/**
 * Bezpieczny konwerter i migrator wsteczny dla Akt Śledczych (Investigator's Dossier).
 * Usuwa naleciałości cRPG (questy, cele z checkboxami, questStatus) i przekształca
 * stan zapisu gry oraz wpisy kroniki w czyste struktury CoC 7e RAW (zero crashy).
 */

import {
  ClueCategory,
  ClueEntry,
  ClueProvenance,
  ClueStatus,
  InvestigatorDossier,
  LocationDossierEntry,
  NpcDossierEntry,
  NpcRelationshipStatus,
  PlayerNoteEntry,
  isClueEntry,
  isLocationDossierEntry,
  isNpcDossierEntry,
  isPlayerNoteEntry,
  linkClueNpcLocation,
} from './dossier-types';
import { inferClueProvenance } from '../parsers/journal-parser';
import {
  isVisualPromptLeak,
  sanitizeLocationName,
} from '@/lib/parsers/event-parser';
import { normalizeEntityTitle } from '@/lib/journal/entity-visual-resolver';

interface LegacyObjective {
  id?: string;
  description?: string;
  completed?: boolean;
  dateCompleted?: string;
}

interface LegacyEntryLike {
  id?: string;
  type?: string;
  title?: string;
  content?: string;
  tags?: string[];
  category?: string;
  questStatus?: 'active' | 'completed' | 'failed';
  hypothesisStatus?: 'unverified' | 'confirmed' | 'disproven';
  objectives?: LegacyObjective[];
  investigatorInsight?: string;
  provenance?: ClueProvenance;
  inGameDate?: string;
  date?: string;
  timestamp?: number | string | Date;
  imageUrl?: string;
  metadata?: {
    npcName?: string;
    locationName?: string;
    imageUrl?: string;
  };
  sourceJournalEntryId?: string;
}

const FORENSIC_PATTERNS = [
  'autopsj', 'sekcj', 'zwłok', 'ciał', 'krew', 'krwi', 'odcisk', 'ślad',
  'rany', 'rana', 'ranion', 'trucizn', 'toksyn', 'medycyn', 'oględzin',
  'obrażen', 'forensic', 'autopsy', 'blood', 'fingerprint', 'wound', 'poison', 'corpse', 'body'
];

const DOCUMENT_PATTERNS = [
  'dokument', 'akt', 'akta', 'aktach', 'list', 'liśc', 'pismo', 'pisem',
  'gazet', 'artykuł', 'książk', 'księg', 'dziennik', 'notatk', 'raport',
  'telegram', 'rejestr', 'teczk', 'biuletyn', 'wycinek', 'document', 'letter',
  'newspaper', 'article', 'book', 'diary', 'report', 'record', 'file'
];

const TESTIMONY_PATTERNS = [
  'zeznan', 'świadek', 'świadk', 'świadectw', 'przesłuchan', 'rozmow', 'wywiad',
  'słowa', 'relacj', 'informator', 'podejrzan', 'testimony', 'witness',
  'interview', 'statement', 'informant', 'confession'
];

const OCCULT_PATTERNS = [
  'mit', 'mity', 'mitów', 'okultyzm', 'kult', 'rytuał', 'symbol', 'znak',
  'artefakt', 'bóstwo', 'bóstw', 'potwór', 'potwor', 'czar', 'czary', 'magi',
  'przekleństw', 'bluźnier', 'cthulhu', 'nyarlathotep', 'azathoth', 'shub',
  'yog', 'necronomicon', 'occult', 'mythos', 'ritual', 'idol', 'grimoire', 'spell'
];

function matchesPattern(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

/**
 * Automatycznie dedukuje kategorię poszlaki na podstawie treści, tytułu i tagów.
 */
export function inferClueCategory(entry: LegacyEntryLike): ClueCategory {
  const combined = [
    entry.title || '',
    entry.content || '',
    entry.category || '',
    ...(Array.isArray(entry.tags) ? entry.tags : []),
  ].join(' ');

  if (matchesPattern(combined, OCCULT_PATTERNS)) return 'occult';
  if (matchesPattern(combined, DOCUMENT_PATTERNS)) return 'document';
  if (matchesPattern(combined, TESTIMONY_PATTERNS)) return 'testimony';
  if (matchesPattern(combined, FORENSIC_PATTERNS)) return 'forensic';

  return 'forensic';
}

/**
 * Normalizuje status poszlaki eliminując cRPG-owe questStatus.
 */
export function inferClueStatus(entry: LegacyEntryLike): ClueStatus {
  if (entry.hypothesisStatus === 'confirmed' || entry.questStatus === 'completed') {
    return 'confirmed';
  }
  if (entry.hypothesisStatus === 'disproven' || entry.questStatus === 'failed') {
    return 'disproven';
  }
  return 'unconfirmed';
}

/**
 * Przekształca dawne cele cRPG (QuestObjective) w czytelną listę poszlak/kroków badawczych.
 */
function appendObjectivesToDescription(
  baseDescription: string,
  objectives?: LegacyObjective[]
): string {
  if (!Array.isArray(objectives) || objectives.length === 0) {
    return baseDescription || '';
  }

  const lines = objectives
    .filter((obj): obj is LegacyObjective => Boolean(obj && typeof obj === 'object'))
    .map((obj) => {
      const mark = obj.completed ? '[x]' : '[ ]';
      const desc = obj.description || 'Cel śledczy';
      const dateSuffix = obj.dateCompleted ? ` (odnotowano: ${obj.dateCompleted})` : '';
      return `- ${mark} ${desc}${dateSuffix}`;
    });

  if (lines.length === 0) return baseDescription || '';

  const prefix = baseDescription ? `${baseDescription.trim()}\n\n` : '';
  return `${prefix}Cele śledcze:\n${lines.join('\n')}`;
}

/**
 * Normalizuje timestamp do liczby ms lub undefined.
 */
function normalizeTimestamp(ts: unknown): number | undefined {
  if (typeof ts === 'number' && !Number.isNaN(ts)) return ts;
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (ts instanceof Date && !Number.isNaN(ts.getTime())) {
    return ts.getTime();
  }
  return undefined;
}

/**
 * Główny konwerter: przekształca tablicę starych wpisów JournalEntry/ExtendedJournalEntry
 * na kanoniczną strukturę InvestigatorDossier.
 */
export function migrateLegacyJournalToDossier(
  legacyEntries?: unknown,
  existingDossier?: Partial<InvestigatorDossier> | null
): InvestigatorDossier {
  const initialClues: ClueEntry[] = [];
  if (Array.isArray(existingDossier?.clues)) {
    const seenClueTitles = new Set<string>();
    for (const c of existingDossier.clues) {
      if (!isClueEntry(c)) continue;
      if (isVisualPromptLeak(c.title) || isVisualPromptLeak(c.description)) continue;
      const norm = normalizeEntityTitle(c.title);
      if (norm && seenClueTitles.has(norm)) continue;
      if (norm) seenClueTitles.add(norm);
      initialClues.push(c);
    }
  }

  const initialLocations: LocationDossierEntry[] = [];
  if (Array.isArray(existingDossier?.locations)) {
    const seenLocs = new Set<string>();
    for (const l of existingDossier.locations) {
      if (!isLocationDossierEntry(l)) continue;
      if (isVisualPromptLeak(l.name) || isVisualPromptLeak(l.description)) continue;
      const cleanName = sanitizeLocationName(l.name);
      if (!cleanName) continue;
      const lower = cleanName.toLowerCase();
      if (seenLocs.has(lower)) continue;
      seenLocs.add(lower);
      initialLocations.push({ ...l, name: cleanName });
    }
  }

  const result: InvestigatorDossier = {
    clues: initialClues,
    npcs: Array.isArray(existingDossier?.npcs) ? [...existingDossier.npcs.filter(isNpcDossierEntry)] : [],
    locations: initialLocations,
    notes: Array.isArray(existingDossier?.notes) ? [...existingDossier.notes.filter(isPlayerNoteEntry)] : [],
    lastUpdated: existingDossier?.lastUpdated || new Date().toISOString(),
  };

  // Uzupełnij proweniencję dla istniejących poszlak ze starych zapisów gry
  result.clues.forEach((c) => {
    if (!c.provenance) {
      c.provenance = inferClueProvenance(c.title, c.description, c.category);
    }
  });

  if (!Array.isArray(legacyEntries)) {
    return result;
  }

  const clueIds = new Set(result.clues.map((c) => c.id));
  const npcIds = new Set(result.npcs.map((n) => n.id));
  const locationIds = new Set(result.locations.map((l) => l.id));
  const noteIds = new Set(result.notes.map((p) => p.id));

  legacyEntries.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') return;
    const entry = raw as LegacyEntryLike;

    const baseId = entry.id ? String(entry.id) : `migrated_${index}`;
    const entryType = (entry.type || '').toLowerCase();
    const tags = Array.isArray(entry.tags)
      ? entry.tags.map(String).filter(Boolean)
      : [];

    const inGameDate = entry.inGameDate || entry.date;
    const timestamp = normalizeTimestamp(entry.timestamp);

    // 1. Postacie / NPC
    if (
      entryType === 'npc' ||
      entryType === 'encyclopedia_character' ||
      (entry.metadata?.npcName && entryType !== 'quest' && entryType !== 'clue')
    ) {
      const npcTargetName = (entry.metadata?.npcName || entry.title || '').trim().toLowerCase();
      const alreadyExists =
        npcIds.has(baseId) ||
        (Boolean(npcTargetName) &&
          result.npcs.some((n) => n.name.trim().toLowerCase() === npcTargetName));

      if (!alreadyExists) {
        const relationship: NpcRelationshipStatus = tags.includes('wrogi') || tags.includes('hostile')
          ? 'hostile'
          : tags.includes('przyjazny') || tags.includes('friendly')
            ? 'friendly'
            : tags.includes('podejrzany') || tags.includes('suspicious')
              ? 'suspicious'
              : 'unknown';

        let npcLocation = entry.metadata?.locationName;
        for (const tag of tags) {
          const lowerTag = tag.toLowerCase();
          if (lowerTag.startsWith('lokacja:') || lowerTag.startsWith('location:') || lowerTag.startsWith('miejsce:')) {
            npcLocation = npcLocation || tag.substring(tag.indexOf(':') + 1).trim();
          }
        }

        const npc: NpcDossierEntry = {
          id: baseId,
          name: entry.metadata?.npcName || entry.title || 'Nieznany NPC',
          occupation: entry.category,
          firstImpression: entry.content || '',
          keyInformation: entry.investigatorInsight,
          relationshipStatus: relationship,
          location: npcLocation,
          avatarUrl: entry.imageUrl || entry.metadata?.imageUrl,
          tags,
          inGameDate,
          timestamp,
          sourceJournalEntryId: entry.id,
        };
        result.npcs.push(npc);
        npcIds.add(baseId);
      }
      return;
    }

    // 2. Lokacje / Miejsca
    if (
      entryType === 'location' ||
      entryType === 'encyclopedia_location' ||
      (entry.metadata?.locationName && entryType !== 'quest' && entryType !== 'clue')
    ) {
      const locTargetName = (entry.metadata?.locationName || entry.title || '').trim().toLowerCase();
      const alreadyExists =
        locationIds.has(baseId) ||
        (Boolean(locTargetName) &&
          result.locations.some((l) => l.name.trim().toLowerCase() === locTargetName));

      if (!alreadyExists) {
        const loc: LocationDossierEntry = {
          id: baseId,
          name: entry.metadata?.locationName || entry.title || 'Nieznana lokacja',
          addressOrRegion: entry.category,
          searchStatus: 'partially_searched',
          description: entry.content || '',
          tags,
          imageUrl: entry.imageUrl || entry.metadata?.imageUrl,
          inGameDate,
          timestamp,
          sourceJournalEntryId: entry.id,
        };
        result.locations.push(loc);
        locationIds.add(baseId);
      }
      return;
    }

    // 3. Własne notatki gracza
    if (entryType === 'note' || entryType === 'player_note') {
      if (!noteIds.has(baseId)) {
        const note: PlayerNoteEntry = {
          id: baseId,
          title: entry.title || 'Notatka badacza',
          content: entry.content || '',
          tags,
          inGameDate,
          timestamp,
          sourceJournalEntryId: entry.id,
        };
        result.notes.push(note);
        noteIds.add(baseId);
      }
      return;
    }

    // 4. Poszlaki, dowody, dawne questy i odkrycia
    const isCaseIntro =
      entryType === 'scene' ||
      entryType === 'case' ||
      entryType === 'case_file' ||
      entryType === 'objective' ||
      entryType === 'mission' ||
      (entry.title || '').toLowerCase().trim() === 'początek śledztwa' ||
      (entry.title || '').toLowerCase().trim() === 'beginning the investigation' ||
      (entry.title || '').toLowerCase().trim() === 'beginning of the investigation';

    if (isCaseIntro) {
      return;
    }

    if (
      isVisualPromptLeak(entry.title || '') ||
      isVisualPromptLeak(entry.content || '')
    ) {
      return;
    }

    const normEntryTitle = normalizeEntityTitle(entry.title || '');
    if (
      !clueIds.has(baseId) &&
      !result.clues.some(
        (clue) =>
          (entry.id && clue.sourceJournalEntryId === entry.id) ||
          (normEntryTitle && normalizeEntityTitle(clue.title) === normEntryTitle)
      )
    ) {
      let sourceNpc = entry.metadata?.npcName;
      let foundLocation = entry.metadata?.locationName;
      for (const tag of tags) {
        const lowerTag = tag.toLowerCase();
        if (lowerTag.startsWith('świadek:') || lowerTag.startsWith('witness:') || lowerTag.startsWith('npc:')) {
          sourceNpc = sourceNpc || tag.substring(tag.indexOf(':') + 1).trim();
        } else if (lowerTag.startsWith('lokacja:') || lowerTag.startsWith('location:') || lowerTag.startsWith('miejsce:')) {
          foundLocation = foundLocation || tag.substring(tag.indexOf(':') + 1).trim();
        }
      }

      const clue: ClueEntry = {
        id: baseId,
        title: entry.title || 'Nieopisana poszlaka',
        description: appendObjectivesToDescription(entry.content || '', entry.objectives),
        category: inferClueCategory(entry),
        status: inferClueStatus(entry),
        provenance: entry.provenance || inferClueProvenance(entry.title || '', entry.content || '', inferClueCategory(entry)),
        sourceNpc,
        foundLocation,
        inGameDate,
        timestamp,
        investigatorInsight: entry.investigatorInsight,
        tags,
        imageUrl: entry.imageUrl || entry.metadata?.imageUrl,
        isKeyClue: tags.includes('kluczowa') || tags.includes('core') || tags.includes('key'),
        sourceJournalEntryId: entry.id,
      };
      result.clues.push(clue);
      clueIds.add(baseId);
    }
  });

  linkClueNpcLocation(result);
  return result;
}

export function ensureCharacterDossier<
  T extends {
    journal?: unknown[];
    equipment?: unknown[];
    investigatorDossier?: InvestigatorDossier;
  }
>(
  character: T
): T & { investigatorDossier: InvestigatorDossier } {
  // Deduplikacja ekwipunku postaci i odfiltrowanie omyłkowych pozycji poszlak (np. postaci NPC lub wycieków promptów)
  if (Array.isArray(character.equipment)) {
    const seenEq = new Set<string>();
    character.equipment = character.equipment.filter((item: unknown) => {
      if (!item || typeof item !== 'object' || !('name' in item)) return false;
      const itemName = (item as { name?: unknown }).name;
      if (typeof itemName !== 'string' || !itemName) return false;
      if (isVisualPromptLeak(itemName)) return false;
      const isPerson =
        /\b(uciekinier|świadek|swiadek|podejrzan|kierowca|mechanik|postać|postac|człowiek|czlowiek|mężczyzna|mezczyzna|kobieta|profesor|doktor|ofiara|kapłan|kaplan|strażnik|straznik|przechodzień|przechodzien|badacz|detektyw|konstruktor|inżynier|inzynier)\b/i.test(
          itemName
        );
      if (isPerson) return false;
      const norm = normalizeEntityTitle(itemName);
      if (norm && seenEq.has(norm)) return false;
      if (norm) seenEq.add(norm);
      return true;
    });
  }
  if (
    character.investigatorDossier &&
    Array.isArray(character.investigatorDossier.clues) &&
    Array.isArray(character.investigatorDossier.npcs) &&
    Array.isArray(character.investigatorDossier.locations) &&
    Array.isArray(character.investigatorDossier.notes)
  ) {
    // Sanitizacja i deduplikacja istniejących poszlak w dossier
    const seenClueTitles = new Set<string>();
    const cleanedClues: ClueEntry[] = [];
    for (const c of character.investigatorDossier.clues) {
      if (!isClueEntry(c)) continue;
      if (isVisualPromptLeak(c.title) || isVisualPromptLeak(c.description)) continue;
      const norm = normalizeEntityTitle(c.title);
      if (norm && seenClueTitles.has(norm)) continue;
      if (norm) seenClueTitles.add(norm);
      cleanedClues.push(
        !c.provenance
          ? { ...c, provenance: inferClueProvenance(c.title, c.description, c.category) }
          : c
      );
    }

    // Sanitizacja lokacji w dossier
    const seenLocs = new Set<string>();
    const cleanedLocations: LocationDossierEntry[] = [];
    for (const l of character.investigatorDossier.locations) {
      if (!isLocationDossierEntry(l)) continue;
      if (isVisualPromptLeak(l.name) || isVisualPromptLeak(l.description)) continue;
      const cleanName = sanitizeLocationName(l.name);
      if (!cleanName) continue;
      const lower = cleanName.toLowerCase();
      if (seenLocs.has(lower)) continue;
      seenLocs.add(lower);
      cleanedLocations.push({ ...l, name: cleanName });
    }

    const baseDossier: InvestigatorDossier = {
      ...character.investigatorDossier,
      clues: cleanedClues,
      locations: cleanedLocations,
    };

    linkClueNpcLocation(baseDossier);

    // Jeśli postać ma też wpisy w journal, dołącz ewentualne brakujące
    if (Array.isArray(character.journal) && character.journal.length > 0) {
      return {
        ...character,
        investigatorDossier: migrateLegacyJournalToDossier(
          character.journal,
          baseDossier
        ),
      };
    }
    return {
      ...character,
      investigatorDossier: baseDossier,
    };
  }

  return {
    ...character,
    investigatorDossier: migrateLegacyJournalToDossier(
      character.journal,
      character.investigatorDossier || null
    ),
  };
}
