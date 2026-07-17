/**
 * Next.js Proxy - propagacja Trace ID (wersja domowa, bez auth)
 *
 * Dodaje nagłówek X-Trace-Id do każdego żądania API (sesja 29, IND-32a).
 * Route handlery odczytują go i przekazują do logApiEvent() - dzięki temu
 * jeden request ma ten sam ID we wszystkich logach (Sentry, JSONL).
 *
 * Auth (Clerk) wycięty w wersji domowej - jeden lokalny użytkownik, brak logowania.
 *
 * Node.js Runtime (default w Next 16 dla proxy.ts; runtime config nie jest dostępny).
 */

import { NextRequest, NextResponse } from 'next/server';

// Generowanie trace ID bez zewnętrznych zależności
function makeTraceId(): string {
  const ts = Date.now().toString(36);
  // Math.random wystarczy - to nie jest ID bezpieczeństwa, tylko korelacja logów
  const rand = Math.random().toString(36).slice(2, 10);
  return `tel_${ts}_${rand}`;
}

/**
 * Dodaj x-trace-id do request/response headers (tylko dla /api/*).
 */
function withTraceId(request: NextRequest): NextResponse {
  const traceId = request.headers.get('x-trace-id') ?? makeTraceId();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-trace-id', traceId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('x-trace-id', traceId);
  return response;
}

export function proxy(request: NextRequest) {
  // Tylko trace-id dla /api/*; reszta tras przechodzi bez modyfikacji nagłówków.
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  return withTraceId(request);
}

export const config = {
  // Uruchamiaj dla wszystkich tras poza statycznymi plikami i Next internalami
  // (wewnętrzny early-return pomija nie-API trasy)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    '/(api|trpc)(.*)',
  ],
};
