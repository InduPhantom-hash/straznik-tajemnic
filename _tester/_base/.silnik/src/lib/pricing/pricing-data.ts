/**
 * Hub cennika (facade) - jedno miejsce do CZYTANIA cen API + punkt nadpisania
 * dla przyszłego auto-fetch (IND-273 T5b).
 *
 * Nic fizycznie nie przenosi - re-eksportuje z 3 istniejących źródeł:
 * - GEMINI_PRICING z `model-registry` (przez ai-cost-tracker drift-guard),
 * - IMAGEN_PRICING / REPLICATE_PRICING z `data/image-pricing`,
 * - BUDGET_USD / TTS_COST_PER_CHAR_* / ttsCostPerChar z `user-usage`.
 *
 * **Nadpisanie cennika Gemini (T5b)**: aplikacja może pobrać świeży cennik
 * (Catalog API / LLM) i wstrzyknąć go przez {@link applyGeminiPricingOverlay}.
 * Overlay przechodzi tylko gdy KAŻDY wpis mieści się w rozsądnym zakresie
 * (0 < input/output < 1000 USD/1M tok) - inaczej zostaje przy wersji `bundled`.
 * Konsumenci kosztów czytają aktywny cennik przez {@link getGeminiPricing}.
 *
 * Czysty moduł server+client-safe (zero `'use client'`, zero FS, zero window).
 *
 * @module pricing-data
 */

import { GEMINI_PRICING } from '@/lib/model-registry';
import { IMAGEN_PRICING, REPLICATE_PRICING } from '@/lib/data/image-pricing';

// Re-eksport cennika obrazów/Gemini (single source of truth zostaje w plikach
// źródłowych). UWAGA: `BUDGET_USD`/`TTS_COST_PER_CHAR_*`/`ttsCostPerChar` NIE są
// tu re-eksportowane - `user-usage.ts` importuje `fs` (server-only), a ten hub jest
// też importowany przez komponenty klienckie (cost-breakdown-grid). Re-eksport
// wciągałby `fs` do bundla klienta (build error). Budżet/TTS czytaj wprost
// z `@/lib/user-usage` po stronie serwera.
export { GEMINI_PRICING, IMAGEN_PRICING, REPLICATE_PRICING };

/** Wersja schematu cennika (bump przy zmianie struktury). */
export const PRICING_VERSION = 1;

/** Data ostatniej ręcznej weryfikacji cennika (z komentarzy `image-pricing.ts`). */
export const PRICING_LAST_VERIFIED = '2026-05-25';

/** Typ pojedynczego wpisu cennika Gemini (USD per 1M tokenów). */
type GeminiPricingEntry = { input: number; output: number };

/** Tablica cen Gemini (model → { input, output }). */
type GeminiPricingTable = Record<string, GeminiPricingEntry>;

/** Skąd pochodzi aktywny cennik Gemini. */
type PricingSource = 'bundled' | 'cached' | 'fresh';

/**
 * Aktywny cennik Gemini. Startuje od kopii `bundled` (model-registry);
 * T5b może go nadpisać przez {@link applyGeminiPricingOverlay}.
 */
let activeGeminiPricing: GeminiPricingTable = { ...GEMINI_PRICING };

/** Pochodzenie aktywnego cennika (do diagnostyki w UI). */
let pricingSource: PricingSource = 'bundled';

/** Zwraca aktywny cennik Gemini (bundled albo nadpisany overlayem T5b). */
export function getGeminiPricing(): GeminiPricingTable {
  return activeGeminiPricing;
}

/**
 * Czy pojedynczy wpis ma sensowne ceny (0 < cena < 1000 USD/1M tok).
 * Chroni przed śmieciem z auto-fetch (puste/ujemne/absurdalne wartości).
 */
function isSaneEntry(entry: GeminiPricingEntry | undefined): boolean {
  if (!entry) return false;
  const { input, output } = entry;
  return input > 0 && input < 1000 && output > 0 && output < 1000;
}

/**
 * Nadpisuje cennik Gemini świeżymi danymi (T5b auto-fetch).
 *
 * Sanity-guard all-or-nothing: jeśli KAŻDY wpis przejdzie {@link isSaneEntry},
 * scala `{ ...bundled, ...fresh }` (klucz `default` z bundled zachowany),
 * ustawia źródło i zwraca `true`. Jeśli którykolwiek wpis poza zakresem -
 * odrzuca CAŁY overlay (nie częściowo), zostawia bundled, zwraca `false`.
 *
 * @param fresh  Świeży cennik (model → { input, output }).
 * @param source `'cached'` (z dysku) albo `'fresh'` (świeżo pobrane z API).
 * @returns `true` gdy overlay przyjęty, `false` gdy odrzucony.
 */
export function applyGeminiPricingOverlay(
  fresh: GeminiPricingTable,
  source: 'cached' | 'fresh'
): boolean {
  const entries = Object.values(fresh);
  if (entries.length === 0) return false;
  if (!entries.every(isSaneEntry)) return false;

  activeGeminiPricing = { ...GEMINI_PRICING, ...fresh };
  pricingSource = source;
  return true;
}

/** Przywraca cennik Gemini do wersji `bundled` (reset overlayu, m.in. dla testów). */
export function resetGeminiPricingOverlay(): void {
  activeGeminiPricing = { ...GEMINI_PRICING };
  pricingSource = 'bundled';
}

/** Metadane cennika (wersja, data weryfikacji, źródło) - do wyświetlenia w UI. */
export function getPricingMeta(): {
  version: number;
  lastVerified: string;
  source: PricingSource;
} {
  return {
    version: PRICING_VERSION,
    lastVerified: PRICING_LAST_VERIFIED,
    source: pricingSource,
  };
}
