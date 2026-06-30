'use client';

import type { FC } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import type { Character } from '@/lib/types';
import {
  type DiceRoll,
  rollD100,
  rollD100WithBonus,
  createSkillRoll,
  formatRollForChat,
  formatRollForAI,
  saveRollToHistory,
  mapDifficultyToRequired,
} from '@/lib/dice-utils';
import { useLuckSpend } from './use-luck-spend';
import { RollTestResult } from './roll-test-result';

/**
 * Dane testu z tagu [TEST:] przekazane do modalu (z SkillTestCard po kliknięciu "Rzuć").
 */
export interface RollTestData {
  skill: string;
  value: number;
  difficulty: 'zwykly' | 'trudny' | 'ekstremalny';
  /** Bilans kości premii/kary (dodatnie = premia, ujemne = kara). */
  bonusDice: number;
  /** Uzasadnienie / okoliczności testu (do dziennika). */
  justification?: string;
}

interface RollTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: RollTestData | null;
  activeCharacter?: Character;
  /** Wysyła wynik rzutu do czatu (istniejąca ścieżka handleSendMessage). */
  onRollSendToChat?: (message: string, systemContext: string) => void;
  /** Zapisuje rzut do dziennika postaci (most appendRollToJournal w page.tsx). */
  onJournalRoll?: (roll: DiceRoll, justification?: string) => void;
  /** Odejmuje wydane pkt Szczęścia z karty postaci (CoC 7e Faza 5B). */
  onSpendLuck?: (amount: number) => void;
}

const ANIM_TICK_MS = 60;
const ANIM_DURATION_MS = 700;

/**
 * Mały modal Tacki sterowany WYŁĄCZNIE tagiem [TEST:] (D1 - uproszczenie Tacki).
 *
 * Przebieg: podsumowanie testu → animacja kości → wynik. Po nieudanym rzucie gracz może
 * wydać Szczęście (CoC 7e Faza 5B), by obniżyć wynik do progu, a potem RĘCZNIE wysłać
 * finalny rzut do czatu + dziennika ("Do czatu"). Rozdzielenie rzutu od wysyłki jest
 * konieczne - Szczęście wydaje się PO zobaczeniu nieudanego rzutu. Cała ocena idzie przez
 * kanoniczny silnik `dice-utils` (single source of truth - próg ½/⅕, fumble RAW, premia/kara).
 */
export const RollTestModal: FC<RollTestModalProps> = ({
  open,
  onOpenChange,
  test,
  activeCharacter,
  onRollSendToChat,
  onJournalRoll,
  onSpendLuck,
}) => {
  // 'idle' = przed rzutem, 'rolling' = animacja, 'done' = wynik gotowy (oczekuje wysłania).
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'done'>('idle');
  const [animValue, setAnimValue] = useState(0);
  const [roll, setRoll] = useState<DiceRoll | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { availableLuck, setAvailableLuck, luckNeeded, spendLuck } =
    useLuckSpend(activeCharacter?.luck ?? 0, roll, setRoll, onSpendLuck);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Reset stanu przy każdym otwarciu / zmianie testu / ZMIANIE POSTACI (po id).
  // Celowo zależymy od `activeCharacter?.id`, NIE całego obiektu: wydanie Szczęścia
  // odejmuje luck → rodzic tworzy nowy obiekt postaci (to samo id) → przy zależności
  // od `activeCharacter` useEffect resetował phase do 'idle' ("k100/RZUĆ") i chował
  // konwersję porażka→sukces. availableLuck synchronizuje sam hook (setAvailableLuck).
  useEffect(() => {
    if (open) {
      setPhase('idle');
      setRoll(null);
      setAnimValue(0);
      setAvailableLuck(activeCharacter?.luck ?? 0);
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, test, activeCharacter?.id, clearTimers, setAvailableLuck]);

  if (!test) return null;

  const requiredDifficulty = mapDifficultyToRequired(test.difficulty);

  const handleRoll = () => {
    if (phase !== 'idle') return;
    setPhase('rolling');

    // Wynik rzeczywisty (kości premii/kary uwzględnione przez silnik).
    const result =
      test.bonusDice !== 0
        ? rollD100WithBonus(test.bonusDice).total
        : rollD100();

    const finalRoll = createSkillRoll(
      test.skill,
      test.value,
      result,
      false,
      activeCharacter?.name,
      test.bonusDice,
      requiredDifficulty
    );

    // Animacja: migające losowe liczby, potem ustalenie wyniku.
    const interval = setInterval(() => {
      setAnimValue(Math.floor(Math.random() * 100) + 1);
    }, ANIM_TICK_MS);
    timersRef.current.push(
      interval as unknown as ReturnType<typeof setTimeout>
    );

    const settle = setTimeout(() => {
      clearInterval(interval);
      setAnimValue(result);
      setRoll(finalRoll);
      setPhase('done');
      // Historia łapie każdy rzut (nawet niewysłany). Wysyłka do czatu + dziennika
      // następuje dopiero po ręcznym "Do czatu" (po ewentualnym wydaniu Szczęścia).
      saveRollToHistory(finalRoll);
    }, ANIM_DURATION_MS);
    timersRef.current.push(settle);
  };

  // Wysyła FINALNY rzut (po ewentualnym wydaniu Szczęścia) do czatu + dziennika.
  const handleSend = () => {
    if (!roll) return;
    if (onRollSendToChat) {
      onRollSendToChat(
        formatRollForChat(roll),
        formatRollForAI(roll, activeCharacter?.name)
      );
    }
    onJournalRoll?.(roll, test.justification);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="wide">
        <DialogHeader>
          <div className="text-center">
            <div className="font-special-elite text-[14px] uppercase tracking-[0.32em] text-primary">
              Niech zadecyduje los
            </div>
            <DialogTitle className="mt-1 justify-center font-display text-xl font-bold uppercase tracking-[0.1em] text-foreground">
              Test: {test.skill}
            </DialogTitle>
          </div>
          <DialogDescription className="text-center font-serif italic text-muted-foreground">
            {test.justification || 'Rzuć kością, by rozstrzygnąć test.'}
          </DialogDescription>
        </DialogHeader>

        <RollTestResult
          test={test}
          phase={phase}
          animValue={animValue}
          roll={roll}
          availableLuck={availableLuck}
          luckNeeded={luckNeeded}
          onRoll={handleRoll}
          onSpendLuck={spendLuck}
          onSend={handleSend}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
