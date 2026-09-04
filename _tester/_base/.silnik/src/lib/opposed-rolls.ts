/**
 * @file opposed-rolls.ts
 * Deterministyczny silnik testów przeciwstawnych (Opposed Rolls) według oficjalnych zasad Call of Cthulhu 7e (RAW).
 *
 * Zasady CoC 7e RAW (Księga Strażnika, s. 88):
 * 1. Zwycięża strona, która osiągnie wyższy stopień sukcesu:
 *    Krytyk (01) > Ekstremalny (≤ 1/5) > Trudny (≤ 1/2) > Zwykły (≤ wartość) > Porażka > Fumble (96-100 / 100).
 * 2. Obie strony z porażką: nikt nie osiąga celu (impas / obopólna porażka).
 * 3. Remis stopni sukcesu (np. obaj trudny sukces):
 *    Wygrywa strona o wyższej bazowej wartości cechy/umiejętności.
 * 4. Remis absolutny (ten sam stopień sukcesu ORAZ identyczna wartość cechy):
 *    Pat fabularny (draw) z możliwością ponownego rzutu (reroll) do natychmiastowego rozstrzygnięcia.
 * 5. Każda ze stron może posiadać niezależne kości premiowe (+1, +2) lub karne (-1, -2).
 */

import {
  type RollOutcome,
  evaluateSkillCheck,
  rollD100WithBonus,
} from '@/lib/dice-utils';

export type OpposedWinner = 'sideA' | 'sideB' | 'draw';

export type OpposedTieBreaker =
  | 'outcome_rank'
  | 'skill_value'
  | 'exact_tie'
  | 'mutual_failure';

export interface OpposedRollSideConfig {
  id?: string;
  name: string;
  skillName: string;
  skillValue: number;
  bonusDice?: number;
  isPlayer?: boolean;
  characterId?: string;
}

export interface OpposedThresholds {
  regular: number;
  hard: number;
  extreme: number;
  fumble: number;
}

export interface OpposedRollSideResult {
  id?: string;
  name: string;
  skillName: string;
  skillValue: number;
  bonusDice: number;
  total: number;
  tensResults: number[];
  unitsResult: number;
  outcome: RollOutcome;
  thresholds: OpposedThresholds;
  isPlayer?: boolean;
  characterId?: string;
}

export interface OpposedRollResolution {
  sideA: OpposedRollSideResult;
  sideB: OpposedRollSideResult;
  winner: OpposedWinner;
  winnerName: string | null;
  loserName: string | null;
  isDraw: boolean;
  tieBreaker: OpposedTieBreaker;
  canReroll: boolean;
  summaryKey: string;
  summaryParams: Record<string, string | number>;
}

/**
 * Wagi stopni sukcesu CoC 7e do porównywania wyników w testach przeciwstawnych.
 */
export const OPPOSED_OUTCOME_RANKS: Record<RollOutcome, number> = {
  critical: 5,
  extreme: 4,
  hard: 3,
  regular: 2,
  fail: 1,
  fumble: 0,
};

/**
 * Zwraca czy wynik to jakikolwiek sukces (regular lub wyżej).
 */
export function isSuccessOutcome(outcome: RollOutcome): boolean {
  return OPPOSED_OUTCOME_RANKS[outcome] >= OPPOSED_OUTCOME_RANKS.regular;
}

/**
 * Oblicza progi sukcesów CoC 7e dla danej wartości umiejętności/cechy.
 */
export function calculateOpposedThresholds(skillValue: number): OpposedThresholds {
  const safeValue = Math.max(1, Math.min(99, skillValue));
  return {
    regular: safeValue,
    hard: Math.floor(safeValue / 2),
    extreme: Math.floor(safeValue / 5),
    fumble: safeValue < 50 ? 96 : 100,
  };
}

/**
 * Wykonuje deterministyczny rzut k100 z kośćmi premiowymi/karnymi dla pojedynczej strony.
 */
export function rollSide(config: OpposedRollSideConfig): OpposedRollSideResult {
  const bonus = config.bonusDice || 0;
  const clampedBonus = Math.max(-2, Math.min(2, bonus));
  const { total, tensResults, unitsResult } = rollD100WithBonus(clampedBonus);
  const outcome = evaluateSkillCheck(total, config.skillValue);
  const thresholds = calculateOpposedThresholds(config.skillValue);

  return {
    id: config.id,
    name: config.name,
    skillName: config.skillName,
    skillValue: config.skillValue,
    bonusDice: clampedBonus,
    total,
    tensResults,
    unitsResult,
    outcome,
    thresholds,
    isPlayer: config.isPlayer,
    characterId: config.characterId,
  };
}

/**
 * Deterministycznie rozstrzyga test przeciwstawny dwóch stron według CoC 7e RAW.
 * Może być wywoływane zarówno dla świeżo rzuconych kości, jak i ze z góry ustalonymi wynikami (np. w testach jednostkowych).
 */
export function evaluateOpposedResolution(
  sideA: OpposedRollSideResult,
  sideB: OpposedRollSideResult
): OpposedRollResolution {
  const rankA = OPPOSED_OUTCOME_RANKS[sideA.outcome];
  const rankB = OPPOSED_OUTCOME_RANKS[sideB.outcome];
  const isSuccessA = isSuccessOutcome(sideA.outcome);
  const isSuccessB = isSuccessOutcome(sideB.outcome);

  // 1. Obie strony poniosły porażkę (Failure lub Fumble)
  if (!isSuccessA && !isSuccessB) {
    return {
      sideA,
      sideB,
      winner: 'draw',
      winnerName: null,
      loserName: null,
      isDraw: true,
      tieBreaker: 'mutual_failure',
      canReroll: true,
      summaryKey: 'mutualFailure',
      summaryParams: {
        sideA: sideA.name,
        sideB: sideB.name,
      },
    };
  }

  // 2. Różne stopnie sukcesu - wyższy stopień wygrywa
  if (rankA !== rankB) {
    const isAWinner = rankA > rankB;
    const winnerSide = isAWinner ? sideA : sideB;
    const loserSide = isAWinner ? sideB : sideA;

    return {
      sideA,
      sideB,
      winner: isAWinner ? 'sideA' : 'sideB',
      winnerName: winnerSide.name,
      loserName: loserSide.name,
      isDraw: false,
      tieBreaker: 'outcome_rank',
      canReroll: false,
      summaryKey: 'winByOutcomeRank',
      summaryParams: {
        winner: winnerSide.name,
        loser: loserSide.name,
        winnerRank: winnerSide.outcome,
        loserRank: loserSide.outcome,
      },
    };
  }

  // 3. Identyczny stopień sukcesu - rozstrzygnięcie wartością bazową
  if (sideA.skillValue !== sideB.skillValue) {
    const isAWinner = sideA.skillValue > sideB.skillValue;
    const winnerSide = isAWinner ? sideA : sideB;
    const loserSide = isAWinner ? sideB : sideA;

    return {
      sideA,
      sideB,
      winner: isAWinner ? 'sideA' : 'sideB',
      winnerName: winnerSide.name,
      loserName: loserSide.name,
      isDraw: false,
      tieBreaker: 'skill_value',
      canReroll: false,
      summaryKey: 'winBySkillValue',
      summaryParams: {
        winner: winnerSide.name,
        loser: loserSide.name,
        winnerSkill: winnerSide.skillValue,
        loserSkill: loserSide.skillValue,
        outcome: sideA.outcome,
      },
    };
  }

  // 4. Remis absolutny (ten sam stopień sukcesu ORAZ identyczna wartość bazowa)
  return {
    sideA,
    sideB,
    winner: 'draw',
    winnerName: null,
    loserName: null,
    isDraw: true,
    tieBreaker: 'exact_tie',
    canReroll: true,
    summaryKey: 'exactTie',
    summaryParams: {
      sideA: sideA.name,
      sideB: sideB.name,
      skillValue: sideA.skillValue,
      outcome: sideA.outcome,
    },
  };
}

/**
 * Przeprowadza pełny rzut i rozstrzygnięcie testu przeciwstawnego dla dwóch stron.
 */
export function rollAndResolveOpposed(
  sideAConfig: OpposedRollSideConfig,
  sideBConfig: OpposedRollSideConfig
): OpposedRollResolution {
  const sideA = rollSide(sideAConfig);
  const sideB = rollSide(sideBConfig);
  return evaluateOpposedResolution(sideA, sideB);
}

/**
 * Formatuje wynik testu przeciwstawnego do czytelnej wiadomości na czacie.
 */
export function formatOpposedRollForChat(
  resolution: OpposedRollResolution,
  t?: (key: string, params?: Record<string, any>) => string
): string {
  const { sideA, sideB, winner, tieBreaker } = resolution;

  const outcomeMap: Record<RollOutcome, string> = {
    critical: 'Krytyczny sukces (01)',
    extreme: 'Sukces ekstremalny',
    hard: 'Trudny sukces',
    regular: 'Zwykły sukces',
    fail: 'Porażka',
    fumble: 'Fumble',
  };

  const lineA = `🎲 **${sideA.name}** [${sideA.skillName} ${sideA.skillValue}%]: rzut **${sideA.total}** → ${outcomeMap[sideA.outcome]}`;
  const lineB = `🎲 **${sideB.name}** [${sideB.skillName} ${sideB.skillValue}%]: rzut **${sideB.total}** → ${outcomeMap[sideB.outcome]}`;

  let verdict: string;
  if (winner === 'draw') {
    if (tieBreaker === 'mutual_failure') {
      verdict = `⚖️ **Wynik:** Obopólna porażka — nikt nie osiąga przewagi.`;
    } else {
      verdict = `⚖️ **Wynik:** Pat absolutny (${outcomeMap[sideA.outcome]}, równa wartość ${sideA.skillValue}%). Sytuacja nierozstrzygnięta!`;
    }
  } else {
    const winnerSide = winner === 'sideA' ? sideA : sideB;
    const loserSide = winner === 'sideA' ? sideB : sideA;

    if (tieBreaker === 'outcome_rank') {
      verdict = `🏆 **Wynik:** Zwycięża **${winnerSide.name}** wyższym stopniem sukcesu (${outcomeMap[winnerSide.outcome]} vs ${outcomeMap[loserSide.outcome]}).`;
    } else {
      verdict = `🏆 **Wynik:** Remis stopnia (${outcomeMap[winnerSide.outcome]}). Zwycięża **${winnerSide.name}** wyższą wartością bazową (${winnerSide.skillValue}% vs ${loserSide.skillValue}%).`;
    }
  }

  return `${lineA}\n${lineB}\n${verdict}`;
}

/**
 * Formatuje wynik testu przeciwstawnego do kontekstu systemowego dla Strażnika Tajemnic (AI MG).
 */
export function formatOpposedRollForSystemContext(
  resolution: OpposedRollResolution
): string {
  const { sideA, sideB, winner, tieBreaker } = resolution;

  return JSON.stringify({
    type: 'opposed_roll_resolution',
    winner,
    tieBreaker,
    sideA: {
      name: sideA.name,
      skill: sideA.skillName,
      value: sideA.skillValue,
      roll: sideA.total,
      outcome: sideA.outcome,
      bonusDice: sideA.bonusDice,
    },
    sideB: {
      name: sideB.name,
      skill: sideB.skillName,
      value: sideB.skillValue,
      roll: sideB.total,
      outcome: sideB.outcome,
      bonusDice: sideB.bonusDice,
    },
  });
}
