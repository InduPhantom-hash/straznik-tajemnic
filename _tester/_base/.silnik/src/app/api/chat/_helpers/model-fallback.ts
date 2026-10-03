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

/**
 * Detekcja błędu wyczerpania środków przedpłaconych (prepayment credits) w Google AI Studio (HTTP 402).
 */
export function isPrepaymentCreditsError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; code?: number; message?: string };
  const msg = typeof err === 'string' ? err : e.message ?? '';
  const status = e.status ?? e.code;
  if (status === 402) return true;
  return /"code":\s*402|prepayment credits are depleted/i.test(msg);
}

/**
 * Detekcja błędu limitów lub wyczerpania środków (402 Prepayment / 429 RESOURCE_EXHAUSTED / Quota).
 */
export function isQuotaOrCreditsError(err: unknown): boolean {
  if (!err) return false;
  if (isPrepaymentCreditsError(err)) return true;
  const e = err as { status?: number; code?: number; message?: string };
  const msg = typeof err === 'string' ? err : e.message ?? '';
  const status = e.status ?? e.code;
  if (status === 429) return true;
  return /RESOURCE_EXHAUSTED|quota|rate[_ ]limit|too many requests|Quota exceeded/i.test(msg);
}


