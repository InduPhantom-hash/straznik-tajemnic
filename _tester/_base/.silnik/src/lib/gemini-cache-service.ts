/**
 * OPT-26: Gemini Context Caching Service
 *
 * Zarządza cache'owaniem stabilnych części promptu (system prompt, era rules,
 * GM protocol) w Gemini API. Cached tokeny kosztują 75-90% mniej niż standard.
 *
 * Strategia:
 * - systemInstruction: pełny system prompt GM (stabilny per sesja dzięki OPT-04)
 * - contents: era rules + GM protocol (stabilne per sesja/próg tur)
 * - TTL: 1h (typowa sesja gry)
 * - Hash-based invalidation: md5(systemPrompt + stableInstructions + model)
 * - Graceful fallback: jeśli cache nie zadziała → zwykły request (brak regresji)
 *
 * IND-19: migracja SDK @google/generative-ai (EOL) → @google/genai.
 * Zmiany: GoogleAICacheManager → ai.caches, ttlSeconds: N → ttl: "Ns" (string Duration),
 * model bez prefiksu "models/" (nowe SDK nie wymaga), managerPool → aiPool (GoogleGenAI).
 */

import { GoogleGenAI, type CachedContent } from '@google/genai';
import crypto from 'crypto';
// IND-275 T1: CACHEABLE_MODELS / MIN_CACHE_TOKENS scentralizowane w model-registry.
import {
  CACHEABLE_MODELS,
  MIN_CACHE_TOKENS,
  DEFAULT_MIN_CACHE_TOKENS,
} from './model-registry';

// ─── Configuration ───────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 3600; // 1 hour

// ─── Internal state ──────────────────────────────────────────────────

interface CacheEntry {
  cachedContent: CachedContent;
  contentHash: string;
  createdAt: number;
}

/** Cache reference store: cacheKey → CacheEntry */
const cacheStore = new Map<string, CacheEntry>();

/** GoogleGenAI pool: apiKey → instance */
const aiPool = new Map<string, GoogleGenAI>();

// ─── Helpers ─────────────────────────────────────────────────────────

function getAI(apiKey: string): GoogleGenAI {
  let ai = aiPool.get(apiKey);
  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
    aiPool.set(apiKey, ai);
  }
  return ai;
}

function hashContent(...parts: string[]): string {
  return crypto.createHash('md5').update(parts.join('|||')).digest('hex');
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Pobierz lub utwórz Gemini context cache dla stabilnych części promptu.
 *
 * @param apiKey       Klucz API Gemini
 * @param modelName    Nazwa modelu (np. 'gemini-2.5-flash')
 * @param systemPrompt Pełny system prompt GM (jako systemInstruction)
 * @param stableInstructions Połączone era rules + GM protocol
 * @param ttlSeconds   TTL cache w sekundach (domyślnie CACHE_TTL_SECONDS = 3600)
 * @returns CachedContent do użycia przez config.cachedContent w gemini-provider (IND-19),
 *          lub null jeśli cache nie jest możliwy/opłacalny
 */
export async function getOrCreateGeminiCache(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  stableInstructions: string,
  ttlSeconds?: number
): Promise<CachedContent | null> {
  // ── Guard: model supports caching? ──
  if (!CACHEABLE_MODELS.has(modelName)) {
    return null;
  }

  // ── Guard: enough tokens to cache? ──
  const totalTokens =
    estimateTokens(systemPrompt) + estimateTokens(stableInstructions);
  const minTokens = MIN_CACHE_TOKENS[modelName] || DEFAULT_MIN_CACHE_TOKENS;
  if (totalTokens < minTokens) {
    console.log(
      `📦 OPT-26: Skipping cache - ${totalTokens} est. tokens < ${minTokens} minimum for ${modelName}`
    );
    return null;
  }

  // ── Check in-memory cache store ──
  const contentHash = hashContent(systemPrompt, stableInstructions, modelName);
  const cacheKey = `${apiKey.slice(-8)}_${contentHash}`;

  const existing = cacheStore.get(cacheKey);
  if (existing) {
    const ageSeconds = (Date.now() - existing.createdAt) / 1000;
    // Use cache if it's not expired (with 60s safety margin)
    if (ageSeconds < CACHE_TTL_SECONDS - 60) {
      console.log(
        `✅ OPT-26: Cache hit: ${existing.cachedContent.name} (age: ${Math.floor(ageSeconds)}s, ~${totalTokens} tok cached)`
      );
      return existing.cachedContent;
    }
    // Expired - remove stale entry
    cacheStore.delete(cacheKey);
    console.log(
      `🔄 OPT-26: Cache expired (${Math.floor(ageSeconds)}s), creating new...`
    );
  }

  // ── Create new cache via Gemini API ──
  // IND-19: ai.caches.create({ model, config: { ..., ttl: "Xs" } })
  // model BEZ prefiksu "models/" - nowe SDK tego nie wymaga
  const effectiveTTL = ttlSeconds ?? CACHE_TTL_SECONDS;
  try {
    const ai = getAI(apiKey);

    const cachedContent = await ai.caches.create({
      model: modelName,
      config: {
        systemInstruction: systemPrompt,
        contents: [
          {
            role: 'user',
            parts: [{ text: stableInstructions }],
          },
          {
            role: 'model',
            parts: [
              {
                text: 'Rozumiem kontekst gry, zasady epoki i protokół MG. Czekam na wiadomość gracza.',
              },
            ],
          },
        ],
        ttl: `${effectiveTTL}s`,
        displayName: `zew-gm-${modelName}-${Date.now()}`,
      },
    });

    // Store in local cache
    cacheStore.set(cacheKey, {
      cachedContent,
      contentHash,
      createdAt: Date.now(),
    });

    console.log(
      `🆕 OPT-26: Cache created: ${cachedContent.name} (~${totalTokens} tok, TTL ${effectiveTTL}s, model: ${modelName})`
    );
    return cachedContent;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`⚠️ OPT-26: Cache creation failed for ${modelName}: ${msg}`);
    // Graceful fallback - caller proceeds without cache
    return null;
  }
}

/**
 * Wyczyść lokalny cache store (np. przy zmianie sesji)
 */
export function clearGeminiCacheStore(): void {
  cacheStore.clear();
  console.log('🗑️ OPT-26: Cache store cleared');
}

/**
 * Status cache'a do diagnostyki
 */
export function getGeminiCacheStatus(): {
  entries: number;
  caches: Array<{
    key: string;
    name?: string;
    ageSeconds: number;
    hash: string;
  }>;
} {
  const now = Date.now();
  return {
    entries: cacheStore.size,
    caches: Array.from(cacheStore.entries()).map(([key, entry]) => ({
      key,
      name: entry.cachedContent.name,
      ageSeconds: Math.floor((now - entry.createdAt) / 1000),
      hash: entry.contentHash.slice(0, 8),
    })),
  };
}
