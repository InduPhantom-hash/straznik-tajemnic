/**
 * @file firearms-engine.ts
 * Deterministyczny silnik broni palnej według oficjalnych zasad CoC 7e (Rules As Written).
 *
 * Odpowiada za:
 * 1. Inicjatywę z bronią palną: wyciągnięta i wycelowana broń daje DEX + 50 (działanie przed walką wręcz).
 * 2. Modyfikatory zasięgu:
 *    - Point-blank (przyłożenie: odległość ≤ DEX/5 stóp / ~DEX/15 jardów): +1 kość premiowa dla strzelca.
 *      Cel może zadeklarować rzucenie się za osłonę (Dive for Cover) - test Uniku. Jeśli udany: znosi kość premiową,
 *      ale cel leży (Prone) i traci kolejną akcję w tej rundzie.
 *    - Dystans bazowy (do zasięgu bazowego broni): brak kości premiowych/karnych.
 *    - Długi dystans (do 2x zasięgu bazowego): 1 kość karna.
 *    - Ekstremalny dystans (do 4x zasięgu bazowego): 2 kości karne.
 *    - Powyżej 4x zasięgu bazowego: strzał fizycznie niemożliwy.
 * 3. Wielokrotne strzały w jednej rundzie (np. pistolet 1(3)):
 *    - 1. strzał: 0 kości karnych.
 *    - 2. strzał w tej samej rundzie: 1 kość karna.
 *    - 3. strzał w tej samej rundzie: 2 kości karne.
 * 4. Ogień ciągły i strzelanie salwami (Burst / Full Auto):
 *    - Wielkość salwy (Burst size): dziesiątki wartości umiejętności, min. 3 kule (np. 45% -> 4 kule, 15% -> 3 kule).
 *    - 1. salwa: standardowy rzut; każda kolejna salwa w tej samej rundzie: +1 kolejna kość karna.
 *    - Przeniesienie ognia na inny cel (Switching targets): dodatkowo +1 kość karna.
 *    - Zwykły / Trudny sukces: trafia połowa kul z salwy (zaokrąglenie w dół: floor(burst/2)), zadając zwykłe obrażenia.
 *    - Ekstremalny / Krytyczny sukces: trafiają WSZYSTKIE kule z salwy, z czego połowa (ceil(burst/2)) zadaje
 *      obrażenia z Przebiciem (Impale: max + rzut kością), a pozostałe zwykłe obrażenia.
 * 5. Zawodność i zacięcie broni (Malfunction):
 *    - Wartość zacięcia pobierana z katalogu broni (np. 96-100, domyślnie 100).
 *    - Rzut k100 ≥ progu zacięcia: broń ulega zacięciu (kliknięcie, brak strzału).
 *    - ZAKAZ UŻYCIA SZCZĘŚCIA (RAW): na rzut wywołujący zacięcie nie wolno wydać punktów Szczęścia!
 *    - Odblokowanie broni: prosta mechanika = 1 runda lub test Broń Palna/Naprawa Mechaniczna; złożona = 1d6 rund.
 * 6. Ekstremalny sukces i Przebicie (Impale):
 *    - Sukces ekstremalny lub krytyczny przy pojedynczym strzale zadaje maksymalne obrażenia broni + dodatkowy rzut kością obrażeń.
 *    - Broń palna NIGDY nie dodaje modyfikatora obrażeń postaci (Damage Bonus / DB).
 * 7. Zarządzanie magazynkiem i przeładowanie:
 *    - Ręczne ładowanie pojedynczych naboi: 2 naboje na pełną rundę walki.
 *    - Wymiana całego magazynka pudełkowego/bębnowego / speedloader: 1 pełna runda.
 */

import type { RollOutcome } from '@/lib/dice-utils';
import { evaluateSkillCheck, rollDiceFormula } from '@/lib/dice-utils';
import type { CombatConvention, DamageBreakdown } from './combat-resolver';
import { checkMajorWound, getMaxDiceValue } from './combat-resolver';

export type FirearmDistanceCategory =
  | 'point_blank'
  | 'base_range'
  | 'long_range'
  | 'extreme_range'
  | 'out_of_range';

export type FirearmCategory =
  | 'handgun'
  | 'rifle'
  | 'shotgun'
  | 'smg'
  | 'machine_gun';

export interface FirearmDiceNet {
  bonusDice: number;
  penaltyDice: number;
  netDice: number;
}

export interface DiveForCoverResult {
  success: boolean;
  outcome: RollOutcome;
  targetIsProne: boolean;
  targetLosesNextAction: boolean;
  cancelledBonusDie: boolean;
}

export interface SingleShotDamageResult {
  rawDamage: number;
  effectiveDamage: number;
  isImpale: boolean;
  isMajorWound: boolean;
  breakdown: string;
}

export interface BurstBulletHit {
  bulletIndex: number;
  isImpale: boolean;
  rawDamage: number;
  effectiveDamage: number;
  breakdown: string;
}

export interface FirearmBurstResult {
  weaponName: string;
  burstSize: number;
  bulletsFired: number;
  bulletsHit: number;
  roll: number;
  outcome: RollOutcome;
  isMalfunction: boolean;
  isLuckForbidden: boolean;
  hits: BurstBulletHit[];
  totalRawDamage: number;
  totalEffectiveDamage: number;
  isMajorWound: boolean;
  breakdown: string;
  logKey: string;
  logParams: Record<string, string | number>;
}

export interface ResolveFirearmShotParams {
  shooterName: string;
  targetName: string;
  weaponName: string;
  skillValue: number;
  roll: number;
  damageFormula: string;
  distanceYards: number;
  baseRangeYards: number;
  shooterDex?: number;
  shotNumberInRound?: number;
  malfunctionThreshold?: number;
  targetArmor?: number;
  targetMaxHp?: number;
  convention?: CombatConvention;
  isTargetDivingForCover?: boolean;
  targetDodgeSkill?: number;
  targetDodgeRoll?: number;
  rollFn?: (formula: string) => number;
}

export interface FirearmShotResult {
  shooterName: string;
  targetName: string;
  weaponName: string;
  distanceYards: number;
  baseRangeYards: number;
  distanceCategory: FirearmDistanceCategory;
  isOutOfRange: boolean;
  shotNumberInRound: number;
  bonusDice: number;
  penaltyDice: number;
  netDice: number;
  roll: number;
  skillValue: number;
  outcome: RollOutcome;
  hit: boolean;
  isMalfunction: boolean;
  isLuckForbidden: boolean;
  damage?: DamageBreakdown;
  diveForCover?: DiveForCoverResult;
  logKey: string;
  logParams: Record<string, string | number>;
}

export interface JamClearingRequirement {
  weaponCategory: FirearmCategory;
  roundsNeeded: number | string;
  requiresSkillCheck: boolean;
  suggestedSkills: string[];
  descriptionKey: string;
}

export interface ReloadRequirement {
  reloadType: 'single_round' | 'box_magazine' | 'speedloader';
  roundsToLoad: number;
  combatRoundsNeeded: number;
  descriptionKey: string;
}

/**
 * Inicjatywa z bronią palną CoC 7e RAW:
 * Jeśli broń palna jest wyciągnięta i wycelowana w cel przed rozpoczęciem rundy,
 * strzelec działa z inicjatywą DEX + 50 (przed jakimikolwiek atakami wręcz).
 */
export function calculateFirearmInitiative(
  dex: number,
  isReady: boolean
): number {
  return isReady ? dex + 50 : dex;
}

/**
 * Kalkulacja kategorii dystansu CoC 7e RAW:
 * - Point-blank: odległość ≤ DEX/5 stóp (w jardach: DEX / 15, min 1 jard). Jeśli DEX brak: standardowo ≤ 3 jardy.
 * - Base range: > point_blank i ≤ baseRange.
 * - Long range: > baseRange i ≤ 2 * baseRange.
 * - Extreme range: > 2 * baseRange i ≤ 4 * baseRange.
 * - Out of range: > 4 * baseRange (strzał niemożliwy).
 */
export function calculateDistanceCategory(
  distanceYards: number,
  baseRangeYards: number,
  shooterDex?: number
): FirearmDistanceCategory {
  const safeBaseRange = Math.max(1, baseRangeYards);
  const pointBlankThresholdYards =
    shooterDex !== undefined
      ? Math.max(1, Math.round((shooterDex / 5) / 3))
      : 3;

  if (distanceYards <= pointBlankThresholdYards) {
    return 'point_blank';
  }
  if (distanceYards <= safeBaseRange) {
    return 'base_range';
  }
  if (distanceYards <= 2 * safeBaseRange) {
    return 'long_range';
  }
  if (distanceYards <= 4 * safeBaseRange) {
    return 'extreme_range';
  }
  return 'out_of_range';
}

/**
 * Kara za wielokrotne strzały pojedyncze w jednej rundzie (np. rewolwer / pistolet 1(3)):
 * - 1. strzał: 0 kości karnych.
 * - 2. strzał: 1 kość karna.
 * - 3. strzał: 2 kości karne.
 */
export function calculateMultipleShotsPenalty(
  shotNumberInRound: number
): number {
  if (shotNumberInRound <= 1) return 0;
  if (shotNumberInRound === 2) return 1;
  return 2;
}

/**
 * Wielkość salwy (Burst size) CoC 7e RAW:
 * Równa dziesiątkom wartości umiejętności strzeleckiej (min. 3 kule).
 * Np. 45% -> 4 kule; 15% -> 3 kule; 75% -> 7 kul.
 */
export function calculateBurstSize(skillValue: number): number {
  const tens = Math.floor(Math.max(0, skillValue) / 10);
  return Math.max(3, tens);
}

/**
 * Sprawdzenie zacięcia broni (Malfunction) CoC 7e RAW:
 * Rzut k100 ≥ progu zacięcia oznacza zacięcie broni.
 * W CoC 7e domyślny próg zacięcia broni wynosi 100, chyba że katalog podaje niższą wartość (np. 96-99).
 */
export function checkMalfunction(
  roll: number,
  malfunctionThreshold: number = 100
): boolean {
  return roll >= malfunctionThreshold;
}

/**
 * Rozliczenie rzucenia się za osłonę (Dive for Cover) CoC 7e RAW:
 * - Cel może rzucić się za osłonę w reakcji na strzał z przyłożenia (point-blank).
 * - Niezależnie od wyniku testu Uniku cel ląduje na ziemi (Prone) i traci kolejną akcję w tej rundzie.
 * - Jeśli test Uniku (Dodge) jest udany (regular lub wyżej): znosi kość premiową (+1K) strzelca.
 */
export function resolveDiveForCover(
  dodgeRoll: number,
  dodgeSkill: number
): DiveForCoverResult {
  const outcome = evaluateSkillCheck(dodgeRoll, dodgeSkill);
  const success =
    outcome === 'regular' ||
    outcome === 'hard' ||
    outcome === 'extreme' ||
    outcome === 'critical';

  return {
    success,
    outcome,
    targetIsProne: true,
    targetLosesNextAction: true,
    cancelledBonusDie: success,
  };
}

/**
 * Oblicza łączny bilans kości premiowych i karnych dla strzału z broni palnej CoC 7e RAW.
 */
export function calculateFirearmNetDice(params: {
  distanceCategory: FirearmDistanceCategory;
  shotNumberInRound?: number;
  burstNumberInRound?: number;
  switchingTarget?: boolean;
  targetDivingForCoverSuccess?: boolean;
  extraBonusDice?: number;
  extraPenaltyDice?: number;
}): FirearmDiceNet {
  const {
    distanceCategory,
    shotNumberInRound = 1,
    burstNumberInRound,
    switchingTarget = false,
    targetDivingForCoverSuccess = false,
    extraBonusDice = 0,
    extraPenaltyDice = 0,
  } = params;

  let bonusDice = extraBonusDice;
  let penaltyDice = extraPenaltyDice;

  // 1. Zasięg
  if (distanceCategory === 'point_blank') {
    if (!targetDivingForCoverSuccess) {
      bonusDice += 1;
    }
  } else if (distanceCategory === 'long_range') {
    penaltyDice += 1;
  } else if (distanceCategory === 'extreme_range') {
    penaltyDice += 2;
  }

  // 2. Wielokrotne strzały pojedyncze
  if (shotNumberInRound > 1) {
    penaltyDice += calculateMultipleShotsPenalty(shotNumberInRound);
  }

  // 3. Wielokrotne salwy w rundzie
  if (burstNumberInRound && burstNumberInRound > 1) {
    penaltyDice += burstNumberInRound - 1;
  }

  // 4. Przeniesienie ognia na inny cel
  if (switchingTarget) {
    penaltyDice += 1;
  }

  const netDice = bonusDice - penaltyDice;
  return { bonusDice, penaltyDice, netDice };
}

/**
 * Oblicza obrażenia pojedynczego strzału CoC 7e RAW:
 * - Sukces ekstremalny lub krytyczny: Przebicie (Impale) = maksymalne obrażenia broni + dodatkowy rzut kością broni.
 * - Broń palna NIGDY nie dodaje modyfikatora obrażeń postaci (DB)!
 * - Sukces zwykły/trudny: standardowy rzut kością broni.
 * - Pancerz celu odejmuje się od łącznych obrażeń.
 */
export function calculateSingleShotDamage(params: {
  damageFormula: string;
  outcome: RollOutcome;
  targetArmor?: number;
  targetMaxHp?: number;
  convention?: CombatConvention;
  rollFn?: (formula: string) => number;
}): SingleShotDamageResult {
  const {
    damageFormula,
    outcome,
    targetArmor = 0,
    targetMaxHp = 10,
    convention = 'classic',
    rollFn = (f: string) => rollDiceFormula(f)?.total ?? 0,
  } = params;

  if (outcome === 'fail' || outcome === 'fumble') {
    return {
      rawDamage: 0,
      effectiveDamage: 0,
      isImpale: false,
      isMajorWound: false,
      breakdown: 'Miss',
    };
  }

  const isExtreme = outcome === 'extreme' || outcome === 'critical';

  if (isExtreme) {
    const maxDamage = getMaxDiceValue(damageFormula);
    const extraRoll = Math.max(1, rollFn(damageFormula));
    const rawDamage = maxDamage + extraRoll;
    const effectiveDamage = Math.max(0, rawDamage - targetArmor);
    const majorWoundCheck = checkMajorWound(
      effectiveDamage,
      targetMaxHp,
      convention
    );

    return {
      rawDamage,
      effectiveDamage,
      isImpale: true,
      isMajorWound: majorWoundCheck.isMajorWound,
      breakdown: `Impale: max(${maxDamage}) + roll(${extraRoll}) = ${rawDamage}${
        targetArmor > 0 ? ` - armor(${targetArmor}) = ${effectiveDamage}` : ''
      }`,
    };
  }

  const rawDamage = Math.max(1, rollFn(damageFormula));
  const effectiveDamage = Math.max(0, rawDamage - targetArmor);
  const majorWoundCheck = checkMajorWound(
    effectiveDamage,
    targetMaxHp,
    convention
  );

  return {
    rawDamage,
    effectiveDamage,
    isImpale: false,
    isMajorWound: majorWoundCheck.isMajorWound,
    breakdown: `Roll: ${rawDamage}${
      targetArmor > 0 ? ` - armor(${targetArmor}) = ${effectiveDamage}` : ''
    }`,
  };
}

/**
 * Rozstrzyga pojedynczy strzał z broni palnej CoC 7e RAW z pełną analizą zasięgu i zacięć.
 */
export function resolveFirearmShot(
  params: ResolveFirearmShotParams
): FirearmShotResult {
  const {
    shooterName,
    targetName,
    weaponName,
    skillValue,
    roll,
    damageFormula,
    distanceYards,
    baseRangeYards,
    shooterDex,
    shotNumberInRound = 1,
    malfunctionThreshold = 100,
    targetArmor = 0,
    targetMaxHp = 10,
    convention = 'classic',
    isTargetDivingForCover = false,
    targetDodgeSkill = 25,
    targetDodgeRoll = 50,
    rollFn,
  } = params;

  const distanceCategory = calculateDistanceCategory(
    distanceYards,
    baseRangeYards,
    shooterDex
  );

  // 1. Poza zasięgiem (powyżej 4x bazowego)
  if (distanceCategory === 'out_of_range') {
    return {
      shooterName,
      targetName,
      weaponName,
      distanceYards,
      baseRangeYards,
      distanceCategory,
      isOutOfRange: true,
      shotNumberInRound,
      bonusDice: 0,
      penaltyDice: 0,
      netDice: 0,
      roll,
      skillValue,
      outcome: 'fail',
      hit: false,
      isMalfunction: false,
      isLuckForbidden: false,
      logKey: 'firearmOutOfRange',
      logParams: {
        shooter: shooterName,
        target: targetName,
        distance: distanceYards,
      },
    };
  }

  // 2. Dive for Cover (tylko przy point-blank)
  let diveResult: DiveForCoverResult | undefined;
  if (distanceCategory === 'point_blank' && isTargetDivingForCover) {
    diveResult = resolveDiveForCover(targetDodgeRoll, targetDodgeSkill);
  }

  // 3. Bilans kości
  const diceNet = calculateFirearmNetDice({
    distanceCategory,
    shotNumberInRound,
    targetDivingForCoverSuccess: diveResult?.cancelledBonusDie,
  });

  // 4. Zacięcie broni (Malfunction)
  const isMalfunction = checkMalfunction(roll, malfunctionThreshold);
  if (isMalfunction) {
    return {
      shooterName,
      targetName,
      weaponName,
      distanceYards,
      baseRangeYards,
      distanceCategory,
      isOutOfRange: false,
      shotNumberInRound,
      bonusDice: diceNet.bonusDice,
      penaltyDice: diceNet.penaltyDice,
      netDice: diceNet.netDice,
      roll,
      skillValue,
      outcome: 'fumble',
      hit: false,
      isMalfunction: true,
      isLuckForbidden: true, // ZAKAZ SZCZĘŚCIA (RAW)
      diveForCover: diveResult,
      logKey: 'firearmMalfunction',
      logParams: {
        shooter: shooterName,
        weapon: weaponName,
        roll,
        threshold: malfunctionThreshold,
      },
    };
  }

  // 5. Normalna ewaluacja wyniku
  const outcome = evaluateSkillCheck(roll, skillValue);
  const hit =
    outcome === 'regular' ||
    outcome === 'hard' ||
    outcome === 'extreme' ||
    outcome === 'critical';

  if (!hit) {
    return {
      shooterName,
      targetName,
      weaponName,
      distanceYards,
      baseRangeYards,
      distanceCategory,
      isOutOfRange: false,
      shotNumberInRound,
      bonusDice: diceNet.bonusDice,
      penaltyDice: diceNet.penaltyDice,
      netDice: diceNet.netDice,
      roll,
      skillValue,
      outcome,
      hit: false,
      isMalfunction: false,
      isLuckForbidden: false,
      diveForCover: diveResult,
      logKey: 'firearmMiss',
      logParams: {
        shooter: shooterName,
        target: targetName,
        roll,
        targetValue: skillValue,
      },
    };
  }

  // 6. Obliczenie obrażeń trafienia
  const dmg = calculateSingleShotDamage({
    damageFormula,
    outcome,
    targetArmor,
    targetMaxHp,
    convention,
    rollFn,
  });

  return {
    shooterName,
    targetName,
    weaponName,
    distanceYards,
    baseRangeYards,
    distanceCategory,
    isOutOfRange: false,
    shotNumberInRound,
    bonusDice: diceNet.bonusDice,
    penaltyDice: diceNet.penaltyDice,
    netDice: diceNet.netDice,
    roll,
    skillValue,
    outcome,
    hit: true,
    isMalfunction: false,
    isLuckForbidden: false,
    damage: {
      totalDamage: dmg.rawDamage,
      effectiveDamage: dmg.effectiveDamage,
      isImpale: dmg.isImpale,
      isMajorWound: dmg.isMajorWound,
      breakdown: dmg.breakdown,
    },
    diveForCover: diveResult,
    logKey: dmg.isImpale ? 'firearmImpaleHit' : 'firearmRegularHit',
    logParams: {
      shooter: shooterName,
      target: targetName,
      weapon: weaponName,
      damage: dmg.effectiveDamage,
    },
  };
}

/**
 * Rozstrzyga salwę ognia ciągłego (Burst / Full Auto) CoC 7e RAW:
 * - Sukces Zwykły/Trudny: trafia połowa kul (floor(burst / 2)), każda zadaje standardowe obrażenia.
 * - Sukces Ekstremalny/Krytyczny: trafiają WSZYSTKIE kule, z czego ceil(burst / 2) to Impale, a reszta to zwykłe.
 * - Porażka: 0 trafień.
 * - Zacięcie: broń zacina się, 0 trafień, zakaz wydawania Szczęścia.
 */
export function resolveFirearmBurst(params: {
  shooterName: string;
  targetName: string;
  weaponName: string;
  skillValue: number;
  roll: number;
  damageFormula: string;
  burstSize?: number;
  malfunctionThreshold?: number;
  targetArmor?: number;
  targetMaxHp?: number;
  convention?: CombatConvention;
  rollFn?: (formula: string) => number;
}): FirearmBurstResult {
  const {
    shooterName,
    targetName,
    weaponName,
    skillValue,
    roll,
    damageFormula,
    burstSize = calculateBurstSize(skillValue),
    malfunctionThreshold = 100,
    targetArmor = 0,
    targetMaxHp = 10,
    convention = 'classic',
    rollFn = (f: string) => rollDiceFormula(f)?.total ?? 0,
  } = params;

  // 1. Zacięcie broni
  const isMalfunction = checkMalfunction(roll, malfunctionThreshold);
  if (isMalfunction) {
    return {
      weaponName,
      burstSize,
      bulletsFired: burstSize,
      bulletsHit: 0,
      roll,
      outcome: 'fumble',
      isMalfunction: true,
      isLuckForbidden: true,
      hits: [],
      totalRawDamage: 0,
      totalEffectiveDamage: 0,
      isMajorWound: false,
      breakdown: `Malfunction on roll ${roll} (threshold ${malfunctionThreshold})`,
      logKey: 'burstMalfunction',
      logParams: {
        shooter: shooterName,
        weapon: weaponName,
        roll,
        threshold: malfunctionThreshold,
      },
    };
  }

  // 2. Sukces rzutu
  const outcome = evaluateSkillCheck(roll, skillValue);
  const isSuccess =
    outcome === 'regular' ||
    outcome === 'hard' ||
    outcome === 'extreme' ||
    outcome === 'critical';

  if (!isSuccess) {
    return {
      weaponName,
      burstSize,
      bulletsFired: burstSize,
      bulletsHit: 0,
      roll,
      outcome,
      isMalfunction: false,
      isLuckForbidden: false,
      hits: [],
      totalRawDamage: 0,
      totalEffectiveDamage: 0,
      isMajorWound: false,
      breakdown: `Burst miss (roll ${roll} > ${skillValue})`,
      logKey: 'burstMiss',
      logParams: {
        shooter: shooterName,
        target: targetName,
        roll,
        skill: skillValue,
      },
    };
  }

  const isExtreme = outcome === 'extreme' || outcome === 'critical';
  const bulletsHit = isExtreme ? burstSize : Math.floor(burstSize / 2);
  const impaleBullets = isExtreme ? Math.ceil(burstSize / 2) : 0;

  const hits: BurstBulletHit[] = [];
  let totalRawDamage = 0;
  let totalEffectiveDamage = 0;

  for (let i = 0; i < bulletsHit; i++) {
    const isThisImpale = i < impaleBullets;
    let bulletRaw = 0;
    let breakdown = '';

    if (isThisImpale) {
      const maxDmg = getMaxDiceValue(damageFormula);
      const extra = Math.max(1, rollFn(damageFormula));
      bulletRaw = maxDmg + extra;
      breakdown = `Impale(${maxDmg}+${extra})`;
    } else {
      bulletRaw = Math.max(1, rollFn(damageFormula));
      breakdown = `Normal(${bulletRaw})`;
    }

    const bulletEffective = Math.max(0, bulletRaw - targetArmor);
    totalRawDamage += bulletRaw;
    totalEffectiveDamage += bulletEffective;

    hits.push({
      bulletIndex: i + 1,
      isImpale: isThisImpale,
      rawDamage: bulletRaw,
      effectiveDamage: bulletEffective,
      breakdown,
    });
  }

  const majorWoundCheck = checkMajorWound(
    totalEffectiveDamage,
    targetMaxHp,
    convention
  );

  return {
    weaponName,
    burstSize,
    bulletsFired: burstSize,
    bulletsHit,
    roll,
    outcome,
    isMalfunction: false,
    isLuckForbidden: false,
    hits,
    totalRawDamage,
    totalEffectiveDamage,
    isMajorWound: majorWoundCheck.isMajorWound,
    breakdown: `Burst ${bulletsHit}/${burstSize} hits: ${hits
      .map((h) => h.breakdown)
      .join(', ')} = ${totalEffectiveDamage} dmg`,
    logKey: isExtreme ? 'burstExtremeHit' : 'burstRegularHit',
    logParams: {
      shooter: shooterName,
      target: targetName,
      weapon: weaponName,
      hits: bulletsHit,
      burstSize,
      damage: totalEffectiveDamage,
    },
  };
}

/**
 * Zwraca wymagania dotyczące odblokowania zaciętej broni CoC 7e RAW:
 * - Rewolwer/prosta: 1 pełna runda lub test Broń Palna / Naprawa Mechaniczna.
 * - Pistolet automatyczny / karabin: 1 runda + test lub 1d6 rund.
 * - Pistolet maszynowy / ckm: 1d6 rund lub test Naprawa Mechaniczna.
 */
export function getJamClearingRequirement(
  weaponCategory: FirearmCategory
): JamClearingRequirement {
  switch (weaponCategory) {
    case 'smg':
    case 'machine_gun':
      return {
        weaponCategory,
        roundsNeeded: '1d6',
        requiresSkillCheck: true,
        suggestedSkills: ['Naprawa Mechaniczna', 'Broń Palna'],
        descriptionKey: 'jamClearingComplex',
      };
    case 'rifle':
    case 'shotgun':
      return {
        weaponCategory,
        roundsNeeded: 1,
        requiresSkillCheck: true,
        suggestedSkills: ['Broń Palna (Karabin)', 'Naprawa Mechaniczna'],
        descriptionKey: 'jamClearingStandard',
      };
    case 'handgun':
    default:
      return {
        weaponCategory: 'handgun',
        roundsNeeded: 1,
        requiresSkillCheck: false,
        suggestedSkills: ['Broń Palna', 'Naprawa Mechaniczna'],
        descriptionKey: 'jamClearingSimple',
      };
  }
}

/**
 * Zwraca czas przeładowania broni CoC 7e RAW:
 * - Ładowanie ręczne pojedynczych naboi: 2 naboje na 1 pełną rundę.
 * - Wymiana całego magazynka pudełkowego/bębnowego / speedloader: 1 pełna runda.
 */
export function getReloadRequirement(
  reloadType: 'single_round' | 'box_magazine' | 'speedloader',
  roundsToLoad: number = 2
): ReloadRequirement {
  if (reloadType === 'box_magazine' || reloadType === 'speedloader') {
    return {
      reloadType,
      roundsToLoad,
      combatRoundsNeeded: 1,
      descriptionKey: 'reloadMagazineComplete',
    };
  }

  const roundsNeeded = Math.max(1, Math.ceil(roundsToLoad / 2));
  return {
    reloadType: 'single_round',
    roundsToLoad,
    combatRoundsNeeded: roundsNeeded,
    descriptionKey: 'reloadSingleRounds',
  };
}

/**
 * Generuje ustrukturyzowany prompt dla AI MG opisujący mechanikę broni palnej postaci.
 */
export function buildFirearmPromptGuidance(): string {
  return (
    '### ZASADY BRONI PALNEJ COC 7E (RAW):\n' +
    '- **Inicjatywa:** Wyciągnięta i wycelowana broń palna działa z inicjatywą DEX + 50 (przed walką wręcz).\n' +
    '- **Strzał z przyłożenia (Point-blank):** Odległość ≤ DEX/15 m daje +1 kość premiową dla strzelca. Cel może podjąć Dive for Cover (Unik), by znieść premię, ale pada na ziemię (Prone) i traci akcję.\n' +
    '- **Dystans:** Zasięg bazowy = test standardowy; Długi dystans (do 2x) = 1 kość karna; Ekstremalny (do 4x) = 2 kości karne.\n' +
    '- **Wielokrotne strzały:** 1. strzał = normalny rzut, 2. strzał w tej samej rundzie = 1 kość karna, 3. strzał = 2 kości karne.\n' +
    '- **Salwy / Ogień ciągły:** Wielkość salwy = dziesiątki umiejętności (min. 3 kule). Zwykły sukces = trafia połowa kul; Ekstremalny = trafiają wszystkie kule (połowa z Przebiciem / Impale).\n' +
    '- **Zacięcie broni (Malfunction):** Rzut ≥ progu zacięcia (np. 96-100) zacina broń. ZAKAZ UŻYCIA SZCZĘŚCIA na zacięcie (RAW)!\n' +
    '- **Przebicie (Impale):** Sukces ekstremalny = max obrażeń broni + rzut kością broni. Broń palna NIE dolicza Damage Bonus (DB) postaci.'
  );
}
