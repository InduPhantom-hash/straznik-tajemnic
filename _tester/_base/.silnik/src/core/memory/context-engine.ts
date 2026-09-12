import { createHash } from 'crypto';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import { getGeminiClient } from '@/lib/gemini-client-pool';
import { getContextLimit } from '@/lib/model-registry';
import type { Message } from '@/lib/types';
import { cleanResponseText } from '@/lib/parsers/text-cleaner';
import { getCampaignMemoryLedgerStore, type CampaignMemoryLedgerStore } from './ledger-store';
import { searchCampaignMemory, type CampaignMemoryRetrieval } from './retrieval';
import type { CampaignMemoryScope, RevealedMemoryFact } from './types';

export const COMPRESSION_THRESHOLD_RATIO = 0.5;
const HEAD_BUDGET_RATIO = 0.1;
const TAIL_BUDGET_RATIO = 0.25;
const CHECKPOINT_STALENESS_MESSAGES = 20;

export interface PreparedCampaignContext {
  messages: Message[];
  summarySection: string | null;
  memorySection: string;
  retrieval: CampaignMemoryRetrieval | null;
  compacted: boolean;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function takeWithinBudget(messages: Message[], budget: number, fromEnd: boolean): Message[] {
  const selected: Message[] = [];
  let used = 0;
  const indexes = fromEnd
    ? Array.from({ length: messages.length }, (_, index) => messages.length - 1 - index)
    : Array.from({ length: messages.length }, (_, index) => index);
  for (const index of indexes) {
    const cost = estimateTokens(messages[index].content) + 8;
    if (selected.length > 0 && used + cost > budget) break;
    selected.push(messages[index]);
    used += cost;
  }
  return fromEnd ? selected.reverse() : selected;
}

function formatMessages(messages: Message[], start: number): string {
  return messages
    .map((entry, index) => {
      const content = entry.role === 'assistant' ? cleanResponseText(entry.content) : entry.content;
      return `[${start + index}] ${entry.role === 'user' ? 'GRACZ' : 'MG'}: ${content}`;
    })
    .join('\n\n');
}

function buildSummarySection(summary: string, start: number, end: number, locale: 'pl' | 'en'): string {
  const heading = locale === 'en' ? 'CAMPAIGN CONTEXT SUMMARY' : 'PODSUMOWANIE KONTEKSTU KAMPANII';
  return `\n## ${heading} (messages ${start}-${end})\n${summary}`;
}

const SUMMARY_INSTRUCTION = `Jesteś kompresorem kontekstu kampanii RPG. Podsumowujesz wyłącznie fakty ujawnione graczom. Nie dopowiadaj sekretów ani rozwiązania scenariusza. Zwróć poprawny JSON z polami: events, investigatorDecisions, revealedClues, npcStatus, consequences, unresolvedThreads. Każde pole jest tablicą krótkich zdań. Zachowaj nazwy własne, chronologię i skutki decyzji.`;

function parseSummary(raw: string, locale: 'pl' | 'en'): string | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as Record<string, unknown>;
  const labels: Record<string, [string, string]> = {
    events: ['Wydarzenia', 'Events'],
    investigatorDecisions: ['Decyzje Badaczy', 'Investigator decisions'],
    revealedClues: ['Ujawnione tropy', 'Revealed clues'],
    npcStatus: ['Status NPC', 'NPC status'],
    consequences: ['Konsekwencje', 'Consequences'],
    unresolvedThreads: ['Nierozwiązane wątki', 'Unresolved threads'],
  };
  const lines: string[] = [];
  for (const [key, [pl, en]] of Object.entries(labels)) {
    const values = parsed[key];
    if (Array.isArray(values) && values.length > 0) {
      const safeValues = values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => cleanResponseText(value))
        .filter(Boolean);
      if (safeValues.length > 0) lines.push(`- ${locale === 'en' ? en : pl}: ${safeValues.join('; ')}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

export class CampaignContextEngine {
  constructor(private readonly ledger: CampaignMemoryLedgerStore = getCampaignMemoryLedgerStore()) {}

  async prepareContext(input: {
    messages?: Message[];
    query: string;
    modelId: string;
    apiKey: string;
    scope: CampaignMemoryScope | null;
    locale: 'pl' | 'en';
    contextLimitOverride?: number;
  }): Promise<PreparedCampaignContext> {
    const messages = input.messages ?? [];
    const [compaction, retrieval] = await Promise.all([
      this.compactIfNeeded({
        messages,
        modelId: input.modelId,
        apiKey: input.apiKey,
        scope: input.scope,
        locale: input.locale,
        contextLimitOverride: input.contextLimitOverride,
      }),
      input.scope ? this.searchCampaignMemory(input.scope, input.query) : Promise.resolve(null),
    ]);
    return {
      ...compaction,
      retrieval,
      memorySection: retrieval?.promptSection ?? '',
    };
  }

  recordCompletedTurn(input: {
    scope: CampaignMemoryScope;
    sessionId: string;
    messageId: string;
    userMessageId?: string;
    userText: string;
    assistantText: string;
    facts?: RevealedMemoryFact[];
  }): number {
    return this.ledger.recordConversationTurn(input);
  }

  async searchCampaignMemory(scope: CampaignMemoryScope, query: string): Promise<CampaignMemoryRetrieval> {
    return searchCampaignMemory(scope, query, this.ledger);
  }

  async compactIfNeeded(input: {
    messages: Message[];
    modelId: string;
    apiKey: string;
    scope: CampaignMemoryScope | null;
    locale: 'pl' | 'en';
    contextLimitOverride?: number;
  }): Promise<Pick<PreparedCampaignContext, 'messages' | 'summarySection' | 'compacted'>> {
    const limit = input.contextLimitOverride ?? getContextLimit(input.modelId);
    const total = input.messages.reduce((sum, entry) => sum + estimateTokens(entry.content) + 8, 0);
    if (!input.scope || total <= limit * COMPRESSION_THRESHOLD_RATIO) {
      return { messages: input.messages, summarySection: null, compacted: false };
    }

    const head = takeWithinBudget(input.messages, Math.floor(limit * HEAD_BUDGET_RATIO), false);
    const tailPool = input.messages.slice(head.length);
    const tail = takeWithinBudget(tailPool, Math.floor(limit * TAIL_BUDGET_RATIO), true);
    const start = head.length;
    const endExclusive = input.messages.length - tail.length;
    if (endExclusive <= start) {
      return { messages: input.messages, summarySection: null, compacted: false };
    }

    const failure = this.ledger.getCompressionFailure(input.scope.playthroughId);
    if (failure.retryAfter && Date.parse(failure.retryAfter) > Date.now()) {
      return { messages: input.messages, summarySection: null, compacted: false };
    }

    const cached = this.ledger.getLatestCheckpoint(input.scope.playthroughId);
    if (
      cached &&
      cached.sourceStartSequence === start &&
      Math.abs(cached.sourceEndSequence - (endExclusive - 1)) < CHECKPOINT_STALENESS_MESSAGES
    ) {
      const uncoveredMiddle = input.messages.slice(
        Math.max(start, cached.sourceEndSequence + 1),
        endExclusive
      );
      return {
        messages: [...head, ...uncoveredMiddle, ...tail],
        summarySection: buildSummarySection(cached.summary, cached.sourceStartSequence, cached.sourceEndSequence, input.locale),
        compacted: true,
      };
    }

    try {
      const client = getGeminiClient(input.apiKey);
      if (!client) throw new Error('Gemini client unavailable');
      const result = await client.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: formatMessages(input.messages.slice(start, endExclusive), start),
        config: {
          systemInstruction: SUMMARY_INSTRUCTION,
          temperature: 0.1,
          topP: 0.9,
          maxOutputTokens: 1200,
        },
      });
      const summary = result.text ? parseSummary(result.text, input.locale) : null;
      if (!summary) throw new Error('Invalid compression response');
      const latest = this.ledger.getLatestCheckpoint(input.scope.playthroughId);
      const version = (latest?.version ?? 0) + 1;
      const id = createHash('sha256')
        .update(`${input.scope.playthroughId}:${start}:${endExclusive - 1}:${summary}`)
        .digest('hex');
      this.ledger.saveCheckpoint({
        id,
        playthroughId: input.scope.playthroughId,
        version,
        sourceStartSequence: start,
        sourceEndSequence: endExclusive - 1,
        sourceMessageIds: input.messages.slice(start, endExclusive).map((message) => message.id),
        summary,
        createdAt: new Date().toISOString(),
      });
      return {
        messages: [...head, ...tail],
        summarySection: buildSummarySection(summary, start, endExclusive - 1, input.locale),
        compacted: true,
      };
    } catch (error) {
      this.ledger.recordCompressionFailure(input.scope.playthroughId);
      console.warn('Campaign context compression failed; keeping original context:', error);
      return { messages: input.messages, summarySection: null, compacted: false };
    }
  }
}

let singleton: CampaignContextEngine | null = null;

export function getCampaignContextEngine(): CampaignContextEngine {
  if (!singleton) singleton = new CampaignContextEngine();
  return singleton;
}
