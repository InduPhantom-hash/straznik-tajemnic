/**
 * Telemetry Service - ustrukturyzowane logowanie każdego zdarzenia API
 *
 * Trzy warstwy zapisu (każda niezależna, błąd jednej nie blokuje pozostałych):
 *   1. console.log  - zawsze, Vercel Logs przechwytuje automatycznie
 *   2. JSONL file   - lokalnie dev: ./src/telemetry.jsonl
 *   3. Sentry       - opcjonalne, gdy NEXT_PUBLIC_SENTRY_DSN jest ustawiony
 *
 * Supabase (warstwa 4) - dodaj gdy będziesz gotowy:
 *   ustaw SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY w .env.local
 *   i odkomentuj blok supabase poniżej.
 *
 * Każde zdarzenie dostaje unikalny trace_id - możesz go powiązać
 * z logami Vercel, naganiem PostHog i błędem Sentry.
 */

import * as Sentry from '@sentry/nextjs';

// ============================================================================
// TYPES
// ============================================================================

export type TelemetryStatus = 'success' | 'error' | 'timeout' | 'cancelled';

export interface ApiEventPayload {
  /** Endpoint API, np. '/api/chat', '/api/tts' */
  endpoint: string;
  /** Model AI użyty w żądaniu, np. 'gemini-3-flash', 'elevenlabs' */
  model?: string;
  /** HTTP status code odpowiedzi */
  status: number;
  /** Czas wykonania w ms */
  durationMs: number;
  /** Tokeny wejściowe (tylko dla modeli językowych) */
  tokensIn?: number;
  /** Tokeny wyjściowe */
  tokensOut?: number;
  /** Szacunkowy koszt żądania w USD */
  costUsd?: number;
  /** ID sesji gry */
  sessionId?: string;
  /** Pseudonimowy ID użytkownika */
  userId?: string;
  /** SUCCESS / ERROR / TIMEOUT */
  result: TelemetryStatus;
  /** Kod błędu jeśli result !== 'success', np. 'API_KEY_MISSING', 'RATE_LIMIT' */
  errorCode?: string;
  /** Wiadomość błędu (skrócona, bez danych wrażliwych) */
  errorMsg?: string;
  /** Rozmiar requestu w bajtach */
  requestBytes?: number;
  /** Provider: 'gemini' | 'google' | 'vertex' | 'replicate' (M5+M6 sesja 146: drop elevenlabs/openai) */
  provider?: string;
  /** Dodatkowe metadane specyficzne dla endpointu */
  meta?: Record<string, string | number | boolean | null>;
}

export interface TelemetryEvent extends ApiEventPayload {
  /** Unikalny ID śledzenia - łączy logi Vercel, Sentry i PostHog */
  traceId: string;
  /** ISO timestamp początku żądania */
  timestamp: string;
  /** Środowisko: 'development' | 'production' | 'test' */
  env: string;
}

// ============================================================================
// TRACE ID
// ============================================================================

/**
 * Generuje unikalny trace ID dla żądania.
 * Format: tel_{timestamp}_{random6} - czytelny w logach.
 */
export function generateTraceId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `tel_${ts}_${rand}`;
}

// ============================================================================
// CORE: logApiEvent
// ============================================================================

/**
 * Rejestruje zdarzenie API we wszystkich skonfigurowanych kanałach.
 *
 * Użycie - wzorzec try/finally w route handlerze:
 * ```ts
 * const traceId = generateTraceId();
 * const startMs = Date.now();
 * try {
 *   // ... logika ...
 *   await logApiEvent({ endpoint: '/api/chat', status: 200, result: 'success',
 *     durationMs: Date.now() - startMs, model, tokensIn, tokensOut, traceId });
 * } catch (err) {
 *   await logApiEvent({ endpoint: '/api/chat', status: 500, result: 'error',
 *     durationMs: Date.now() - startMs, errorMsg: String(err), traceId });
 *   throw err;
 * }
 * ```
 */
export async function logApiEvent(
  payload: ApiEventPayload & { traceId: string }
): Promise<void> {
  const event: TelemetryEvent = {
    ...payload,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV ?? 'development',
  };

  // Warstwa 1: console.log (zawsze - Vercel Logs przechwytuje)
  writeToConsole(event);

  // Warstwa 2: lokalny plik JSONL (dev)
  writeToFile(event);

  // Warstwa 3: Sentry - dodaj breadcrumb i scope do aktywnej transakcji
  writeToSentry(event);

  // Warstwa 4: Supabase (odkomentuj gdy gotowy)
  // await writeToSupabase(event);
}

// ============================================================================
// LAYER 1: console.log
// ============================================================================

function writeToConsole(event: TelemetryEvent): void {
  const icon = event.result === 'success' ? '📊' : '🔴';
  const cost = event.costUsd != null ? ` $${event.costUsd.toFixed(5)}` : '';
  const tokens =
    event.tokensIn != null || event.tokensOut != null
      ? ` [in:${event.tokensIn ?? '-'} out:${event.tokensOut ?? '-'}]`
      : '';

  // Linia czytelna dla człowieka + JSON dla maszyny - Vercel strukturyzuje to poprawnie
  console.log(
    `${icon} TELEMETRY ${event.traceId} | ${event.endpoint} | ${event.status} | ${event.durationMs}ms${tokens}${cost}`,
    JSON.stringify({
      traceId: event.traceId,
      endpoint: event.endpoint,
      model: event.model,
      status: event.status,
      durationMs: event.durationMs,
      result: event.result,
      errorCode: event.errorCode,
      errorMsg: event.errorMsg,
      tokensIn: event.tokensIn,
      tokensOut: event.tokensOut,
      costUsd: event.costUsd,
      sessionId: event.sessionId,
      provider: event.provider,
      timestamp: event.timestamp,
    })
  );
}

// ============================================================================
// LAYER 2: JSONL file (dev only)
// ============================================================================

function writeToFile(event: TelemetryEvent): void {
  // Tylko lokalnie - na Vercel filesystem jest ephemeral (nie persystuje)
  if (typeof process === 'undefined') return;
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.TELEMETRY_WRITE_FILE
  )
    return;

  try {
    // ESLint ignored - plik server-only, fs/path nie trafi do bundla klienta przez tree-shaking
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const logPath = path.resolve(process.cwd(), 'src', 'telemetry.jsonl');
    fs.appendFileSync(logPath, JSON.stringify(event) + '\n', 'utf8');
  } catch {
    // Cichy fail - nie przerywaj działania aplikacji z powodu logów
  }
}

// ============================================================================
// LAYER 3: Sentry breadcrumbs
// ============================================================================

function writeToSentry(event: TelemetryEvent): void {
  try {
    // Dodaj breadcrumb do aktywnej transakcji Sentry
    // Breadcrumby pojawiają się w panelu błędu - widać co działo się przed crashem
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${event.endpoint} → ${event.status} (${event.durationMs}ms)`,
      level: event.result === 'error' ? 'error' : 'info',
      data: {
        traceId: event.traceId,
        model: event.model,
        provider: event.provider,
        tokensIn: event.tokensIn,
        tokensOut: event.tokensOut,
        costUsd: event.costUsd,
        errorCode: event.errorCode,
      },
      timestamp: Date.now() / 1000,
    });

    // Jeśli błąd - ustaw dodatkowy kontekst na scope
    if (event.result === 'error') {
      Sentry.withScope((scope) => {
        scope.setTag('endpoint', event.endpoint);
        scope.setTag('error_code', event.errorCode ?? 'unknown');
        scope.setContext('api_event', {
          traceId: event.traceId,
          model: event.model,
          status: event.status,
          durationMs: event.durationMs,
          sessionId: event.sessionId,
        });
      });
    }
  } catch {
    // Sentry może nie być zainicjalizowany - ignorujemy
  }
}

// ============================================================================
// LAYER 4: Supabase (stub - odkomentuj gdy gotowy)
// ============================================================================

// async function writeToSupabase(event: TelemetryEvent): Promise<void> {
//   const supabaseUrl = process.env.SUPABASE_URL;
//   const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!supabaseUrl || !supabaseKey) return;
//
//   try {
//     // Lazy import żeby nie ładować @supabase/supabase-js gdy nie skonfigurowany
//     const { createClient } = await import('@supabase/supabase-js');
//     const supabase = createClient(supabaseUrl, supabaseKey);
//     await supabase.from('api_events').insert([event]);
//   } catch (err) {
//     console.warn('⚠️ Telemetry: Supabase write failed:', err);
//   }
// }

// ============================================================================
// UTILITY: timer helper
// ============================================================================

/**
 * Upraszcza pomiar czasu w route handlerach.
 *
 * ```ts
 * const timer = startTimer();
 * // ... robota ...
 * const durationMs = timer.elapsed();
 * ```
 */
export function startTimer(): { elapsed: () => number } {
  const start = Date.now();
  return { elapsed: () => Date.now() - start };
}
