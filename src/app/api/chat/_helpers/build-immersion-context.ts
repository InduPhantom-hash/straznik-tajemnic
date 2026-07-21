/**
 * build-immersion-context.ts - defensywne pobieranie danych immersyjnych dla MG.
 *
 * Pobiera równolegle 3 źródła danych świata (astronomia, gazety, ceny epoki)
 * i składa sekcję promptu `## DANE ŚWIATA (IMMERSJA)`. Każde źródło:
 *   - działa w `Promise.allSettled` z timeout 5s;
 *   - oznaczone jest flagą `isFallback` ze źródła (API live vs dane lokalne);
 *   - ma label źródła i daty pobrania w nagłówku pod-sekcji.
 *
 * Cache w pamięci procesu (Map, TTL 10 min) - dane astronomiczne i gazetowe
 * nie zmieniają się w trakcie sesji.
 *
 * Tryb offline: `process.env.IMMERSION_OFFLINE === '1'` pomija fetch,
 * zwraca pusty string (MG gra bez danych świata).
 *
 * Roadmapa Etap 3, linie 96-98:
 *   - Włączanie danych tylko gdy dostępne
 *   - Oznaczenie źródła danych i daty pobrania
 *   - Cache i tryb "brak danych zewnętrznych"
 *
 * @module build-immersion-context
 */

import { getDaylightAndMoon, type DaylightResult } from '@/lib/immersion/astronomy-service';
import { fetchHistoricalNews, type HistoricalNewsItem } from '@/lib/immersion/news-service';
import { convertUSD, type PriceConversionResult } from '@/lib/immersion/pricing-service';

// ---------------------------------------------------------------------------
// Cache in-memory (per-process, TTL 10 min)
// ---------------------------------------------------------------------------

interface ImmersionCacheEntry {
  section: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minut
const immersionCache = new Map<string, ImmersionCacheEntry>();

function getCacheKey(dateStr: string, lat: number, lng: number, era: string): string {
  return `${dateStr}-${lat}-${lng}-${era}`;
}

function getCached(key: string): string | null {
  const entry = immersionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    immersionCache.delete(key);
    return null;
  }
  return entry.section;
}

function setCache(key: string, section: string): void {
  immersionCache.set(key, { section, cachedAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Timeout wrapper
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: timeout ${FETCH_TIMEOUT_MS}ms`)), FETCH_TIMEOUT_MS)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Sekcja formatowania
// ---------------------------------------------------------------------------

function sourceLabel(isFallback: boolean): string {
  if (isFallback) return '[dane lokalne - fallback]';
  const now = new Date().toISOString();
  return `[zrodlo: API | pobrano: ${now}]`;
}

function formatDaylightSection(data: DaylightResult): string {
  return (
    `### Astronomia ${sourceLabel(data.isFallback)}\n` +
    `Wschod slonca: ${data.sunrise}, Zachod: ${data.sunset}, Dlugosc dnia: ${data.dayLength}\n` +
    `Faza Ksiezyca: ${data.moonPhase}\n` +
    `Poziom oswietlenia: ${data.lightLevel}`
  );
}

function formatNewsSection(news: HistoricalNewsItem[], isFallback: boolean): string {
  if (news.length === 0) return '';
  const headlines = news
    .slice(0, 3)
    .map((n) => `- "${n.snippet.slice(0, 150)}" - ${n.title}, ${n.date}`)
    .join('\n');
  return `### Naglowki gazet z epoki ${sourceLabel(isFallback)}\n${headlines}`;
}

function formatPricesSection(result: PriceConversionResult): string {
  return (
    `### Wartosc pieniadza ${sourceLabel(result.isFallback)}\n` +
    `$10 z roku ${result.targetYear} to ok. $${result.convertedAmount} w ${result.originalYear} ` +
    `(mnoznik inflacji: x${result.inflationMultiplier}). ` +
    `Uzywaj tego przelicznika, zeby nadawac cenom w grze realistyczna wage.`
  );
}

// ---------------------------------------------------------------------------
// Eksportowana funkcja
// ---------------------------------------------------------------------------

export interface FetchImmersionContextOpts {
  /** Data w grze, format YYYY-MM-DD */
  gameDate: string;
  /** Szerokość geograficzna lokacji (domyślnie Boston/Arkham: 42.3601) */
  lat?: number;
  /** Długość geograficzna lokacji (domyślnie Boston/Arkham: -71.0589) */
  lng?: number;
  /** Era gry, np. '1920s', '1890s' - używane do przelicznika cen */
  gameEra?: string;
}

/**
 * Pobiera dane immersyjne i zwraca gotową sekcję promptu.
 * Zwraca pusty string gdy tryb offline lub wszystkie źródła zawiodły.
 */
export async function fetchImmersionContext(opts: FetchImmersionContextOpts): Promise<string> {
  // Tryb offline - pomijamy wszystko
  if (process.env.IMMERSION_OFFLINE === '1') {
    return '';
  }

  const { gameDate, lat = 42.3601, lng = -71.0589, gameEra = '1920s' } = opts;

  // Wyciągnij rok gry z ery (np. '1920s' -> 1920, '1890s' -> 1890)
  const eraYear = parseInt(gameEra.replace(/\D/g, '')) || 1920;

  // Cache check
  const cacheKey = getCacheKey(gameDate, lat, lng, gameEra);
  const cached = getCached(cacheKey);
  if (cached !== null) return cached;

  // Równoległe pobieranie z timeout
  const [daylightResult, newsResult, pricesResult] = await Promise.allSettled([
    withTimeout(getDaylightAndMoon(gameDate, lat, lng), 'Daylight'),
    withTimeout(fetchHistoricalNews(gameDate), 'News'),
    withTimeout(convertUSD(10, 2026, eraYear), 'Prices'),
  ]);

  const sections: string[] = [];

  // Daylight
  if (daylightResult.status === 'fulfilled') {
    sections.push(formatDaylightSection(daylightResult.value));
  }

  // News
  if (newsResult.status === 'fulfilled') {
    const { news, isFallback } = newsResult.value;
    const newsSection = formatNewsSection(news, isFallback);
    if (newsSection) sections.push(newsSection);
  }

  // Prices
  if (pricesResult.status === 'fulfilled') {
    sections.push(formatPricesSection(pricesResult.value));
  }

  // Check for epoch specific knowledge summary (e.g. 1990s-2000s PL)
  let epochSummarySection = '';
  if (gameEra.includes('1990') || gameEra.includes('2000') || gameEra.toLowerCase().includes('pl')) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const epochFilePath = path.join(process.cwd(), 'data', 'epochs', 'pl-1990s-2000s', 'summary_immersion.json');
      if (fs.existsSync(epochFilePath)) {
        const summaryData = JSON.parse(fs.readFileSync(epochFilePath, 'utf-8'));
        const highlightsText = (summaryData.highlights || [])
          .slice(0, 5)
          .map((h: any) => `- **${h.title}**: ${h.summary.slice(0, 150)}...`)
          .join('\n');
        epochSummarySection = `### Realia i Tlo Epoki (Polska 1990-2000)\n${summaryData.instructions}\n\nKluczowe konteksty epokowe:\n${highlightsText}`;
      }
    } catch (e) {
      // Ignorujemy błędy odczytu plików epokowych
    }
  }

  if (epochSummarySection) {
    sections.push(epochSummarySection);
  }

  if (sections.length === 0) return '';

  const section =
    `\n## DANE SWIATA (IMMERSJA)\n` +
    `Ponizsze dane wzbogacaja narracje o realia epoki. Uzywaj ich subtelnie - wplataj w opisy, dialogi NPC ` +
    `i atmosfere scen. Nie recytuj ich wprost graczowi.\n\n` +
    sections.join('\n\n');

  // Zapisz do cache
  setCache(cacheKey, section);

  return section;
}
