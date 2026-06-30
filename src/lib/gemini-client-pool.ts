/**
 * Gemini Client Pool
 *
 * Cache'uje instancje GoogleGenAI per klucz API.
 * Eliminuje tworzenie nowego klienta na każdy request.
 * GoogleGenAI jest stateless — bezpieczny do reuse.
 */

import { GoogleGenAI } from '@google/genai';

const clientCache = new Map<string, GoogleGenAI>();

/**
 * Zwraca (lub tworzy i cache'uje) klienta Gemini dla danego klucza API.
 * Zwraca null jeśli brak klucza.
 */
export function getGeminiClient(apiKey: string | null | undefined): GoogleGenAI | null {
    if (!apiKey || apiKey.trim() === '') return null;

    const existing = clientCache.get(apiKey);
    if (existing) return existing;

    const client = new GoogleGenAI({ apiKey });
    clientCache.set(apiKey, client);
    return client;
}

/**
 * Wyczyść cache (np. przy zmianie klucza API).
 */
export function clearGeminiClientCache(): void {
    clientCache.clear();
}
