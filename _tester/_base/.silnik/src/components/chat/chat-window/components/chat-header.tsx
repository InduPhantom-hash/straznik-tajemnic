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
  /** Opis przygody zawierający m.in. klimat i pogodę. */
  adventureDescription?: string;
}

export function ChatHeader({
  title,
  region,
  currentLocation,
  adventureDescription,
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

  // Parsuj pogodę z opisu przygody
  let weatherInfo = '';
  if (adventureDescription) {
    const weatherMatch = adventureDescription.match(/\[KLIMAT\s*&\s*POGODA\]:\s*([^]*?)(?=\n\n|\[|$)/i);
    if (weatherMatch && weatherMatch[1]) {
      weatherInfo = weatherMatch[1].trim();
      // Czyścimy dopisek o danych historycznych dla lepszej immersji w UI
      weatherInfo = weatherInfo.replace(/\s*\(dane historyczne dla dnia.*?\)/i, '');
    }
  }

  return (
    <div className="relative h-16 flex items-center justify-between px-6 bg-card border-b border-brass/30">
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

      <div className="flex items-center gap-4 shrink-0 ml-4">
        {/* IND-267: pineska bieżącej lokacji bohatera. #5: zawsze widoczna
            (wcześniej hidden md:flex chowało ją na wąskim oknie launchera). */}
        {location && (
          <span
            className="flex items-center gap-1 max-w-[10rem] sm:max-w-[16rem] truncate text-sm text-brass/90 font-special-elite"
            title={location}
          >
            <span aria-hidden="true">📍</span>
            <span className="truncate">{location}</span>
          </span>
        )}

        {/* déco: brass-dzielnik */}
        <span
          aria-hidden="true"
          className="hidden sm:block h-7 w-px bg-brass/25"
        />

        {/* Campaign Clock - Integrated into main window header */}
        <CampaignClock compact className="hidden sm:flex shrink-0" weatherInfo={weatherInfo} />
      </div>
    </div>
  );
}
