/**
 * resolveGeminiCache - async helper dla sekcji OPT-26 route.ts (IND-183 micro 3/5, OPT-C04).
 *
 * Warunkowo woła `getOrCreateGeminiCache` (Gemini Context Caching IND-13).
 * Zwraca null gdy cache wyłączony LUB graceful fallback gdy cache service rzuci.
 *
 * Zachowuje kompatybilność z konfiguracją promptu oraz wspiera:
 *   - if (enableCache) → composes stableInstructions = [eraRules, gmProtocol].join
 *   - default TTL: 7200000 ms (2 godziny, OPT-C04)
 *   - ttlSeconds = Math.floor((cacheTTL ?? DEFAULT_GEMINI_CACHE_TTL_MS) / 1000)
 *   - graceful: getOrCreateGeminiCache zwraca null przy błędzie / niecacheable model
 */

import type { CachedContent } from '@google/genai';
import {
  getOrCreateGeminiCache,
  DEFAULT_CACHE_TTL_SECONDS,
} from '@/lib/gemini-cache-service';

/** Domyślny TTL cache w ms: 2 godziny = 7 200 000 ms (OPT-C04) */
export const DEFAULT_GEMINI_CACHE_TTL_MS = DEFAULT_CACHE_TTL_SECONDS * 1000;

export interface ResolveGeminiCacheOpts {
  enableCache?: boolean;
  cacheTTL?: number; // ms (defaults to 7200000 = 2h)
  apiKey: string;
  modelId: string;
  systemPrompt: string;
  eraRules: string;
  gmProtocol: string;
}

export async function resolveGeminiCache(
  opts: ResolveGeminiCacheOpts
): Promise<CachedContent | null> {
  if (!opts.enableCache) {
    return null;
  }

  const stableInstructions = [opts.eraRules, opts.gmProtocol].join('\n\n');
  const rawTTL = opts.cacheTTL;
  const ttlMs =
    typeof rawTTL === 'number' && rawTTL > 0
      ? rawTTL
      : DEFAULT_GEMINI_CACHE_TTL_MS;
  const ttlSeconds = Math.floor(ttlMs / 1000);

  return await getOrCreateGeminiCache(
    opts.apiKey,
    opts.modelId,
    opts.systemPrompt,
    stableInstructions,
    ttlSeconds
  );
}
