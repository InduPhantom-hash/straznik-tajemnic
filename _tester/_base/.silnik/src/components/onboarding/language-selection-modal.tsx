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
    <div className="relative deco-corners w-full max-w-4xl border border-brass/50 bg-[#100d09] bg-[radial-gradient(circle_at_center,_#1c1712_0%,_#0d0a07_100%)] p-8 sm:p-12 md:p-14 text-center shadow-[0_0_80px_rgba(201,162,39,0.22)]">
      <p className="font-special-elite text-xs sm:text-sm uppercase tracking-[0.18em] text-brass/90 whitespace-nowrap">
        ZANIM ROZPOCZNIE SIĘ ŚLEDZTWO &bull; BEFORE THE INVESTIGATION BEGINS
      </p>
      <h1
        id="language-selection-title"
        className="mt-4 sm:mt-5 font-display-decorative text-2xl sm:text-3xl md:text-4xl uppercase tracking-[0.08em] text-foreground"
      >
        WYBIERZ JĘZYK <span className="text-brass/40 font-sans font-light text-xl sm:text-2xl md:text-3xl mx-2 sm:mx-3">/</span> CHOOSE LANGUAGE
      </h1>
      <div className="mt-4 sm:mt-5 space-y-1.5">
        <p className="font-serif text-lg sm:text-xl md:text-2xl italic text-foreground/90">
          Ten wybór ustawia język gry i narracji.
        </p>
        <p className="font-serif text-sm sm:text-base md:text-lg italic text-muted-foreground/80">
          This choice sets the game and narrative language.
        </p>
      </div>

      <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 max-w-2xl mx-auto items-start">
        {/* Polski Button */}
        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            onClick={() => onSelectLanguage('pl', 'metric')}
            className="w-full border-2 border-brass/60 bg-brass/15 hover:bg-brass/25 px-8 py-5 sm:py-6 font-display text-lg sm:text-xl uppercase tracking-[0.16em] text-brass hover:text-brass-light transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brass cursor-pointer shadow-[0_0_20px_rgba(201,162,39,0.12)] hover:shadow-[0_0_30px_rgba(201,162,39,0.25)] hover:border-brass active:scale-[0.99]"
          >
            Polski
          </button>
          <span className="mt-2.5 font-serif text-xs sm:text-sm text-muted-foreground/90 italic">
            System metryczny (m, kg)
          </span>
        </div>

        {/* English Button + Measurement Switch */}
        <div className="flex flex-col items-center w-full">
          <button
            type="button"
            onClick={() => onSelectLanguage('en', enMeasurement)}
            className="w-full border-2 border-brass/60 bg-brass/15 hover:bg-brass/25 px-8 py-5 sm:py-6 font-display text-lg sm:text-xl uppercase tracking-[0.16em] text-brass hover:text-brass-light transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brass cursor-pointer shadow-[0_0_20px_rgba(201,162,39,0.12)] hover:shadow-[0_0_30px_rgba(201,162,39,0.25)] hover:border-brass active:scale-[0.99]"
          >
            English
          </button>

          {/* Sub-selector for Units */}
          <div className="mt-2.5 w-full p-2 rounded bg-black/50 border border-brass/30 flex flex-col items-center gap-1.5 shadow-inner">
            <span className="text-[11px] sm:text-xs font-sans uppercase tracking-wider text-brass/80 font-medium">
              Units / Jednostki
            </span>
            <div className="grid grid-cols-2 gap-1.5 w-full text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setEnMeasurement('imperial')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-mono rounded transition-colors ${
                  enMeasurement === 'imperial'
                    ? 'bg-brass/35 text-brass font-bold border border-brass/60 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                Imperial (ft, lbs)
              </button>
              <button
                type="button"
                onClick={() => setEnMeasurement('metric')}
                className={`px-3 py-1.5 text-xs sm:text-sm font-mono rounded transition-colors ${
                  enMeasurement === 'metric'
                    ? 'bg-brass/35 text-brass font-bold border border-brass/60 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                Metric (m, kg)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 18+ Mature Content Warning Frame */}
      <div
        className="mt-8 sm:mt-10 max-w-2xl mx-auto rounded border border-destructive/40 bg-destructive/10 px-5 py-4 sm:px-6 sm:py-5 text-left shadow-[0_0_25px_rgba(179,50,44,0.12)] relative overflow-hidden"
        role="note"
        aria-label="Content Warning 18+"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-destructive/70" />
        <div className="flex items-center gap-2.5 mb-2">
          <span className="inline-block px-2 py-0.5 text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase bg-destructive/25 text-destructive-foreground border border-destructive/50 rounded-sm">
            18+ &bull; MATURE AUDIENCE
          </span>
          <span className="font-display text-xs sm:text-sm uppercase tracking-wider text-amber-200/90 font-semibold">
            Ostrzeżenie o zawartości / Content Warning
          </span>
        </div>
        <p className="font-serif text-xs sm:text-sm leading-relaxed text-foreground/85">
          Gra porusza tematy drażliwe, kontrowersyjne, szaleństwo oraz sceny brutalne i grozę. Doświadczenie przeznaczone jest dla osób pełnoletnich.
        </p>
        <p className="mt-1 font-serif text-[11px] sm:text-xs leading-relaxed text-muted-foreground/75 italic">
          This game contains sensitive themes, controversial topics, madness, depictions of violence, and horror. Intended for mature audiences only.
        </p>
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

