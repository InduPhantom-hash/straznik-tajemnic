/**
 * Typy danych dla hierarchicznego generatora intrygi i scenariuszy (DeepMind Dramatron CoC 7e RAW).
 * 
 * 5 Zagnieżdżonych Etapów Dekompozycji:
 * 1. Logline & Ziarno Mitów (Mythos Premise)
 * 2. Dramatis Personae z Maskami (Lajos Egri 3D: fizjologia, socjologia, psychologia)
 * 3. Drzewo Poszlak i Graf Śledztwa (Alexandrian Three-Clue Rule & M.I.C.E. Quotient)
 * 4. Karty Lokacji (Topografia, progi zmysłowe i 7 typów zagadek zamkniętego pokoju Johna Dicksona Carra)
 * 5. Sceny, Beaty i Punkty Kulminacyjne (4 Akty Obłędu, progi SAN, testy umiejętności)
 */

import type {
  ClueCategory,
  LockedRoomMysteryType,
  MiceQuotientType,
  NpcRelationshipStatus,
} from '../journal/dossier-types';
import type { GraphConnection } from '../types';

export type DramatronEra = 'classic' | 'gaslight' | 'noir' | 'prl' | 'modern';
export type DramatronTone = 'purist' | 'pulp' | 'noir';

export type DramatronGenerationStageId =
  | 'premise'
  | 'cast'
  | 'clue_web'
  | 'locations'
  | 'scenes';

export interface DramatronStageStatus {
  id: DramatronGenerationStageId;
  label: string;
  isComplete: boolean;
  isRunning: boolean;
  summary?: string;
}

// ============================================================================
// ETAP 1: LOGLINE & ZIARNO MITÓW (MYTHOS PREMISE)
// ============================================================================

export interface DramatronPremise {
  id: string;
  title: string;
  logline: string;
  mythosEntity: string;
  anomalyType: string;
  centralMystery: string;
  era: DramatronEra;
  eraLabel: string;
  exactYear: string;
  location: string;
  country: string;
  tone: DramatronTone;
  investigatorHook: string;
  keeperTruthOverview: string;
  themes: string[];
}

// ============================================================================
// ETAP 2: DRAMATIS PERSONAE (SIATKA NPC Z MASKAMI - LAJOS EGRI 3D)
// ============================================================================

export interface DramatronNpc {
  id: string;
  name: string;
  occupation: string;
  firstImpression: string;
  relationshipStatus: NpcRelationshipStatus;
  disposition: 'friendly' | 'neutral' | 'suspicious' | 'hostile' | 'fanatical';

  // Profil Lajosa Egriego (The Art of Dramatic Writing)
  physiologicalDetail: string; // Wygląd, tik, manieryzm fizyczny, postawa
  sociologicalStatus: string;   // Klasa, status, pozycja siły, przynależność
  psychologicalAgenda: string;  // Ukryta agenda, prywatny lęk, słabość moralna

  // Podwójna tożsamość w intrydze CoC
  mask: string;                 // Publiczna rola prezentowana społeczeństwu
  secret: string;               // Mroczny sekret / uwikłanie w kult lub anomalię
  statsSummary: string;         // Blok cech CoC 7e RAW (STR, CON, SIZ, DEX, INT, POW, HP, SAN)
}

// ============================================================================
// ETAP 3: DRZEWO POSZLAK & GRAF ŚLEDZTWA (ALEXANDRIAN 3-CLUE & M.I.C.E.)
// ============================================================================

export interface DramatronClue {
  id: string;
  title: string;
  description: string;
  category: ClueCategory;
  isKeyClue: boolean;
  miceType: MiceQuotientType;
  miceObjective?: string;
  sourceNpcId?: string;
  foundLocationId?: string;
  leadsToNodeId: string; // Węzeł dedukcyjny / konkluzja, do której poszlaka prowadzi
  alternativeClueIds?: string[]; // Pozostałe poszlaki z trójki dowodowej (Reguła 3 Poszlak)
  insightHint?: string; // Podpowiedź przy udanym teście Wiedzy / Pomysłu (INT)
}

export interface DramatronTruthAnchor {
  culprit: string;
  motive: string;
  murderWeapon: string;
  keyAlibi: string;
  immutableFacts: string[];
}

export interface DramatronClueWeb {
  clues: DramatronClue[];
  connections: GraphConnection[];
  truthAnchor: DramatronTruthAnchor;
}

// ============================================================================
// ETAP 4: KARTY LOKACJI 1920s (TOPOGRAFIA, ZMYSŁY, CARR LOCKED ROOM)
// ============================================================================

export interface DramatronLocation {
  id: string;
  name: string;
  addressOrRegion: string;
  description: string;
  sensoryAtmosphere: string; // Zapach, dźwięk, światło, wilgotność
  sensoryIllusions?: string; // Omamy onejroidalne / załamanie percepcji (CoC 7e)
  clueIds: string[];
  lockedRoomMystery?: {
    type: LockedRoomMysteryType;
    anomalyDescription: string;
    investigationHint: string;
  };
}

// ============================================================================
// ETAP 5: SCENY, BEATY I PUNKTY KULMINACYJNE (4 AKTY OBŁĘDU)
// ============================================================================

export interface DramatronBeat {
  id: string;
  title: string;
  description: string;
  miceType?: MiceQuotientType;
  sanLossRisk?: string; // np. "1/1D4 SAN" lub "1D3/1D10 SAN"
  skillChecks?: string[]; // np. ["Spostrzegawczość", "Perswazja", "Okultyzm"]
  keyClueId?: string;
  outcome?: string;
}

export interface DramatronScene {
  id: string;
  title: string;
  act: 1 | 2 | 3 | 4; // 1: Wprowadzenie, 2: Śledztwo, 3: Konfrontacja, 4: Kulminacja/Upadek
  actLabel: string;
  locationId: string;
  npcIds: string[];
  description: string;
  beats: DramatronBeat[];
  clueIds: string[];
  isClimax?: boolean;
}

// ============================================================================
// KOMPLETNY PAKIET SCENARIUSZA DRAMATRON
// ============================================================================

export interface DramatronAdventure {
  version: string;
  generatedAt: string;
  premise: DramatronPremise;
  cast: DramatronNpc[];
  clueWeb: DramatronClueWeb;
  locations: DramatronLocation[];
  scenes: DramatronScene[];
}

export interface DramatronGenerationInput {
  theme?: string;
  era?: DramatronEra;
  exactYear?: string;
  location?: string;
  country?: string;
  tone?: DramatronTone;
  mythosEntity?: string;
  apiKey?: string;
  locale?: 'pl' | 'en';
}
