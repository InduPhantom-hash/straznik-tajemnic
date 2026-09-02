/**
 * Stałe modelu Gemini - re-export z `model-registry.ts` (single source of truth).
 *
 * IND-68 (sesja 75): eliminacja `'gemini-2.0-flash'` literal duplikowanego
 * w 8 miejscach (chat/route, pdf/extract-text, adventure/analyze, ai/gemini,
 * chat-test, summarize-scene, analyze-image, equipment/generate-starting).
 *
 * IND-275 T1 (self-check): wartości przeniesione do `src/lib/model-registry.ts`.
 * Ten plik re-eksportuje je pod historycznymi nazwami `DEFAULT_GEMINI_MODEL` /
 * `DEFAULT_GEMINI_MODEL_LITE` (13+ callerów bez zmian). **Zmiana modelu** =
 * edycja TYLKO rejestru.
 */
import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_CHAT_MODEL_FALLBACK,
  DEFAULT_CHAT_MODEL_LITE,
} from '../model-registry';

/**
 * Domyślny model Gemini dla wszystkich endpointów AI.
 *
 * Aktualnie `gemini-flash-latest` (automatyczny stabilny Flash alias).
 */
export const DEFAULT_GEMINI_MODEL = DEFAULT_CHAT_MODEL;

/**
 * Sprawdzony produkcyjnie model awaryjny (w razie 404/503 na aliasie).
 */
export const DEFAULT_GEMINI_MODEL_FALLBACK = DEFAULT_CHAT_MODEL_FALLBACK;

/**
 * Wariant Lite dla low-cost endpointów (equipment generation, scene summary).
 * Używany w `equipment/generate-starting/route.ts`.
 */
export const DEFAULT_GEMINI_MODEL_LITE = DEFAULT_CHAT_MODEL_LITE;
