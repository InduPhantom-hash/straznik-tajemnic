/**
 * IND-222: detekcja błędu "model nie istnieje" (404 NOT_FOUND) z SDK Gemini.
 *
 * Wydzielone z run-chat-pipeline.ts jako czysta funkcja bez zależności od
 * `next/server`, by dało się testować w izolacji (import run-chat-pipeline
 * ciągnie cały łańcuch next/server + 17 deps).
 *
 * Detekcja po status/message, NIE instanceof (mock-safe, lekcja IND-191
 * classifyTtsError - mock klasy ApiError w Jest = inna referencja, instanceof pęka).
 */
export function isModelNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 404) return true;
  return /not found|NOT_FOUND/i.test(e.message ?? '');
}

/**
 * Detekcja błędu nieprawidłowego/wygasłego klucza API Gemini (400 INVALID_ARGUMENT / 403 PERMISSION_DENIED / 401).
 */
export function isInvalidKeyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; code?: number; message?: string };
  const status = e.status ?? e.code;
  if (status === 400 || status === 401 || status === 403) {
    return /INVALID_ARGUMENT|PERMISSION_DENIED|API[_ ]key not valid|API_KEY_INVALID|UNAUTHENTICATED/i.test(
      e.message ?? ''
    );
  }
  return /API[_ ]key not valid|API_KEY_INVALID/i.test(e.message ?? '');
}

