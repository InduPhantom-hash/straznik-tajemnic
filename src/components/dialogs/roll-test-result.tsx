'use client';

import type { FC } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dices, Sparkles, Send } from 'lucide-react';
import {
  type DiceRoll,
  getOutcomeInfo,
  isSuccess,
  REQUIRED_DIFFICULTY_LABELS,
} from '@/lib/dice-utils';
import type { RollTestData } from './RollTestModal';

const DIFFICULTY_LABEL: Record<RollTestData['difficulty'], string> = {
  zwykly: 'Zwykły',
  trudny: 'Trudny (½)',
  ekstremalny: 'Ekstremalny (⅕)',
};

interface RollTestResultProps {
  test: RollTestData;
  phase: 'idle' | 'rolling' | 'done';
  animValue: number;
  roll: DiceRoll | null;
  /** Dostępne pkt Szczęścia (CoC 7e Faza 5B); null luckNeeded = nie wolno / nie trzeba. */
  availableLuck: number;
  luckNeeded: number | null;
  onRoll: () => void;
  onSpendLuck: () => void;
  onSend: () => void;
  onClose: () => void;
}

/**
 * Panel ciała modalu Tacki [TEST:]: podsumowanie trudności → animowana kość + werdykt
 * → akcje (Rzuć / Wydaj Szczęście / Do czatu / Zamknij). Wydzielony z RollTestModal.
 */
export const RollTestResult: FC<RollTestResultProps> = ({
  test,
  phase,
  animValue,
  roll,
  availableLuck,
  luckNeeded,
  onRoll,
  onSpendLuck,
  onSend,
  onClose,
}) => {
  const target = test.value;
  const hardThreshold = Math.floor(target / 2);
  const extremeThreshold = Math.floor(target / 5);
  const MUTED = 'text-muted-foreground';
  const thClass = (key: RollTestData['difficulty'], active: string) =>
    test.difficulty === key ? `${active} font-semibold` : MUTED;

  const succeeded = roll
    ? roll.requiredDifficulty && roll.passedRequirement !== undefined
      ? roll.passedRequirement
      : roll.outcome
        ? isSuccess(roll.outcome)
        : false
    : false;
  // Test z USTAWIONĄ trudnością (½/⅕): "zwykły sukces" nie spełniający progu jest dla
  // TEGO testu porażką. Synchronizujemy główny werdykt z `succeeded`, by uniknąć
  // sprzeczności "👍 SUKCES | ✗ test trudny" (np. rzut 58 przy progu trudnym ≤37).
  const hasSetDifficulty =
    !!roll?.requiredDifficulty &&
    roll.requiredDifficulty !== 'regular' &&
    roll.passedRequirement !== undefined;
  const rawOutcomeInfo = roll?.outcome ? getOutcomeInfo(roll.outcome) : null;
  const outcomeInfo =
    hasSetDifficulty && !succeeded && roll?.outcome && isSuccess(roll.outcome)
      ? getOutcomeInfo('fail')
      : rawOutcomeInfo;

  const bonusLabel =
    test.bonusDice > 0
      ? `+${test.bonusDice} kość premii`
      : test.bonusDice < 0
        ? `${Math.abs(test.bonusDice)} kość kary`
        : null;

  const canSpendLuck =
    phase === 'done' && luckNeeded !== null && luckNeeded <= availableLuck;

  return (
    <div className="space-y-4 py-2">
      {/* Podsumowanie testu: próg trudności + kości premii/kary */}
      <div className="border border-brass/28 bg-[#16130f] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-special-elite text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Trudność
          </span>
          <Badge variant="secondary">{DIFFICULTY_LABEL[test.difficulty]}</Badge>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-special-elite text-xs uppercase tracking-[0.06em]">
          <span className={thClass('zwykly', 'text-foreground')}>
            Zwykły ≤ {target}
          </span>
          <span className={thClass('trudny', 'text-brass')}>
            Trudny ≤ {hardThreshold}
          </span>
          <span className={thClass('ekstremalny', 'text-primary')}>
            Ekstremalny ≤ {extremeThreshold}
          </span>
        </div>
        {bonusLabel && (
          <div className="text-center">
            <Badge
              variant="outline"
              className={
                test.bonusDice > 0
                  ? 'border-primary/50 text-primary'
                  : 'border-destructive/50 text-destructive'
              }
            >
              🎲 {bonusLabel}
            </Badge>
          </div>
        )}
      </div>

      {/* Kość wyniku - animowana, potem ustalony wynik */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden border border-brass/28 bg-[radial-gradient(80%_70%_at_50%_40%,#16130f,#0c0a07)] px-6 py-7">
        <div className="relative flex items-center justify-center w-[130px] h-[130px]">
          <div
            className={`absolute inset-0 border border-primary/50 rotate-45 ${phase === 'rolling' ? 'animate-spin' : 'animate-emerald-pulse'}`}
          />
          <div className="absolute inset-[14px] border border-brass/40 rotate-45" />
          <div className="relative font-display font-bold text-[58px] leading-none text-foreground [text-shadow:0_0_24px_rgba(13,148,136,0.4)]">
            {phase === 'idle' ? 'k100' : animValue}
          </div>
        </div>

        {phase === 'done' && outcomeInfo && (
          <div
            className={`relative mt-3 font-display text-lg uppercase tracking-[0.16em] ${outcomeInfo.color}`}
          >
            {outcomeInfo.emoji} {outcomeInfo.label}
          </div>
        )}
        {phase === 'done' &&
          roll?.requiredDifficulty &&
          roll.requiredDifficulty !== 'regular' &&
          roll.passedRequirement !== undefined && (
            <div
              className={`relative mt-1 font-special-elite text-xs tracking-[0.1em] ${succeeded ? 'text-primary' : 'text-destructive'}`}
            >
              {succeeded ? '✓' : '✗'} test{' '}
              {REQUIRED_DIFFICULTY_LABELS[roll.requiredDifficulty]}
            </div>
          )}
        {phase === 'done' && roll?.luckSpent ? (
          <div className="relative mt-1 font-special-elite text-xs tracking-[0.1em] text-yellow-300">
            ✦ wydano {roll.luckSpent} pkt Szczęścia
          </div>
        ) : null}
      </div>

      {/* Akcje */}
      <div className="flex items-center justify-center gap-3 pt-1">
        {phase === 'idle' ? (
          <Button
            onClick={onRoll}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display uppercase tracking-[0.12em] px-8"
          >
            <Dices className="w-4 h-4 mr-2" />
            Rzuć
          </Button>
        ) : (
          <>
            {canSpendLuck && (
              <Button
                variant="outline"
                onClick={onSpendLuck}
                className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10 font-display uppercase tracking-[0.1em]"
                title={`Wydaj ${luckNeeded} pkt Szczęścia (masz ${availableLuck})`}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Szczęście {luckNeeded}
              </Button>
            )}
            {phase === 'done' && (
              <Button
                onClick={onSend}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-display uppercase tracking-[0.12em]"
              >
                <Send className="w-4 h-4 mr-2" /> Do czatu
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={phase === 'rolling'}
              className="font-display uppercase tracking-[0.1em] text-muted-foreground"
            >
              Zamknij
            </Button>
          </>
        )}
      </div>
      {phase === 'done' && (
        <p className="text-center font-serif italic text-xs text-muted-foreground/80">
          Wydaj Szczęście (jeśli dostępne), a potem wyślij rzut „Do czatu”.
        </p>
      )}
    </div>
  );
};
