/**
 * Auto-fetch cennika Gemini (IND-273 T5b) - 2-tier.
 *
 * Tier A (LLM-extraction): pobiera HTML strony cennika Google, oddaje Gemini Flash
 * z `responseMimeType: application/json` i prosi o ceny input/output (USD per 1M
 * tokenów) DLA znanych ID modeli. Sanity-guard (0 < cena < 1000) + cache TTL 24h
 * na dysku (`<data>/pricing/gemini-pricing.cache.json`).
 * Tier B (bundled): gdy Tier A zawiedzie / offline / brak klucza - caller zostaje
 * przy cenniku bundled z `pricing-data.ts` (cichy fallback, nigdy nie wywraca gry).
 *
 * Tier 1 (Cloud Billing Catalog API) ODRZUCONY w spike T5a (401 bezwarunkowo -
 * billing API nie akceptuje klucza API, wymaga OAuth2/IAM). Patrz
 * `.agent/research/self-check-spike-2026-06-27.md`.
 *
 * SERWER-ONLY: FS (cache) + fetch publicznej strony + LLM call. Caller
 * (`/api/pricing/refresh`) łapie błędy - cennik nigdy nie blokuje rozgrywki.
 *
 * @module pricing-fetch-service
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL } from '@/lib/ai-providers/constants';
import { getWritableDataDir } from '@/lib/paths';
import { GEMINI_PRICING } from '@/lib/pricing/pricing-data';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PRICING_URL = 'https://ai.google.dev/gemini-api/docs/pricing';
const HTML_CAP = 200_000; // limit znaków HTML podawanych modelowi (kontrola tokenów)

export type GeminiPricingTable = Record<
  string,
  { input: number; output: number }
>;

interface PricingCache {
  /** Świeże ceny LUB `null` = cooldown po nieudanym Tier A (nie ponawiaj przez TTL). */
  pricing: GeminiPricingTable | null;
  fetchedAt: string;
}

function cacheFilePath(): string {
  return path.join(
    getWritableDataDir(),
    'pricing',
    'gemini-pricing.cache.json'
  );
}

/** ID modeli, których cennik nas interesuje (bundled `GEMINI_PRICING` bez `default`). */
function knownModelIds(): string[] {
  return Object.keys(GEMINI_PRICING).filter((id) => id !== 'default');
}

/** Czy cena to sensowna liczba (0 < cena < 1000 USD/1M tok). */
function isSanePrice(v: unknown): v is number {
  return typeof v === 'number' && v > 0 && v < 1000;
}

/** Odczyt cache z dysku (null gdy brak/uszkodzony). `pricing` może być null (cooldown). */
export function readPricingCache(): PricingCache | null {
  try {
    const file = cacheFilePath();
    if (!fs.existsSync(file)) return null;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as PricingCache;
    if (!parsed || typeof parsed.fetchedAt !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Czy cache jest świeży (młodszy niż TTL 24h). */
export function isCacheFresh(cache: PricingCache | null): boolean {
  if (!cache?.fetchedAt) return false;
  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  return age >= 0 && age < CACHE_TTL_MS;
}

/** Zapis cache (pricing=null = cooldown po nieudanym Tier A). Zwraca znacznik czasu. */
function writePricingCache(pricing: GeminiPricingTable | null): string {
  const file = cacheFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const fetchedAt = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify({ pricing, fetchedAt }), 'utf-8');
  return fetchedAt;
}

/**
 * Tier A: pobierz HTML cennika → Gemini Flash structured-output → zmapuj na nasze
 * ID modeli → sanity-guard. Zwraca tabelę cen albo null (offline / parse fail /
 * brak sensownych danych - caller użyje bundled).
 */
export async function fetchFreshGeminiPricing(
  apiKey: string
): Promise<GeminiPricingTable | null> {
  let html: string;
  try {
    const res = await fetch(PRICING_URL, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  const ids = knownModelIds();
  const prompt = `Z poniższego HTML strony cennika Google Gemini API wyciągnij ceny w USD za 1 milion tokenów (input i output) dla DOKŁADNIE tych ID modeli: ${ids.join(', ')}.

Zwróć JSON: {"prices":[{"id":"<jedno z ID powyżej>","inputPer1M":<liczba>,"outputPer1M":<liczba>}]}.
Zasady: używaj wyłącznie ID z listy; pomiń model, którego ceny nie znajdziesz; ceny to liczby (np. 0.075), bez symboli walut ani jednostek.

HTML:
${html.slice(0, HTML_CAP)}`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });
    const text = (result.text ?? '')
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(text) as {
      prices?: Array<{
        id?: unknown;
        inputPer1M?: unknown;
        outputPer1M?: unknown;
      }>;
    };
    const known = new Set(ids);
    const table: GeminiPricingTable = {};
    for (const p of parsed.prices ?? []) {
      if (typeof p.id !== 'string' || !known.has(p.id)) continue;
      if (!isSanePrice(p.inputPer1M) || !isSanePrice(p.outputPer1M)) continue;
      table[p.id] = { input: p.inputPer1M, output: p.outputPer1M };
    }
    return Object.keys(table).length > 0 ? table : null;
  } catch {
    return null;
  }
}

export interface RefreshResult {
  source: 'cached' | 'fresh' | 'bundled';
  pricing: GeminiPricingTable | null;
  fetchedAt: string | null;
}

/**
 * Orkiestrator: cache-fresh → zwróć BEZ kosztownego LLM (realne ceny = `cached`,
 * cooldown = `bundled`). `force` / cache-stale + klucz → Tier A. Sukces → zapis +
 * `fresh`. Porażka → zapis COOLDOWN (pricing:null) by NIE ponawiać 16s+LLM przez 24h
 * (krytyczne dla obcych z własnym kluczem = realne pieniądze). Brak klucza → bundled
 * BEZ cooldownu (po dodaniu klucza ma od razu spróbować). Nie rzuca dla normalnych
 * ścieżek (caller i tak łapie).
 */
export async function refreshGeminiPricing(
  apiKey: string | null,
  force = false
): Promise<RefreshResult> {
  const cache = readPricingCache();
  if (!force && isCacheFresh(cache) && cache) {
    return cache.pricing
      ? { source: 'cached', pricing: cache.pricing, fetchedAt: cache.fetchedAt }
      : { source: 'bundled', pricing: null, fetchedAt: cache.fetchedAt }; // cooldown
  }
  if (apiKey) {
    const fresh = await fetchFreshGeminiPricing(apiKey);
    if (fresh) {
      const fetchedAt = writePricingCache(fresh);
      return { source: 'fresh', pricing: fresh, fetchedAt };
    }
    // Tier A zawiódł mimo klucza → zapisz cooldown (24h bez ponawiania LLM).
    writePricingCache(null);
    return { source: 'bundled', pricing: null, fetchedAt: null };
  }
  // Brak klucza: stary cache (realne ceny) jeśli jest, inaczej bundled. Bez cooldownu.
  if (cache?.pricing) {
    return {
      source: 'cached',
      pricing: cache.pricing,
      fetchedAt: cache.fetchedAt,
    };
  }
  return { source: 'bundled', pricing: null, fetchedAt: null };
}
