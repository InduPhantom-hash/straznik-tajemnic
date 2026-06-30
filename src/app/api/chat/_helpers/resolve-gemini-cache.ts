/**
 * resolveGeminiCache - async helper dla sekcji OPT-26 route.ts (IND-183 micro 3/5).
 *
 * Warunkowo woła `getOrCreateGeminiCache` (Gemini Context Caching IND-13).
 * Zwraca null gdy cache wyłączony LUB graceful fallback gdy cache service rzuci.
 *
 * Zachowuje 1:1 zachowanie z oryginalnego route.ts (lin 148-165 przed split):
 *   - if (enableCache) → composes stableInstructions = [eraRules, gmProtocol].join
 *   - ttlSeconds = Math.floor((cacheTTL ?? 3600000) / 1000)  // ms → sec konwersja
 *   - graceful: getOrCreateGeminiCache zwraca null przy błędzie / niecacheable model
 */

import type { CachedContent } from '@google/genai';
import { getOrCreateGeminiCache } from '@/lib/gemini-cache-service';

export interface ResolveGeminiCacheOpts {
  enableCache?: boolean;
  cacheTTL?: number; // ms (defaults to 3600000 = 1h)
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
  const ttlSeconds = Math.floor((opts.cacheTTL ?? 3600000) / 1000);

  return await getOrCreateGeminiCache(
    opts.apiKey,
    opts.modelId,
    opts.systemPrompt,
    stableInstructions,
    ttlSeconds
  );
}
