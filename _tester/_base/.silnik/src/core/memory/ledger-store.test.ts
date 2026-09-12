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
