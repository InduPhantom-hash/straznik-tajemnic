/**
 * createSseStream - factory function dla sekcji 12 route.ts (IND-71 micro 3/3).
 *
 * Buduje ReadableStream w formacie SSE (Server-Sent Events) ze stream chunks
 * od `provider.streamChat()`. Po zakończeniu strumienia:
 *   1. parseAIResponse(fullText) - extract events/combat/dialogues/illustrations/timeUpdate
 *   2. updateDirectorState - warunkowo gdy sessionId + parsed.gmMetadata
 *   3. enqueue metadata event ('data: {type:"metadata",...}\n\n')
 *   4. logApiEvent - fire-and-forget cost recording + telemetria (OPT-28)
 *   5. conversationMemory.saveConversationTurn - fire-and-forget Pinecone persist
 *
 * Pattern SSE: każdy chunk to `data: {JSON}\n\n` (z double-newline separator).
 * Error w stream → controller.error(e) propaguje do client (NIE swallows).
 *
 * Side effects (asynchroniczne):
 *   - updateDirectorState (sync, ale try/catch)
 *   - logApiEvent (Promise.catch swallowed - non-blocking telemetria)
 *   - conversationMemory.saveConversationTurn (Promise.catch swallowed - fire-and-forget)
 *
 * Dependencies (mockowalne przez jest): parseAIResponse, updateDirectorState,
 * logApiEvent, conversationMemory.
 */

import { parseAIResponse } from '@/lib/response-parser';
import { updateDirectorState } from '@/lib/director-state';
import { conversationMemory } from '@/lib/vector-db/conversation-memory';
import { logApiEvent } from '@/lib/telemetry';
import { calculateGeminiCost } from '@/lib/ai-cost-tracker';
import { recordUserUsage } from '@/lib/user-usage';
import type { StreamChunk, CompletionUsage } from '@/lib/ai-providers/types';
import type { Character } from '@/lib/types';
import type { RagMeta } from './run-rag-summary';

export interface CreateSseStreamOpts {
  providerStream: AsyncIterable<StreamChunk>;
  getUsage: () => Promise<CompletionUsage | null>;
  sessionId?: string;
  message: string;
  character?: Character;
  modelId: string;
  traceId: string;
  timer: { elapsed: () => number };
  /** Telemetry: metadata RAG retrieval (null gdy fallback / brak hits) */
  ragMeta?: RagMeta | null;
  /** Telemetry: aktywny embedding dim (768 v1 / 3072 v2) */
  embeddingDim: number;
  /** Telemetry: aktywna wersja RAG ('v1' | 'v2') z process.env.RAG_VERSION */
  ragVersion: string;
  /** IND-168 Faza 6: userId konta (Clerk) dla licznika zużycia per-konto */
  userId: string;
}

export function createSseStream(opts: CreateSseStreamOpts): ReadableStream {
  const {
    providerStream,
    getUsage,
    sessionId,
    message,
    character,
    modelId,
    traceId,
    timer,
    ragMeta,
    embeddingDim,
    ragVersion,
    userId,
  } = opts;

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let fullText = '';

      try {
        for await (const chunk of providerStream) {
          if (chunk.text) {
            fullText += chunk.text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'text', content: chunk.text })}\n\n`
              )
            );
          }
        }

        // Parsuj pełną odpowiedź i wyślij metadane
        const parsed = parseAIResponse(fullText);

        // Director's State update (warunkowo)
        if (sessionId && parsed.gmMetadata) {
          try {
            updateDirectorState(
              sessionId,
              parsed.gmMetadata,
              parsed.journalEntries
            );
          } catch (e) {
            console.warn('⚠️ Director state update failed:', e);
          }
        }

        const usage = await getUsage();

        // Telemetry namespace dla PostHog client-side emit (spawn task 2026-05-22).
        // Client (useChat.onMetadata) odbiera te pola → trackEvent('ai_request_completed').
        const telemetry = {
          durationMs: timer.elapsed(),
          ragHits: ragMeta?.hits ?? 0,
          ragSource: ragMeta?.source ?? 'none',
          ragNamespaces: ragMeta?.namespaces ?? '',
          ragNamespaceCount: ragMeta?.namespaceCount ?? 0,
          ragDurationMs: ragMeta?.durationMs ?? 0,
          embeddingDim,
          ragVersion,
          model: usage?.model || modelId,
          tokensIn: usage?.promptTokens ?? 0,
          tokensOut: usage?.completionTokens ?? 0,
          cachedTokens: usage?.cachedTokens ?? 0,
        };

        const metadata = {
          type: 'metadata',
          parsedEvents: parsed.events,
          combatState: parsed.combat,
          dialogues: parsed.dialogues,
          illustrations: parsed.illustrations,
          skillTests: parsed.skillTests,
          timeUpdate: parsed.timeUpdate,
          costData: usage
            ? {
                totalTokens: usage.totalTokens,
                model: usage.model,
              }
            : null,
          telemetry,
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`)
        );

        // OPT-28: cost recording + telemetria (fire-and-forget)
        // IND-67: drop fs.appendFileSync('./src/cost-log.jsonl') - Vercel READ-ONLY FS rzucał EROFS.
        // Spawn task 2026-05-22: rozszerz meta o RAG fields (Sentry + Vercel Logs spójność z PostHog).
        if (usage) {
          // IND-257: koszt liczony raz, wspólny dla logApiEvent (telemetry.jsonl)
          // i recordUserUsage (budżet per-konto). Wcześniej logApiEvent nie miał
          // costUsd → kosztu czatu nie dało się czytać z telemetry.jsonl.
          const geminiCost = calculateGeminiCost(
            usage.model || modelId,
            usage.promptTokens ?? 0,
            usage.completionTokens ?? 0,
            usage.cachedTokens ?? 0
          );
          logApiEvent({
            traceId,
            endpoint: '/api/chat',
            provider: 'gemini',
            model: usage.model || modelId,
            status: 200,
            durationMs: timer.elapsed(),
            tokensIn: usage.promptTokens ?? 0,
            tokensOut: usage.completionTokens ?? 0,
            costUsd: geminiCost,
            result: 'success',
            sessionId: sessionId ?? undefined,
            meta: {
              cachedTokens: usage.cachedTokens ?? 0,
              totalTokens: usage.totalTokens ?? 0,
              ragHits: ragMeta?.hits ?? 0,
              ragSource: ragMeta?.source ?? 'none',
              ragNamespaces: ragMeta?.namespaces ?? '',
              ragNamespaceCount: ragMeta?.namespaceCount ?? 0,
              embeddingDim,
              ragVersion,
            },
          }).catch(() => {});

          // IND-168 Faza 6: licznik zużycia per-konto (fire-and-forget, GCS).
          // NIE może blokować streamu ani 500-ować - błędy swallowane.
          recordUserUsage(userId, {
            type: 'gemini',
            cost: geminiCost,
            tokens: usage.totalTokens ?? 0,
          }).catch(() => {});
        }

        // Conversation memory persist (fire-and-forget Pinecone)
        if (sessionId && fullText) {
          conversationMemory
            .saveConversationTurn({
              userMessage: message,
              aiResponse: fullText,
              sessionId,
              characterName: character?.name,
            })
            .catch(() => {});
        }

        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
