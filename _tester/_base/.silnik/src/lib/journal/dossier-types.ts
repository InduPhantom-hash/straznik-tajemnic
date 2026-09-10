/**
 * Definicje typów dla Akt Śledczych i Notesu Badacza (Investigator's Dossier).
 * Zgodne z oficjalnymi zasadami Call of Cthulhu 7th Edition (RAW).
 * Zastępuje anachroniczne koncepcje cRPG (questy, objectives, questStatus).
 */

export type ClueCategory = 'forensic' | 'document' | 'testimony' | 'occult';

export type ClueStatus = 'unconfirmed' | 'confirmed' | 'disproven' | 'superseded';

export type ClueDiscoveryStatus = 'unrevealed' | 'discovered' | 'verified';
export type EpistemicLayerType = 'keeper_truth' | 'player_clue';

/**
 * Wektor dramatyczny M.I.C.E. Quotient (Orson Scott Card / Mary Robinette Kowal):
 * - milieu: konflikt przestrzeni, uwięzienie, droga ucieczki lub zabezpieczenie lokacji
 * - inquiry: pytanie śledcze, poszlaka, zagadka do rozwikłania
 * - character: motywacja wewnętrzna, tożsamość, lęk moralny lub przemiana postaci
 * - event: zachwianie porządku świata, kataklizm, rytuał, wyścig z czasem
 */
export type MiceQuotientType = 'milieu' | 'inquiry' | 'character' | 'event';

export interface ClueEntry {
  id: string;
  title: string;
  description: string;
  category: ClueCategory;
  status: ClueStatus;
  /** Status odkrycia poszlaki w ramach epistemicznej mgły wojny (Concordia pattern) */
  discoveryStatus?: ClueDiscoveryStatus;
  /** Warstwa epistemiczna: obiektywna prawda MG vs wiedza badacza */
  epistemicLayer?: EpistemicLayerType;
  /** Identyfikator poszlaki unieważniającej (Arcanum Benchmark 2026: Fact Supersession) */
  supersededBy?: string;
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
  /** Powiązane identyfikatory węzłów dowodowych (Alexandrian Three-Clue Rule & Node Network) */
  linkedNodeIds?: string[];
  /** Alternatywne tropy prowadzące do tej samej konkluzji (eliminacja chokepointów) */
  alternativeClueTrails?: string[];
  /** Wektor dramatyczny M.I.C.E. Quotient */
  miceType?: MiceQuotientType;
  /** Kluczowe pytanie lub cel w ramach wektora M.I.C.E. */
  miceObjective?: string;
  sourceJournalEntryId?: string;
}

export type NpcRelationshipStatus =
  | 'friendly'
  | 'neutral'
  | 'hostile'
  | 'suspicious'
  | 'fanatical'
  | 'unknown'
  | 'deceased';

export interface NpcDossierEntry {
  id: string;
  name: string;
  occupation?: string;
  firstImpression?: string;
  keyInformation?: string;
  relationshipStatus: NpcRelationshipStatus;
  /** Nastawienie psychologiczne NPC (blokada uległości bez testu socjalnego) */
  disposition?: 'friendly' | 'neutral' | 'suspicious' | 'hostile' | 'fanatical';
  location?: string;
  locationId?: string;
  avatarUrl?: string;
  tags?: string[];
  notes?: string;
  inGameDate?: string;
  timestamp?: number;
  sourceJournalEntryId?: string;

  // === Trójwymiarowy profil postaci według Lajosa Egriego (The Art of Dramatic Writing) ===
  /** Wymiar fizjologiczny: cecha wyglądu, tik, manieryzm fizyczny, postawa */
  physiologicalDetail?: string;
  /** Wymiar socjologiczny: status społeczny, klasa, pozycja siły, przynależność */
  sociologicalStatus?: string;
  /** Wymiar psychologiczny: ukryta agenda, prywatny lęk, słabość moralna */
  psychologicalAgenda?: string;
}

export type LocationSearchStatus =
  | 'unvisited'
  | 'partially_searched'
  | 'thoroughly_searched';

/**
 * 7 Typów Zagadek Zamkniętego Pokoju (John Dickson Carr - The Hollow Man, 1935)
 */
export type LockedRoomMysteryType =
  | 'accident_feigned_as_murder' // Typ 1: Fatalny wypadek pozorowany na zabójstwo
  | 'toxic_gas_or_paroxysm'      // Typ 2: Trujący gaz lub szał niszczący otoczenie
  | 'mechanical_trap'            // Typ 3: Mechaniczna pułapka (zegar, rygiel)
  | 'suicide_framed_as_murder'   // Typ 4: Samobójstwo znikającą bronią (np. sopel)
  | 'victim_impersonation'       // Typ 5: Sprawca udający ofiarę po zabójstwie
  | 'strike_from_outside'        // Typ 6: Strzał/atak z zewnątrz (lufcik, szczelina)
  | 'strike_during_break_in';    // Typ 7: Atak w trakcie wyważania drzwi w chaosie

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

  // === Zagadka Zamkniętego Pokoju (John Dickson Carr) ===
  lockedRoomMystery?: {
    type: LockedRoomMysteryType;
    anomalyDescription: string;
    investigationHint?: string;
  };
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
