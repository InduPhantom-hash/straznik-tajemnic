'use client';

import type { FC } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

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

      {/* Scena perspektywy 3D */}
      <div className="dice-perspective-tray relative flex items-center justify-center gap-4 sm:gap-6 min-h-[140px] sm:min-h-[160px] py-2 w-full">
        {/* Kości dziesiątek - jeśli są kości premii/kary w fazie done, renderujemy wszystkie rzucone kości dziesiątek */}
        {phase === 'done' && extraTensDisplay.length > 1 ? (
          extraTensDisplay.map((item, idx) => (
            <SingleDie
              key={`tens-dice-${idx}`}
              type="tens"
              value={item.value}
              phase={phase}
              animationClass="animate-dice-tumble-tens"
              isSelected={item.isSelected}
              isExtra={true}
              testId={item.isSelected ? 'tens-die' : 'extra-tens-die'}
              badgeLabel={item.isSelected ? t('dieSelected') : t('dieDiscarded')}
            />
          ))
        ) : (
          <>
            {/* Standardowa pojedyncza kość dziesiątek */}
            <SingleDie
              type="tens"
              value={tensDisplay}
              phase={phase}
              animationClass="animate-dice-tumble-tens"
              testId="tens-die"
              label={t('tensDie')}
            />

            {/* Dodatkowa kość dziesiątek w trakcie rzutu przy premii/karze */}
            {phase === 'rolling' && bonusDice !== 0 && extraTensDisplay[0] && (
              <SingleDie
                type="tens"
                value={extraTensDisplay[0].value}
                phase={phase}
                animationClass="animate-dice-tumble-extra"
                testId="extra-tens-die"
                label={bonusDice > 0 ? t('bonusDieLabel') : t('penaltyDieLabel')}
                isExtra={true}
              />
            )}
          </>
        )}

        {/* Kość jedności (szmaragd / złoto) */}
        <SingleDie
          type="units"
          value={unitsDisplay}
          phase={phase}
          animationClass="animate-dice-tumble-units"
          testId="units-die"
          label={t('unitsDie')}
        />
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

            {/* Przypis dla 00 + 0 = 100 wg reguł CoC 7e RAW */}
            {isRaw100 && (
              <p className="text-[11px] font-serif italic text-brass/90 tracking-wide">
                ({t('diceSumRaw100')} - CoC 7e RAW)
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

interface SingleDieProps {
  type: 'tens' | 'units';
  value: string;
  phase: 'idle' | 'rolling' | 'done';
  animationClass: string;
  testId: string;
  label?: string;
  badgeLabel?: string;
  isSelected?: boolean;
  isExtra?: boolean;
}

/**
 * Pojedyncza bryła K10 w stylu Dark Art Déco z fasetami wielobocznymi i cieniem.
 */
const SingleDie: FC<SingleDieProps> = ({
  type,
  value,
  phase,
  animationClass,
  testId,
  label,
  badgeLabel,
  isSelected = true,
  isExtra = false,
}) => {
  const isTens = type === 'tens';

  // Kropka pomocnicza pod cyfrą dla 6 i 9 (standard RPG)
  const needsDot = value === '6' || value === '9' || value === '60' || value === '90';

  return (
    <div className="relative flex flex-col items-center select-none" data-testid={testId}>
      {/* Odznaka wybrana / odrzucona dla dodatkowej kości premii/kary */}
      {badgeLabel && (
        <span
          className={cn(
            'mb-1 text-[10px] font-special-elite uppercase tracking-[0.14em] px-1.5 py-0.2 rounded border',
            isSelected
              ? 'border-brass/70 bg-brass/20 text-brass font-bold'
              : 'border-muted-foreground/30 bg-black/40 text-muted-foreground/70 line-through'
          )}
        >
          {badgeLabel}
        </span>
      )}

      {/* Bryła 3D kości */}
      <div
        className={cn(
          'dice-preserve-3d relative flex items-center justify-center transition-all duration-300',
          'w-[74px] h-[86px] sm:w-[82px] sm:h-[96px]',
          phase === 'rolling'
            ? animationClass
            : phase === 'done'
              ? 'animate-dice-settle'
              : 'hover:rotate-x-12 hover:-rotate-y-12 cursor-pointer',
          !isSelected && isExtra && 'opacity-40 grayscale-[40%]'
        )}
        style={{
          transform:
            phase === 'idle'
              ? isTens
                ? 'rotateX(16deg) rotateY(-14deg) rotateZ(2deg)'
                : 'rotateX(16deg) rotateY(14deg) rotateZ(-2deg)'
              : phase === 'done'
                ? isTens
                  ? 'rotateX(12deg) rotateY(-6deg) rotateZ(0deg)'
                  : 'rotateX(12deg) rotateY(6deg) rotateZ(0deg)'
                : undefined,
        }}
      >
        {/* Warstwa zewnętrzna - fasetowany obrys K10 ze złotym/szmaragdowym rantem */}
        <div
          className={cn(
            'dice-facet-k10 absolute inset-0 p-[2.5px] transition-colors',
            isTens
              ? isSelected
                ? 'bg-gradient-to-b from-[#e5be58] via-[#8c6b1c] to-[#3a2c0b] shadow-[0_0_15px_rgba(201,162,39,0.35)]'
                : 'bg-gradient-to-b from-[#735b27] via-[#3a2c0b] to-[#1a1405]'
              : 'bg-gradient-to-b from-[#2dd4bf] via-[#0d9488] to-[#042f2e] shadow-[0_0_15px_rgba(13,148,136,0.4)]'
          )}
        >
          {/* Warstwa wewnętrzna - heban/obsydian lub szmaragd */}
          <div
            className={cn(
              'dice-facet-k10-inner relative w-full h-full flex flex-col items-center justify-center overflow-hidden',
              isTens
                ? 'bg-[radial-gradient(circle_at_50%_35%,_#221d17_0%,_#110e0b_65%,_#060504_100%)]'
                : 'bg-[radial-gradient(circle_at_50%_35%,_#083e33_0%,_#04221c_65%,_#02120e_100%)]'
            )}
          >
            {/* Geometria Art Déco - subtelne linie faset i promienie */}
            <div className="absolute inset-0 opacity-25 bg-[radial-gradient(polygon_at_50%_0%,_rgba(255,255,255,0.4)_0%,_transparent_70%)] pointer-events-none" />
            <div className="absolute top-0 w-full h-[35%] bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

            {/* Cyfra kości */}
            <span
              className={cn(
                'relative font-display font-black tracking-tighter leading-none select-none',
                isTens
                  ? 'text-2xl sm:text-3xl text-[#f7e2a8] [text-shadow:0_0_10px_rgba(201,162,39,0.6)]'
                  : 'text-3xl sm:text-4xl text-[#a7f3d0] [text-shadow:0_0_12px_rgba(45,212,191,0.7)]',
                !isSelected && isExtra && 'line-through decoration-destructive decoration-2'
              )}
            >
              {value}
            </span>

            {/* Kropka orientacyjna (np. dla 6 i 9) */}
            {needsDot && (
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full mt-0.5',
                  isTens ? 'bg-[#f7e2a8]' : 'bg-[#a7f3d0]'
                )}
              />
            )}
          </div>
        </div>
      </div>

      {/* Rzucany cień na welwetową tackę */}
      <div
        className={cn(
          'w-16 h-3 rounded-full bg-black/80 blur-[5px] mt-1.5 transition-all',
          phase === 'rolling' && 'animate-dice-shadow-tumble',
          !isSelected && isExtra && 'opacity-30'
        )}
      />

      {/* Podpis typu kości (np. dziesiątki / jedności) */}
      {label && !badgeLabel && (
        <span className="mt-1 text-[10px] sm:text-[11px] font-special-elite uppercase tracking-[0.14em] text-muted-foreground/80">
          {label}
        </span>
      )}
    </div>
  );
};
