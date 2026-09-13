import fs from 'fs';
import os from 'os';
import path from 'path';
import { CampaignContextEngine, CampaignContextBudgetError } from './context-engine';
import { CampaignMemoryLedgerStore } from './ledger-store';
import type { CampaignMemoryScope } from './types';
import { getGeminiClient } from '@/lib/gemini-client-pool';
import { searchCampaignMemory } from './retrieval';

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
    jest.restoreAllMocks();
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
    const saved = jest.spyOn(ledger, 'saveCheckpoint');
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
    // Persistence of the new optional fields belongs to the ledger workstream.
    jest.spyOn(ledger, 'getLatestCheckpoint').mockReturnValue({ ...checkpoint!, ...saved.mock.calls[0][0] });

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
    const covered = new Set(checkpoint!.sourceMessageIds);
    expect(reused.messages.map((message) => message.id)).toEqual(expanded.filter((message) => !covered.has(message.id)).map((message) => message.id));
  });

  const base = { modelId: 'test', apiKey: 'key', scope, locale: 'pl' as const, contextLimitOverride: 600 };

  async function checkpointFixture() {
    const generateContent = jest.fn(async () => ({ text: JSON.stringify({ events: ['A door was found.'] }) }));
    (getGeminiClient as jest.Mock).mockReturnValue({ models: { generateContent } });
    const engine = new CampaignContextEngine(ledger);
    const initial = messages(12);
    const save = jest.spyOn(ledger, 'saveCheckpoint');
    await engine.compactIfNeeded({ ...base, messages: initial });
    const checkpoint = { ...ledger.getLatestCheckpoint(scope.playthroughId)!, ...save.mock.calls[0][0] };
    const read = jest.spyOn(ledger, 'getLatestCheckpoint').mockReturnValue(checkpoint);
    return { engine, initial, checkpoint, read, generateContent, save };
  }

  it.each(['edited text', 'id', 'role', 'locale', 'model', 'rewind', 'legacy checkpoint', 'different playthrough'])(
    'rejects checkpoint reuse after %s', async (change) => {
      const fixture = await checkpointFixture();
      const input = { ...base, messages: fixture.initial.map((message) => ({ ...message })), locale: 'pl' as 'pl' | 'en' };
      const index = fixture.checkpoint.sourceStartSequence;
      if (change === 'edited text') input.messages[index].content += ' changed';
      if (change === 'id') input.messages[index].id = 'replacement';
      if (change === 'role') input.messages[index].role = input.messages[index].role === 'user' ? 'assistant' : 'user';
      if (change === 'locale') input.locale = 'en';
      if (change === 'model') input.modelId = 'other-model';
      if (change === 'rewind') input.messages = input.messages.slice(0, 10);
      if (change === 'legacy checkpoint') fixture.read.mockReturnValue({ ...fixture.checkpoint, sourceHash: undefined, locale: undefined, modelId: undefined });
      if (change === 'different playthrough') fixture.read.mockReturnValue({ ...fixture.checkpoint, playthroughId: 'another-run' });
      await fixture.engine.compactIfNeeded(input);
      expect(fixture.generateContent).toHaveBeenCalledTimes(2);
    },
  );

  it('hashes full source content beyond any summary-sized prefix', async () => {
    const fixture = await checkpointFixture();
    expect(fixture.checkpoint.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    const input = fixture.initial.map((message) => ({ ...message }));
    input[3].content += 'z'.repeat(8000);
    await fixture.engine.compactIfNeeded({ ...base, messages: input, contextLimitOverride: 10000 });
    // Directly verify the hash input independently, including order, IDs and roles.
    const { createHash } = await import('crypto');
    const { cleanResponseText } = await import('@/lib/parsers/text-cleaner');
    const range = fixture.initial.slice(fixture.checkpoint.sourceStartSequence, fixture.checkpoint.sourceEndSequence + 1);
    expect(fixture.checkpoint.sourceHash).toBe(createHash('sha256').update(JSON.stringify(range.map((message) => ({
      id: message.id, role: message.role,
      content: message.role === 'assistant' ? cleanResponseText(message.content) : message.content,
    })))).digest('hex'));
  });

  it('ignores changes confined to cleaned hidden assistant content', async () => {
    const fixture = await checkpointFixture();
    const input = fixture.initial.map((message) => ({ ...message }));
    input[3].content = '[SEKRETY_MG]Hidden fact[/SEKRETY_MG]' + input[3].content;
    await fixture.engine.compactIfNeeded({ ...base, messages: input });
    expect(fixture.generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('bounds outbound context on compressor failure (cooldown=%s) without changing history', async (cooldown) => {
    const generateContent = jest.fn(async () => { throw new Error('offline'); });
    (getGeminiClient as jest.Mock).mockReturnValue({ models: { generateContent } });
    if (cooldown) ledger.recordCompressionFailure(scope.playthroughId);
    const input = messages(12);
    const before = JSON.stringify(input);
    const result = await new CampaignContextEngine(ledger).compactIfNeeded({ ...base, messages: input, availableContextTokens: 150 });
    expect(JSON.stringify(input)).toBe(before);
    expect(result.messages.slice(-2)).toEqual(input.slice(-2));
    expect(result.messages.reduce((sum, message) => sum + Math.ceil(message.content.length / 4) + 8, 0)).toBeLessThanOrEqual(150);
    expect(ledger.getLatestCheckpoint(scope.playthroughId)).toBeNull();
    expect(generateContent).toHaveBeenCalledTimes(cooldown ? 0 : 1);
  });

  it('rejects protected input before calling the compressor', async () => {
    await expect(new CampaignContextEngine(ledger).compactIfNeeded({ ...base, messages: messages(12), availableContextTokens: 20 }))
      .rejects.toMatchObject({ name: 'CampaignContextBudgetError', code: 'CAMPAIGN_CONTEXT_BUDGET_EXCEEDED', availableTokens: 20 });
    expect(getGeminiClient).not.toHaveBeenCalled();
    expect(ledger.getCompressionFailure(scope.playthroughId).failureCount).toBe(0);
  });

  it('enforces the same preflight without a campaign scope', async () => {
    await expect(new CampaignContextEngine(ledger).compactIfNeeded({ ...base, scope: null, messages: messages(2), availableContextTokens: 1 }))
      .rejects.toBeInstanceOf(CampaignContextBudgetError);
  });

  it('uses the explicit remaining budget without reserving the margin twice', async () => {
    const input = messages(4, 20);
    const exact = input.reduce((sum, message) => sum + Math.ceil(message.content.length / 4) + 8, 0);
    const result = await new CampaignContextEngine(ledger).compactIfNeeded({ ...base, messages: input, availableContextTokens: exact });
    expect(result.messages).toEqual(input);
    expect(getGeminiClient).not.toHaveBeenCalled();
  });

  it.each([null, [0.1, 0.2]])('forwards queryEmbedding=%s and locale in the fourth retrieval argument', async (queryEmbedding) => {
    await new CampaignContextEngine(ledger).prepareContext({ ...base, messages: [], query: 'door', queryEmbedding });
    expect(searchCampaignMemory).toHaveBeenCalledWith(scope, 'door', ledger, { queryEmbedding, locale: 'pl' });
  });

  it('includes retrieved memory in the outbound token budget', async () => {
    (searchCampaignMemory as jest.Mock).mockResolvedValueOnce({ results: [], source: 'fts', promptSection: '\n## Memory\n- ' + 'x'.repeat(400) });
    const result = await new CampaignContextEngine(ledger).prepareContext({ ...base, messages: messages(2, 20), query: 'door', availableContextTokens: 40 });
    expect(result.memorySection).toBe('');
    expect(result.messages).toHaveLength(2);
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
