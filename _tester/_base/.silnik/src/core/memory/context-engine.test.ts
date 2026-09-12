import fs from 'fs';
import os from 'os';
import path from 'path';
import { CampaignContextEngine } from './context-engine';
import { CampaignMemoryLedgerStore } from './ledger-store';
import type { CampaignMemoryScope } from './types';
import { getGeminiClient } from '@/lib/gemini-client-pool';

jest.mock('@/lib/gemini-client-pool', () => ({ getGeminiClient: jest.fn() }));
jest.mock('./retrieval', () => ({
  searchCampaignMemory: jest.fn(async () => ({ results: [], promptSection: '', source: 'none' })),
}));

const scope: CampaignMemoryScope = {
  schemaVersion: 1,
  campaignDefinitionId: 'masks-of-nyarlathotep',
  playthroughId: 'run-context-test',
  adventureId: 'peru',
  kind: 'official',
};

function messages(count: number, chars = 120) {
  return Array.from({ length: count }, (_, index) => ({
    id: `m-${index}`,
    role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
    content: `${index}: ${'x'.repeat(chars)}`,
    timestamp: new Date(index * 1000),
  }));
}

describe('CampaignContextEngine', () => {
  let dir: string;
  let ledger: CampaignMemoryLedgerStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-context-'));
    ledger = new CampaignMemoryLedgerStore(path.join(dir, 'memory.sqlite3'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    ledger.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('does not compact before 50 percent of the model context', async () => {
    const input = messages(4, 20);
    const result = await new CampaignContextEngine(ledger).compactIfNeeded({
      messages: input,
      modelId: 'test',
      apiKey: 'key',
      scope,
      locale: 'pl',
      contextLimitOverride: 1000,
    });
    expect(result.messages).toEqual(input);
    expect(result.compacted).toBe(false);
    expect(getGeminiClient).not.toHaveBeenCalled();
  });

  it('preserves the beginning and end and stores the exact compacted range', async () => {
    (getGeminiClient as jest.Mock).mockReturnValue({
      models: {
        generateContent: jest.fn(async () => ({
          text: JSON.stringify({
            events: ['Odkryto przejście.'],
            investigatorDecisions: ['Badacze weszli do środka.'],
            revealedClues: ['Znak na drzwiach.'],
            npcStatus: [],
            consequences: ['Strażnik ich zauważył.'],
            unresolvedThreads: ['Kto zostawił znak?'],
          }),
        })),
      },
    });
    const input = messages(12);
    for (let index = 0; index < 6; index += 1) {
      ledger.recordConversationTurn({
        scope,
        sessionId: 'session-context',
        messageId: input[index * 2 + 1].id,
        userMessageId: input[index * 2].id,
        userText: input[index * 2].content,
        assistantText: input[index * 2 + 1].content,
      });
    }
    const rawIds = ledger.list(scope).map((entry) => entry.id);
    const result = await new CampaignContextEngine(ledger).compactIfNeeded({
      messages: input,
      modelId: 'test',
      apiKey: 'key',
      scope,
      locale: 'pl',
      contextLimitOverride: 600,
    });
    expect(result.compacted).toBe(true);
    expect(result.messages[0].id).toBe('m-0');
    expect(result.messages.at(-1)?.id).toBe('m-11');
    const checkpoint = ledger.getLatestCheckpoint(scope.playthroughId);
    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.sourceStartSequence).toBeGreaterThanOrEqual(1);
    expect(checkpoint?.sourceEndSequence).toBeLessThan(11);
    expect(ledger.list(scope).map((entry) => entry.id)).toEqual(rawIds);
    expect(ledger.list(scope).some((entry) => !entry.active)).toBe(true);
    const compactedIds = new Set(checkpoint?.sourceMessageIds ?? []);
    expect(ledger.list(scope).filter((entry) => !entry.active).every((entry) =>
      entry.sourceMessageIds.some((id) => compactedIds.has(id))
    )).toBe(true);
  });

  it('keeps context unchanged after an AI failure and applies cooldown', async () => {
    const generateContent = jest.fn(async () => { throw new Error('offline'); });
    (getGeminiClient as jest.Mock).mockReturnValue({ models: { generateContent } });
    const input = messages(12);
    const engine = new CampaignContextEngine(ledger);
    const first = await engine.compactIfNeeded({
      messages: input,
      modelId: 'test',
      apiKey: 'key',
      scope,
      locale: 'pl',
      contextLimitOverride: 600,
    });
    const second = await engine.compactIfNeeded({
      messages: input,
      modelId: 'test',
      apiKey: 'key',
      scope,
      locale: 'pl',
      contextLimitOverride: 600,
    });
    expect(first.messages).toEqual(input);
    expect(second.messages).toEqual(input);
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(ledger.getCompressionFailure(scope.playthroughId).failureCount).toBe(1);
  });

  it('keeps newly uncovered middle messages when reusing a recent checkpoint', async () => {
    const generateContent = jest.fn(async (_request: { contents: string }) => ({
      text: JSON.stringify({
        events: ['Odkryto przejście.'],
        investigatorDecisions: [],
        revealedClues: [],
        npcStatus: [],
        consequences: [],
        unresolvedThreads: [],
      }),
    }));
    (getGeminiClient as jest.Mock).mockReturnValue({ models: { generateContent } });
    const engine = new CampaignContextEngine(ledger);
    const initial = messages(12);
    await engine.compactIfNeeded({
      messages: initial,
      modelId: 'test',
      apiKey: 'key',
      scope,
      locale: 'pl',
      contextLimitOverride: 600,
    });
    const checkpoint = ledger.getLatestCheckpoint(scope.playthroughId);
    expect(checkpoint).not.toBeNull();

    const expanded = messages(14);
    const reused = await engine.compactIfNeeded({
      messages: expanded,
      modelId: 'test',
      apiKey: 'key',
      scope,
      locale: 'pl',
      contextLimitOverride: 600,
    });

    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(reused.messages.map((message) => message.id)).toContain(`m-${checkpoint!.sourceEndSequence + 1}`);
  });

  it('never sends hidden GM content to the compressor or stores it in a checkpoint', async () => {
    const generateContent = jest.fn(async (_request: { contents: string }) => ({
      text: JSON.stringify({
        events: ['[MYŚLI_MG: ukryty sekret] Odkryto zamknięte drzwi.'],
        investigatorDecisions: [],
        revealedClues: [],
        npcStatus: [],
        consequences: [],
        unresolvedThreads: [],
      }),
    }));
    (getGeminiClient as jest.Mock).mockReturnValue({ models: { generateContent } });
    const input = messages(12);
    input[5] = {
      ...input[5],
      content: '[SEKRETY_MG]Kultysta nadal żyje.[/SEKRETY_MG] Gracze widzą zamknięte drzwi. ' + 'x'.repeat(120),
    };
    await new CampaignContextEngine(ledger).compactIfNeeded({
      messages: input,
      modelId: 'test',
      apiKey: 'key',
      scope,
      locale: 'pl',
      contextLimitOverride: 600,
    });
    const request = generateContent.mock.calls[0][0];
    expect(request.contents).not.toContain('Kultysta nadal żyje');
    expect(ledger.getLatestCheckpoint(scope.playthroughId)?.summary).toContain('Odkryto zamknięte drzwi.');
    expect(ledger.getLatestCheckpoint(scope.playthroughId)?.summary).not.toContain('ukryty sekret');
  });
});
