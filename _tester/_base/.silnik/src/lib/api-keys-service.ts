'use client';

/**
 * Serwis do przechowywania kluczy API w localStorage
 * Klucze są przechowywane lokalnie i przesyłane do API przez nagłówki HTTP
 */

export interface ApiKeys {
  // Wymagany - AI Game Master, TTS (Pro/Flash), analiza obrazów
  GEMINI_API_KEY?: string;

  // M5+M6 sesja 146: ELEVENLABS_API_KEY DROPPED per D2.

  // Opcjonalny - Pinecone vector DB
  PINECONE_API_KEY?: string;

  // Opcjonalny - Fallback image generation (Flux Schnell)
  REPLICATE_API_TOKEN?: string;

  // Opcjonalny - Imagen 4 images (Vertex AI)
  VERTEX_AI_API_KEY?: string;
  VERTEX_AI_PROJECT_ID?: string;
}

const STORAGE_KEY = 'zew-app-api-keys';

/**
 * Oczyszcza klucz API / ID projektu z niewidocznych znaków Unicode,
 * separatorów linii (\u2028, \u2029), BOM (\uFEFF) oraz znaków spoza bezpiecznego ASCII (33-126).
 * Zapewnia 100% zgodności ze specyfikacją HTTP RFC 7230 i WHATWG Fetch (ISO-8859-1).
 */
export function sanitizeApiKey(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[^\x21-\x7E]/g, '').trim();
}

/**
 * Zapisuje klucze API do localStorage
 */
export function saveApiKeys(keys: ApiKeys): void {
  if (typeof window === 'undefined') return;

  // Sanityzuj i filtruj puste wartości
  const filtered: ApiKeys = {};
  for (const [k, v] of Object.entries(keys)) {
    const clean = sanitizeApiKey(v);
    if (clean) {
      filtered[k as keyof ApiKeys] = clean;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  // Emituj event dla innych komponentów
  window.dispatchEvent(
    new CustomEvent('api-keys-changed', { detail: filtered })
  );
}

/**
 * Pobiera klucze API z localStorage (automatycznie sanityzuje zapisane dane)
 */
export function getApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const sanitized: ApiKeys = {};
    for (const [k, v] of Object.entries(parsed)) {
      const clean = sanitizeApiKey(v);
      if (clean) {
        sanitized[k as keyof ApiKeys] = clean;
      }
    }
    return sanitized;
  } catch {
    return {};
  }
}

/**
 * Sprawdza czy wymagany klucz GEMINI_API_KEY jest ustawiony
 */
export function hasRequiredKeys(): boolean {
  const keys = getApiKeys();
  return !!(keys.GEMINI_API_KEY && keys.GEMINI_API_KEY.trim() !== '');
}

/**
 * Usuwa wszystkie klucze API
 */
export function clearApiKeys(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('api-keys-changed', { detail: {} }));
}

/**
 * Zwraca nagłówki HTTP z kluczami API do użycia w fetch().
 * Gwarantuje, że nagłówki zawierają wyłącznie bezpieczny ASCII/ISO-8859-1 (brak awarii fetch).
 */
export function getApiKeyHeaders(): Record<string, string> {
  const keys = getApiKeys();
  const headers: Record<string, string> = {};

  const gemini = sanitizeApiKey(keys.GEMINI_API_KEY);
  if (gemini) {
    headers['X-Gemini-Api-Key'] = gemini;
  }
  const pinecone = sanitizeApiKey(keys.PINECONE_API_KEY);
  if (pinecone) {
    headers['X-Pinecone-Api-Key'] = pinecone;
  }
  // M5 sesja 146: ELEVENLABS_API_KEY header DROPPED per D2.
  const replicate = sanitizeApiKey(keys.REPLICATE_API_TOKEN);
  if (replicate) {
    headers['X-Replicate-Api-Token'] = replicate;
  }
  const vertex = sanitizeApiKey(keys.VERTEX_AI_API_KEY);
  if (vertex) {
    headers['X-Vertex-Api-Key'] = vertex;
  }
  const project = sanitizeApiKey(keys.VERTEX_AI_PROJECT_ID);
  if (project) {
    headers['X-Vertex-Project-Id'] = project;
  }

  return headers;
}

/**
 * Wrapper dla fetch() który automatycznie dodaje klucze API z localStorage
 * Użycie: const response = await fetchWithApiKeys('/api/chat', { method: 'POST', body: ... });
 */
export async function fetchWithApiKeys(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKeyHeaders = getApiKeyHeaders();

  const mergedHeaders = {
    ...apiKeyHeaders,
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
}
