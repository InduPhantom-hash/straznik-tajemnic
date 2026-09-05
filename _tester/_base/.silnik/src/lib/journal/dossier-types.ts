/**
 * Definicje typów dla Akt Śledczych i Notesu Badacza (Investigator's Dossier).
 * Zgodne z oficjalnymi zasadami Call of Cthulhu 7th Edition (RAW).
 * Zastępuje anachroniczne koncepcje cRPG (questy, objectives, questStatus).
 */

export type ClueCategory = 'forensic' | 'document' | 'testimony' | 'occult';

export type ClueStatus = 'unconfirmed' | 'confirmed' | 'disproven';

export interface ClueEntry {
  id: string;
  title: string;
  description: string;
  category: ClueCategory;
  status: ClueStatus;
  sourceNpc?: string;
  sourceNpcId?: string;
  foundLocation?: string;
  foundLocationId?: string;
  inGameDate?: string;
  timestamp?: number;
  /** Wniosek Badacza / Dedukcja postaci (np. z rzutu na Pomysł / INT) */
  investigatorInsight?: string;
  tags?: string[];
  imageUrl?: string;
  /** Czy poszlaka stanowi kluczowy element śledztwa (Core Clue RAW) */
  isKeyClue?: boolean;
  sourceJournalEntryId?: string;
}

export type NpcRelationshipStatus =
  | 'friendly'
  | 'neutral'
  | 'hostile'
  | 'suspicious'
  | 'unknown'
  | 'deceased';

export interface NpcDossierEntry {
  id: string;
  name: string;
  occupation?: string;
  firstImpression?: string;
  keyInformation?: string;
  relationshipStatus: NpcRelationshipStatus;
  location?: string;
  locationId?: string;
  avatarUrl?: string;
  tags?: string[];
  notes?: string;
  inGameDate?: string;
  timestamp?: number;
  sourceJournalEntryId?: string;
}

export type LocationSearchStatus =
  | 'unvisited'
  | 'partially_searched'
  | 'thoroughly_searched';

export interface LocationDossierEntry {
  id: string;
  name: string;
  addressOrRegion?: string;
  searchStatus: LocationSearchStatus;
  discoveredClueIds?: string[];
  description?: string;
  tags?: string[];
  imageUrl?: string;
  inGameDate?: string;
  timestamp?: number;
  sourceJournalEntryId?: string;
}

export interface PlayerNoteEntry {
  id: string;
  title: string;
  content: string;
  linkedClueIds?: string[];
  linkedNpcIds?: string[];
  linkedLocationIds?: string[];
  tags?: string[];
  inGameDate?: string;
  timestamp?: number;
  sourceJournalEntryId?: string;
}

export interface InvestigatorDossier {
  clues: ClueEntry[];
  npcs: NpcDossierEntry[];
  locations: LocationDossierEntry[];
  notes: PlayerNoteEntry[];
  lastUpdated?: string;
}

/**
 * Zwraca nową, pustą strukturę akt śledczych.
 */
export function createEmptyDossier(): InvestigatorDossier {
  return {
    clues: [],
    npcs: [],
    locations: [],
    notes: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Type guard sprawdzający, czy obiekt to ClueEntry.
 */
export function isClueEntry(item: unknown): item is ClueEntry {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.title === 'string' &&
    typeof c.category === 'string' &&
    typeof c.status === 'string'
  );
}

/**
 * Type guard sprawdzający, czy obiekt to NpcDossierEntry.
 */
export function isNpcDossierEntry(item: unknown): item is NpcDossierEntry {
  if (!item || typeof item !== 'object') return false;
  const n = item as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    typeof n.name === 'string' &&
    typeof n.relationshipStatus === 'string'
  );
}

/**
 * Type guard sprawdzający, czy obiekt to LocationDossierEntry.
 */
export function isLocationDossierEntry(item: unknown): item is LocationDossierEntry {
  if (!item || typeof item !== 'object') return false;
  const l = item as Record<string, unknown>;
  return (
    typeof l.id === 'string' &&
    typeof l.name === 'string' &&
    typeof l.searchStatus === 'string'
  );
}

/**
 * Type guard sprawdzający, czy obiekt to PlayerNoteEntry.
 */
export function isPlayerNoteEntry(item: unknown): item is PlayerNoteEntry {
  if (!item || typeof item !== 'object') return false;
  const p = item as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.content === 'string'
  );
}
