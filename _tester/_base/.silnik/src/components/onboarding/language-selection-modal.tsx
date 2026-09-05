'use client';

import { useState } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import type { MeasurementSystem } from '@/lib/types';

export function LanguageSelectionContent({
  onSelectLanguage
}: {
  onSelectLanguage: (locale: 'pl' | 'en', measurementSystem?: MeasurementSystem) => void;
}) {
  const [enMeasurement, setEnMeasurement] = useState<MeasurementSystem>('imperial');

  return (
    <div className="relative deco-corners w-full max-w-3xl border border-brass/40 bg-[#100d09] bg-[radial-gradient(circle_at_center,_#1a1610_0%,_#100d09_100%)] p-8 sm:p-12 text-center shadow-[0_0_60px_rgba(201,162,39,0.18)]">
      <p className="font-special-elite text-[10px] sm:text-xs uppercase tracking-[0.14em] text-brass/90 whitespace-nowrap">
        ZANIM ROZPOCZNIE SIĘ ŚLEDZTWO &bull; BEFORE THE INVESTIGATION BEGINS
      </p>
      <h1
        id="language-selection-title"
        className="mt-4 font-display-decorative text-xl sm:text-2xl md:text-3xl uppercase tracking-[0.06em] text-foreground whitespace-nowrap"
      >
        WYBIERZ JĘZYK <span className="text-brass/40 font-sans font-light text-lg sm:text-xl md:text-2xl mx-2">/</span> CHOOSE LANGUAGE
      </h1>
      <div className="mt-4 space-y-1">
        <p className="font-serif text-base sm:text-lg italic text-muted-foreground">
          Ten wybór ustawia język gry i narracji.
        </p>
        <p className="font-serif text-xs sm:text-sm italic text-muted-foreground/70">
          This choice sets the game and narrative language.
        </p>
      </div>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto items-start">
        {/* Polski Button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => onSelectLanguage('pl', 'metric')}
            className="w-full border border-brass/50 bg-brass/10 hover:bg-brass/20 px-6 py-4 font-display uppercase tracking-[0.14em] text-brass transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brass/60 cursor-pointer shadow-[0_0_15px_rgba(201,162,39,0.06)] hover:shadow-[0_0_20px_rgba(201,162,39,0.18)]"
          >
            Polski
          </button>
          <span className="mt-2 font-serif text-[11px] text-muted-foreground/80 italic">
            System metryczny (m, kg)
          </span>
        </div>

        {/* English Button + Measurement Switch */}
        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            onClick={() => onSelectLanguage('en', enMeasurement)}
            className="w-full border border-brass/50 bg-brass/10 hover:bg-brass/20 px-6 py-4 font-display uppercase tracking-[0.14em] text-brass transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brass/60 cursor-pointer shadow-[0_0_15px_rgba(201,162,39,0.06)] hover:shadow-[0_0_20px_rgba(201,162,39,0.18)]"
          >
            English
          </button>

          {/* Sub-selector for Units */}
          <div className="mt-2 w-full p-1.5 rounded bg-black/40 border border-brass/20 flex flex-col items-center gap-1">
            <span className="text-[10px] font-sans uppercase tracking-wider text-brass/70">
              Units / Jednostki
            </span>
            <div className="grid grid-cols-2 gap-1 w-full text-xs">
              <button
                type="button"
                onClick={() => setEnMeasurement('imperial')}
                className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                  enMeasurement === 'imperial'
                    ? 'bg-brass/30 text-brass font-bold border border-brass/50 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                Imperial (ft, lbs)
              </button>
              <button
                type="button"
                onClick={() => setEnMeasurement('metric')}
                className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                  enMeasurement === 'metric'
                    ? 'bg-brass/30 text-brass font-bold border border-brass/50 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                Metric (m, kg)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LanguageSelectionModalProps {
  open: boolean;
  onSelected: () => void;
}

export function LanguageSelectionModal({
  open,
  onSelected,
}: LanguageSelectionModalProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (!open) return null;

  const selectLanguage = (locale: 'pl' | 'en', measurementSystem: MeasurementSystem = 'metric') => {
    localStorage.setItem('language_selected', locale);
    localStorage.setItem('measurement_system', measurementSystem);
    onSelected();
    router.replace(pathname, { locale });
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 bg-[radial-gradient(ellipse_at_center,_rgba(26,22,16,0.85)_0%,_rgba(10,8,6,0.95)_100%)] p-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-selection-title"
    >
      <LanguageSelectionContent onSelectLanguage={selectLanguage} />
    </div>
  );
}

