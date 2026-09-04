/**
 * @file combat-resolver.ts
 * Deterministyczny silnik rozstrzygania starć wręcz według oficjalnych zasad CoC 7e (Rules As Written).
 *
 * Odpowiada za:
 * 1. Asymetryczne reguły remisów w testach przeciwstawnych (Unik vs Kontratak).
 * 2. Porównanie wskaźnika Budowy (Build) dla manewrów bojowych (chwyt, powalenie, rozbrojenie).
 * 3. Kalkulację obrażeń, sukcesów ekstremalnych oraz Przebicia (Impale).
 * 4. Mechanikę przewagi liczebnej (Outnumbered) - darmowa 1 obrona na rundę, potem +1 kość premiowa dla napastników.
 * 5. Adaptację do konwencji: 'classic' / 'noir' / 'pulp'.
 */

import type { RollOutcome } from '@/lib/dice-utils';
import { evaluateSkillCheck, rollDiceFormula } from '@/lib/dice-utils';

export type CombatConvention = 'classic' | 'noir' | 'pulp';

export type DefenseChoice = 'dodge' | 'fight_back' | 'maneuver';

export type ManeuverType = 'grapple' | 'knockdown' | 'disarm' | 'shove';

export type WeaponDamageType = 'blunt' | 'impaling' | 'slashing';

export interface CombatantSnapshot {
  id: string;
  name: string;
  build: number;
  hp: number;
  maxHp: number;
  armor: number;
  brawlSkill: number;
  dodgeSkill: number;
  defensesUsedThisRound: number;
  convention?: CombatConvention;
}

export interface ManeuverFeasibility {
  allowed: boolean;
  penaltyDice: number;
  buildDifference: number;
  reason?: string;
}

export interface DamageBreakdown {
  totalDamage: number;
  effectiveDamage: number;
  isImpale: boolean;
  isMajorWound: boolean;
  breakdown: string;
}

export interface MeleeResolutionResult {
  winner: 'attacker' | 'defender' | 'none';
  defenseChoice: DefenseChoice;
  attackerOutcome: RollOutcome;
  defenderOutcome: RollOutcome;
  isTie: boolean;
  damageDealtTo: 'attacker' | 'defender' | 'none';
  damage?: DamageBreakdown;
  maneuverApplied?: ManeuverType;
  logKey: string;
  logParams: Record<string, string | number>;
}

/**
 * Wartości wag sukcesu CoC 7e dla porównywania stopni w testach przeciwstawnych.
 */
export const OUTCOME_RANKS: Record<RollOutcome, number> = {
  critical: 5,
  extreme: 4,
  hard: 3,
  regular: 2,
  fail: 1,
  fumble: 0,
};

/**
 * Czy dany rzut zakończył się jakimkolwiek sukcesem (regular lub wyżej).
 */
export function isSuccessOutcome(outcome: RollOutcome): boolean {
  return OUTCOME_RANKS[outcome] >= OUTCOME_RANKS.regular;
}

/**
 * Weryfikacja wykonalności manewru bojowego na podstawie Budowy (Build) CoC 7e RAW:
 * - Build celu ≤ Build atakującego: 0 kości karnych.
 * - Build celu większy o 1: 1 kość karna.
 * - Build celu większy o 2: 2 kości karne.
 * - Build celu większy o 3 lub więcej: manewr fizycznie niemożliwy.
 */
export function checkManeuverFeasibility(
  attackerBuild: number,
  targetBuild: number
): ManeuverFeasibility {
  const buildDifference = targetBuild - attackerBuild;

  if (buildDifference >= 3) {
    return {
      allowed: false,
      penaltyDice: 0,
      buildDifference,
      reason: 'buildDifferenceTooGreat',
    };
  }

  if (buildDifference === 2) {
    return {
      allowed: true,
      penaltyDice: 2,
      buildDifference,
    };
  }

  if (buildDifference === 1) {
    return {
      allowed: true,
      penaltyDice: 1,
      buildDifference,
    };
  }

  return {
    allowed: true,
    penaltyDice: 0,
    buildDifference,
  };
}

/**
 * Oblicza przewagę liczebną (Outnumbered) CoC 7e RAW:
 * Każda postać ma 1 darmową obronę w rundzie.
 * Każdy kolejny atakujący wręcz w tej samej rundzie otrzymuje +1 kość premiową (Bonus Die).
 */
export function resolveOutnumberedBonus(defensesUsedThisRound: number): {
  bonusDiceToAttacker: number;
  isOutnumbered: boolean;
} {
  if (defensesUsedThisRound >= 1) {
    return {
      bonusDiceToAttacker: 1,
      isOutnumbered: true,
    };
  }
  return {
    bonusDiceToAttacker: 0,
    isOutnumbered: false,
  };
}

/**
 * Parsuje maksymalną wartość z formuły kości (np. "1d6+2" -> 6+2=8, "1d4" -> 4).
 */
export function getMaxDiceValue(formula: string): number {
  if (!formula || !formula.trim()) return 0;
  const cleaned = formula.replace(/\s+/g, '');
  const match = cleaned.match(/^(\d*)d(\d+)(?:([+-])(\d+))?$/i);
  if (!match) {
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }
  const count = match[1] ? parseInt(match[1], 10) : 1;
  const sides = parseInt(match[2], 10);
  const sign = match[3];
  const mod = match[4] ? parseInt(match[4], 10) : 0;

  let total = count * sides;
  if (sign === '+') total += mod;
  if (sign === '-') total -= mod;
  return Math.max(0, total);
}

/**
 * Kalkulacja obrażeń z uwzględnieniem Przebicia (Impale) i sukcesu ekstremalnego CoC 7e RAW.
 */
export function calculateMeleeDamage(params: {
  weaponDamageFormula: string;
  damageBonusFormula?: string;
  damageType?: WeaponDamageType;
  outcome: RollOutcome;
  isCounterattack?: boolean;
  rollFn?: (formula: string) => number;
}): {
  rawDamage: number;
  isImpale: boolean;
  breakdown: string;
} {
  const {
    weaponDamageFormula,
    damageBonusFormula = '',
    damageType = 'blunt',
    outcome,
    isCounterattack = false,
    rollFn = (f: string) => rollDiceFormula(f)?.total ?? 0,
  } = params;

  const isExtreme = outcome === 'extreme' || outcome === 'critical';
  const isPiercing = damageType === 'impaling' || damageType === 'slashing';

  // W kontrataku RAW CoC 7e sukces ekstremalny NIE daje Przebicia (Impale),
  // lecz zadaje zwykłe/maksymalne obrażenia bez dodatkowej kości broni.
  if (isExtreme && !isCounterattack) {
    const maxWeapon = getMaxDiceValue(weaponDamageFormula);
    const maxDb = damageBonusFormula ? getMaxDiceValue(damageBonusFormula) : 0;

    if (isPiercing) {
      // Przebicie (Impale): max broni + max DB + dodatkowy rzut kością broni
      const extraWeaponRoll = rollFn(weaponDamageFormula);
      const total = maxWeapon + maxDb + extraWeaponRoll;
      return {
        rawDamage: total,
        isImpale: true,
        breakdown: `Impale: max(${maxWeapon}) + maxDB(${maxDb}) + roll(${extraWeaponRoll}) = ${total}`,
      };
    } else {
      // Broń tępa: max broni + max DB
      const total = maxWeapon + maxDb;
      return {
        rawDamage: total,
        isImpale: false,
        breakdown: `Extreme Blunt: max(${maxWeapon}) + maxDB(${maxDb}) = ${total}`,
      };
    }
  }

  // Zwykłe obrażenia
  const weaponRoll = rollFn(weaponDamageFormula);
  const dbRoll = damageBonusFormula ? rollFn(damageBonusFormula) : 0;
  const total = Math.max(1, weaponRoll + dbRoll);
  return {
    rawDamage: total,
    isImpale: false,
    breakdown: `Roll: ${weaponRoll}${damageBonusFormula ? ` + DB(${dbRoll})` : ''} = ${total}`,
  };
}

/**
 * Sprawdza czy obrażenia powodują Ciężką Ranę (Major Wound) w danej konwencji:
 * - 'classic' i 'noir': obrażenia ≥ połowa maxHP.
 * - 'pulp': brak Major Wound, dopóki postać żyje (chyba że cios zadał ≥ pełne maxHP).
 */
export function checkMajorWound(
  damage: number,
  maxHp: number,
  convention: CombatConvention = 'classic'
): { isMajorWound: boolean; conTestRequired: boolean } {
  if (convention === 'pulp') {
    const isInstantKill = damage >= maxHp;
    return {
      isMajorWound: isInstantKill,
      conTestRequired: false,
    };
  }

  const halfMaxHp = Math.floor(maxHp / 2);
  const isMajor = damage >= halfMaxHp;
  return {
    isMajorWound: isMajor,
    conTestRequired: isMajor,
  };
}

export interface ResolveMeleeParams {
  attackerName: string;
  defenderName: string;
  attackerRoll: number;
  attackerSkill: number;
  defenderRoll: number;
  defenderSkill: number;
  defenseChoice: DefenseChoice;
  attackerWeaponFormula?: string;
  attackerDamageBonusFormula?: string;
  attackerDamageType?: WeaponDamageType;
  defenderWeaponFormula?: string;
  defenderDamageBonusFormula?: string;
  defenderDamageType?: WeaponDamageType;
  defenderArmor?: number;
  attackerArmor?: number;
  defenderMaxHp?: number;
  attackerMaxHp?: number;
  maneuverType?: ManeuverType;
  attackerBuild?: number;
  defenderBuild?: number;
  convention?: CombatConvention;
  rollFn?: (formula: string) => number;
}

/**
 * Główna deterministyczna funkcja rozstrzygnięcia starcia wręcz CoC 7e RAW:
 *
 * UNIK (Dodge):
 * - Obrońca rzuca na Unik.
 * - Jeśli stopień sukcesu obrońcy ≥ atakującego (np. obaj Regular) -> WYGRYWA OBROŃCA (atak chybia).
 * - Jeśli obaj fail/fumble -> nikt nie trafia (atak chybia).
 * - Atakujący trafia TYLKO gdy jego stopień sukcesu jest ściśle wyższy niż obrońcy.
 *
 * KONTRATAK (Fight Back):
 * - Obrońca rzuca na Bijatykę/broń wręcz.
 * - Jeśli obaj fail/fumble -> nikt nie trafia, ciosy mijają się.
 * - Jeśli stopnie sukcesu są równe (np. obaj Hard) -> WYGRYWA ATAKUJĄCY (remis sprzyja atakującemu!).
 * - Jeśli atakujący ma wyższy stopień sukcesu -> wygrywa atakujący i zadaje obrażenia.
 * - Jeśli obrońca ma ŚCIŚLE WYŻSZY stopień sukcesu -> WYGRYWA OBROŃCA i zadaje obrażenia atakującemu!
 *
 * MANEWR (Fighting Maneuver):
 * - Wymaga weryfikacji Build.
 * - Przy remisie stopni sukcesu zawsze wygrywa obrońca (RAW).
 */
export function resolveMeleeEngagement(
  params: ResolveMeleeParams
): MeleeResolutionResult {
  const {
    attackerName,
    defenderName,
    attackerRoll,
    attackerSkill,
    defenderRoll,
    defenderSkill,
    defenseChoice,
    attackerWeaponFormula = '1d3',
    attackerDamageBonusFormula = '',
    attackerDamageType = 'blunt',
    defenderWeaponFormula = '1d3',
    defenderDamageBonusFormula = '',
    defenderDamageType = 'blunt',
    defenderArmor = 0,
    attackerArmor = 0,
    defenderMaxHp = 10,
    attackerMaxHp = 10,
    maneuverType,
    attackerBuild = 0,
    defenderBuild = 0,
    convention = 'classic',
    rollFn,
  } = params;

  const attackerOutcome = evaluateSkillCheck(attackerRoll, attackerSkill);
  const defenderOutcome = evaluateSkillCheck(defenderRoll, defenderSkill);

  const attackerRank = OUTCOME_RANKS[attackerOutcome];
  const defenderRank = OUTCOME_RANKS[defenderOutcome];

  const attackerSuccess = isSuccessOutcome(attackerOutcome);
  const defenderSuccess = isSuccessOutcome(defenderOutcome);

  const isTie = attackerRank === defenderRank;

  // 1. Obaj zawiedli (fail / fumble)
  if (!attackerSuccess && !defenderSuccess) {
    return {
      winner: 'none',
      defenseChoice,
      attackerOutcome,
      defenderOutcome,
      isTie,
      damageDealtTo: 'none',
      logKey: 'bothFailedMiss',
      logParams: {
        attacker: attackerName,
        defender: defenderName,
      },
    };
  }

  // 2. UNIK (Dodge)
  if (defenseChoice === 'dodge') {
    // Obrońca wygrywa jeśli uzyskał sukces i jego stopień sukcesu jest >= atakującego
    if (defenderSuccess && defenderRank >= attackerRank) {
      return {
        winner: 'defender',
        defenseChoice,
        attackerOutcome,
        defenderOutcome,
        isTie,
        damageDealtTo: 'none',
        logKey: isTie ? 'dodgeSuccessTie' : 'dodgeSuccessBeatsAttacker',
        logParams: {
          defender: defenderName,
          attacker: attackerName,
        },
      };
    }

    // Atakujący wygrywa tylko jeśli odniósł sukces i ma ściśle wyższy stopień
    if (attackerSuccess && attackerRank > defenderRank) {
      const dmgCalc = calculateMeleeDamage({
        weaponDamageFormula: attackerWeaponFormula,
        damageBonusFormula: attackerDamageBonusFormula,
        damageType: attackerDamageType,
        outcome: attackerOutcome,
        isCounterattack: false,
        rollFn,
      });

      const effectiveDmg = Math.max(0, dmgCalc.rawDamage - defenderArmor);
      const majorWound = checkMajorWound(
        effectiveDmg,
        defenderMaxHp,
        convention
      );

      return {
        winner: 'attacker',
        defenseChoice,
        attackerOutcome,
        defenderOutcome,
        isTie,
        damageDealtTo: 'defender',
        damage: {
          totalDamage: dmgCalc.rawDamage,
          effectiveDamage: effectiveDmg,
          isImpale: dmgCalc.isImpale,
          isMajorWound: majorWound.isMajorWound,
          breakdown: dmgCalc.breakdown,
        },
        logKey: 'attackerHitsDodger',
        logParams: {
          attacker: attackerName,
          defender: defenderName,
          damage: effectiveDmg,
        },
      };
    }

    // Fallback: obrońca odparł atak
    return {
      winner: 'defender',
      defenseChoice,
      attackerOutcome,
      defenderOutcome,
      isTie,
      damageDealtTo: 'none',
      logKey: 'dodgeSuccessFallback',
      logParams: { defender: defenderName, attacker: attackerName },
    };
  }

  // 3. KONTRATAK (Fight Back)
  if (defenseChoice === 'fight_back') {
    // Remis: wygrywa atakujący!
    if (isTie && attackerSuccess) {
      const dmgCalc = calculateMeleeDamage({
        weaponDamageFormula: attackerWeaponFormula,
        damageBonusFormula: attackerDamageBonusFormula,
        damageType: attackerDamageType,
        outcome: attackerOutcome,
        isCounterattack: false,
        rollFn,
      });

      const effectiveDmg = Math.max(0, dmgCalc.rawDamage - defenderArmor);
      const majorWound = checkMajorWound(
        effectiveDmg,
        defenderMaxHp,
        convention
      );

      return {
        winner: 'attacker',
        defenseChoice,
        attackerOutcome,
        defenderOutcome,
        isTie: true,
        damageDealtTo: 'defender',
        damage: {
          totalDamage: dmgCalc.rawDamage,
          effectiveDamage: effectiveDmg,
          isImpale: dmgCalc.isImpale,
          isMajorWound: majorWound.isMajorWound,
          breakdown: dmgCalc.breakdown,
        },
        logKey: 'fightBackAttackerWinsTie',
        logParams: {
          attacker: attackerName,
          defender: defenderName,
          damage: effectiveDmg,
        },
      };
    }

    // Atakujący ma wyższy stopień sukcesu
    if (attackerSuccess && attackerRank > defenderRank) {
      const dmgCalc = calculateMeleeDamage({
        weaponDamageFormula: attackerWeaponFormula,
        damageBonusFormula: attackerDamageBonusFormula,
        damageType: attackerDamageType,
        outcome: attackerOutcome,
        isCounterattack: false,
        rollFn,
      });

      const effectiveDmg = Math.max(0, dmgCalc.rawDamage - defenderArmor);
      const majorWound = checkMajorWound(
        effectiveDmg,
        defenderMaxHp,
        convention
      );

      return {
        winner: 'attacker',
        defenseChoice,
        attackerOutcome,
        defenderOutcome,
        isTie: false,
        damageDealtTo: 'defender',
        damage: {
          totalDamage: dmgCalc.rawDamage,
          effectiveDamage: effectiveDmg,
          isImpale: dmgCalc.isImpale,
          isMajorWound: majorWound.isMajorWound,
          breakdown: dmgCalc.breakdown,
        },
        logKey: 'fightBackAttackerOutranks',
        logParams: {
          attacker: attackerName,
          defender: defenderName,
          damage: effectiveDmg,
        },
      };
    }

    // Obrońca ma ściśle wyższy stopień sukcesu -> to obrońca rani atakującego!
    if (defenderSuccess && defenderRank > attackerRank) {
      const dmgCalc = calculateMeleeDamage({
        weaponDamageFormula: defenderWeaponFormula,
        damageBonusFormula: defenderDamageBonusFormula,
        damageType: defenderDamageType,
        outcome: defenderOutcome,
        isCounterattack: true,
        rollFn,
      });

      const effectiveDmg = Math.max(0, dmgCalc.rawDamage - attackerArmor);
      const majorWound = checkMajorWound(
        effectiveDmg,
        attackerMaxHp,
        convention
      );

      return {
        winner: 'defender',
        defenseChoice,
        attackerOutcome,
        defenderOutcome,
        isTie: false,
        damageDealtTo: 'attacker',
        damage: {
          totalDamage: dmgCalc.rawDamage,
          effectiveDamage: effectiveDmg,
          isImpale: false, // Kontratak nie daje impale
          isMajorWound: majorWound.isMajorWound,
          breakdown: dmgCalc.breakdown,
        },
        logKey: 'fightBackDefenderStrikes',
        logParams: {
          defender: defenderName,
          attacker: attackerName,
          damage: effectiveDmg,
        },
      };
    }
  }

  // 4. MANEWR BOJOWY (Fighting Maneuver)
  if (defenseChoice === 'maneuver') {
    const maneuverCheck = checkManeuverFeasibility(
      defenderBuild,
      attackerBuild
    );

    if (!maneuverCheck.allowed) {
      // Manewr niemożliwy z powodu Budowy -> atakujący trafia jeśli ma sukces
      if (attackerSuccess) {
        const dmgCalc = calculateMeleeDamage({
          weaponDamageFormula: attackerWeaponFormula,
          damageBonusFormula: attackerDamageBonusFormula,
          damageType: attackerDamageType,
          outcome: attackerOutcome,
          isCounterattack: false,
          rollFn,
        });
        const effectiveDmg = Math.max(0, dmgCalc.rawDamage - defenderArmor);
        return {
          winner: 'attacker',
          defenseChoice,
          attackerOutcome,
          defenderOutcome,
          isTie: false,
          damageDealtTo: 'defender',
          damage: {
            totalDamage: dmgCalc.rawDamage,
            effectiveDamage: effectiveDmg,
            isImpale: dmgCalc.isImpale,
            isMajorWound: checkMajorWound(
              effectiveDmg,
              defenderMaxHp,
              convention
            ).isMajorWound,
            breakdown: dmgCalc.breakdown,
          },
          logKey: 'maneuverBlockedByBuild',
          logParams: {
            defender: defenderName,
            attacker: attackerName,
            damage: effectiveDmg,
          },
        };
      }
    }

    // W manewrze przy remisie wygrywa obrońca (RAW)
    if (defenderSuccess && defenderRank >= attackerRank) {
      return {
        winner: 'defender',
        defenseChoice,
        attackerOutcome,
        defenderOutcome,
        isTie,
        damageDealtTo: 'none',
        maneuverApplied: maneuverType || 'grapple',
        logKey: isTie ? 'maneuverSuccessTie' : 'maneuverSuccessOutranks',
        logParams: {
          defender: defenderName,
          attacker: attackerName,
          maneuver: maneuverType || 'grapple',
        },
      };
    }

    // Jeśli obrońca nie pobił atakującego -> atakujący zadaje obrażenia
    if (attackerSuccess && attackerRank > defenderRank) {
      const dmgCalc = calculateMeleeDamage({
        weaponDamageFormula: attackerWeaponFormula,
        damageBonusFormula: attackerDamageBonusFormula,
        damageType: attackerDamageType,
        outcome: attackerOutcome,
        isCounterattack: false,
        rollFn,
      });

      const effectiveDmg = Math.max(0, dmgCalc.rawDamage - defenderArmor);
      return {
        winner: 'attacker',
        defenseChoice,
        attackerOutcome,
        defenderOutcome,
        isTie: false,
        damageDealtTo: 'defender',
        damage: {
          totalDamage: dmgCalc.rawDamage,
          effectiveDamage: effectiveDmg,
          isImpale: dmgCalc.isImpale,
          isMajorWound: checkMajorWound(
            effectiveDmg,
            defenderMaxHp,
            convention
          ).isMajorWound,
          breakdown: dmgCalc.breakdown,
        },
        logKey: 'attackerOvercomesManeuver',
        logParams: {
          attacker: attackerName,
          defender: defenderName,
          damage: effectiveDmg,
        },
      };
    }
  }

  // Ostateczny fallback
  return {
    winner: 'none',
    defenseChoice,
    attackerOutcome,
    defenderOutcome,
    isTie,
    damageDealtTo: 'none',
    logKey: 'engagementUnresolved',
    logParams: { attacker: attackerName, defender: defenderName },
  };
}
