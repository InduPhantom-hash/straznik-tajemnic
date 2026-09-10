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
  LocationDossierEntry,
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
      // Ekstrakcja trójwymiarowości Egriego jeśli podana w formacie [opis | ciało | status | cel]
      let firstImpression = npc.description;
      let physiologicalDetail: string | undefined;
      let sociologicalStatus: string | undefined;
      let psychologicalAgenda: string | undefined;

      if (npc.description.includes('|')) {
        const parts = npc.description.split('|').map((p) => p.trim());
        firstImpression = parts[0] || npc.description;
        if (parts.length >= 2) physiologicalDetail = parts[1];
        if (parts.length >= 3) sociologicalStatus = parts[2];
        if (parts.length >= 4) psychologicalAgenda = parts[3];
      }

      const newNpc: NpcDossierEntry = {
        id: `npc-${lowerName.replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        name: normName,
        firstImpression,
        physiologicalDetail,
        sociologicalStatus,
        psychologicalAgenda,
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
          content: firstImpression,
          tags: [],
          isBookmarked: false,
        });
        existingJournalIds.add(jId);
      }
      changed = true;
    }
  }

  // 2. Obsługa pozostałych tagów dziennika (w tym poszlak z syntezą 1-zdaniową i wektorem M.I.C.E.)
  tags.forEach((tag, index) => {
    // Tagi typu 'npc' zostały już obsłużone powyżej
    if (tag.type === 'npc') return;

    const isClue = tag.type === 'clue' || tag.type === 'discovery';
    let rawContent = tag.content;
    let explicitMiceType: import('@/lib/journal/dossier-types').MiceQuotientType | undefined;
    let miceObjective: string | undefined;

    if (isClue && tag.content.includes('|')) {
      const parts = tag.content.split('|').map((p) => p.trim());
      rawContent = parts[0] || tag.content;
      const mToken = (parts[1] || '').toLowerCase();
      if (['m', 'milieu', 'otoczenie', 'przestrzen'].includes(mToken)) {
        explicitMiceType = 'milieu';
      } else if (['i', 'inquiry', 'sledztwo', 'pytanie'].includes(mToken)) {
        explicitMiceType = 'inquiry';
      } else if (['c', 'character', 'postac', 'tozsamosc'].includes(mToken)) {
        explicitMiceType = 'character';
      } else if (['e', 'event', 'zagrozenie', 'wydarzenie', 'zdarzenie'].includes(mToken)) {
        explicitMiceType = 'event';
      }
      if (parts[2]) {
        miceObjective = parts[2];
      }
    }

    const fact = isClue
      ? synthesizeClueFact(tag.title, rawContent)
      : tag.content;

    // Aktualizuj poszlaki w dossier
    if (isClue && tag.title) {
      const lowerTitle = tag.title.toLowerCase().trim();
      const existingClue = dossier.clues.find(
        (c) => c.title.toLowerCase().trim() === lowerTitle
      );

      // Wykrywanie unieważniania starszych poszlak
      const supersedesMatch = tag.content.match(/(?:zastępuje|unieważnia|obala|supersedes|refutes):\s*([^|\n\]]+)/i);
      const supersededTarget = supersedesMatch ? supersedesMatch[1].trim().toLowerCase() : null;
      if (supersededTarget) {
        dossier.clues.forEach((c) => {
          if (c.title.toLowerCase().trim() === supersededTarget || c.title.toLowerCase().includes(supersededTarget)) {
            c.status = 'superseded';
            c.supersededBy = tag.title.trim();
            changed = true;
          }
        });
      }

      if (!existingClue) {
        const isKey = /klucz|core|key|główn/i.test(`${tag.title} ${tag.content}`);
        const resolvedMiceType = explicitMiceType || inferClueMiceType(tag.title, fact);
        const newClue: ClueEntry = {
          id: `clue-${messageId}-${index}`,
          title: tag.title.trim(),
          description: fact,
          category: inferClueCategory({ title: tag.title, content: rawContent }),
          status: 'confirmed',
          discoveryStatus: 'discovered',
          epistemicLayer: 'player_clue',
          isKeyClue: isKey,
          miceType: resolvedMiceType,
          miceObjective,
          timestamp: Date.now(),
          sourceJournalEntryId: `journal-${messageId}-${index}`,
        };
        dossier.clues.push(newClue);
        changed = true;
      } else {
        // Aktualizacja istniejącej poszlaki
        if (existingClue.description !== fact && fact) {
          existingClue.description = fact;
          existingClue.timestamp = Date.now();
          changed = true;
        }
      }
    }

    // Dopisz wpis do kroniki
    const jId = `journal-${messageId}-${index}`;
    const mappedType = ['sprawa', 'case', 'cel'].includes(tag.type)
      ? 'case'
      : ['notatka', 'note'].includes(tag.type)
        ? 'note'
        : tag.type;

    if (!existingJournalIds.has(jId)) {
      existingJournal.push({
        id: jId,
        timestamp: new Date(),
        inGameDate: tag.inGameDate,
        type: mappedType,
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
      let locDesc = locationEntry.content;
      let lockedRoomMystery: LocationDossierEntry['lockedRoomMystery'];

      if (locationEntry.content.includes('|')) {
        const parts = locationEntry.content.split('|').map((p) => p.trim());
        locDesc = parts[0] || locationEntry.content;
        const typeToken = (parts[1] || '').toLowerCase();
        const validTypes: Record<string, import('@/lib/journal/dossier-types').LockedRoomMysteryType> = {
          typ1: 'accident_feigned_as_murder',
          wypadek: 'accident_feigned_as_murder',
          typ2: 'toxic_gas_or_paroxysm',
          gaz: 'toxic_gas_or_paroxysm',
          typ3: 'mechanical_trap',
          pulapka: 'mechanical_trap',
          typ4: 'suicide_framed_as_murder',
          samobojstwo: 'suicide_framed_as_murder',
          typ5: 'victim_impersonation',
          podszycie: 'victim_impersonation',
          typ6: 'strike_from_outside',
          zewnatrz: 'strike_from_outside',
          typ7: 'strike_during_break_in',
          wywazanie: 'strike_during_break_in',
        };

        const matchedType = validTypes[typeToken];
        if (matchedType) {
          lockedRoomMystery = {
            type: matchedType,
            anomalyDescription: parts[2] || 'Zamknięte od wewnątrz drzwi i brak śladów ucieczki.',
            investigationHint: parts[3] || undefined,
          };
        }
      }

      dossier.locations.push({
        id: `location-${lowerLoc.replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
        name: locationEntry.title,
        description: locDesc,
        searchStatus: 'partially_searched',
        lockedRoomMystery,
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

/**
 * Rozpoznaje wektor dramatyczny M.I.C.E. poszlaki na podstawie tytułu i treści.
 */
export function inferClueMiceType(
  title: string,
  content: string
): import('@/lib/journal/dossier-types').MiceQuotientType {
  const text = `${title} ${content}`.toLowerCase();
  if (/miejsce|lokacja|pokój|piwnica|krypta|tunel|drzwi|ucieczk|droga|wyjście|uwięzi|room|place|location|escape|door|tunnel|cell/i.test(text)) {
    return 'milieu';
  }
  if (/postać|świadek|podejrzan|relacj|psycholog|lęk|sekret|moral|osoba|npc|character|suspect|witness|fear|secret|guilt/i.test(text)) {
    return 'character';
  }
  if (/rytuał|kataklizm|zagrożeni|besti|potwór|eksplozj|zegar|pożar|czas|event|ritual|threat|monster|beast|countdown|fire/i.test(text)) {
    return 'event';
  }
  return 'inquiry';
}
