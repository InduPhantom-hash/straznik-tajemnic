import { useState, useCallback } from 'react';
import {
  DiceRoll,
  evaluateSkillCheck,
  isSuccess,
  meetsDifficulty,
  requiredThreshold,
} from '@/lib/dice-utils';

/**
 * Logika wydawania Szczęścia (CoC 7e Luck spending, Faza 5B) dla pojedynczego rzutu.
 * Wyciągnięta z DiceDialog (D1), by trzymać dialog < 200 linii i nie duplikować zasad.
 *
 * `luckNeeded` = ile pkt trzeba wydać, by rzut zaliczył próg (null gdy nie wolno:
 * fumble, test Poczytalności, już zdany, już użyto Szczęścia, lub brak danych testu).
 */
export function useLuckSpend(
  initialLuck: number,
  roll: DiceRoll | null,
  setRoll: (updater: (prev: DiceRoll | null) => DiceRoll | null) => void,
  onSpendLuck?: (amount: number) => void
) {
  const [availableLuck, setAvailableLuck] = useState(initialLuck);

  const luckNeeded = ((): number | null => {
    if (!roll || roll.targetValue === undefined || !roll.outcome) return null;
    if (roll.luckSpent || roll.outcome === 'fumble') return null;
    if (/poczytaln|sanity|\bsan\b/i.test(roll.skillName ?? '')) return null;
    const required = roll.requiredDifficulty ?? 'regular';
    const passed = roll.requiredDifficulty
      ? roll.passedRequirement === true
      : isSuccess(roll.outcome);
    if (passed) return null;
    const needed = roll.total - requiredThreshold(roll.targetValue, required);
    return needed > 0 ? needed : null;
  })();

  const spendLuck = useCallback(() => {
    if (!roll || luckNeeded === null || luckNeeded > availableLuck) return;
    if (roll.targetValue === undefined) return;
    const required = roll.requiredDifficulty ?? 'regular';
    const threshold = requiredThreshold(roll.targetValue, required);
    const newOutcome = evaluateSkillCheck(threshold, roll.targetValue);
    setRoll((prev) =>
      prev
        ? {
            ...prev,
            total: threshold,
            outcome: newOutcome,
            passedRequirement: prev.requiredDifficulty
              ? meetsDifficulty(newOutcome, required)
              : undefined,
            luckSpent: luckNeeded,
          }
        : prev
    );
    setAvailableLuck((l) => l - luckNeeded);
    onSpendLuck?.(luckNeeded);
  }, [roll, luckNeeded, availableLuck, setRoll, onSpendLuck]);

  return { availableLuck, setAvailableLuck, luckNeeded, spendLuck };
}
