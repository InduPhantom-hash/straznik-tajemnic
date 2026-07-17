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
 * Zapisuje klucze API do localStorage
 */
export function saveApiKeys(keys: ApiKeys): void {
  if (typeof window === 'undefined') return;

  // Filtruj puste wartości
  const filtered = Object.fromEntries(
    Object.entries(keys).filter(([, v]) => v && v.trim() !== '')
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  // Emituj event dla innych komponentów
  window.dispatchEvent(
    new CustomEvent('api-keys-changed', { detail: filtered })
  );
}

/**
 * Pobiera klucze API z localStorage
 */
export function getApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
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
 * Zwraca nagłówki HTTP z kluczami API do użycia w fetch()
 */
export function getApiKeyHeaders(): Record<string, string> {
  const keys = getApiKeys();
  const headers: Record<string, string> = {};

  if (keys.GEMINI_API_KEY) {
    headers['X-Gemini-Api-Key'] = keys.GEMINI_API_KEY;
  }
  if (keys.PINECONE_API_KEY) {
    headers['X-Pinecone-Api-Key'] = keys.PINECONE_API_KEY;
  }
  // M5 sesja 146: ELEVENLABS_API_KEY header DROPPED per D2.
  if (keys.REPLICATE_API_TOKEN) {
    headers['X-Replicate-Api-Token'] = keys.REPLICATE_API_TOKEN;
  }
  if (keys.VERTEX_AI_API_KEY) {
    headers['X-Vertex-Api-Key'] = keys.VERTEX_AI_API_KEY;
  }
  if (keys.VERTEX_AI_PROJECT_ID) {
    headers['X-Vertex-Project-Id'] = keys.VERTEX_AI_PROJECT_ID;
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
