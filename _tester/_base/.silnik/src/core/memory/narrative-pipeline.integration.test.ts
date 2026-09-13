import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Character } from '@/lib/types';
import { applyStatChangesToParty } from '@/lib/character/apply-stat-changes';
import { appendJournalToParty } from '@/lib/journal/apply-journal-tags';
import { CampaignMemoryLedgerStore } from '@/core/memory/ledger-store';
import { sanitizeMechanicalTags, stripHiddenMemoryContent } from '@/lib/parsers/text-cleaner';
import type { CampaignMemoryScope } from '@/core/memory/types';

describe('Narrative SSE Pipeline Integration Test', () => {
  let tempDir: string;
  let ledger: CampaignMemoryLedgerStore;

  const testScope: CampaignMemoryScope = {
    schemaVersion: 1,
    campaignDefinitionId: 'integration-test-campaign',
    playthroughId: 'run-pipe-01',
    adventureId: 'arkham-asylum',
    kind: 'official',
  };

  const initialCharacter: Character = {
    id: 'char-edward-pierce',
    name: 'Edward Pierce',
    occupation: 'Prywatny detektyw',
    age: 38,
    background: 'Doświadczony śledczy z Bostonu.',
    playerName: 'Gracz 1',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 10,
    },
    developmentHistory: [],
    str: 50,
    con: 60,
    siz: 65,
    dex: 50,
    app: 40,
    int: 75,
    pow: 60,
    edu: 70,
    luck: 50,
    hp: 12,
    maxHp: 12,
    san: 60,
    maxSan: 89,
    mp: 12,
    maxMp: 12,
    dayStartSan: 60,
    dailySanLoss: 0,
    skills: {
      'Spostrzegawczość': 65,
      'Mity Cthulhu': 10,
    },
    journal: [],
    investigatorDossier: {
      adventureId: 'arkham-asylum',
      clues: [],
      npcs: [],
      locations: [],
      notes: [],
    },
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-integration-'));
    ledger = new CampaignMemoryLedgerStore(path.join(tempDir, 'campaign-memory.sqlite3'));
  });

  afterEach(() => {
    ledger.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('przetwarza wieloetapowy strumień SSE z tagami MG i poprawnie aktualizuje stan Badacza, Dossier oraz Ledger pamięci', () => {
    // 1. Symulacja strumienia odpowiedzi Mistrza Gry (SSE stream z tagami narracyjnymi i mechanicznymi)
    const rawAiAssistantStream = `
Wkraczasz do zakurzonego gabinetu doktora Hardinga w Arkham Sanitarium.
[SANITY: -2: Makabryczny widok zasuszonych tkanek na biurku]
[HP: -1: Odłamek rozbitego słoja rani dłoń]

Na biurku leży stary, skórzany notes z wyblakłym monogramem.
[DZIENNIK:trop:Dziennik Hardinga z zapiskami o pacjencie numer 47]
[PRZEDMIOT:Zaszyfrowany notes doktora Hardinga: kategoria=dokument|waga=0.5]

W cieniu pod oknem stoi postać w białym fartuchu.
[NPC:Dr Eric Harding: lekarz psychiatra, zaniepokojony i nerwowo chowający skalpel]
[LOKACJA:Arkham Sanitarium: Gabinet lekarski na parterze]

[SEKRETY_MG]Dr Harding wie o podziemnym laboratorium, ale ukrywa to przed policją.[/SEKRETY_MG]

- Czego pan tutaj szuka, panie Pierce? - pyta chłodnym, drżącym głosem.
    `.trim();

    // 2. Krok A: Aplikacja zmian statystyk (HP / SAN) na drużynę Badaczy
    const statChanges = applyStatChangesToParty([initialCharacter], initialCharacter, rawAiAssistantStream);
    const updatedCharacterAfterStats = statChanges.characters.find((c) => c.id === 'char-edward-pierce')!;

    expect(updatedCharacterAfterStats.hp).toBe(11); // 12 - 1 HP
    expect(updatedCharacterAfterStats.san).toBe(58); // 60 - 2 SAN
    expect(updatedCharacterAfterStats.dailySanLoss).toBe(2);

    // 3. Krok B: Aplikacja tagów śledczych do Akt Badacza (Dossier) i Dziennika
    const partyAfterJournal = appendJournalToParty(
      [updatedCharacterAfterStats],
      updatedCharacterAfterStats,
      rawAiAssistantStream,
      'turn-msg-01'
    );
    const finalCharacter = partyAfterJournal.characters.find((c) => c.id === 'char-edward-pierce')!;

    // Weryfikacja wpisu w kronice dziennika
    expect(finalCharacter.journal?.length).toBeGreaterThanOrEqual(1);

    // Weryfikacja Akt Śledczych (Dossier)
    const dossier = finalCharacter.investigatorDossier;
    expect(dossier).toBeDefined();
    expect(
      dossier?.clues.some(
        (c) =>
          c.title.includes('Harding') ||
          c.title.includes('Dziennik') ||
          c.description.includes('Harding') ||
          c.description.includes('pacjencie')
      )
    ).toBe(true);
    expect(dossier?.npcs.some((npc) => npc.name.includes('Dr Eric Harding') || npc.name.includes('Harding'))).toBe(true);
    expect(dossier?.locations.some((loc) => loc.name.includes('Arkham Sanitarium') || loc.name.includes('Gabinet'))).toBe(true);

    // 4. Krok C: Oczyszczenie tekstu przed prezentacją graczowi i lektorowi TTS (Zero wycieków tagów mechanicznych i sekretów)
    const sanitizedForPlayer = sanitizeMechanicalTags(rawAiAssistantStream);
    const sanitizedForMemory = stripHiddenMemoryContent(rawAiAssistantStream);

    expect(sanitizedForPlayer).not.toContain('[SANITY:');
    expect(sanitizedForPlayer).not.toContain('[HP:');
    expect(sanitizedForPlayer).not.toContain('[DZIENNIK:');
    expect(sanitizedForPlayer).not.toContain('[NPC:');
    expect(sanitizedForPlayer).not.toContain('[SEKRETY_MG]');
    expect(sanitizedForPlayer).not.toContain('Dr Harding wie o podziemnym laboratorium'); // Sekrety MG wycięte
    expect(sanitizedForPlayer).toContain('Wkraczasz do zakurzonego gabinetu');
    expect(sanitizedForPlayer).toContain('Czego pan tutaj szuka, panie Pierce?');

    // 5. Krok D: Trwały zapis tury do CampaignMemoryLedgerStore (SQLite)
    const insertedCount = ledger.recordConversationTurn({
      scope: testScope,
      sessionId: 'session-arkham-01',
      messageId: 'msg-turn-harding-01',
      userText: 'Wchodzę do gabinetu Hardinga i rozglądam się uważnie.',
      assistantText: sanitizedForMemory,
      facts: [
        { kind: 'clue', text: 'Odkryto zaszyfrowany notes doktora Hardinga' },
        { kind: 'npc', text: 'Spotkano doktora Erica Hardinga w gabinecie' },
      ],
    });

    expect(insertedCount).toBeGreaterThanOrEqual(2);

    // Weryfikacja odczytu z bazy SQLite w ramach tej samej kampanii
    const storedEntries = ledger.list(testScope);
    expect(storedEntries.length).toBeGreaterThanOrEqual(2);
    expect(storedEntries.some((e) => e.text.includes('notes doktora Hardinga'))).toBe(true);

    // Weryfikacja wyszukiwania (Search / FTS fallback)
    const searchResults = ledger.search(testScope, 'Harding');
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults.some((r) => r.text.includes('Harding'))).toBe(true);
  });
});
