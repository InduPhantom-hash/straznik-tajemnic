'use client';

import { useState } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import type { MeasurementSystem } from '@/lib/types';
import { Globe, Compass } from 'lucide-react';

export function LanguageSelectionContent({
  onSelectLanguage
}: {
  onSelectLanguage: (locale: 'pl' | 'en', measurementSystem?: MeasurementSystem) => void;
}) {
  const [enMeasurement, setEnMeasurement] = useState<MeasurementSystem>('imperial');

  return (
    <div className="relative w-full max-w-5xl text-center z-20 flex flex-col items-center">
      {/* Płomień świecy CSS */}
      <div className="mb-3 animate-candle-flicker">
        <div className="deco-candle" />
      </div>

      {/* Subtelny nadtytuł */}
      <p className="font-special-elite text-xs sm:text-sm uppercase tracking-[0.35em] text-primary mb-2">
        ZANIM ROZPOCZNIE SIĘ ŚLEDZTWO &bull; BEFORE THE INVESTIGATION BEGINS
      </p>

      {/* Główny nagłówek Cinzel Decorative w pełnej krasie */}
      <h1
        id="language-selection-title"
        className="font-display-decorative font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase tracking-[0.08em] leading-tight text-foreground"
        style={{ textShadow: '0 0 45px rgba(201,162,39,0.22)' }}
      >
        STRAŻNIK TAJEMNIC
        <br />
        <span className="text-2xl sm:text-3xl md:text-4xl text-brass font-normal">
          WYBIERZ JĘZYK <span className="text-brass/40 font-sans font-light mx-2">/</span> CHOOSE LANGUAGE
        </span>
      </h1>

      {/* Déco-divider z diamentami jak na WelcomeScreen */}
      <div className="flex items-center gap-4 my-4 sm:my-5 w-[min(540px,90vw)]">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
        <span className="w-2 h-2 bg-brass rotate-45" />
        <span className="font-display text-xs sm:text-sm tracking-[0.28em] uppercase text-brass whitespace-nowrap">
          WIRTUALNY MISTRZ GRY &bull; VIRTUAL GAME MASTER
        </span>
        <span className="w-2 h-2 bg-brass rotate-45" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold" />
      </div>

      {/* Dwujęzyczny opis pomocniczy */}
      <div className="space-y-1 mb-8">
        <p className="font-serif text-lg sm:text-xl italic text-foreground/90">
          Ten wybór ustala język rozgrywki, dialogów oraz styl narracji.
        </p>
        <p className="font-serif text-sm sm:text-base italic text-muted-foreground/80">
          This choice sets the game, dialogue, and narrative language.
        </p>
      </div>

      {/* 2 duże kafle wyboru języka wzorowane 1:1 na kaflach menu głównego */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-2 items-stretch">
        {/* Kafel: Polski */}
        <button
          type="button"
          data-testid="btn-language-pl"
          onClick={() => onSelectLanguage('pl', 'metric')}
          className="deco-corners relative flex flex-col items-start justify-between p-7 sm:p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610]/95 to-[#100d09]/95 shadow-[0_0_35px_rgba(201,162,39,0.08)] backdrop-blur-sm hover:brightness-125 hover:border-primary/60 hover:shadow-[0_0_45px_rgba(20,184,166,0.2)] cursor-pointer transition-all group text-left min-h-[200px]"
        >
          <div className="flex items-center gap-5 w-full mb-3">
            <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-primary group-hover:scale-110 transition-transform shrink-0" />
            <div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground uppercase tracking-[0.08em] group-hover:text-brass transition-colors">
                POLSKI
              </h2>
              <span className="font-serif text-xs sm:text-sm text-brass/80 italic">
                Pełna narracja po polsku
              </span>
            </div>
          </div>
          <p className="font-special-elite text-sm sm:text-base text-muted-foreground tracking-[0.05em] w-full mt-2">
            Zagraj z domyślnym systemem metrycznym (metry, kilogramy) i polskim kanonem terminologicznym.
          </p>
          <div className="mt-4 pt-3 border-t border-brass/20 w-full flex justify-between items-center text-xs font-mono text-brass/70">
            <span>JEDNOSTKI: METRYCZNE</span>
            <span className="group-hover:translate-x-1 transition-transform text-primary font-bold">ROZPOCZNIJ &rarr;</span>
          </div>
        </button>

        {/* Kafel: English */}
        <div className="deco-corners relative flex flex-col items-start justify-between p-7 sm:p-8 border border-brass/50 bg-gradient-to-br from-[#1a1610]/95 to-[#100d09]/95 shadow-[0_0_35px_rgba(201,162,39,0.08)] backdrop-blur-sm hover:border-brass/70 hover:shadow-[0_0_45px_rgba(201,162,39,0.18)] transition-all text-left min-h-[200px]">
          <button
            type="button"
            data-testid="btn-language-en"
            onClick={() => onSelectLanguage('en', enMeasurement)}
            className="w-full text-left group cursor-pointer"
          >
            <div className="flex items-center gap-5 w-full mb-3">
              <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-primary group-hover:scale-110 transition-transform shrink-0" />
              <div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-foreground uppercase tracking-[0.08em] group-hover:text-brass transition-colors">
                  ENGLISH
                </h2>
                <span className="font-serif text-xs sm:text-sm text-brass/80 italic">
                  Complete English narration
                </span>
              </div>
            </div>
            <p className="font-special-elite text-sm sm:text-base text-muted-foreground tracking-[0.05em] w-full mt-2">
              Play using official Chaosium terminology and your preferred measurement system.
            </p>
          </button>

          {/* Wybór jednostek dla j. angielskiego */}
          <div className="mt-4 pt-3 border-t border-brass/20 w-full flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-sans uppercase tracking-wider text-brass/80">
              <span>UNITS / SYSTEM MIAR:</span>
              <span className="font-mono text-[10px] text-muted-foreground">SELECT BEFORE START</span>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                type="button"
                onClick={() => setEnMeasurement('imperial')}
                className={`py-2 px-3 text-xs font-mono rounded transition-all cursor-pointer ${
                  enMeasurement === 'imperial'
                    ? 'bg-brass/35 text-brass font-bold border border-brass/60 shadow-[0_0_12px_rgba(201,162,39,0.25)]'
                    : 'bg-black/40 text-muted-foreground hover:text-foreground border border-brass/20 hover:bg-white/5'
                }`}
              >
                Imperial (ft, lbs)
              </button>
              <button
                type="button"
                onClick={() => setEnMeasurement('metric')}
                className={`py-2 px-3 text-xs font-mono rounded transition-all cursor-pointer ${
                  enMeasurement === 'metric'
                    ? 'bg-brass/35 text-brass font-bold border border-brass/60 shadow-[0_0_12px_rgba(201,162,39,0.25)]'
                    : 'bg-black/40 text-muted-foreground hover:text-foreground border border-brass/20 hover:bg-white/5'
                }`}
              >
                Metric (m, kg)
              </button>
            </div>
            <button
              type="button"
              onClick={() => onSelectLanguage('en', enMeasurement)}
              className="mt-1 w-full py-2 bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary hover:text-emerald-300 font-display text-xs uppercase tracking-[0.14em] font-bold rounded-sm transition-all text-center cursor-pointer shadow-sm"
            >
              LAUNCH IN ENGLISH &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Stylizowana ramka ostrzegawcza 18+ (Mature Content Warning) */}
      <div
        className="mt-8 w-full max-w-4xl rounded border border-destructive/50 bg-destructive/10 p-5 sm:p-6 text-left shadow-[0_0_30px_rgba(179,50,44,0.15)] relative overflow-hidden backdrop-blur-sm"
        role="note"
        aria-label="Content Warning 18+"
      >
        <div className="absolute top-0 left-0 w-1.5 h-full bg-destructive/80" />
        <div className="flex items-center gap-3 mb-2.5">
          <span className="inline-block px-2.5 py-0.5 text-xs font-mono font-bold tracking-widest uppercase bg-destructive/30 text-destructive-foreground border border-destructive/60 rounded-sm shadow-sm">
            18+ &bull; MATURE AUDIENCE
          </span>
          <span className="font-display text-xs sm:text-sm uppercase tracking-wider text-amber-200 font-semibold">
            Ostrzeżenie o zawartości / Content Warning
          </span>
        </div>
        <p className="font-serif text-sm sm:text-base leading-relaxed text-foreground/90">
          Gra porusza tematy drażliwe, kontrowersyjne, szaleństwo oraz sceny brutalne i grozę. Doświadczenie przeznaczone jest dla osób pełnoletnich.
        </p>
        <p className="mt-1.5 font-serif text-xs sm:text-sm leading-relaxed text-muted-foreground/80 italic">
          This game contains sensitive themes, controversial topics, madness, depictions of violence, and horror. Intended for mature audiences only.
        </p>
      </div>

      {/* Stopka z hołdem dla H.P. Lovecrafta: Słynne epitafium "I AM PROVIDENCE" */}
      <div className="mt-8 text-center max-w-3xl px-4 pointer-events-none">
        <p className="font-serif italic text-base sm:text-lg text-brass/90 tracking-wide">
          „I AM PROVIDENCE” (Jestem Providence)
        </p>
        <p className="font-special-elite text-xs text-muted-foreground/75 uppercase tracking-[0.2em] mt-1.5">
          W hołdzie twórczości H.P. Lovecrafta (1890–1937) &bull; Słynne epitafium wyryte na nagrobku pisarza
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
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-y-auto journal-scroll bg-background p-4 sm:p-8 md:p-12"
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-selection-title"
    >
      {/* === Warstwy tła Dark Art Déco 1:1 z WelcomeScreen === */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 60% at 50% 38%, #1c1812 0%, #0c0d0a 55%, #060708 100%)',
          }}
        />
        <div className="absolute inset-0 deco-sunburst-bottom" />
        <div className="deco-mist" />
        <div
          className="absolute inset-0"
          style={{ boxShadow: 'inset 0 0 220px 70px rgba(0,0,0,0.85)' }}
        />
      </div>

      {/* 4 złote narożniki kanwy Art Déco */}
      <span className="pointer-events-none absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-brass/60 z-30" />
      <span className="pointer-events-none absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-brass/60 z-30" />
      <span className="pointer-events-none absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-brass/60 z-30" />
      <span className="pointer-events-none absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-brass/60 z-30" />

      {/* Zawartość wyboru języka */}
      <LanguageSelectionContent onSelectLanguage={selectLanguage} />
    </div>
  );
}
