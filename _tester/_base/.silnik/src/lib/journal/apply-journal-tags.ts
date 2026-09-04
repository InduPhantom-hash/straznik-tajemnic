import type { Character, JournalEntry } from '@/lib/types';
import type { JournalTagEntry } from '@/lib/parsers/types';
import {
  extractJournalTags,
  extractNpcTags,
  synthesizeClueFact,
  ExtractedNpcTag,
} from '@/lib/parsers/journal-parser';
import { extractLatestTagLocation } from '@/lib/parsers/event-parser';
import { resolveCharacterByName } from '@/lib/character/match-by-name';
import {
  ensureCharacterDossier,
  inferClueCategory,
} from '@/lib/journal/dossier-migration';
import type {
  InvestigatorDossier,
  NpcDossierEntry,
  ClueEntry,
} from '@/lib/journal/dossier-types';

/**
 * Most między parserem tagów MG a dziennikiem postaci i aktami śledczymi (Investigator Dossier).
 *
 * Issue #68: Dwukierunkowa pętla pamięci.
 * 1. Gdy MG opisuje NPC -> tworzy lub aktualizuje kartę w dossier (zamiast dodawać kolejny powtarzający się wpis kroniki).
 * 2. Gdy badacz odkrywa poszlakę -> syntetyzuje precyzyjny 1-zdaniowy fakt do dossier i dziennika.
 *
 * Typ `JournalEntry`:
 *  - `@/lib/types`            → `character.journal` (modal sesji, useSceneSummary)  ← SSOT
 */

/**
 * Mapuje tagi [DZIENNIK:typ:tytuł] na wpisy `character.journal`. Id jest deterministyczne
 * (`messageId` + index), więc dopisywanie jest idempotentne: ponowne przetworzenie tej samej
 * wiadomości nie tworzy duplikatów.
 */
export function buildJournalEntriesFromTags(
  tags: JournalTagEntry[],
  messageId: string
): JournalEntry[] {
  return tags.map((tag, index) => {
    const isClue = tag.type === 'clue' || tag.type === 'discovery';
    const content = isClue
      ? synthesizeClueFact(tag.title, tag.content)
      : tag.content;

    return {
      id: `journal-${messageId}-${index}`,
      timestamp: new Date(),
      inGameDate: tag.inGameDate,
      type: tag.type,
      title: tag.title,
      content,
      tags: [],
      isBookmarked: false,
    };
  });
}

/**
 * IND-267: most `[LOKACJA: Nazwa: opis]` → wpis dziennika typu `location`.
 */
export function buildLocationEntryFromText(
  rawText: string,
  messageId: string
): JournalEntry | null {
  const location = extractLatestTagLocation(rawText);
  if (!location) return null;

  return {
    id: `location-${messageId}`,
    timestamp: new Date(),
    type: 'location',
    title: location.name,
    content: location.description,
    tags: [],
    isBookmarked: false,
  };
}

/**
 * Aktualizuje akta śledcze (dossier) oraz dziennik pojedynczej postaci na podstawie
 * tagów z tury narracji MG.
 */
export function processCharacterJournalAndDossier(
  character: Character,
  tags: JournalTagEntry[],
  npcTags: ExtractedNpcTag[],
  locationEntry: JournalEntry | null,
  messageId: string
): { character: Character; changed: boolean } {
  const charWithDossier = ensureCharacterDossier(character);
  const dossier: InvestigatorDossier = {
    ...charWithDossier.investigatorDossier,
    clues: [...charWithDossier.investigatorDossier.clues],
    npcs: [...charWithDossier.investigatorDossier.npcs],
    locations: [...charWithDossier.investigatorDossier.locations],
    notes: [...charWithDossier.investigatorDossier.notes],
  };

  const existingJournal = [...(charWithDossier.journal ?? [])];
  const existingJournalIds = new Set(existingJournal.map((e) => e.id));
  let changed = false;

  // 1. Obsługa NPC (zarówno z [NPC: Imię: opis], jak i [DZIENNIK:npc:Imię])
  const combinedNpcs = [...npcTags];
  for (const t of tags) {
    if (t.type === 'npc' && t.title && t.content) {
      if (!combinedNpcs.some((n) => n.name.toLowerCase().trim() === t.title.toLowerCase().trim())) {
        combinedNpcs.push({
          name: t.title.trim(),
          description: t.content.trim(),
          who: t.who,
        });
      }
    }
  }

  for (const npc of combinedNpcs) {
    const normName = npc.name.trim();
    if (!normName) continue;
    const lowerName = normName.toLowerCase();

    const existingNpcIndex = dossier.npcs.findIndex(
      (n) => n.name.toLowerCase().trim() === lowerName
    );

    if (existingNpcIndex >= 0) {
      // NPC już istnieje: AKTUALIZUJEMY kartę w dossier bez tworzenia kolejnego wpisu w kronice
      const existing = dossier.npcs[existingNpcIndex];
      let npcUpdated = false;

      if (!existing.firstImpression && npc.description) {
        existing.firstImpression = npc.description;
        npcUpdated = true;
      } else if (npc.description) {
        // Dołącz nową informację, jeśli nie jest duplikatem
        const snippet = npc.description.slice(0, 30).toLowerCase();
        const currentKeyInfo = existing.keyInformation || '';
        if (!currentKeyInfo.toLowerCase().includes(snippet)) {
          existing.keyInformation = currentKeyInfo
            ? `${currentKeyInfo}; ${npc.description}`
            : npc.description;
          npcUpdated = true;
        }
      }

      if (npcUpdated) {
        existing.timestamp = Date.now();
        dossier.npcs[existingNpcIndex] = { ...existing };
        changed = true;
      }
    } else {
      // Nowy NPC: twórz nową kartę w dossier + JEDEN wpis w kronice
      const newNpc: NpcDossierEntry = {
        id: `npc-${lowerName.replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        name: normName,
        firstImpression: npc.description,
        relationshipStatus: 'unknown',
        timestamp: Date.now(),
      };
      dossier.npcs.push(newNpc);

      const jId = `journal-${messageId}-npc-${lowerName.replace(/[^a-z0-9]/g, '-')}`;
      if (!existingJournalIds.has(jId)) {
        existingJournal.push({
          id: jId,
          timestamp: new Date(),
          type: 'npc',
          title: normName,
          content: npc.description,
          tags: [],
          isBookmarked: false,
        });
        existingJournalIds.add(jId);
      }
      changed = true;
    }
  }

  // 2. Obsługa pozostałych tagów dziennika (w tym poszlak z syntezą 1-zdaniową)
  tags.forEach((tag, index) => {
    // Tagi typu 'npc' zostały już obsłużone powyżej
    if (tag.type === 'npc') return;

    const isClue = tag.type === 'clue' || tag.type === 'discovery';
    const fact = isClue
      ? synthesizeClueFact(tag.title, tag.content)
      : tag.content;

    // Aktualizuj poszlaki w dossier
    if (isClue && tag.title) {
      const lowerTitle = tag.title.toLowerCase().trim();
      const existingClue = dossier.clues.find(
        (c) => c.title.toLowerCase().trim() === lowerTitle
      );

      if (!existingClue) {
        const isKey = /klucz|core|key|główn/i.test(`${tag.title} ${tag.content}`);
        const newClue: ClueEntry = {
          id: `clue-${messageId}-${index}`,
          title: tag.title.trim(),
          description: fact,
          category: inferClueCategory({ title: tag.title, content: tag.content }),
          status: 'confirmed',
          isKeyClue: isKey,
          timestamp: Date.now(),
          sourceJournalEntryId: `journal-${messageId}-${index}`,
        };
        dossier.clues.push(newClue);
        changed = true;
      }
    }

    // Dopisz wpis do kroniki
    const jId = `journal-${messageId}-${index}`;
    if (!existingJournalIds.has(jId)) {
      existingJournal.push({
        id: jId,
        timestamp: new Date(),
        inGameDate: tag.inGameDate,
        type: tag.type,
        title: tag.title,
        content: fact,
        tags: [],
        isBookmarked: false,
      });
      existingJournalIds.add(jId);
      changed = true;
    }
  });

  // 3. Obsługa lokacji
  if (locationEntry) {
    const lowerLoc = locationEntry.title.toLowerCase().trim();
    const existingLoc = dossier.locations.find(
      (l) => l.name.toLowerCase().trim() === lowerLoc
    );

    if (!existingLoc) {
      dossier.locations.push({
        id: `location-${lowerLoc.replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        name: locationEntry.title,
        description: locationEntry.content,
        searchStatus: 'partially_searched',
        timestamp: Date.now(),
      });
      changed = true;
    }

    if (!existingJournalIds.has(locationEntry.id)) {
      existingJournal.push(locationEntry);
      existingJournalIds.add(locationEntry.id);
      changed = true;
    }
  }

  if (!changed) return { character, changed: false };

  dossier.lastUpdated = new Date().toISOString();
  return {
    character: {
      ...charWithDossier,
      journal: existingJournal,
      investigatorDossier: dossier,
    },
    changed: true,
  };
}

/**
 * Ekstrahuje tagi [DZIENNIK:], [NPC:] oraz [LOKACJA:] z tekstu odpowiedzi MG,
 * aktualizuje dossier i dopisuje brakujące wpisy do `character.journal`.
 */
export function appendJournalFromText(
  character: Character,
  rawText: string,
  messageId: string
): Character {
  const tags = extractJournalTags(rawText);
  const npcTags = extractNpcTags(rawText);
  const locationEntry = buildLocationEntryFromText(rawText, messageId);

  if (tags.length === 0 && npcTags.length === 0 && !locationEntry) {
    return character;
  }

  const result = processCharacterJournalAndDossier(
    character,
    tags,
    npcTags,
    locationEntry,
    messageId
  );

  return result.character;
}

/**
 * Wariant party-aware (duet / Hot Seat): wpis `[DZIENNIK:@Imię:...]` trafia do
 * dziennika postaci wskazanej prefiksem `@Imię` (fallback: aktywna postać).
 */
export function appendJournalToParty(
  characters: Character[],
  activeCharacter: Character,
  rawText: string,
  messageId: string
): { characters: Character[]; activeCharacter: Character; changed: boolean } {
  const tags = extractJournalTags(rawText);
  const npcTags = extractNpcTags(rawText);
  const locationEntry = buildLocationEntryFromText(rawText, messageId);

  if (tags.length === 0 && npcTags.length === 0 && !locationEntry) {
    return { characters, activeCharacter, changed: false };
  }

  // Mapuj tagi na postacie
  const tagsByChar = new Map<string, JournalTagEntry[]>();
  const npcTagsByChar = new Map<string, ExtractedNpcTag[]>();

  tags.forEach((tag) => {
    const target = resolveCharacterByName(characters, tag.who, activeCharacter);
    const list = tagsByChar.get(target.id) ?? [];
    list.push(tag);
    tagsByChar.set(target.id, list);
  });

  npcTags.forEach((npc) => {
    const target = resolveCharacterByName(characters, npc.who, activeCharacter);
    const list = npcTagsByChar.get(target.id) ?? [];
    list.push(npc);
    npcTagsByChar.set(target.id, list);
  });

  let changedAny = false;
  const apply = (c: Character): Character => {
    const cTags = tagsByChar.get(c.id) ?? [];
    const cNpcs = npcTagsByChar.get(c.id) ?? [];
    const cLoc = c.id === activeCharacter.id ? locationEntry : null;

    if (cTags.length === 0 && cNpcs.length === 0 && !cLoc) {
      return c;
    }

    const res = processCharacterJournalAndDossier(c, cTags, cNpcs, cLoc, messageId);
    if (res.changed) changedAny = true;
    return res.character;
  };

  const nextCharacters = characters.map(apply);
  const nextActive =
    nextCharacters.find((c) => c.id === activeCharacter.id) ??
    apply(activeCharacter);

  return {
    characters: nextCharacters,
    activeCharacter: nextActive,
    changed: changedAny,
  };
}
