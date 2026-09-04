/**
 * @file hazards-engine.ts
 * Deterministyczny silnik zagrożeń środowiskowych i trucizn Call of Cthulhu 7e RAW.
 *
 * Źródło zasad: Księga Strażnika CoC 7e, Rozdział 6:
 * - Upadki (Falling - s. 124, Table III): 1k6/3m, amortyzacja testem Skakania (Jump), rodzaje podłoża.
 * - Ogień i kwas (Fire & Acid - Table III): 1k6/2k6/3k6 na rundę, pancerz nie chroni.
 * - Uduszenie i tonięcie (Suffocation & Drowning - s. 125): wstrzymanie oddechu CON/5 rund,
 *   kolejne rundy z rosnącymi kośćmi karnymi do testu CON, porażka = 1k6 HP/rundę.
 * - Trucizny i toksyny (Poisons - Table IV, s. 129): kanoniczna tabela CoC 7e z testem CON
 *   o trudności zależnej od potencji (Zwykły/Trudny/Ekstremalny).
 */

import {
  type RollOutcome,
  evaluateSkillCheck,
  rollD100WithBonus,
  rollDiceFormula,
} from '@/lib/dice-utils';

export type HazardType =
  | 'falling'
  | 'fire'
  | 'acid'
  | 'suffocation'
  | 'drowning'
  | 'poison';

export type FallingSurface = 'hard' | 'normal' | 'soft' | 'water';

export type FireIntensity = 'minor' | 'moderate' | 'major' | 'inferno';

export type AcidPotency = 'splash' | 'immersion';

export type PoisonDelivery = 'ingestion' | 'injection' | 'inhalation' | 'contact';

export interface PoisonDefinition {
  id: string;
  nameKey: string;
  potency: number; // 1-100
  difficulty: 'regular' | 'hard' | 'extreme';
  delivery: PoisonDelivery;
  onsetKey: string;
  fullDamageFormula: string; // np. '3d10', '2d10', '1d10', '0'
  reducedDamageFormula: string; // np. '1d10', '1d6', '1d4', '0'
  fullEffectKey: string;
  reducedEffectKey: string;
  isFatalOnFailure?: boolean;
  causesUnconsciousness?: boolean;
}

/** Kanoniczna Tabela IV Trucizn i Toksyn z Księgi Strażnika CoC 7e */
export const COC7E_POISONS: PoisonDefinition[] = [
  {
    id: 'cyanide',
    nameKey: 'poisons.cyanide.name',
    potency: 90,
    difficulty: 'extreme',
    delivery: 'ingestion',
    onsetKey: 'poisons.cyanide.onset',
    fullDamageFormula: '3d10',
    reducedDamageFormula: '1d10',
    fullEffectKey: 'poisons.cyanide.full',
    reducedEffectKey: 'poisons.cyanide.reduced',
    isFatalOnFailure: true,
  },
  {
    id: 'arsenic',
    nameKey: 'poisons.arsenic.name',
    potency: 70,
    difficulty: 'hard',
    delivery: 'ingestion',
    onsetKey: 'poisons.arsenic.onset',
    fullDamageFormula: '2d10',
    reducedDamageFormula: '1d6',
    fullEffectKey: 'poisons.arsenic.full',
    reducedEffectKey: 'poisons.arsenic.reduced',
  },
  {
    id: 'strychnine',
    nameKey: 'poisons.strychnine.name',
    potency: 85,
    difficulty: 'extreme',
    delivery: 'ingestion',
    onsetKey: 'poisons.strychnine.onset',
    fullDamageFormula: '3d10',
    reducedDamageFormula: '1d10',
    fullEffectKey: 'poisons.strychnine.full',
    reducedEffectKey: 'poisons.strychnine.reduced',
  },
  {
    id: 'curare',
    nameKey: 'poisons.curare.name',
    potency: 80,
    difficulty: 'hard',
    delivery: 'injection',
    onsetKey: 'poisons.curare.onset',
    fullDamageFormula: '2d10',
    reducedDamageFormula: '1d6',
    fullEffectKey: 'poisons.curare.full',
    reducedEffectKey: 'poisons.curare.reduced',
  },
  {
    id: 'snake_venom',
    nameKey: 'poisons.snake_venom.name',
    potency: 75,
    difficulty: 'hard',
    delivery: 'injection',
    onsetKey: 'poisons.snake_venom.onset',
    fullDamageFormula: '2d10',
    reducedDamageFormula: '1d6',
    fullEffectKey: 'poisons.snake_venom.full',
    reducedEffectKey: 'poisons.snake_venom.reduced',
  },
  {
    id: 'mustard_gas',
    nameKey: 'poisons.mustard_gas.name',
    potency: 70,
    difficulty: 'hard',
    delivery: 'inhalation',
    onsetKey: 'poisons.mustard_gas.onset',
    fullDamageFormula: '2d6',
    reducedDamageFormula: '1d6',
    fullEffectKey: 'poisons.mustard_gas.full',
    reducedEffectKey: 'poisons.mustard_gas.reduced',
  },
  {
    id: 'chloroform',
    nameKey: 'poisons.chloroform.name',
    potency: 45,
    difficulty: 'regular',
    delivery: 'inhalation',
    onsetKey: 'poisons.chloroform.onset',
    fullDamageFormula: '0',
    reducedDamageFormula: '0',
    fullEffectKey: 'poisons.chloroform.full',
    reducedEffectKey: 'poisons.chloroform.reduced',
    causesUnconsciousness: true,
  },
  {
    id: 'belladonna',
    nameKey: 'poisons.belladonna.name',
    potency: 55,
    difficulty: 'regular',
    delivery: 'ingestion',
    onsetKey: 'poisons.belladonna.onset',
    fullDamageFormula: '1d10',
    reducedDamageFormula: '1d4',
    fullEffectKey: 'poisons.belladonna.full',
    reducedEffectKey: 'poisons.belladonna.reduced',
  },
  {
    id: 'carbon_monoxide',
    nameKey: 'poisons.carbon_monoxide.name',
    potency: 65,
    difficulty: 'hard',
    delivery: 'inhalation',
    onsetKey: 'poisons.carbon_monoxide.onset',
    fullDamageFormula: '2d6',
    reducedDamageFormula: '1d6',
    fullEffectKey: 'poisons.carbon_monoxide.full',
    reducedEffectKey: 'poisons.carbon_monoxide.reduced',
  },
];

export interface FallingResolution {
  heightMeters: number;
  surface: FallingSurface;
  baseDiceCount: number; // liczba kości d6
  jumpRoll?: {
    total: number;
    skillValue: number;
    outcome: RollOutcome;
    diceReduced: number; // ile kości d6 zredukowano
  };
  effectiveDiceCount: number;
  damageRolled: number;
  halvedBySurface: boolean;
  finalDamage: number;
  isTerminal: boolean; // czy osiągnięto prędkość graniczną (30m+ / 10k6)
}

/**
 * Oblicza obrażenia z upadku według CoC 7e RAW (s. 124, Table III).
 */
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
  const surface = options.surface || 'normal';
  const cleanHeight = Math.max(1, Math.round(heightMeters));

  // Bazowa liczba kości d6: 1k6 na każde pełne lub rozpoczęte 3m, max 10k6
  let baseDiceCount = Math.min(10, Math.max(1, Math.floor(cleanHeight / 3)));
  if (cleanHeight < 3) {
    baseDiceCount = 1;
  }
  const isTerminal = cleanHeight >= 30;

  // Rozstrzygnięcie testu Skakania (Jump)
  let jumpRollInfo: FallingResolution['jumpRoll'] = undefined;
  let diceReduction = 0;

  if (!options.skipJumpCheck && options.jumpSkillValue && options.jumpSkillValue > 0) {
    const rollTotal = options.jumpRollTotal ?? rollD100WithBonus(0).total;
    const outcome = evaluateSkillCheck(rollTotal, options.jumpSkillValue);

    switch (outcome) {
      case 'critical':
      case 'extreme':
        diceReduction = cleanHeight <= 6 ? baseDiceCount : 3;
        break;
      case 'hard':
        diceReduction = 2;
        break;
      case 'regular':
        diceReduction = 1;
        break;
      case 'fail':
      case 'fumble':
      default:
        diceReduction = 0;
        break;
    }

    jumpRollInfo = {
      total: rollTotal,
      skillValue: options.jumpSkillValue,
      outcome,
      diceReduced: Math.min(baseDiceCount, diceReduction),
    };
  }

  const effectiveDiceCount = Math.max(0, baseDiceCount - diceReduction);

  // Rzut kośćmi obrażeń
  let damageRolled = 0;
  if (effectiveDiceCount > 0) {
    if (options.fixedDamageRoll !== undefined) {
      damageRolled = options.fixedDamageRoll;
    } else {
      const rolled = rollDiceFormula(`${effectiveDiceCount}d6`);
      damageRolled = rolled?.total ?? effectiveDiceCount * 3;
    }
  }

  // Wpływ podłoża (Soft lub Water przy braku rozbicia)
  let halvedBySurface = false;
  let finalDamage = damageRolled;

  if (surface === 'soft' || (surface === 'water' && cleanHeight <= 12)) {
    halvedBySurface = true;
    finalDamage = Math.floor(damageRolled / 2);
  }

  return {
    heightMeters: cleanHeight,
    surface,
    baseDiceCount,
    jumpRoll: jumpRollInfo,
    effectiveDiceCount,
    damageRolled,
    halvedBySurface,
    finalDamage,
    isTerminal,
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

/**
 * Oblicza obrażenia od ognia według CoC 7e RAW (Table III).
 * Pancerz NIE chroni przed ogniem (ignoresArmor = true).
 */
export function resolveFireDamage(
  intensity: FireIntensity,
  rounds: number = 1,
  fixedDamage?: number
): FireResolution {
  const safeRounds = Math.max(1, rounds);
  let perRoundDice: string;
  let descriptionKey: string;

  switch (intensity) {
    case 'minor':
      perRoundDice = '1d6';
      descriptionKey = 'hazards.fire.minor';
      break;
    case 'moderate':
      perRoundDice = '1d6';
      descriptionKey = 'hazards.fire.moderate';
      break;
    case 'major':
      perRoundDice = '2d6';
      descriptionKey = 'hazards.fire.major';
      break;
    case 'inferno':
    default:
      perRoundDice = '3d6';
      descriptionKey = 'hazards.fire.inferno';
      break;
  }

  let totalDamage = 0;
  if (fixedDamage !== undefined) {
    totalDamage = fixedDamage;
  } else {
    for (let i = 0; i < safeRounds; i++) {
      const rolled = rollDiceFormula(perRoundDice);
      totalDamage += rolled?.total ?? 3;
    }
  }

  return {
    intensity,
    rounds: safeRounds,
    damageFormula: `${safeRounds}x(${perRoundDice})`,
    damageRolled: totalDamage,
    ignoresArmor: true,
    descriptionKey,
  };
}

export interface AcidResolution {
  potency: AcidPotency;
  damageFormula: string;
  damageRolled: number;
  ignoresArmor: true;
}

/**
 * Oblicza obrażenia od kwasu według CoC 7e RAW (Table III).
 */
export function resolveAcidDamage(
  potency: AcidPotency,
  fixedDamage?: number
): AcidResolution {
  const damageFormula = potency === 'splash' ? '1d6' : '2d6';
  let damageRolled = fixedDamage;

  if (damageRolled === undefined) {
    const rolled = rollDiceFormula(damageFormula);
    damageRolled = rolled?.total ?? (potency === 'splash' ? 3 : 7);
  }

  return {
    potency,
    damageFormula,
    damageRolled,
    ignoresArmor: true,
  };
}

export interface SuffocationResolution {
  conValue: number;
  maxRoundsHoldingBreath: number; // CON/5 lub CON/10
  roundWithoutAir: number; // która runda po wyczerpaniu tchu
  penaltyDice: number; // 0, -1, lub -2
  conRoll: {
    total: number;
    outcome: RollOutcome;
    success: boolean;
  };
  damageTaken: number; // 0 przy sukcesie, 1k6 przy porażce
  isDrowningAgony: boolean; // czy HP spadło do 0 (śmierć/utonięcie w toku)
}

/**
 * Oblicza maksymalną liczbę rund wstrzymania oddechu (CoC 7e RAW s. 125).
 */
export function getMaxHoldBreathRounds(conValue: number, isStrenuous: boolean = false): number {
  const safeCon = Math.max(1, conValue);
  const divisor = isStrenuous ? 10 : 5;
  return Math.max(1, Math.floor(safeCon / divisor));
}

/**
 * Rozstrzyga pojedynczą rundę bez powietrza (CoC 7e RAW s. 125).
 */
export function resolveSuffocationRound(
  conValue: number,
  roundWithoutAir: number,
  options: {
    fixedRoll?: number;
    fixedDamage?: number;
    isStrenuous?: boolean;
  } = {}
): SuffocationResolution {
  const safeCon = Math.max(1, conValue);
  const safeRound = Math.max(1, roundWithoutAir);
  const maxHold = getMaxHoldBreathRounds(safeCon, options.isStrenuous);

  let penaltyDice = 0;
  if (safeRound === 2) {
    penaltyDice = -1;
  } else if (safeRound >= 3) {
    penaltyDice = -2;
  }

  const rollResult = options.fixedRoll !== undefined
    ? { total: options.fixedRoll }
    : rollD100WithBonus(penaltyDice);

  const outcome = evaluateSkillCheck(rollResult.total, safeCon);
  const success = ['critical', 'extreme', 'hard', 'regular'].includes(outcome);

  let damageTaken = 0;
  if (!success) {
    if (options.fixedDamage !== undefined) {
      damageTaken = options.fixedDamage;
    } else {
      const rolled = rollDiceFormula('1d6');
      damageTaken = rolled?.total ?? 3;
    }
  }

  return {
    conValue: safeCon,
    maxRoundsHoldingBreath: maxHold,
    roundWithoutAir: safeRound,
    penaltyDice,
    conRoll: {
      total: rollResult.total,
      outcome,
      success,
    },
    damageTaken,
    isDrowningAgony: false,
  };
}

export interface PoisonResolution {
  poison: PoisonDefinition;
  conValue: number;
  requiredDifficulty: 'regular' | 'hard' | 'extreme';
  conRoll: {
    total: number;
    outcome: RollOutcome;
    passedRequirement: boolean;
  };
  damageTaken: number;
  damageFormulaUsed: string;
  effectKey: string;
  isFatal: boolean;
  unconscious: boolean;
}

/**
 * Rozstrzyga działanie trucizny według CoC 7e RAW (Table IV, s. 129).
 */
export function resolvePoisonEffect(
  poisonIdOrDef: string | PoisonDefinition,
  conValue: number,
  options: {
    fixedRoll?: number;
    fixedDamage?: number;
  } = {}
): PoisonResolution {
  const poison = typeof poisonIdOrDef === 'string'
    ? (COC7E_POISONS.find((p) => p.id === poisonIdOrDef) || COC7E_POISONS[0])
    : poisonIdOrDef;

  const safeCon = Math.max(1, conValue);
  const rollTotal = options.fixedRoll ?? rollD100WithBonus(0).total;
  const outcome = evaluateSkillCheck(rollTotal, safeCon);

  let passedRequirement = false;
  switch (poison.difficulty) {
    case 'extreme':
      passedRequirement = outcome === 'critical' || outcome === 'extreme';
      break;
    case 'hard':
      passedRequirement =
        outcome === 'critical' || outcome === 'extreme' || outcome === 'hard';
      break;
    case 'regular':
    default:
      passedRequirement =
        outcome === 'critical' ||
        outcome === 'extreme' ||
        outcome === 'hard' ||
        outcome === 'regular';
      break;
  }

  const formulaToUse = passedRequirement
    ? poison.reducedDamageFormula
    : poison.fullDamageFormula;

  let damageTaken = 0;
  if (options.fixedDamage !== undefined) {
    damageTaken = options.fixedDamage;
  } else if (formulaToUse !== '0' && formulaToUse !== '') {
    const rolled = rollDiceFormula(formulaToUse);
    damageTaken = rolled?.total ?? 0;
  }

  const isFatal = !passedRequirement && Boolean(poison.isFatalOnFailure);
  const unconscious = Boolean(poison.causesUnconsciousness);
  const effectKey = passedRequirement ? poison.reducedEffectKey : poison.fullEffectKey;

  return {
    poison,
    conValue: safeCon,
    requiredDifficulty: poison.difficulty,
    conRoll: {
      total: rollTotal,
      outcome,
      passedRequirement,
    },
    damageTaken,
    damageFormulaUsed: formulaToUse,
    effectKey,
    isFatal,
    unconscious,
  };
}
