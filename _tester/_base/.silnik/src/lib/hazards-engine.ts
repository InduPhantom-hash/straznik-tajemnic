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

/** Preserve the actual dice for the presentation layer. Fixed values are test
 * inputs, not invented physical dice, so they correctly carry an empty pool. */
function rollDamageFormula(formula: string, fixedDamage?: number) {
  if (fixedDamage !== undefined) return { total: fixedDamage, results: [] as number[] };
  return rollDiceFormula(formula) ?? { total: 0, results: [] as number[] };
}

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
  damageDiceResults: number[];
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
  const damage = effectiveDiceCount === 0
    ? { total: 0, results: [] as number[] }
    : rollDamageFormula(damageFormula, options.fixedDamageRoll);
  const damageRolled = damage.total;

  return {
    heightMeters: cleanHeight,
    surface,
    baseDiceCount,
    damageDie,
    damageFormula,
    jumpRoll,
    effectiveDiceCount,
    damageRolled,
    damageDiceResults: damage.results,
    finalDamage: damageRolled,
    isTerminal: cleanHeight >= 30,
  };
}

export interface FireResolution {
  intensity: FireIntensity;
  rounds: number;
  damageFormula: string;
  damageRolled: number;
  damageDiceResults: number[];
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
  const damageDiceResults: number[] = [];
  if (fixedDamage === undefined) {
    for (let round = 0; round < safeRounds; round += 1) {
      const damage = rollDamageFormula(perRoundDice);
      damageRolled += damage.total;
      damageDiceResults.push(...damage.results);
    }
  }
  return {
    intensity,
    rounds: safeRounds,
    damageFormula: `${safeRounds}x(${perRoundDice})`,
    damageRolled,
    damageDiceResults,
    ignoresArmor: true,
    descriptionKey: severe ? 'fireSevere' : 'fireModerate',
  };
}

export interface AcidResolution {
  potency: AcidPotency;
  damageFormula: '1d3' | '1d6';
  damageRolled: number;
  damageDiceResults: number[];
  ignoresArmor: true;
}

export function resolveAcidDamage(potency: AcidPotency, fixedDamage?: number): AcidResolution {
  const damageFormula = potency === 'splash' ? '1d3' : '1d6';
  const damage = rollDamageFormula(damageFormula, fixedDamage);
  return {
    potency,
    damageFormula,
    damageRolled: damage.total,
    damageDiceResults: damage.results,
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
  damageDiceResults: number[];
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

  const damage = conFailed
    ? rollDamageFormula(damageFormula, options.fixedDamage)
    : { total: 0, results: [] as number[] };
  const damageTaken = damage.total;
  const deathAtZero = options.currentHp !== undefined && damageTaken >= Math.max(0, options.currentHp);

  return {
    conValue: safeCon,
    roundWithoutAir: safeRound,
    kind,
    conFailedBeforeRound,
    conRoll,
    damageFormula,
    damageTaken,
    damageDiceResults: damage.results,
    conFailed,
    deathAtZero,
  };
}

export interface PoisonResolution {
  poison: PoisonDefinition;
  conValue: number;
  conRoll: { total: number; outcome: RollOutcome; extremeSuccess: boolean };
  fullDamage: number;
  damageDiceResults: number[];
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
  const damage = rollDamageFormula(poison.damageFormula, options.fixedDamage);
  const fullDamage = damage.total;
  return {
    poison,
    conValue: safeCon,
    conRoll: { total, outcome, extremeSuccess },
    fullDamage,
    damageDiceResults: damage.results,
    damageTaken: extremeSuccess ? Math.floor(fullDamage / 2) : fullDamage,
    damageFormulaUsed: poison.damageFormula,
    halvedByExtremeCon: extremeSuccess,
  };
}

// ============================================================================
// POJAZDY I KOLIZJE (CoC 7e Księga Strażnika Rozdział 7, Tabela V i Tabela VI)
// ============================================================================

export type VehicleCollisionSeverity = 'minor' | 'moderate' | 'major' | 'catastrophic' | 'road_kill';

export interface VehicleDefinition {
  id: string;
  nameKey: string;
  movement: number;
  build: number;
  armor: number; // pancerz dla pasażerów/kierowcy
  passengers: number;
}

export const COC7E_VEHICLES: Record<string, VehicleDefinition> = {
  economy_car: { id: 'economy_car', nameKey: 'Samochód ekonomiczny', movement: 13, build: 3, armor: 1, passengers: 4 },
  standard_car: { id: 'standard_car', nameKey: 'Samochód standardowy', movement: 14, build: 4, armor: 2, passengers: 5 },
  luxury_car: { id: 'luxury_car', nameKey: 'Samochód luksusowy', movement: 15, build: 4, armor: 2, passengers: 6 },
  sports_car: { id: 'sports_car', nameKey: 'Samochód sportowy', movement: 16, build: 4, armor: 2, passengers: 5 },
  van: { id: 'van', nameKey: 'Furgonetka', movement: 13, build: 5, armor: 2, passengers: 14 },
  six_ton_truck: { id: 'six_ton_truck', nameKey: 'Ciężarówka sześciotonowa', movement: 11, build: 7, armor: 2, passengers: 3 },
  eighteen_wheeler: { id: 'eighteen_wheeler', nameKey: 'Ciężarówka osiemnastokołowa', movement: 10, build: 9, armor: 2, passengers: 3 },
  light_motorcycle: { id: 'light_motorcycle', nameKey: 'Lekki motocykl', movement: 13, build: 1, armor: 0, passengers: 1 },
  heavy_motorcycle: { id: 'heavy_motorcycle', nameKey: 'Ciężki motocykl', movement: 16, build: 3, armor: 0, passengers: 1 },
};

export interface VehicleCollisionDamageConfig {
  severity: VehicleCollisionSeverity;
  buildDamageFormula: string;
  descriptionKey: string;
}

export const COC7E_COLLISIONS: Record<VehicleCollisionSeverity, VehicleCollisionDamageConfig> = {
  minor: { severity: 'minor', buildDamageFormula: '1d3', descriptionKey: 'Drobna kolizja (otarcie, słupek)' },
  moderate: { severity: 'moderate', buildDamageFormula: '1d6', descriptionKey: 'Umiarkowana kolizja (zwierzę, lekki pojazd)' },
  major: { severity: 'major', buildDamageFormula: '1d10', descriptionKey: 'Poważna kolizja (drzewo, standardowe auto)' },
  catastrophic: { severity: 'catastrophic', buildDamageFormula: '2d10', descriptionKey: 'Katastrofa (ciężarówka, autobus, stary mur)' },
  road_kill: { severity: 'road_kill', buildDamageFormula: '5d10', descriptionKey: 'Śmierć na drodze (pociąg, czołg, meteor)' },
};

export interface VehicleCollisionResolution {
  severity: VehicleCollisionSeverity;
  initialBuild: number;
  buildDamage: number;
  remainingBuild: number;
  penaltyDieApplied: boolean;
  destroyedInSingleEvent: boolean;
  passengerDamageFormula: string;
  passengerDamage: number;
  luckRollRequired: boolean;
  luckRollPassed?: boolean;
  passengerKilledInstantly: boolean;
}

/**
 * Rozstrzyga kolizję pojazdu wg reguł Księgi Strażnika str. 162-167 (Tabela V i VI).
 *
 * @param vehicleBuild Aktualna Krzepa pojazdu
 * @param severity Kategoria kolizji z Tabeli VI
 * @param maxBuild Maksymalna (początkowa) Krzepa pojazdu
 * @param options Opcje testowe (stałe rzuty)
 */
export function resolveVehicleCollision(
  vehicleBuild: number,
  severity: VehicleCollisionSeverity,
  maxBuild: number,
  options: {
    fixedBuildDamage?: number;
    fixedPassengerDamage?: number;
    passengerLuck?: number;
    fixedLuckRoll?: number;
  } = {}
): VehicleCollisionResolution {
  const config = COC7E_COLLISIONS[severity];
  let buildDamage = 0;

  if (options.fixedBuildDamage !== undefined) {
    buildDamage = options.fixedBuildDamage;
  } else {
    const rolled = rollDamageFormula(config.buildDamageFormula).total;
    // Dla drobnej kolizji RAW mówi 1K3-1 (minimum 0)
    buildDamage = severity === 'minor' ? Math.max(0, rolled - 1) : rolled;
  }

  const remainingBuild = Math.max(0, vehicleBuild - buildDamage);
  const halfBuild = Math.floor(maxBuild / 2);
  const penaltyDieApplied = remainingBuild <= halfBuild && remainingBuild > 0;

  // Czy zniszczony w pojedynczym zdarzeniu katastrofalnym (obrażenia >= początkowa Krzepa pojazdu, RAW s. 162)
  const destroyedInSingleEvent = buildDamage >= maxBuild;

  let passengerDamageFormula = '0';
  let luckRollRequired = false;
  let luckRollPassed: boolean | undefined = undefined;
  let passengerKilledInstantly = false;

  if (remainingBuild === 0) {
    if (destroyedInSingleEvent) {
      luckRollRequired = true;
      if (options.passengerLuck !== undefined) {
        const roll = options.fixedLuckRoll ?? rollD100WithBonus(0).total;
        luckRollPassed = roll <= options.passengerLuck;
        passengerKilledInstantly = !luckRollPassed;
      }
      // Szczęśliwcy wyrzuceni z pojazdu otrzymują 2K10 obrażeń (RAW s. 162)
      passengerDamageFormula = '2d10';
    } else {
      // Skumulowane wyzerowanie: wypadek skutkujący 1K10 obrażeń (RAW s. 162)
      passengerDamageFormula = '1d10';
    }
  }

  const passengerDamage = options.fixedPassengerDamage !== undefined
    ? options.fixedPassengerDamage
    : (passengerDamageFormula !== '0' ? rollDamageFormula(passengerDamageFormula).total : 0);

  return {
    severity,
    initialBuild: vehicleBuild,
    buildDamage,
    remainingBuild,
    penaltyDieApplied,
    destroyedInSingleEvent,
    passengerDamageFormula,
    passengerDamage,
    luckRollRequired,
    luckRollPassed,
    passengerKilledInstantly,
  };
}

/**
 * Rozstrzyga obrażenia zadane pojazdowi z zewnątrz (np. ostrzał z broni palnej lub atak wręcz).
 * Zgodnie z RAW str. 162:
 * "Każde pełne 10 punktów obrażeń zmniejsza Krzepę pojazdu o 1 punkt (zaokrąglając w dół);
 * obrażenia poniżej 10 punktów można zignorować."
 */
export function resolveVehicleExternalDamage(
  currentBuild: number,
  incomingDamage: number
): { buildLost: number; remainingBuild: number } {
  const buildLost = Math.floor(incomingDamage / 10);
  const remainingBuild = Math.max(0, currentBuild - buildLost);
  return { buildLost, remainingBuild };
}

