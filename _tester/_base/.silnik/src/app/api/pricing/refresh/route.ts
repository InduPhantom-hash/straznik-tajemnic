/**
 * GET /api/pricing/refresh - auto-fetch cennika Gemini (IND-273 T5b).
 *
 * Cache-fresh (<24h) → zwraca `cached` BEZ kosztownego LLM. Cache-stale lub
 * `?force=true` → Tier A (HTML cennika → Gemini Flash) i zapis cache. Po pobraniu
 * nakłada overlay na aktywny cennik (`applyGeminiPricingOverlay`) - `calculateGeminiCost`
 * zaczyna liczyć świeższymi stawkami w TYM procesie serwera. Fail/offline/brak klucza
 * → bundled (cichy fallback, gra nigdy nie pada).
 *
 * Klucz: nagłówek `X-Gemini-Api-Key` (BYOK) > `process.env.GEMINI_API_KEY` (env-fallback,
 * wzór `summarize-scene`/`health/gemini`). HTTP zawsze 200 - stan w body. Server-only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshGeminiPricing } from '@/lib/pricing/pricing-fetch-service';
import {
  applyGeminiPricingOverlay,
  PRICING_LAST_VERIFIED,
} from '@/lib/pricing/pricing-data';

export interface PricingRefreshResponse {
  source: 'cached' | 'fresh' | 'bundled';
  /** Data do UI: data pobrania (cached/fresh) lub bundled `PRICING_LAST_VERIFIED`. */
  lastVerified: string;
  fetchedAt: string | null;
  /** Czy overlay realnie nadpisał aktywny cennik (sanity-guard mógł odrzucić). */
  applied: boolean;
}

function resolveGeminiApiKey(request: NextRequest): string | null {
  return (
    request.headers.get('X-Gemini-Api-Key')?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    null
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const force = new URL(request.url).searchParams.get('force') === 'true';
  const apiKey = resolveGeminiApiKey(request);

  try {
    const result = await refreshGeminiPricing(apiKey, force);
    let applied = false;
    if (result.pricing) {
      applied = applyGeminiPricingOverlay(
        result.pricing,
        result.source === 'fresh' ? 'fresh' : 'cached'
      );
    }
    return NextResponse.json<PricingRefreshResponse>({
      source: applied ? result.source : 'bundled',
      // Uczciwa data: realny overlay → data pobrania; bundled/cooldown → data bundled.
      lastVerified:
        applied && result.fetchedAt
          ? new Date(result.fetchedAt).toLocaleDateString('pl-PL')
          : PRICING_LAST_VERIFIED,
      fetchedAt: result.fetchedAt,
      applied,
    });
  } catch {
    return NextResponse.json<PricingRefreshResponse>({
      source: 'bundled',
      lastVerified: PRICING_LAST_VERIFIED,
      fetchedAt: null,
      applied: false,
    });
  }
}
