import { NextRequest, NextResponse } from 'next/server';
import { loadAISettings, getGameMasterPrompt } from '@/lib/ai-settings';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import { getContextLimit } from '@/lib/model-registry';
import { getOptimizedMessages } from '@/lib/context-optimizer';
import { Character, Message } from '@/lib/types';
import { extractCommand, handleCommand } from '@/lib/command-handler';
import { detectGameContext } from '@/lib/prompt-section-parser';
import { GeminiChatProvider } from '@/lib/ai-providers';
import { getContextAwareGMProtocol } from '@/lib/prompts/gm-protocol';
import {
  isSessionResume,
  buildSessionRecapInstruction,
} from '@/lib/session-recap';
import { getEmbeddingDimensions } from '@/lib/embedding-service';
import {
  buildAdditionalContext,
  buildPlayerSkillsSection,
  NpcContextEntry,
  HotSeatPlayerEntry,
} from './build-context';
import { buildHandoutsContext } from './build-handouts-context';
import type { AdventureHandout } from '@/lib/adventures-data';
import { buildGeminiOptions } from './build-gemini-options';
import { buildPdfStrategy, PdfMemoryAttachments } from './build-pdf-strategy';
import { buildTimeContext } from './build-time-context';
import { createSseStream } from './create-sse-stream';
import { resolveGeminiCache } from './resolve-gemini-cache';
import { runRAGAndSummary } from './run-rag-summary';
import { resolveSettings } from './resolve-settings';
import { buildPlayerWeaponContext } from '@/lib/combat/weapon-context';
import { resolveUserId, scopeSessionId } from '@/lib/auth-user';
import * as Sentry from '@sentry/nextjs';
import { isModelNotFoundError } from './model-fallback';

/**
 * Rozwiązuje klucz Gemini dla requestu.
 * WERSJA LOKALNA (zew-app-local): priorytet ma nagłówek X-Gemini-Api-Key
 * (localStorage, jeśli gracz wpisał własny), a fallbackiem jest serwerowy
 * GEMINI_API_KEY z .env.local. Dzięki temu na prywatnym localhoście narracja
 * działa bez ręcznego wpisywania klucza w modal (i znika błąd 401 po zamknięciu
 * modala). Klucz nigdy nie pochodzi z body ani z Clerk privateMetadata.
 */
function resolveGeminiApiKey(request: NextRequest): string | null {
  const key = request.headers.get('X-Gemini-Api-Key')?.trim();
  return key || process.env.GEMINI_API_KEY?.trim() || null;
}

export interface ChatPipelineInput {
  request: NextRequest;
  body: Record<string, unknown>;
  traceId: string;
  timer: { elapsed: () => number };
}

/**
 * Orchestrator AI GM chat pipeline (IND-184 extract z route.ts POST handler).
 *
 * 1-shot pipeline: command → settings → provider → time/cache/RAG → context → PDF → stream → SSE.
 * Zwraca Response (early returns dla command/disabled/no-prompt/no-key, finalny SSE stream dla
 * happy path). Wszystkie błędy bubble up do route.ts catch (telemetry + 500 NextResponse).
 *
 * Plik 264 lin > 200 (CLAUDE.md guardrail) - świadoma akceptacja: brak naturalnego split
 * pointu dalej (Strategia B `micro split` rejected w research IND-184). Orchestrator 1-shot,
 * 8 helperów już wyciągniętych w sesji 123+126. Dalsze rozbijanie generuje boilerplate bez wartości.
 */
export async function runChatPipeline({
  request,
  body,
  traceId,
  timer,
}: ChatPipelineInput): Promise<Response> {
  const {
    message,
    character,
    messages,
    pdfMemory,
    npcs,
    currentLocation,
    gameContextPrompt,
    skipContext,
    adventureContext,
    isGameStart,
    aiSettings: clientAISettings,
    hotSeatConfig,
  } = body as {
    message: string;
    character?: Character | null;
    messages?: Message[];
    pdfMemory?: PdfMemoryAttachments | null;
    npcs?: NpcContextEntry[];
    currentLocation?: string;
    gameContextPrompt?: string;
    skipContext?: boolean;
    adventureContext?: {
      era?: string;
      sourceBookId?: string;
      handouts?: AdventureHandout[];
    } | null;
    isGameStart?: boolean;
    aiSettings?: { sessionId?: string } & Record<string, unknown>;
    hotSeatConfig?: { enabled?: boolean; players?: HotSeatPlayerEntry[] };
  };

  // Komendy lokalne
  const command = extractCommand(message);
  if (command) {
    const commandResponse = handleCommand(
      command,
      character as Character | null
    );
    if (commandResponse !== null) {
      return NextResponse.json({
        response: commandResponse,
        isCommand: true,
      });
    }
  }

  // Ustawienia i Prompty - IND-183 micro 1/5
  const aiSettings = resolveSettings(loadAISettings(), clientAISettings);

  if (!aiSettings.gameMasterNarration.enabled) {
    return NextResponse.json({ response: 'Narracja AI jest wyłączona.' });
  }

  const contextMemory =
    aiSettings.gameMasterNarration.behavior.contextMemory || 1000;
  const recentMessages = getOptimizedMessages(messages, contextMemory);
  const gameContext = detectGameContext(message, recentMessages, character);
  // IND-194: pełny path z przekazanym aiSettings (zmergowany z clientAISettings, lin 120).
  // Wcześniej getOptimizedGameMasterPrompt/getGameMasterPrompt re-czytały loadAISettings()
  // serwerowo → pusta localStorage → mainPrompt (.md gracza) gubiony. Teraz mainPrompt dociera.
  const systemPrompt = getGameMasterPrompt(aiSettings);

  if (process.env.DEBUG_GM_PROMPT === '1') {
    console.log(
      '[GM_PROMPT] systemPromptLen=',
      systemPrompt.length,
      'mainPromptLen=',
      aiSettings.gameMasterNarration.prompts.mainPrompt?.length ?? 0
    );
  }

  if (!systemPrompt) {
    return NextResponse.json(
      {
        error: 'Brak system prompt dla AI Game Master',
        details: 'gameMasterNarration.prompts wymaga konfiguracji w Settings',
      },
      { status: 500 }
    );
  }

  // === GEMINI PROVIDER ===
  const apiKey = resolveGeminiApiKey(request);

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'Wklej swój klucz Google AI Studio w ustawieniach',
        code: 'BYOK_KEY_MISSING',
      },
      { status: 401 }
    );
  }

  const modelId = aiSettings.geminiSettings.model || DEFAULT_GEMINI_MODEL;
  const provider = new GeminiChatProvider(apiKey, modelId);

  // === TIME & ERA CONTEXT === - IND-183 micro 2/5
  const { timePromptSection, eraRules } = buildTimeContext({
    adventureContext,
  });

  // === OPT-21: CONTEXT-AWARE GM PROTOCOL ===
  const messageCount = messages?.length || 0;
  const gmProtocol = getContextAwareGMProtocol(messageCount);

  // === R3 (latencja): dwie niezależne gałęzie sieciowe RÓWNOLEGLE ===
  // Cache promptu (OPT-26) NIE zależy od sessionId; łańcuch userId→sessionId→RAG
  // (OPT-09) NIE zależy od cache. Wcześniej szły sekwencyjnie (cache + RAG); teraz
  // Promise.all → koszt = wolniejsza z dwóch zamiast sumy obu (~50-200ms zysku).
  //   - OPT-26: GEMINI CONTEXT CACHING (IND-13) - IND-183 micro 3/5
  //   - OPT-09 + MID-SESSION SUMMARY - IND-71 micro 2/3
  //   - IND-168 Faza 3: izolacja per-konto. Magazyny kluczowane sessionId (Pinecone
  //     sessions/{id}, cache podsumowań, director state) scope'owane userId z Clerk
  //     → sessions/{userId}/{sessionId}. Dev (Clerk off): ragUserId='' → płaski sessionId.
  //   - IND-206 BYOK: ten sam klucz usera (z nagłówka) także dla podsumowań -
  //     conversation-summarizer dostaje go jako parametr, więc summary >80 msg
  //     obciąża klucz testera bez osobnego odczytu nagłówka.
  const [resolvedCachedContent, ragResult] = await Promise.all([
    resolveGeminiCache({
      enableCache: aiSettings.geminiSettings.enableCache,
      cacheTTL: aiSettings.geminiSettings.cacheTTL,
      apiKey,
      modelId,
      systemPrompt,
      eraRules,
      gmProtocol,
    }),
    (async () => {
      const ragUserId = await resolveUserId('');
      const sessionId = scopeSessionId(ragUserId, clientAISettings?.sessionId);
      const { ragSection, summarySection, ragMeta } = await runRAGAndSummary({
        message,
        messages,
        sessionId,
        apiKey,
        geminiKey: apiKey,
        // Zawęża RAG 'adventures' do książki aktywnej przygody (DriveThruRPG).
        adventureSource: adventureContext?.sourceBookId,
      });
      return { ragUserId, sessionId, ragSection, summarySection, ragMeta };
    })(),
  ]);
  const { ragUserId, sessionId, ragSection, summarySection, ragMeta } =
    ragResult;

  // === BUDUJ KONTEKST (additionalContext) - IND-71 micro 1/3 ===
  // C1: recap przy wznowieniu zapisanej gry (isGameStart + istnieje historia rozmowy).
  const sessionRecapSection = isSessionResume(isGameStart, messageCount)
    ? buildSessionRecapInstruction()
    : null;

  const additionalContext = buildAdditionalContext({
    timePromptSection,
    gmProtocol,
    gameContext,
    resolvedCachedContent,
    sessionId,
    ragSection,
    summarySection,
    // Realne handouty przygody (DriveThruRPG) - MG dostaje markdown obrazów do pokazania.
    handoutsSection: buildHandoutsContext(adventureContext?.handouts),
    sessionRecapSection,
    skipContext,
    gameContextPrompt,
    npcs,
    currentLocation,
    hotSeatConfig,
    // IND-223: oznacz postać gracza jako sterowaną przez człowieka
    playerCharacterName: character?.name,
    // Uzbrojenie postaci → AI prowadzi walkę narracyjnie znając broń + umiejętność + obrażenia
    playerWeaponsSection: buildPlayerWeaponContext(character ?? null),
    // Lista umiejętności postaci → AI wzywa testy nazwami z karty (eliminuje Tackę 0%)
    playerSkillsSection: buildPlayerSkillsSection(character ?? null),
  });

  // === PDF STRATEGY (OPT-01) === - IND-183 micro 4/5
  const { fileAttachments } = buildPdfStrategy({
    pdfMemory,
    message,
    messages,
    isGameStart,
  });

  // === OPT-27: PRE-FLIGHT TOKEN ESTIMATION ===
  const estimateTokens = (text: string) => Math.ceil(text.length / 4);
  const totalEstTokens =
    additionalContext.reduce((sum, ctx) => sum + estimateTokens(ctx), 0) +
    estimateTokens(systemPrompt) +
    fileAttachments.length * 10000;

  // IND-275 T1: limity okna kontekstowego z model-registry (getContextLimit).
  const contextLimit = getContextLimit(modelId);
  const safeLimit = Math.floor(contextLimit * 0.8);

  if (totalEstTokens > safeLimit) {
    console.warn(
      `⚠️ Pre-flight: ~${totalEstTokens} tokens exceeds 80% of ${contextLimit}. Trimming context.`
    );
  }

  // === STREAMING via Provider === - IND-183 micro 5/5
  const chatGeminiOptions = buildGeminiOptions({
    geminiSettings: aiSettings.geminiSettings,
    additionalContext,
    fileAttachments,
    resolvedCachedContent,
  });

  const streamArgs = {
    systemPrompt,
    messages: recentMessages.map((msg: { role: string; content: string }) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    userMessage: message,
    temperature: aiSettings.geminiSettings.temperature,
    topP: aiSettings.geminiSettings.topP,
    maxOutputTokens: aiSettings.geminiSettings.maxOutputTokens,
    geminiOptions: chatGeminiOptions,
  };

  // IND-222: graceful fallback. Gdy skonfigurowany model zwróci 404 NOT_FOUND
  // (literówka w nazwie presetu / Google wycofał wariant), logujemy + ponawiamy
  // na DEFAULT_GEMINI_MODEL zamiast wywalać turę na 500. streamChat woła
  // generateContentStream EAGER (gemini-provider:263), więc 404 rzuca się tu na
  // await - łapalne. Dla złego modelu cache też się wywala 404 → resolveGeminiCache
  // zwraca null, więc chatGeminiOptions nie ma cachedContent przypisanego do
  // martwego modelu → streamArgs bezpieczne do reuse na modelu fallback.
  let effectiveModelId = modelId;
  let streamResult: Awaited<ReturnType<typeof provider.streamChat>>;
  try {
    streamResult = await provider.streamChat(streamArgs);
  } catch (err) {
    if (isModelNotFoundError(err) && modelId !== DEFAULT_GEMINI_MODEL) {
      console.warn(
        `⚠️ IND-222: model "${modelId}" zwrócił 404 NOT_FOUND → fallback na "${DEFAULT_GEMINI_MODEL}"`
      );
      Sentry.captureMessage(
        `Gemini model 404 → fallback: ${modelId} → ${DEFAULT_GEMINI_MODEL}`,
        { level: 'warning', tags: { feature: 'chat', issue: 'IND-222' } }
      );
      effectiveModelId = DEFAULT_GEMINI_MODEL;
      const fallbackProvider = new GeminiChatProvider(
        apiKey,
        DEFAULT_GEMINI_MODEL
      );
      streamResult = await fallbackProvider.streamChat(streamArgs);
    } else {
      throw err;
    }
  }
  const { stream: providerStream, getUsage } = streamResult;

  // === SSE STREAM + POST-STREAM SIDE EFFECTS - IND-71 micro 3/3 ===
  const sseStream = createSseStream({
    providerStream,
    getUsage,
    sessionId,
    message,
    character: character ?? undefined,
    modelId: effectiveModelId,
    traceId,
    timer,
    ragMeta,
    embeddingDim: getEmbeddingDimensions(),
    ragVersion: process.env.RAG_VERSION === 'v2' ? 'v2' : 'v1',
    // IND-168 Faza 6: reuse rozwiązanego ragUserId (Clerk > '' dev) dla licznika
    // zużycia per-konto; user-usage normalizuje puste -> 'local'.
    userId: ragUserId,
  });

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
