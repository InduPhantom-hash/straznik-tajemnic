/**
 * Chrome AI Re-ranker - kliencki moduł re-rankingu RAG przez Gemini Nano.
 *
 * ARCHITEKTURA:
 *   Serwerowy RAG (run-rag-summary.ts) zwraca 15-20 fragmentów z podręcznika.
 *   Ten moduł (CLIENT-SIDE) przepuszcza je przez Gemini Nano zainstalowany
 *   lokalnie w Chrome 127+. Nano re-rankuje fragmenty na podstawie pytania
 *   gracza i zwraca TOP-N (domyślnie 5) najbardziej trafnych.
 *
 *   Efekt: mniej szumu tokenowego w chmurowym API Gemini = tańsze i szybsze
 *   odpowiedzi. Gracz nie musi o tym wiedzieć - Nano pracuje "niewidocznie".
 *
 * FALLBACK:
 *   Gdy Chrome AI nie jest dostępne (starszy Chrome, Firefox, Safari),
 *   moduł zwraca oryginalne fragmenty bez zmian (passthrough).
 *
 * UWAGA: Ten plik MUSI być importowany WYŁĄCZNIE w komponentach klienckich
 *   ('use client'). NIE importuj w plikach route.ts ani middleware.
 *
 * @module chrome-ai-reranker
 */

import type { AILanguageModel } from '@/types/window-ai';

// --- Typy ---

/** Fragment RAG z serwerowego retrieval. */
export interface RagFragment {
  /** Treść fragmentu (chunk tekstu z podręcznika/encyklopedii). */
  content: string;
  /** Źródło fragmentu (np. "rules", "adventure", "encyclopedia"). */
  source?: string;
  /** Oryginalny score z serwerowego retrieval (BM25 + cosine). */
  score?: number;
  /** Dowolne metadane (strona, tytuł, namespace). */
  metadata?: Record<string, unknown>;
}

/** Wynik re-rankingu z Nano. */
export interface RerankedFragment extends RagFragment {
  /** Score od Nano (0-10, wyższy = bardziej trafny). */
  nanoScore: number;
  /** Oryginalna pozycja w tablicy wejściowej. */
  originalIndex: number;
}

/** Status dostępności Chrome AI. */
export type ChromeAIStatus =
  | 'available'       // Nano gotowy do użycia
  | 'after-download'  // Nano wymaga pobrania modelu
  | 'unavailable'     // Chrome AI niedostępne (stary Chrome, inny browser)
  | 'error';          // Błąd inicjalizacji

// --- Stałe ---

/** Ilość najlepszych fragmentów zwracanych po re-rankingu. */
const DEFAULT_TOP_N = 5;

/** Timeout na odpowiedź Nano (ms). */
const NANO_TIMEOUT_MS = 5000;

/** System prompt dla re-rankera. */
const RERANKER_SYSTEM_PROMPT = `Jesteś re-rankerem fragmentów podręcznika RPG "Zew Cthulhu 7e".
Gracz zadał pytanie. Otrzymujesz listę fragmentów z podręcznika.
Dla każdego fragmentu oceń trafność wobec pytania na skali 0-10.
Zwróć WYŁĄCZNIE JSON: [{"index": 0, "score": 8}, {"index": 1, "score": 3}, ...]
Nie dodawaj żadnego tekstu poza JSON.`;

// --- Singleton sesji Nano ---

let nanoSession: AILanguageModel | null = null;
let nanoStatus: ChromeAIStatus = 'unavailable';

/**
 * Sprawdza dostępność Chrome AI Nano.
 * Bezpieczne do wywołania w dowolnym momencie (SSR-safe).
 */
export async function checkChromeAIStatus(): Promise<ChromeAIStatus> {
  if (typeof window === 'undefined' || !window.ai?.languageModel) {
    nanoStatus = 'unavailable';
    return nanoStatus;
  }

  try {
    const capabilities = await window.ai.languageModel.capabilities();
    if (capabilities.available === 'readily') {
      nanoStatus = 'available';
    } else if (capabilities.available === 'after-download') {
      nanoStatus = 'after-download';
    } else {
      nanoStatus = 'unavailable';
    }
  } catch {
    nanoStatus = 'error';
  }

  return nanoStatus;
}

/**
 * Zwraca aktualny status Chrome AI (cache, nie odpytuje ponownie).
 */
export function getChromeAIStatus(): ChromeAIStatus {
  return nanoStatus;
}

/**
 * Inicjalizuje sesję Nano (lazy, singleton).
 * Zwraca `true` jeśli sesja jest gotowa, `false` jeśli niedostępna.
 */
async function ensureNanoSession(): Promise<boolean> {
  if (nanoSession) return true;

  const status = await checkChromeAIStatus();
  if (status !== 'available') return false;

  try {
    nanoSession = await window.ai!.languageModel.create({
      systemPrompt: RERANKER_SYSTEM_PROMPT,
      temperature: 0.1, // Deterministyczne rankingi
      topK: 1,
    });
    return true;
  } catch (err) {
    console.warn('⚠️ Chrome AI Nano: nie udało się zainicjalizować sesji', err);
    nanoStatus = 'error';
    return false;
  }
}

/**
 * Niszczy sesję Nano (cleanup).
 * Wywołaj np. przy odmontowaniu komponentu Encyklopedii.
 */
export function destroyNanoSession(): void {
  if (nanoSession) {
    nanoSession.destroy();
    nanoSession = null;
  }
}

// --- Re-ranking ---

/**
 * Re-rankuje fragmenty RAG przez Chrome AI Nano.
 *
 * @param query - Pytanie gracza
 * @param fragments - Fragmenty z serwerowego RAG retrieval
 * @param topN - Ilość najlepszych fragmentów do zwrócenia (domyślnie 5)
 * @returns Re-rankowane fragmenty (lub oryginalne przy niedostępności Nano)
 */
export async function rerankWithNano(
  query: string,
  fragments: RagFragment[],
  topN: number = DEFAULT_TOP_N
): Promise<RerankedFragment[]> {
  // Passthrough: za mało fragmentów, nie ma co re-rankować
  if (fragments.length <= topN) {
    return fragments.map((f, i) => ({
      ...f,
      nanoScore: f.score ?? 5,
      originalIndex: i,
    }));
  }

  // Próba inicjalizacji Nano
  const ready = await ensureNanoSession();
  if (!ready || !nanoSession) {
    // Fallback: zwróć topN z oryginalnym sortowaniem (bez re-rankingu)
    return fragments.slice(0, topN).map((f, i) => ({
      ...f,
      nanoScore: f.score ?? 5,
      originalIndex: i,
    }));
  }

  // Buduj prompt dla Nano
  const fragmentList = fragments
    .map((f, i) => `[${i}] ${f.content.substring(0, 300)}`)
    .join('\n\n');

  const prompt = `Pytanie gracza: "${query}"\n\nFragmenty:\n${fragmentList}\n\nOceń trafność każdego fragmentu (0-10) i zwróć JSON.`;

  try {
    // Timeout: nie czekaj dłużej niż NANO_TIMEOUT_MS
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NANO_TIMEOUT_MS);

    const response = await nanoSession.prompt(prompt, {
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Parsuj JSON z odpowiedzi Nano
    const scores = parseNanoResponse(response, fragments.length);

    // Połącz z fragmentami i posortuj malejąco wg nanoScore
    const reranked: RerankedFragment[] = fragments
      .map((f, i) => ({
        ...f,
        nanoScore: scores[i] ?? 0,
        originalIndex: i,
      }))
      .sort((a, b) => b.nanoScore - a.nanoScore)
      .slice(0, topN);

    console.log(
      `🧠 Chrome AI Nano: re-ranked ${fragments.length} → ${reranked.length} fragmentów`,
      reranked.map((r) => `[${r.originalIndex}] score=${r.nanoScore}`)
    );

    return reranked;
  } catch (err) {
    console.warn('⚠️ Chrome AI Nano: re-ranking failed, passthrough', err);
    // Fallback: oryginalne fragmenty
    return fragments.slice(0, topN).map((f, i) => ({
      ...f,
      nanoScore: f.score ?? 5,
      originalIndex: i,
    }));
  }
}

/**
 * Parsuje odpowiedź JSON od Nano.
 * Toleruje niekompletne/zaszumione odpowiedzi (Nano to mały model).
 */
function parseNanoResponse(
  response: string,
  expectedCount: number
): number[] {
  const scores = new Array<number>(expectedCount).fill(0);

  try {
    // Wyciągnij JSON z odpowiedzi (może być owinięty w tekst)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return scores;

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      index: number;
      score: number;
    }>;

    if (!Array.isArray(parsed)) return scores;

    for (const entry of parsed) {
      if (
        typeof entry.index === 'number' &&
        typeof entry.score === 'number' &&
        entry.index >= 0 &&
        entry.index < expectedCount
      ) {
        scores[entry.index] = Math.max(0, Math.min(10, entry.score));
      }
    }
  } catch {
    // Nano zwrócił coś nieparsowalne - fallback na zerowe score
    console.warn('⚠️ Chrome AI Nano: nie udało się sparsować odpowiedzi JSON');
  }

  return scores;
}
