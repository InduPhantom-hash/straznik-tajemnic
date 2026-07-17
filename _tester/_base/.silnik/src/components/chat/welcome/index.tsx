'use client';

/**
 * WelcomeScreen - ekran powitalny w stylu Dark Art Déco (makieta karta 02/05/06).
 * Warstwy tła (radial + sunburst od dołu + mgła emerald + winieta) + 4 złote narożniki,
 * świeca CSS, "Anno Domini" (rok z gry), tytuł Cinzel Decorative, déco-divider,
 * karta "Wznów sesję" (quick-win z realnych danych), onboarding, cytat na dole.
 *
 * Warstwa wyłącznie prezentacyjna - prop-kontrakt WelcomeScreenProps bez zmian.
 * Quick-winy czytają read-only z localStorage (rok zegara, lista zapisów).
 */

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import type { WelcomeScreenProps } from './types';
import { WELCOME_QUOTES } from './data/quotes';
import { useTypewriterSound } from './hooks/use-typewriter-sound';
import { OnboardingButtons } from './components/onboarding-buttons';
import { BottomLinks } from './components/bottom-links';
import { FullGameSaveManager } from '@/lib/full-game-save-manager';
import { timeManager } from '@/lib/time-manager';

/** Metadane najświeższego zapisu (synchronicznie z localStorage). */
interface RecentSave {
  id: string;
  name: string;
  lastUpdated: string;
  messageCount: number;
  imageCount: number;
}

/** Rok arabski → rzymski (Anno Domini). Zakres lat gry (1890-2000+). */
function toRoman(year: number): string {
  const map: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let n = Math.max(1, Math.floor(year));
  let out = '';
  for (const [value, numeral] of map) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}

/** Relatywny opis czasu zapisu ("dziś" / "wczoraj" / "N dni temu"). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'dziś';
  if (days === 1) return 'wczoraj';
  return `${days} dni temu`;
}

/** Karta wznowienia ostatniej sesji (styl déco z makiety karta 06). */
const ResumeCard: FC<{ save: RecentSave; onResume?: () => void }> = ({
  save,
  onResume,
}) => (
  <div className="deco-corners relative w-[min(420px,90vw)] mb-6 p-4 border border-brass/50 bg-gradient-to-br from-[#1a1610] to-[#100d09] shadow-[0_0_22px_rgba(13,148,136,0.08)] z-20">
    <div className="font-special-elite text-[14px] text-primary tracking-[0.22em] uppercase mb-1">
      ● Ostatnia sesja
    </div>
    <div className="font-display font-bold text-lg text-foreground uppercase tracking-[0.06em] truncate">
      {save.name}
    </div>
    <div className="flex items-center gap-4 mt-2 font-special-elite text-[14px] text-muted-foreground tracking-[0.06em]">
      <span>{save.messageCount} wpisów</span>
      {save.imageCount > 0 && <span>{save.imageCount} ilustracji</span>}
      <span className="text-brass/90">{relativeTime(save.lastUpdated)}</span>
    </div>
    {onResume && (
      <button
        onClick={onResume}
        className="mt-4 w-full font-display font-semibold uppercase tracking-[0.16em] text-sm py-3 text-[#04110f] bg-primary border border-primary hover:brightness-110 transition-all cursor-pointer"
      >
        Wznów grę
      </button>
    )}
  </div>
);

export const WelcomeScreen: FC<WelcomeScreenProps> = ({
  onUploadRules,
  onSelectAdventure,
  onSessionZero,
  onCreateCharacter,
  onPickPredefinedCharacter,
  onPickCharacter,
  onStartGame,
  onChoosePlayMode,
  onLoadSave,
  onOpenApiKeys,
  hasRules = false,
  hasAdventure = false,
  adventureTitle,
  hasSessionZero = false,
  hasCharacter = false,
  hasSavedCharacters = false,
  isDuet = false,
}) => {
  const [quote] = useState(
    () => WELCOME_QUOTES[Math.floor(Math.random() * WELCOME_QUOTES.length)]
  );
  const { displayedText, isTyping } = useTypewriterSound(quote.greeting);

  // Quick-winy (read-only, po mount - unika hydration mismatch):
  const [gameYear, setGameYear] = useState<number | null>(null);
  const [recentSave, setRecentSave] = useState<RecentSave | null>(null);

  useEffect(() => {
    // Rok do "Anno Domini" - ze źródła zegara kampanii (timeManager, klucz coc7_game_time),
    // czytany po mount (klient) by uniknąć hydration mismatch. Jedno źródło prawdy z
    // CampaignClock: pokazuje aktualny rok gry (po upływie czasu), nie tylko startowy.
    setGameYear(timeManager.getTime().year);
    // Najświeższy zapis do karty "Wznów sesję".
    try {
      const list = FullGameSaveManager.getSavesList();
      if (list.length > 0) {
        const s = list[0];
        setRecentSave({
          id: s.id,
          name: s.name,
          lastUpdated: s.lastUpdated,
          messageCount: s.messageCount,
          imageCount: s.imageCount,
        });
      }
    } catch {
      /* brak zapisów - karta wznowienia po prostu się nie pokaże */
    }
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      {/* === Warstwy tła (makieta karta 02) === */}
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

      {/* === 4 złote narożniki === */}
      <span className="pointer-events-none absolute top-5 left-5 w-11 h-11 border-t-2 border-l-2 border-brass/60" />
      <span className="pointer-events-none absolute top-5 right-5 w-11 h-11 border-t-2 border-r-2 border-brass/60" />
      <span className="pointer-events-none absolute bottom-5 left-5 w-11 h-11 border-b-2 border-l-2 border-brass/60" />
      <span className="pointer-events-none absolute bottom-5 right-5 w-11 h-11 border-b-2 border-r-2 border-brass/60" />

      {/* === Centrum === */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center px-6 pb-40 text-center overflow-y-auto">
        {/* świeca CSS */}
        <div className="mb-3 animate-candle-flicker">
          <div className="deco-candle" />
        </div>

        {/* Anno Domini (rok z gry) */}
        <div className="font-special-elite text-xs text-primary uppercase tracking-[0.5em] mb-3">
          Anno Domini {toRoman(gameYear ?? 1925)}
        </div>

        {/* tytuł */}
        <h1
          className="font-display-decorative font-black text-5xl md:text-7xl uppercase tracking-[0.1em] leading-none text-foreground"
          style={{ textShadow: '0 0 40px rgba(201,162,39,0.18)' }}
        >
          Strażnik
          <br />
          Tajemnic
        </h1>

        {/* déco-divider z diamentami */}
        <div className="flex items-center gap-4 my-8 w-[min(520px,90vw)]">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
          <span className="w-2 h-2 bg-brass rotate-45" />
          <span className="font-display text-[13px] tracking-[0.34em] uppercase text-brass whitespace-nowrap">
            Wirtualny Mistrz Gry
          </span>
          <span className="w-2 h-2 bg-brass rotate-45" />
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold" />
        </div>

        {/* karta wznowienia (quick-win, tylko gdy istnieje zapis) */}
        {recentSave && <ResumeCard save={recentSave} onResume={onLoadSave} />}

        {/* mini-podgląd wybranej przygody */}
        {hasAdventure && adventureTitle && (
          <div className="deco-corners relative mb-6 px-5 py-2 bg-card/70 border border-brass/30 z-20">
            <p className="text-sm text-brass font-special-elite">
              📖 Wybrano:{' '}
              <span className="font-bold text-foreground">
                {adventureTitle}
              </span>
            </p>
          </div>
        )}

        {/* przyciski onboardingu */}
        <OnboardingButtons
          onUploadRules={onUploadRules}
          onSelectAdventure={onSelectAdventure}
          onSessionZero={onSessionZero}
          onCreateCharacter={onCreateCharacter}
          onPickPredefinedCharacter={onPickPredefinedCharacter}
          onPickCharacter={onPickCharacter}
          onStartGame={onStartGame}
          onChoosePlayMode={onChoosePlayMode}
          hasRules={hasRules}
          hasAdventure={hasAdventure}
          hasSessionZero={hasSessionZero}
          hasCharacter={hasCharacter}
          hasSavedCharacters={hasSavedCharacters}
          isDuet={isDuet}
        />

        {/* dolne linki (wczytaj / klucze) */}
        <div className="mt-3">
          <BottomLinks onLoadSave={onLoadSave} onOpenApiKeys={onOpenApiKeys} />
        </div>
      </div>

      {/* === Cytat na dole (efekt maszyny do pisania) === */}
      <div className="pointer-events-none absolute left-0 right-0 bottom-10 px-10 text-center z-20">
        <p className="font-serif italic text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          „{displayedText}
          {isTyping && <span className="animate-pulse">|</span>}&rdquo;
        </p>
        <div className="font-special-elite text-[14px] tracking-[0.24em] uppercase text-muted-foreground/70 mt-3">
          - H.P. Lovecraft, „{quote.work}&rdquo;
        </div>
      </div>
    </div>
  );
};
