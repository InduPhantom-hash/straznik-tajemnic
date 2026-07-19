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

const DEFAULT_TITLE = 'Tajemnica Biblioteki Miskatonic';

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
}

export function ChatHeader({
  title,
  region,
  currentLocation,
}: ChatHeaderProps) {
  const place = currentLocation?.trim();
  const regionLabel = region?.trim();
  // 3H: "region · miejsce" gdy oba znane i RÓŻNE; w innym wypadku to z nich, które
  // istnieje. Dedup `place !== regionLabel` chroni przed "Arkham · Arkham" gdy seed P1
  // zasiał currentLocation regionem (do 1. [LOKACJA:]) lub gdy AI powtórzy region.
  const location =
    regionLabel && place && place !== regionLabel
      ? `${regionLabel} · ${place}`
      : regionLabel || place || '';

  return (
    <div className="relative grid h-16 grid-cols-[minmax(10rem,0.8fr)_minmax(0,1.6fr)_auto] items-center gap-4 border-b border-brass/30 bg-card px-6">
      {/* déco: złota linia akcentu pod nagłówkiem */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent"
      />
      <div className="flex items-center gap-3 font-special-elite min-w-0">
        {/* déco: oko (Eye of Horus) jako znak marki - emerald, pulsujące */}
        <span
          aria-hidden="true"
          className="text-primary text-lg leading-none animate-glyph-pulse select-none"
        >
          𓂀
        </span>
        <span className="text-foreground tracking-wide truncate">
          {title?.trim() || DEFAULT_TITLE}
        </span>
      </div>

      {/* IND-267: elastyczny środkowy obszar wykorzystuje całą wolną szerokość.
          Truncate działa dopiero wtedy, gdy rzeczywiście zabraknie miejsca. */}
      <div className="min-w-0 justify-self-end">
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

      <div className="flex shrink-0 items-center gap-4">
        {/* déco: brass-dzielnik */}
        <span
          aria-hidden="true"
          className="hidden sm:block h-7 w-px bg-brass/25"
        />

        {/* Campaign Clock - Integrated into main window header */}
        <CampaignClock compact className="hidden sm:flex shrink-0" />
      </div>
    </div>
  );
}
