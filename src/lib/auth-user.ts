/**
 * Rozwiązywanie tożsamości użytkownika server-side (wersja domowa, bez auth).
 *
 * Aplikacja domowa nie ma logowania - jeden lokalny użytkownik. `resolveUserId`
 * i `scopeSessionId` zostały, bo 7 tras API ich używa do scope'owania ścieżek
 * GCS / RAG, ale po wycięciu Clerka po prostu zwracają przekazany fallback
 * (kliencki userId / hash IP+UA / 'local' / 'default_user').
 */

/**
 * Zwraca `legacyFallback` (wersja domowa: brak auth, jeden lokalny użytkownik).
 *
 * @param legacyFallback wartość scope (np. `userId || 'local'`)
 */
export async function resolveUserId(legacyFallback: string): Promise<string> {
  return legacyFallback;
}

/**
 * Scope'uje identyfikator sesji per-konto (IND-168 Faza 3, izolacja RAG).
 *
 * Magazyny kluczowane sessionId (Pinecone namespace `sessions/{id}`, cache
 * podsumowań, director state) stają się per-user: `{userId}/{sessionId}`.
 * Dzięki temu pamięć fabularna jednego gracza nie wycieka do RAG innego.
 *
 * Gdy `userId` puste (Clerk wyłączony w dev) - zwraca płaski `sessionId`
 * (zachowanie sprzed Fazy 3). Gdy brak `sessionId` - zwraca go bez zmian.
 */
export function scopeSessionId(
  userId: string,
  sessionId?: string
): string | undefined {
  if (!sessionId) return sessionId;
  return userId ? `${userId}/${sessionId}` : sessionId;
}

// IND-206 BYOK: getUserGeminiApiKey + UserApiKeyMetadata USUNIĘTE. Klucz Gemini
// testera żyje wyłącznie w localStorage i jedzie nagłówkiem X-Gemini-Api-Key -
// Clerk privateMetadata nie przechowuje już kluczy (właściciel nie widzi kluczy
// testerów). resolveUserId/scopeSessionId zostają (izolacja RAG/storage per-konto).
