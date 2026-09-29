import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { CampaignMemoryLedgerStore, stripSystemDirectivesForLedger } from './ledger-store';
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

  describe('stripSystemDirectivesForLedger & Issue #560 session-end snapshot resilience', () => {
    it('strips various system directives and normalizes whitespace', () => {
      expect(stripSystemDirectivesForLedger('Wracam do pokoju.\n[KONIEC_SESJI:FINAL]')).toBe('Wracam do pokoju.');
      expect(stripSystemDirectivesForLedger('Wracam do pokoju.\n[KONIEC_SESJI_FINAL]')).toBe('Wracam do pokoju.');
      expect(stripSystemDirectivesForLedger('Wracam do pokoju.\n[KONIEC_SESJI:POTWIERDZENIE]')).toBe('Wracam do pokoju.');
      expect(stripSystemDirectivesForLedger('[KONIEC_SESJI]')).toBe('');
      expect(stripSystemDirectivesForLedger('Badam pokój.\n[END_SESSION:FINAL]')).toBe('Badam pokój.');
      expect(stripSystemDirectivesForLedger('Badam pokój.\n[END_SESSION]')).toBe('Badam pokój.');
      expect(stripSystemDirectivesForLedger('Finał.\n[INSTRUKCJA SPECJALNA - KONIEC SESJI (KROK 2 - FINAŁ)]')).toBe('Finał.');
      expect(stripSystemDirectivesForLedger('Finał.\n[GM DIRECTIVE: wrap scene]')).toBe('Finał.');
      expect(stripSystemDirectivesForLedger('Finał.\n[SYSTEM: wrap up]')).toBe('Finał.');
      expect(stripSystemDirectivesForLedger('Odwiedzam [Biblioteka] i szukam [Dziennik].')).toBe('Odwiedzam [Biblioteka] i szukam [Dziennik].');
      expect(stripSystemDirectivesForLedger('Badam [system] zabezpieczeń.')).toBe('Badam [system] zabezpieczeń.');
      expect(stripSystemDirectivesForLedger('')).toBe('');
    });

    it('creates snapshot without conflict when recordConversationTurn received userText with [KONIEC_SESJI:FINAL]', () => {
      store.recordConversationTurn({
        scope,
        sessionId: 'session-closure',
        messageId: 'assistant-end',
        userMessageId: 'user-end',
        userText: 'Kończę śledztwo i palę dokumenty.\n[KONIEC_SESJI:FINAL]',
        assistantText: 'Mrok pochłania gabinet. [KONIEC_SESJI:POTWIERDZENIE]',
      });

      // React message state contains clean player utterance
      const snapshot = store.createSnapshot(scope, [
        { id: 'user-end', role: 'user', content: 'Kończę śledztwo i palę dokumenty.' },
        { id: 'assistant-end', role: 'assistant', content: 'Mrok pochłania gabinet. [KONIEC_SESJI:POTWIERDZENIE]' },
      ]);

      expect(snapshot.entries).toHaveLength(2);
      const userEntry = snapshot.entries.find((e) => e.role === 'user');
      expect(userEntry?.text).toBe('Kończę śledztwo i palę dokumenty.');
      expect(userEntry?.text).not.toContain('[KONIEC_SESJI:FINAL]');

      const assistantEntry = snapshot.entries.find((e) => e.role === 'assistant');
      expect(assistantEntry?.text).toBe('Mrok pochłania gabinet.');
      expect(assistantEntry?.text).not.toContain('[KONIEC_SESJI:POTWIERDZENIE]');
    });

    it('creates snapshot without conflict when legacy ledger entries contain system directives', () => {
      // Direct insertion mimicking pre-fix legacy database with [KONIEC_SESJI:FINAL]
      const db = new Database(filePath);
      db.prepare(`
        INSERT INTO memory_entries (
          id, playthrough_id, campaign_definition_id, adventure_id, memory_kind,
          session_id, sequence_no, role, text, tags_json, source_message_ids_json, revealed_at, active, fact_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'legacy-user-entry', scope.playthroughId, scope.campaignDefinitionId, scope.adventureId,
        'conversation', 'session-legacy', 1, 'user', 'Opuszczam Arkham.\n[KONIEC_SESJI:FINAL]',
        '[]', JSON.stringify(['msg-user-1']), new Date().toISOString(), 1, '{}'
      );
      db.prepare(`
        INSERT INTO memory_entries (
          id, playthrough_id, campaign_definition_id, adventure_id, memory_kind,
          session_id, sequence_no, role, text, tags_json, source_message_ids_json, revealed_at, active, fact_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'legacy-assistant-entry', scope.playthroughId, scope.campaignDefinitionId, scope.adventureId,
        'conversation', 'session-legacy', 2, 'assistant', 'Pociąg rusza w mgłę.',
        '[]', JSON.stringify(['msg-ast-1']), new Date().toISOString(), 1, '{}'
      );
      db.close();

      const snapshot = store.createSnapshot(scope, [
        { id: 'msg-user-1', role: 'user', content: 'Opuszczam Arkham.' },
        { id: 'msg-ast-1', role: 'assistant', content: 'Pociąg rusza w mgłę.' },
      ]);

      expect(snapshot.entries).toHaveLength(2);
      const userEntry = snapshot.entries.find((e) => e.role === 'user');
      expect(userEntry?.text).toBe('Opuszczam Arkham.');
      expect(userEntry?.text).not.toContain('[KONIEC_SESJI:FINAL]');
    });

    it('creates snapshot without conflict when messages contain system directives', () => {
      store.recordConversationTurn({
        scope,
        sessionId: 'session-closure',
        messageId: 'ast-msg',
        userMessageId: 'usr-msg',
        userText: 'Wracam do hotelu.',
        assistantText: 'Koniec przygody.',
      });

      // Message has directive attached
      const snapshot = store.createSnapshot(scope, [
        { id: 'usr-msg', role: 'user', content: 'Wracam do hotelu.\n[KONIEC_SESJI:FINAL]' },
        { id: 'ast-msg', role: 'assistant', content: 'Koniec przygody.' },
      ]);

      expect(snapshot.entries).toHaveLength(2);
      expect(snapshot.entries.find((e) => e.role === 'user')?.text).toBe('Wracam do hotelu.');
    });

    it('handles [KONIEC_SESJI] trigger turn without snapshot conflicts and retains non-empty text', () => {
      store.recordConversationTurn({
        scope,
        sessionId: 'session-closure',
        messageId: 'ast-closure',
        userMessageId: 'usr-closure',
        userText: '[KONIEC_SESJI]',
        assistantText: 'Co robisz przed zakończeniem sesji?',
      });

      const snapshot = store.createSnapshot(scope, [
        { id: 'usr-closure', role: 'user', content: '[KONIEC_SESJI]' },
        { id: 'ast-closure', role: 'assistant', content: 'Co robisz przed zakończeniem sesji?' },
      ]);

      expect(snapshot.entries).toHaveLength(2);
      const userEntry = snapshot.entries.find((e) => e.role === 'user');
      expect(userEntry?.text).toBe('[KONIEC_SESJI]');
    });

    it('supports bidirectional idempotent turn recording when input text has directives on one call and clean on repeat', () => {
      const turnWithDirective = {
        scope,
        sessionId: 'session-idempotency',
        messageId: 'turn-closure',
        userText: 'Poddaję się szaleństwu.\n[KONIEC_SESJI:FINAL]',
        assistantText: 'Ciemność zwycięża. [KONIEC_SESJI:POTWIERDZENIE]',
      };

      expect(store.recordConversationTurn(turnWithDirective)).toBe(2);
      // Repeating with clean text computes identical hash because cleanUserText and cleanAssistantText are used
      const turnClean = {
        ...turnWithDirective,
        userText: 'Poddaję się szaleństwu.',
        assistantText: 'Ciemność zwycięża.',
      };
      expect(store.recordConversationTurn(turnClean)).toBe(0);

      // Verify stored entries in snapshot are clean
      const snapshot = store.createSnapshot(scope, [
        { id: 'turn-closure:user', role: 'user', content: 'Poddaję się szaleństwu.' },
        { id: 'turn-closure', role: 'assistant', content: 'Ciemność zwycięża.' },
      ]);
      expect(snapshot.entries.find((e) => e.role === 'assistant')?.text).toBe('Ciemność zwycięża.');
      expect(snapshot.entries.find((e) => e.role === 'user')?.text).toBe('Poddaję się szaleństwu.');
    });
  });
});
