/**
 * Typy domenowe magii i tomisk Mitów w oparciu o:
 * - Księga Strażnika CoC 7e RAW (Rozdział 9 i 11)
 * - Wielki Grymuar Magii Mitów Cthulhu (The Grand Grimoire of Cthulhu Mythos Magic)
 * - Poradniki MG (Seth Skorkowsky: Part 8 - The Mythos & Magic)
 */

import type { RollOutcome } from '@/lib/dice-utils';

export interface MagicSourceRef {
  sourceId: 'keeper-rulebook-7e' | 'grand-grimoire' | 'custom';
  title: string;
  edition: '7e';
  page: number;
  pagePl?: number;
  pageEn?: number;
  pdfPage?: number;
  language: 'pl' | 'en';
}

export interface CatastropheEffect {
  id: number;
  tier: 'minor' | 'major';
  name: { pl: string; en: string };
  description: { pl: string; en: string };
  mechanicalEffect?: { pl: string; en: string };
}

export interface CastingCatastrophe {
  costMultiplier: number;
  mpDeficitPaidWithHp: number;
  effect: CatastropheEffect;
}

export type SpellCategory =
  | 'combat'
  | 'protective'
  | 'summon'
  | 'contact'
  | 'banish'
  | 'gate'
  | 'influence'
  | 'folk'
  | 'other';

export interface SpellCastingTime {
  type: 'instantaneous' | 'rounds' | 'minutes' | 'hours' | 'days';
  value: { pl: string; en: string };
  rounds?: number;
  hours?: number;
  dexBonus?: number; // np. +50 DEX dla natychmiastowych w kolejce inicjatywy
}

export interface SpellRequirements {
  components?: { pl: string[]; en: string[] };
  location?: { pl: string; en: string };
  conditions?: { pl: string; en: string };
  sacrifice?: { pl: string; en: string };
}

export interface DeeperMagicVariant {
  name: { pl: string; en: string };
  description: { pl: string; en: string };
  costMultiplier?: number;
  effectMod: { pl: string; en: string };
}

export interface SpellDefinition {
  id: string; // stabilny kebab-case, np. 'wither-limb'
  name: string; // kanoniczna nazwa
  namePl: string;
  nameEn: string;
  diegeticNames: {
    pl: string[];
    en: string[];
  };
  category: SpellCategory;
  // Koszty bazowe (liczbowe lub wzór kości, np. 8 lub '1k6')
  mpCost: number | string;
  sanCost: number | string;
  hpCost?: number;
  powCost?: number; // trwała redukcja POW (np. Znak Starszych Bogów: 10 POW)
  castingTime: SpellCastingTime;
  range: { pl: string; en: string };
  duration: { pl: string; en: string };
  requirements?: SpellRequirements;
  opposedRoll?: 'pow' | null;
  deeperMagic?: DeeperMagicVariant;
  description: { pl: string; en: string };
  source: MagicSourceRef;
  definitionVersion: number;
}

export interface TomeDefinition {
  id: string; // np. 'necronomicon-latin'
  title: string;
  titlePl: string;
  titleEn: string;
  author?: string;
  language: string;
  languageDifficulty: 'regular' | 'hard' | 'extreme';
  initialReading: {
    hours: number;
    sanCost: number | string;
    cmi: number; // Cthulhu Mythos Initial
  };
  fullStudy: {
    weeks: number;
    sanCost: number | string;
    cmf: number; // Cthulhu Mythos Final
    mr: number; // Mythos Rating (maksymalny cap)
  };
  spells: string[]; // Identyfikatory zawartych zaklęć
  source: MagicSourceRef;
  definitionVersion: number;
}

export interface KnownSpellEntry {
  spellId: string;
  learnedAt: string; // ISO data
  source: 'tome' | 'teacher' | 'entity' | 'preset';
  sourceId?: string;
  isFirstCastDone: boolean; // czy wykonano już pierwsze rzucenie (Hard POW)
  pushedRollUsed?: boolean;
  deeperUnlocked: boolean; // odblokowane przez rzucenie w stanie obłędu (RAW)
  knownAlias?: string; // diegetyczna nazwa znana badaczowi
  definitionVersion: number;
}

export interface TomeStudyEntry {
  tomeId: string;
  initialReadingDone: boolean;
  fullStudyDone: boolean;
  studyCount: number; // liczba pełnych lektur (każda kolejna x2 czas)
  completedWeeks: number;
  cmiAwarded: number;
  cmfAwarded: number;
  sanLossPaid: number;
  definitionVersion: number;
}

export interface CharacterMagicState {
  schemaVersion: number;
  belief: 'skeptic' | 'believer';
  beliefConversionDate?: string;
  beliefConversionReason?: string;
  // U sceptyka strata SAN z lektury jest odkładana dopóki nie uwierzy lub nie spotka bytu Mitów
  deferredSanLoss: number;
  knownSpells: Record<string, KnownSpellEntry>;
  tomeStudies: Record<string, TomeStudyEntry>;
}

// === INTERFEJSY ROZSTRZYGANIA (SILNIK) ===

export interface CastingRequest {
  casterId: string;
  casterName: string;
  casterPow: number;
  casterMp: number;
  casterHp: number;
  casterSan: number;
  casterMythos?: number;
  isInsane?: boolean; // temporary lub indefinite insanity
  belief: 'skeptic' | 'believer';
  spellId: string;
  isFirstCastOverride?: boolean; // wymuszenie testu jeśli brak w knownSpells
  isPush?: boolean; // czy to forsowanie po porażce pierwszego rzucenia
  target?: {
    id?: string;
    name: string;
    pow: number;
  };
  allowHpConversion?: boolean; // zgoda gracza na pobranie brakujących MP z HP (1:1)
}

export interface CastingResolution {
  success: boolean;
  spellId: string;
  isFirstCast: boolean;
  hardPowThreshold?: number;
  firstCastRoll?: {
    roll: number;
    threshold: number;
    outcome?: RollOutcome;
    success: boolean;
    isPushed?: boolean;
    pushedFailedCatastrophe?: boolean;
  };
  catastrophe?: CastingCatastrophe;
  opposedRoll?: {
    casterRoll: number;
    casterSuccessLevel: number; // 0=fail, 1=regular, 2=hard, 3=extreme, 4=critical
    casterOutcome?: RollOutcome;
    casterName?: string;
    casterPow?: number;
    targetRoll: number;
    targetSuccessLevel: number;
    targetOutcome?: RollOutcome;
    targetName?: string;
    targetPow?: number;
    winner: 'caster' | 'target' | 'tie';
    casterPowImprovementEligible: boolean;
  };
  deeperUnlockedNow?: boolean;
  costPaid: {
    mp: number;
    hpFromMp: number;
    san: number;
    powPermanent: number;
  };
  statChanges: {
    mpDelta: number;
    hpDelta: number;
    sanDelta: number;
    powDelta: number;
  };
  characterUpdates: {
    isFirstCastDone: boolean;
    deeperUnlocked?: boolean;
  };
  message: {
    pl: string;
    en: string;
  };
  gmNarrativeContext: string;
}

export interface InitialReadingRequest {
  investigatorLanguageSkill: number;
  languageDifficulty: 'regular' | 'hard' | 'extreme';
  tomeId: string;
  belief: 'skeptic' | 'believer';
}

export interface InitialReadingResolution {
  success: boolean;
  languageRoll: {
    roll: number;
    threshold: number;
    outcome?: RollOutcome;
    success: boolean;
  };
  hoursSpent: number;
  cmiGained: number;
  sanLoss: number;
  deferredSanLoss: number; // jeśli sceptyk
  spellsDiscovered: string[];
  message: {
    pl: string;
    en: string;
  };
}

export interface FullStudyRequest {
  tomeId: string;
  investigatorSan: number;
  investigatorMythos: number;
  studyCount: number; // która to pełna lektura (0 dla pierwszej)
  belief: 'skeptic' | 'believer';
  allowSanSaveHouseRule?: boolean; // opcjonalny house rule Setha Skorkowsky'ego
}

export interface FullStudyResolution {
  weeksRequired: number;
  sanRoll: {
    roll: number;
    sanTarget: number;
    outcome?: RollOutcome;
    success: boolean;
  };
  sanLoss: number;
  deferredSanLoss: number;
  cmfGained: number;
  mythosCappedAtMr: boolean;
  message: {
    pl: string;
    en: string;
  };
}

export interface ReferenceCheckRequest {
  tomeId: string;
  topic?: string;
}

export interface ReferenceCheckResolution {
  hoursSpent: number;
  roll: number;
  mythosRating: number;
  outcome?: RollOutcome;
  success: boolean;
  message: {
    pl: string;
    en: string;
  };
}

export interface BeliefConversionResolution {
  oldBelief: 'skeptic';
  newBelief: 'believer';
  sanLossApplied: number;
  intCheckRequired: boolean; // jeśli strata >= 5 SAN
  message: {
    pl: string;
    en: string;
  };
  gmNarrativeContext: string;
}

export interface SpontaneousMagicRequest {
  casterName: string;
  casterMythos: number;
  casterMp: number;
  casterHp: number;
  desiredEffect: string;
  difficulty: 'regular' | 'hard' | 'extreme';
  estimatedMpCost: number;
  estimatedSanCost: number;
  allowHpConversion?: boolean;
  target?: {
    name: string;
    pow: number;
  };
}

export interface SpontaneousMagicResolution {
  success: boolean;
  mythosRoll: {
    roll: number;
    threshold: number;
    success: boolean;
  };
  opposedRoll?: {
    casterRoll: number;
    targetRoll: number;
    winner: 'caster' | 'target' | 'tie';
  };
  costPaid: {
    mp: number;
    hpFromMp: number;
    san: number;
  };
  statChanges: {
    mpDelta: number;
    hpDelta: number;
    sanDelta: number;
  };
  message: {
    pl: string;
    en: string;
  };
  gmNarrativeContext: string;
}

// === OBRONA PRZED WROGĄ MAGIĄ (OPPOSED MAGIC DEFENSE - CoC 7e RAW) ===

export interface OpposedMagicEventData {
  id: string;
  attackerName: string;
  attackerPow: number;
  spellId?: string;
  spellName?: string;
  characterName?: string;
  characterId?: string;
  description?: string;
}

export interface OpposedDefenseRequest {
  attackerName: string;
  attackerPow: number;
  spellId?: string;
  spellName?: string;
  defenderId: string;
  defenderName: string;
  defenderPow: number;
  defenderHp?: number;
  defenderSan?: number;
}

export interface OpposedDefenseResolution {
  success: boolean; // czy obrona się powiodła (obrońca odparł czar)
  attackerName: string;
  attackerPow: number;
  defenderName: string;
  defenderPow: number;
  spellId?: string;
  spellName?: string;
  attackerRoll: number;
  attackerSuccessLevel: number;
  attackerOutcome?: RollOutcome;
  defenderRoll: number;
  defenderSuccessLevel: number;
  defenderOutcome?: RollOutcome;
  winner: 'attacker' | 'defender' | 'tie';
  defenderPowImprovementEligible: boolean;
  ruleOfLimitsApplied?: boolean;
  statChanges: {
    hpDelta: number;
    sanDelta: number;
    mpDelta: number;
  };
  message: {
    pl: string;
    en: string;
  };
  gmNarrativeContext: string;
}

// === NAUKA ZAKLĘĆ Z TOMU (LEARN SPELL FROM TOME - CoC 7e RAW str. 196) ===

export interface LearnSpellFromTomeRequest {
  investigatorName: string;
  investigatorInt: number;
  tomeId: string;
  spellId: string;
  isPush?: boolean;
}

export interface LearnSpellFromTomeResolution {
  success: boolean;
  weeksSpent: number;
  intRoll: {
    roll: number;
    threshold: number;
    outcome?: RollOutcome;
    success: boolean;
    isPushed?: boolean;
  };
  spellLearned: boolean;
  message: {
    pl: string;
    en: string;
  };
  gmNarrativeContext: string;
}
