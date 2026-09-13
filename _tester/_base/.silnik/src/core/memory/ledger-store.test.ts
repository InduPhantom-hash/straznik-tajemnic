import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { CampaignMemoryLedgerStore } from './ledger-store';
import type { CampaignMemoryScope } from './types';

const scope: CampaignMemoryScope = {
  schemaVersion: 1,
  campaignDefinitionId: 'masks-of-nyarlathotep',
  playthroughId: 'run-one',
  adventureId: 'masks-of-nyarlathotep',
  kind: 'official',
};

describe('CampaignMemoryLedgerStore', () => {
  let directory: string;
  let filePath: string;
  let store: CampaignMemoryLedgerStore;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-memory-'));
    filePath = path.join(directory, 'memory.sqlite3');
    store = new CampaignMemoryLedgerStore(filePath);
  });

  afterEach(() => {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('persists a turn idempotently and survives a restart', () => {
    const input = {
      scope,
      sessionId: 'session-one',
      messageId: 'assistant-one',
      userText: 'Sprawdzam księgę gości hotelu.',
      assistantText: 'W księdze widnieje nazwisko Jacksona Eliasa.',
    };
    expect(store.recordConversationTurn(input)).toBe(2);
    expect(store.recordConversationTurn(input)).toBe(0);
    store.close();

    store = new CampaignMemoryLedgerStore(filePath);
    expect(store.list(scope).map((entry) => entry.text)).toEqual([
      input.userText,
      input.assistantText,
    ]);
  });

  it('stores revealed structured facts atomically with the completed turn', () => {
    const inserted = store.recordConversationTurn({
      scope,
      sessionId: 'session-one',
      messageId: 'assistant-facts',
      userText: 'Wchodzę do hotelu.',
      assistantText: 'W holu spotykasz recepcjonistę.',
      facts: [
        { kind: 'location', text: 'Hotel: marmurowy hol' },
        { kind: 'npc', text: 'Recepcjonista: przestraszony świadek' },
      ],
    });
    expect(inserted).toBe(4);
    expect(store.list(scope).map((entry) => entry.kind)).toEqual([
      'conversation', 'conversation', 'location', 'npc',
    ]);
    expect(store.recordConversationTurn({
      scope,
      sessionId: 'session-one',
      messageId: 'assistant-facts',
      userText: 'Wchodzę do hotelu.',
      assistantText: 'W holu spotykasz recepcjonistę.',
      facts: [{ kind: 'location', text: 'Hotel: marmurowy hol' }],
    })).toBe(0);
  });

  it('keeps the full player utterance when the response contains no visible narration', () => {
    expect(store.recordConversationTurn({
      scope,
      sessionId: 'session-one',
      messageId: 'assistant-secret-only',
      userText: 'Pytam o zamknięte drzwi.',
      assistantText: '',
    })).toBe(1);
    expect(store.list(scope).map((entry) => entry.text)).toEqual(['Pytam o zamknięte drzwi.']);
  });

  it('keeps playthroughs isolated in FTS search', () => {
    store.recordConversationTurn({
      scope,
      sessionId: 'session-one',
      messageId: 'one',
      userText: 'Badam hotel.',
      assistantText: 'Odkrywasz nazwisko Elias w księdze hotelowej.',
    });
    const otherScope = { ...scope, playthroughId: 'run-two' };
    store.recordConversationTurn({
      scope: otherScope,
      sessionId: 'session-two',
      messageId: 'two',
      userText: 'Badam statek.',
      assistantText: 'Odkrywasz manifest ładunkowy.',
    });

    expect(store.search(scope, 'Elias')).toHaveLength(1);
    expect(store.search(otherScope, 'Elias')).toHaveLength(0);
  });

  it('binds a playthrough to its campaign but preserves previous chapters', () => {
    store.recordConversationTurn({ scope: { ...scope, adventureId: 'peru' }, sessionId: 's', messageId: 'a', userText: 'list', assistantText: 'Elias jest w Peru.' });
    const nextChapter = { ...scope, adventureId: 'london' };
    expect(store.search(nextChapter, 'Elias')).toHaveLength(1);
    expect(store.list(nextChapter)[0].scope.adventureId).toBe('peru');
    expect(() => store.list({ ...scope, campaignDefinitionId: 'other' })).toThrow('Campaign scope conflict');
  });

  it('rolls back canonical entries and index jobs when a transaction fails', () => {
    const raw = new Database(filePath);
    raw.exec("CREATE TRIGGER reject_test_fact BEFORE INSERT ON memory_entries WHEN new.memory_kind = 'clue' BEGIN SELECT RAISE(ABORT, 'test disk failure'); END");
    raw.close();
    expect(() => store.recordConversationTurn({ scope, sessionId: 's', messageId: 'a', userText: 'list', assistantText: 'Elias', facts: [{ kind: 'clue', text: 'Elias' }] })).toThrow('test disk failure');
    expect(store.list(scope)).toEqual([]);
    expect(store.pendingIndexEntries(scope)).toEqual([]);
  });

  it('keeps pending index jobs through restart and rejects altered retries', () => {
    const turn = { scope, sessionId: 's', messageId: 'a', userText: 'list', assistantText: 'Elias' };
    store.recordConversationTurn(turn);
    expect(() => store.recordConversationTurn({ ...turn, assistantText: 'Inna odpowiedź' })).toThrow('content conflict');
    const completed = store.pendingIndexEntries(scope)[0].id;
    store.finishIndexJob(completed, true);
    store.close();
    store = new CampaignMemoryLedgerStore(filePath);
    expect(store.pendingIndexEntries(scope).map(e => e.id)).toEqual([`${scope.playthroughId}::a:assistant`]);
    expect(store.recordConversationTurn(turn)).toBe(0);
  });

  it('forks a historical snapshot without later facts and retries restore idempotently', () => {
    store.recordConversationTurn({ scope, sessionId: 's', messageId: 'a', userMessageId: 'u', userText: 'Czytam', assistantText: 'Alibi', facts: [{ kind: 'clue', entityId: 'alibi', text: 'Alibi', status: 'confirmed' }] });
    store.recordConversationTurn({ scope, sessionId: 's', messageId: 'b', userText: 'Sprawdzam', assistantText: 'Przyznanie', facts: [{ kind: 'clue', entityId: 'alibi', text: 'Alibi', status: 'disproven' }] });
    const snapshot = store.createSnapshot(scope, [{ id: 'u', role: 'user', content: 'Czytam' }, { id: 'a', role: 'assistant', content: 'Alibi' }]);
    expect(snapshot.entries).toHaveLength(3);
    const restored = store.restoreSnapshot(snapshot, 'load-one');
    expect(restored.playthroughId).not.toBe(scope.playthroughId);
    expect(store.restoreSnapshot(snapshot, 'load-one')).toEqual(restored);
    expect(store.restoreSnapshot(snapshot, 'load-two').playthroughId).not.toBe(restored.playthroughId);
    expect(store.list(restored).map(e => e.status).filter(Boolean)).toEqual(['confirmed']);
    expect(store.search(restored, 'Przyznanie')).toEqual([]);
    expect(store.pendingIndexEntries(restored)).toHaveLength(3);
    expect(() => store.restoreSnapshot({ ...snapshot, entries: [] }, 'load-one')).toThrow('Restore request conflict');
  });

  it('refuses an incomplete save instead of silently dropping an uncommitted response', () => {
    store.recordConversationTurn({ scope, sessionId: 's', messageId: 'a', userText: 'Czytam', assistantText: 'List' });
    expect(() => store.createSnapshot(scope, [{ id: 'a', role: 'assistant', content: 'List' }, { id: 'b', role: 'assistant', content: 'Niezapisana odpowiedź' }])).toThrow('not been committed');
  });

  it('uses the commit cleaner when comparing raw chat to a snapshot', () => {
    store.recordConversationTurn({ scope, sessionId: 's', messageId: 'a', userText: 'Czytam', assistantText: 'List' });
    expect(store.createSnapshot(scope, [{ id: 'a', role: 'assistant', content: 'List [GM_THOUGHTS]Ukryty plan[/GM_THOUGHTS]' }]).entries).toHaveLength(2);
    expect(() => store.createSnapshot(scope, [{ id: 'a', role: 'assistant', content: 'Zmieniony list' }])).toThrow('conflicts');
  });

  it('accepts natural multi-word questions without disabling FTS', () => {
    store.recordConversationTurn({
      scope,
      sessionId: 'session-one',
      messageId: 'natural-query',
      userText: 'Badam list.',
      assistantText: 'Jackson Elias wskazał hotel w Londynie.',
    });
    expect(store.search(scope, 'Co Jackson powiedział o hotelu?')).not.toHaveLength(0);
  });

  it('falls back to canonical LIKE search when FTS is damaged', () => {
    store.recordConversationTurn({
      scope,
      sessionId: 'session-one',
      messageId: 'one',
      userText: 'Czytam list.',
      assistantText: 'List wspomina o wyprawie Carlyle.',
    });
    const raw = new Database(filePath);
    raw.exec('DROP TABLE memory_entries_fts');
    raw.close();

    const results = store.search(scope, 'Carlyle');
    expect(results).toHaveLength(1);
    expect(results[0].source).toBe('like');

    expect(store.recordConversationTurn({
      scope,
      sessionId: 'session-one',
      messageId: 'two',
      userText: 'Zapisuję wniosek.',
      assistantText: 'Ledger pozostaje źródłem prawdy.',
    })).toBe(2);
    expect(store.list(scope).map((entry) => entry.text)).toContain('Ledger pozostaje źródłem prawdy.');

    expect(store.rebuildFts()).toBe(true);
    const rebuiltResults = store.search(scope, 'Carlyle');
    expect(rebuiltResults).toHaveLength(1);
    expect(rebuiltResults[0].source).toBe('fts');
  });
});
