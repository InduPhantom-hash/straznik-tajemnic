'use client';

import type { FC } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { PhysicalDiceScene } from '@/components/dice/physical-dice-scene';
import { traceForD100Bonus } from '@/lib/dice-roll-trace';

export interface ArtDecoDiceBreakdown {
  tensResults: number[];
  unitsResult: number;
  selectedTens: number;
  total: number;
}

export interface ArtDecoDice3DProps {
  phase: 'idle' | 'rolling' | 'done';
  animValue: number;
  total?: number;
  breakdown?: ArtDecoDiceBreakdown | null;
  bonusDice?: number;
  luckSpent?: number;
}

/**
 * Trójwymiarowa Tacka Kości Dark Art Déco dla testu k100 (CoC 7e RAW).
 *
 * Prezentuje fizyczną parę kości dziesięciościennych (K10):
 *  1. Kość dziesiątek (00-90) - mosiądz / heban z grawerami Art Déco.
 *  2. Kość jedności (0-9) - szlachetny szmaragd / malachit ze złoceniami.
 *  3. Ewentualne dodatkowe kości dziesiątek przy kościach premii/kary (z wyróżnieniem
 *     wybranej i wyszarzeniem odrzuconej kości).
 */
export const ArtDecoDice3D: FC<ArtDecoDice3DProps> = ({
  phase,
  animValue,
  total,
  breakdown,
  bonusDice = 0,
  luckSpent,
}) => {
  const t = useTranslations('RollTestResult');

  // Obliczenie wartości wyświetlanych na kościach w zależności od fazy
  let tensDisplay = '00';
  let unitsDisplay = '0';
  let extraTensDisplay: { value: string; isSelected: boolean }[] = [];

  if (phase === 'rolling') {
    const rawTens = Math.floor((animValue % 100) / 10) * 10;
    tensDisplay = String(rawTens).padStart(2, '0');
    unitsDisplay = String(animValue % 10);
    if (bonusDice !== 0) {
      const extraRaw = ((rawTens + 30) % 100);
      extraTensDisplay = [{ value: String(extraRaw).padStart(2, '0'), isSelected: false }];
    }
  } else if (phase === 'done') {
    if (breakdown) {
      tensDisplay = String(breakdown.selectedTens).padStart(2, '0');
      unitsDisplay = String(breakdown.unitsResult);

      if (breakdown.tensResults.length > 1) {
        let foundSelected = false;
        extraTensDisplay = breakdown.tensResults.map((val) => {
          const isSelected = !foundSelected && val === breakdown.selectedTens;
          if (isSelected) foundSelected = true;
          return {
            value: String(val).padStart(2, '0'),
            isSelected,
          };
        });
      }
    } else if (total !== undefined) {
      const tensVal = total === 100 ? 0 : Math.floor((total % 100) / 10) * 10;
      const unitsVal = total === 100 ? 0 : total % 10;
      tensDisplay = String(tensVal).padStart(2, '0');
      unitsDisplay = String(unitsVal);
    }
  }

  // Finalna suma rzutu
  const finalTotal = total ?? (breakdown ? breakdown.total : animValue);
  const isRaw100 = tensDisplay === '00' && unitsDisplay === '0';
  const physicalTrace = traceForD100Bonus(
    finalTotal,
    breakdown?.tensResults ?? [Number(tensDisplay)],
    breakdown?.unitsResult ?? Number(unitsDisplay),
    bonusDice,
    'roll-test'
  );

  return (
    <div
      data-testid="art-deco-dice-3d"
      role="region"
      aria-label={t('diceTrayAria')}
      aria-busy={phase === 'rolling'}
      className="relative flex flex-col items-center justify-center w-full overflow-hidden rounded-md border border-brass/35 bg-[radial-gradient(ellipse_at_top,_#1c1813_0%,_#0d0b08_70%,_#060504_100%)] p-4 sm:p-5 shadow-[inset_0_0_35px_rgba(0,0,0,0.85)]"
    >
      {/* Ozdobne narożniki Art Déco */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brass/50 pointer-events-none" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-brass/50 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-brass/50 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brass/50 pointer-events-none" />

      <PhysicalDiceScene dice={physicalTrace.dice} rolling={phase === 'rolling'} label={t('diceTrayAria')} />

      {/* Semantyczna warstwa wyniku nad sceną WebGL. Nie rysuje atrap kości: wartości
          należą do tych samych elementów trace, które trafiają do silnika sceny. */}
      <div className="sr-only" aria-live="polite">
        {phase === 'done' && extraTensDisplay.length > 1 ? (
          extraTensDisplay.map((item, index) => (
            <span
              key={`${item.value}-${index}`}
              data-testid={item.isSelected ? 'tens-die' : 'extra-tens-die'}
            >
              {item.value} {item.isSelected ? t('dieSelected') : t('dieDiscarded')}
            </span>
          ))
        ) : (
          <>
            <span
              data-testid="tens-die"
              className={phase === 'rolling' ? 'animate-dice-tumble-tens' : undefined}
            >
              {tensDisplay}
            </span>
            {phase === 'rolling' && bonusDice !== 0 && extraTensDisplay[0] && (
              <span data-testid="extra-tens-die" className="animate-dice-tumble-extra">
                {extraTensDisplay[0].value}
              </span>
            )}
          </>
        )}
        <span
          data-testid="units-die"
          className={phase === 'rolling' ? 'animate-dice-tumble-units' : undefined}
        >
          {unitsDisplay}
        </span>
      </div>

      {/* Belka dekompozycji sumy / wzoru stołowego */}
      <div
        data-testid="dice-formula"
        className="relative mt-3 flex flex-col items-center justify-center text-center font-display"
      >
        {phase === 'idle' ? (
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/90 font-special-elite">
            <span className="text-brass">k100</span>
            <span>•</span>
            <span>{t('tensDie')} + {t('unitsDie')}</span>
          </div>
        ) : phase === 'rolling' ? (
          <div className="text-xs uppercase tracking-[0.2em] text-primary animate-pulse font-special-elite">
            {t('rolling')}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-bold tracking-wider text-foreground">
              <span className="px-2 py-0.5 rounded bg-black/60 border border-brass/35 text-brass">
                {tensDisplay}
              </span>
              <span className="text-muted-foreground">+</span>
              <span className="px-2 py-0.5 rounded bg-black/60 border border-primary/50 text-primary">
                {unitsDisplay}
              </span>
              <span className="text-muted-foreground">=</span>
              <span className="px-2.5 py-0.5 rounded bg-brass/15 border border-brass text-foreground text-base sm:text-lg [text-shadow:0_0_12px_rgba(201,162,39,0.5)]">
                {isRaw100 ? '100' : finalTotal}
              </span>
            </div>

            {/* Przypis dla 00 + 0 = 100 wg reguł d100 Weird Fiction */}
            {isRaw100 && (
              <p className="text-[11px] font-serif italic text-brass/90 tracking-wide">
                ({t('diceSumRaw100')} - d100 Weird Fiction)
              </p>
            )}

            {/* Informacja o kości premii/kary i odrzuceniu */}
            {bonusDice !== 0 && extraTensDisplay.length > 1 && (
              <p className="text-[11px] font-special-elite text-muted-foreground tracking-wide">
                {bonusDice > 0 ? t('bonusDicePlus', { count: bonusDice }) : t('bonusDiceMinus', { count: Math.abs(bonusDice) })}
              </p>
            )}

            {/* Informacja o wydanym Szczęściu */}
            {luckSpent && luckSpent > 0 ? (
              <p className="text-[11px] font-special-elite text-yellow-300 tracking-wide flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                {t('luckSpentNote', { amount: luckSpent })}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
