/**
 * Deterministyczny silnik innych obrażeń Call of Cthulhu 7e.
 * Źródło prawdy: Keeper Rulebook, tabela Other Forms of Damage.
 */

import {
  type RollOutcome,
  evaluateSkillCheck,
  rollD100WithBonus,
  rollDiceFormula,
} from '@/lib/dice-utils';

export type HazardType = 'falling' | 'fire' | 'acid' | 'suffocation' | 'drowning' | 'poison';
export type FallingSurface = 'hard' | 'normal' | 'soft' | 'water';
export type FireIntensity = 'minor' | 'moderate' | 'major' | 'inferno';
export type AcidPotency = 'splash' | 'immersion';
export type AirlessKind = 'smoke' | 'water' | 'vacuum';
export type PoisonSeverity = 'mild' | 'strong' | 'lethal';

export interface PoisonDefinition {
  id: PoisonSeverity;
  nameKey: 'poisonMild' | 'poisonStrong' | 'poisonLethal';
  damageFormula: '1d10' | '2d10' | '4d10';
  effectKey: 'poisonMildEffect' | 'poisonStrongEffect' | 'poisonLethalEffect';
}

export const COC7E_POISONS: PoisonDefinition[] = [
  { id: 'mild', nameKey: 'poisonMild', damageFormula: '1d10', effectKey: 'poisonMildEffect' },
  { id: 'strong', nameKey: 'poisonStrong', damageFormula: '2d10', effectKey: 'poisonStrongEffect' },
  { id: 'lethal', nameKey: 'poisonLethal', damageFormula: '4d10', effectKey: 'poisonLethalEffect' },
];

const LEGACY_POISON_SEVERITY: Record<string, PoisonSeverity> = {
  arsenic: 'strong', arszenik: 'strong', cyanide: 'lethal', cyjanek: 'lethal',
  strychnine: 'lethal', strychnina: 'lethal', curare: 'lethal', kurara: 'lethal',
  snake_venom: 'strong', 'snake-venom': 'strong', jad_węża: 'strong',
  mustard_gas: 'strong', gaz_musztardowy: 'strong', chloroform: 'mild',
  chloroformium: 'mild', belladonna: 'strong', carbon_monoxide: 'strong',
  tlenek_węgla: 'strong',
};

export function normalizePoisonSeverity(value?: string, legacyPotency?: number): PoisonSeverity | null {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'mild' || normalized === 'lagodna' || normalized === 'łagodna') return 'mild';
  if (normalized === 'strong' || normalized === 'silna') return 'strong';
  if (normalized === 'lethal' || normalized === 'smiertelna' || normalized === 'śmiertelna') return 'lethal';
  if (normalized && LEGACY_POISON_SEVERITY[normalized]) return LEGACY_POISON_SEVERITY[normalized];
  if (legacyPotency !== undefined && Number.isFinite(legacyPotency)) {
    if (legacyPotency >= 80) return 'lethal';
    if (legacyPotency >= 50) return 'strong';
    return 'mild';
  }
  return null;
}

export interface FallingResolution {
  heightMeters: number;
  surface: FallingSurface;
  baseDiceCount: number;
  damageDie: 3 | 6 | 10;
  damageFormula: string;
  jumpRoll?: { total: number; skillValue: number; outcome: RollOutcome; diceReduced: number };
  effectiveDiceCount: number;
  damageRolled: number;
  finalDamage: number;
  isTerminal: boolean;
}

/** Jedna kość za każde rozpoczęte 3 m, maksymalnie 10 kości. */
export function resolveFallingDamage(
  heightMeters: number,
  options: {
    surface?: FallingSurface;
    jumpSkillValue?: number;
    jumpRollTotal?: number;
    skipJumpCheck?: boolean;
    fixedDamageRoll?: number;
  } = {}
): FallingResolution {
  const surface = options.surface ?? 'normal';
  const cleanHeight = Math.max(1, Number.isFinite(heightMeters) ? heightMeters : 1);
  const baseDiceCount = Math.min(10, Math.ceil(cleanHeight / 3));
  const damageDie: 3 | 6 | 10 = surface === 'hard' ? 10 : surface === 'normal' ? 6 : 3;

  let jumpRoll: FallingResolution['jumpRoll'];
  let diceReduced = 0;
  if (!options.skipJumpCheck && (options.jumpSkillValue ?? 0) > 0) {
    const skillValue = Math.max(1, options.jumpSkillValue ?? 1);
    const total = options.jumpRollTotal ?? rollD100WithBonus(0).total;
    const outcome = evaluateSkillCheck(total, skillValue);
    if (['critical', 'extreme', 'hard', 'regular'].includes(outcome)) diceReduced = 1;
    jumpRoll = { total, skillValue, outcome, diceReduced: Math.min(baseDiceCount, diceReduced) };
  }

  const effectiveDiceCount = Math.max(0, baseDiceCount - diceReduced);
  const damageFormula = effectiveDiceCount > 0 ? `${effectiveDiceCount}d${damageDie}` : '0';
  const damageRolled = effectiveDiceCount === 0
    ? 0
    : options.fixedDamageRoll ?? rollDiceFormula(damageFormula)?.total ?? 0;

  return {
    heightMeters: cleanHeight,
    surface,
    baseDiceCount,
    damageDie,
    damageFormula,
    jumpRoll,
    effectiveDiceCount,
    damageRolled,
    finalDamage: damageRolled,
    isTerminal: cleanHeight >= 30,
  };
}

export interface FireResolution {
  intensity: FireIntensity;
  rounds: number;
  damageFormula: string;
  damageRolled: number;
  ignoresArmor: true;
  descriptionKey: string;
}

export function resolveFireDamage(
  intensity: FireIntensity,
  rounds: number = 1,
  fixedDamage?: number
): FireResolution {
  const safeRounds = Math.max(1, Math.round(rounds));
  const severe = intensity === 'major' || intensity === 'inferno';
  const perRoundDice = severe ? '1d10' : '1d6';
  let damageRolled = fixedDamage ?? 0;
  if (fixedDamage === undefined) {
    for (let round = 0; round < safeRounds; round += 1) {
      damageRolled += rollDiceFormula(perRoundDice)?.total ?? 0;
    }
  }
  return {
    intensity,
    rounds: safeRounds,
    damageFormula: `${safeRounds}x(${perRoundDice})`,
    damageRolled,
    ignoresArmor: true,
    descriptionKey: severe ? 'fireSevere' : 'fireModerate',
  };
}

export interface AcidResolution {
  potency: AcidPotency;
  damageFormula: '1d3' | '1d6';
  damageRolled: number;
  ignoresArmor: true;
}

export function resolveAcidDamage(potency: AcidPotency, fixedDamage?: number): AcidResolution {
  const damageFormula = potency === 'splash' ? '1d3' : '1d6';
  return {
    potency,
    damageFormula,
    damageRolled: fixedDamage ?? rollDiceFormula(damageFormula)?.total ?? 0,
    ignoresArmor: true,
  };
}

export interface SuffocationResolution {
  conValue: number;
  roundWithoutAir: number;
  kind: AirlessKind;
  conFailedBeforeRound: boolean;
  conRoll: { total: number; outcome: RollOutcome; success: boolean } | null;
  damageFormula: '1d3' | '1d6';
  damageTaken: number;
  conFailed: boolean;
  deathAtZero: boolean;
}

export function resolveSuffocationRound(
  conValue: number,
  roundWithoutAir: number,
  options: {
    fixedRoll?: number;
    fixedDamage?: number;
    kind?: AirlessKind;
    conFailed?: boolean;
    currentHp?: number;
  } = {}
): SuffocationResolution {
  const safeCon = Math.max(1, conValue);
  const safeRound = Math.max(1, Math.round(roundWithoutAir));
  const kind = options.kind ?? 'smoke';
  const damageFormula = kind === 'smoke' ? '1d3' : '1d6';
  const conFailedBeforeRound = options.conFailed === true;
  let conRoll: SuffocationResolution['conRoll'] = null;
  let conFailed = conFailedBeforeRound;

  if (!conFailedBeforeRound) {
    const total = options.fixedRoll ?? rollD100WithBonus(0).total;
    const outcome = evaluateSkillCheck(total, safeCon);
    const success = ['critical', 'extreme', 'hard', 'regular'].includes(outcome);
    conRoll = { total, outcome, success };
    conFailed = !success;
  }

  const damageTaken = conFailed
    ? options.fixedDamage ?? rollDiceFormula(damageFormula)?.total ?? 0
    : 0;
  const deathAtZero = options.currentHp !== undefined && damageTaken >= Math.max(0, options.currentHp);

  return {
    conValue: safeCon,
    roundWithoutAir: safeRound,
    kind,
    conFailedBeforeRound,
    conRoll,
    damageFormula,
    damageTaken,
    conFailed,
    deathAtZero,
  };
}

export interface PoisonResolution {
  poison: PoisonDefinition;
  conValue: number;
  conRoll: { total: number; outcome: RollOutcome; extremeSuccess: boolean };
  fullDamage: number;
  damageTaken: number;
  damageFormulaUsed: string;
  halvedByExtremeCon: boolean;
}

export function resolvePoisonEffect(
  severity: PoisonSeverity,
  conValue: number,
  options: { fixedRoll?: number; fixedDamage?: number } = {}
): PoisonResolution {
  const poison = COC7E_POISONS.find((item) => item.id === severity) ?? COC7E_POISONS[0];
  const safeCon = Math.max(1, conValue);
  const total = options.fixedRoll ?? rollD100WithBonus(0).total;
  const outcome = evaluateSkillCheck(total, safeCon);
  const extremeSuccess = outcome === 'critical' || outcome === 'extreme';
  const fullDamage = options.fixedDamage ?? rollDiceFormula(poison.damageFormula)?.total ?? 0;
  return {
    poison,
    conValue: safeCon,
    conRoll: { total, outcome, extremeSuccess },
    fullDamage,
    damageTaken: extremeSuccess ? Math.floor(fullDamage / 2) : fullDamage,
    damageFormulaUsed: poison.damageFormula,
    halvedByExtremeCon: extremeSuccess,
  };
}
