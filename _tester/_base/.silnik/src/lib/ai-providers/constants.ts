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
import { DEFAULT_CHAT_MODEL, DEFAULT_CHAT_MODEL_LITE } from '../model-registry';

/**
 * Domyślny model Gemini dla wszystkich endpointów AI.
 *
 * Aktualnie `gemini-2.5-flash` (stabilny balans, zweryfikowany żywym API jako
 * model presetu HIGH). Po upgrade w presetach (Zew-App 4.x) - zmień TYLKO tutaj,
 * callerzy używają const importu.
 *
 * Sesja 48 audyt #14 wykryła model staleness w 3 fallback miejscach
 * (chat/route.ts:154,331 + provider-aware paths) - przed IND-68 każda
 * zmiana modelu wymagała grep + edit 8 plików.
 *
 * 2026-06-22 (playtest): Google wycofał `gemini-2.0-flash` (404 NOT_FOUND
 * "no longer available") → /api/ai/utility, fallback /api/chat, PDF, ekwipunek
 * leciały 502. Bump na `gemini-2.5-flash` (rejestry cost/cache/limity już go
 * mają). Lekcja IND-222: nazwy modeli Gemini deprecują - weryfikuj żywym API.
 */
export const DEFAULT_GEMINI_MODEL = DEFAULT_CHAT_MODEL;

/**
 * Wariant Lite dla low-cost endpointów (equipment generation, scene summary).
 * Używany w `equipment/generate-starting/route.ts`.
 *
 * 2026-06-22: `gemini-2.0-flash-lite` wycofany razem z 2.0-flash. Wskazuje na
 * `gemini-2.5-flash` (jedyny zweryfikowany żywo cheap model). `gemini-2.5-flash-lite`
 * istnieje w typach, ale wymaga smoke generateContent przed użyciem (IND-222).
 */
export const DEFAULT_GEMINI_MODEL_LITE = DEFAULT_CHAT_MODEL_LITE;
