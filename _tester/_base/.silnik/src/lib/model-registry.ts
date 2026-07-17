/**
 * Model Registry - single source of truth dla modeli Gemini (IND-275 T1).
 *
 * Konsoliduje rozsiane po ~8 plikach definicje modeli (chat per preset, default,
 * embedding + wymiary, cacheable, context limits, cennik) w jeden moduł.
 * Zmiana modelu / cennika = edycja TYLKO tutaj.
 *
 * ZASADA "ZERO USUWANIA ID" (IND-222): bare warianty (gemini-3-flash,
 * gemini-3.1-pro bez '-preview') są WYBIERALNE w dropdownie ustawień
 * (gemini-sections/header.tsx) oraz pełnią rolę świadomych fallbacków.
 * NIE wycinamy ich z type union ani z map - tylko oznaczamy `// legacy`.
 *
 * Wartości w tym pliku są IDENTYCZNE z poprzednim stanem (zachowanie 1:1):
 * - QUALITY_PRESETS (ai-presets/definitions.ts) trzyma literały `as const` dla
 *   literal-typingu; rejestr je MIRRORuje w PRESET_MODELS, a drift-guard test
 *   pilnuje równości (definitions.ts NIE importuje z rejestru w runtime).
 */

// ============================================================================
// TYPE UNION (przeniesiony z ai-settings/types.ts - identyczny skład 14 ID)
// ============================================================================

/**
 * Pełna lista ID modeli Gemini wybieralnych w ustawieniach.
 * Bare warianty (bez '-preview') = świadome fallbacki IND-222, NIE usuwać.
 */
export type GeminiModelId =
  | 'gemini-3.1-pro-preview'
  | 'gemini-3.1-pro' // legacy (IND-222 fallback; bare = 404, ale wybieralny/wymuszony)
  | 'gemini-3-flash-preview'
  | 'gemini-3-flash' // legacy (IND-222 fallback)
  | 'gemini-3-flash-lite'
  | 'gemini-3-pro-preview'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-exp'
  | 'gemini-2.0-flash-lite'
  | 'gemini-flash-latest'
  | 'gemini-pro-latest';

// ============================================================================
// DEFAULTY CHAT
// ============================================================================

/** Domyślny model chat dla wszystkich endpointów AI (fallback IND-222). */
export const DEFAULT_CHAT_MODEL = 'gemini-2.5-flash' as const;

/** Wariant Lite dla low-cost endpointów (equipment/scene summary). */
export const DEFAULT_CHAT_MODEL_LITE = 'gemini-2.5-flash' as const;

// ============================================================================
// PRESETY (mirror QUALITY_PRESETS z definitions.ts - drift-guard pilnuje)
// ============================================================================

export type PresetKey = 'low' | 'mid' | 'high' | 'ultra';

export interface PresetModelInfo {
  /** Model chat użyty przez preset (musi === QUALITY_PRESETS[x].settings.model). */
  chatModel: GeminiModelId;
  /** Głos TTS presetu (musi === QUALITY_PRESETS[x].settings.ttsVoice). */
  ttsVoice: string | null;
}

/**
 * Mapa preset → model + głos. Wartości 1:1 z ai-presets/definitions.ts.
 * Drift-guard test (model-registry.test.ts) wymusza równość z QUALITY_PRESETS.
 */
export const PRESET_MODELS: Record<PresetKey, PresetModelInfo> = {
  low: { chatModel: 'gemini-3-flash-preview', ttsVoice: null },
  mid: { chatModel: 'gemini-3-flash-preview', ttsVoice: 'Charon' },
  high: { chatModel: 'gemini-2.5-flash', ttsVoice: 'Charon' },
  ultra: { chatModel: 'gemini-3.1-pro-preview', ttsVoice: 'Gacrux' },
};

// ============================================================================
// EMBEDDINGI (z embedding-service.ts)
// ============================================================================

/** Model embeddingów RAG (#1 MTEB Multilingual). */
export const EMBEDDING_MODEL = 'gemini-embedding-001' as const;

/** Wymiar V1 (default, MRL truncated). */
export const EMBEDDING_DIM_V1 = 768;
/** Wymiar V2 (opt-in RAG_VERSION=v2, native). */
export const EMBEDDING_DIM_V2 = 3072;

// ============================================================================
// CACHE (z gemini-cache-service.ts)
// ============================================================================

/** Modele wspierające context caching (OPT-26). */
export const CACHEABLE_MODELS: ReadonlySet<string> = new Set([
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  // IND-222: poprawne nazwy API ('-preview')
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3.1-pro-preview',
  // legacy (bare = 404, zostawione jako no-op fallback)
  'gemini-3-flash',
  'gemini-3-pro',
  'gemini-3.1-pro',
]);

/** Minimalna liczba cached tokenów per model (poniżej = odrzucone przez API). */
export const MIN_CACHE_TOKENS: Record<string, number> = {
  'gemini-2.5-pro': 4096,
  'gemini-3-pro-preview': 4096,
  'gemini-3.1-pro-preview': 4096,
  'gemini-3-pro': 4096, // legacy
  'gemini-3.1-pro': 4096, // legacy
};

export const DEFAULT_MIN_CACHE_TOKENS = 1024;

// ============================================================================
// CONTEXT WINDOW (z run-chat-pipeline.ts)
// ============================================================================

const DEFAULT_CONTEXT_LIMIT = 1048576;

/** Limity okna kontekstowego per model (tokeny wejścia). */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'gemini-2.0-flash': DEFAULT_CONTEXT_LIMIT,
  'gemini-2.5-flash': DEFAULT_CONTEXT_LIMIT,
  'gemini-3-flash-preview': DEFAULT_CONTEXT_LIMIT,
  'gemini-3-pro-preview': DEFAULT_CONTEXT_LIMIT,
  'gemini-3.1-pro-preview': DEFAULT_CONTEXT_LIMIT,
};

/** Zwraca limit kontekstu modelu (fallback DEFAULT_CONTEXT_LIMIT). */
export function getContextLimit(modelId: string): number {
  return MODEL_CONTEXT_LIMITS[modelId] || DEFAULT_CONTEXT_LIMIT;
}

// ============================================================================
// CENNIK GEMINI (z ai-cost-tracker.ts - per 1M tokenów USD)
// ============================================================================

/**
 * Cennik Gemini (input/output USD per 1M tokenów). Klucz `default` = fallback
 * dla nieznanych modeli. calculateGeminiCost() (ai-cost-tracker) używa tej mapy.
 */
export const GEMINI_PRICING: Record<string, { input: number; output: number }> =
  {
    // IND-222: poprawne nazwy API ('-preview'); bare zostawione (fallback 'default' i tak pokrywa)
    'gemini-3.1-pro-preview': { input: 2.0, output: 12.0 },
    'gemini-3-flash-preview': { input: 0.5, output: 3.0 },
    'gemini-3.1-pro': { input: 2.0, output: 12.0 }, // legacy
    'gemini-3-flash': { input: 0.5, output: 3.0 }, // legacy
    'gemini-2.5-pro': { input: 3.5, output: 10.5 },
    'gemini-2.5-flash': { input: 0.075, output: 0.3 },
    'gemini-2.0-flash': { input: 0.075, output: 0.3 },
    default: { input: 0.5, output: 1.5 },
  };
