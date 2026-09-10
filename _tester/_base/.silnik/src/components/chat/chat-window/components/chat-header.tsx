'use client';

/**
 * @file ChatHeader - header czatu z tytułem przygody, pineską lokacji i zegarem.
 *
 * IND-235: tytuł odzwierciedla `adventureContext.title` (prop `title`), z fallbackiem
 * na domyślny scenariusz gdy przygoda nie jest jeszcze wybrana.
 * IND-267: pineska 📍 z bieżącą lokacją bohatera (z najnowszego [LOKACJA:]); pokazywana
 * tylko gdy lokacja jest znana.
 * 3H: pineska składa REGION (z `adventureContext.location`, stały dla przygody) z
 * konkretnym MIEJSCEM (z [LOKACJA:] od MG) → "region · miejsce". Region i miejsce to
 * dwa różne pola, więc się nie dublują; gdy jedno brakuje, pokazujemy to drugie.
 */

import { CampaignClock } from '../../../ui/campaign-clock';
import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';

interface ChatHeaderProps {
  /** Tytuł wybranej przygody; gdy brak - domyślny scenariusz. */
  title?: string;
  /**
   * 3H: region przygody (np. "Arkham, Massachusetts") z `adventureContext.location`.
   * Stała ramka geograficzna sceny; łączona z `currentLocation` jako "region · miejsce".
   */
  region?: string;
  /** IND-267: konkretne MIEJSCE bohatera (z najnowszego [LOKACJA:]); część po "·". */
  currentLocation?: string;
  /** Otwiera kompendium zasad, bestiariusz i encyklopedię epoki. */
  onOpenHelp?: () => void;
  /** Czy włączony jest tryb kulis MG / BOP */
  isDirectorMode?: boolean;
  /** Callback do przełączania trybu kulis MG / BOP */
  onToggleDirectorMode?: () => void;
}

export function ChatHeader({
  title,
  region,
  currentLocation,
  onOpenHelp,
  isDirectorMode = false,
  onToggleDirectorMode,
}: ChatHeaderProps) {
  const t = useTranslations('ChatHeader');
  const defaultTitle = t('defaultTitle');
  const place = currentLocation?.trim();
  const regionLabel = region?.trim();
  // 3H: "region · miejsce" gdy oba znane i RÓŻNE; w innym wypadku to z nich, które
  // istnieje. Dedup `place !== regionLabel` chroni przed "Arkham · Arkham" gdy seed P1
  // zasiał currentLocation regionem (do 1. [LOKACJA:]) lub gdy AI powtórzy region.
  const location =
    regionLabel && place && place !== regionLabel
      ? `${place} · ${regionLabel}`
      : place || regionLabel || '';

  return (
    <div className="relative flex h-16 items-center justify-between gap-2 sm:gap-4 border-b border-brass/30 bg-card px-3 sm:px-6">
      {/* déco: złota linia akcentu pod nagłówkiem */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent"
      />
      <div className="flex items-center gap-2 sm:gap-3 font-special-elite min-w-0 max-w-[35%] sm:max-w-[40%] md:max-w-[45%] shrink-0">
        {/* déco: oko (Eye of Horus) jako znak marki - emerald, pulsujące */}
        <span
          aria-hidden="true"
          className="text-primary text-lg leading-none animate-glyph-pulse select-none shrink-0"
        >
          𓂀
        </span>
        <span 
          className="text-foreground tracking-wide truncate block"
          title={title?.trim() || defaultTitle}
        >
          {title?.trim() || defaultTitle}
        </span>
      </div>

      {/* IND-267: elastyczny środkowy obszar wykorzystuje całą wolną szerokość.
          Truncate działa dopiero wtedy, gdy rzeczywiście zabraknie miejsca. */}
      <div className="min-w-0 flex-1 flex justify-end">
        {location && (
          <span
            className="flex min-w-0 items-center gap-1 font-special-elite text-sm text-brass/90"
            title={location}
          >
            <span aria-hidden="true" className="shrink-0">
              📍
            </span>
            <span className="truncate">{location}</span>
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {onToggleDirectorMode && (
          <button
            type="button"
            onClick={onToggleDirectorMode}
            className={`flex items-center gap-1.5 font-special-elite text-xs border px-2.5 py-1 rounded transition-colors cursor-pointer shrink-0 ${
              isDirectorMode
                ? 'bg-brass/20 text-gold border-brass/80 shadow-sm'
                : 'text-brass/70 hover:text-brass border-brass/30 hover:border-brass/70 bg-card/60'
            }`}
            title={t('directorModeTooltip')}
            aria-pressed={isDirectorMode}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t('directorMode')}</span>
          </button>
        )}

        {onOpenHelp && (
          <button
            type="button"
            onClick={onOpenHelp}
            className="flex items-center gap-1.5 font-special-elite text-xs text-brass hover:text-gold border border-brass/30 hover:border-brass/70 px-2.5 py-1 rounded bg-card/60 transition-colors cursor-pointer shrink-0"
            title={t('compendiumTitle')}
          >
            <span aria-hidden="true">🕯️</span>
            <span className="hidden md:inline">{t('compendium')}</span>
          </button>
        )}

        {/* déco: brass-dzielnik */}
        <span
          aria-hidden="true"
          className="hidden md:block h-7 w-px bg-brass/25"
        />

        {/* Campaign Clock - Integrated into main window header */}
        <CampaignClock compact className="hidden sm:flex shrink-0" />
      </div>
    </div>
  );
}
