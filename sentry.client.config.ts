/**
 * Sentry — konfiguracja po stronie klienta (przeglądarka)
 *
 * Plik jest automatycznie importowany przez Next.js na froncie.
 * Aktywuje się gdy NEXT_PUBLIC_SENTRY_DSN jest ustawiony.
 *
 * Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Próbkowanie śladów wydajności — 20% w produkcji
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Session Replay: nagrywa co klikał użytkownik przed błędem
    replaysOnErrorSampleRate: 1.0,   // 100% sesji z błędem
    replaysSessionSampleRate: 0.05,  // 5% wszystkich sesji

    integrations: [
      Sentry.replayIntegration({
        // Maskuj pola z kluczami API
        maskAllInputs: true,
        blockAllMedia: false,
      }),
      Sentry.browserTracingIntegration(),
    ],

    // Tagi globalne do filtrowania w dashboardzie
    initialScope: {
      tags: {
        app: 'zew-cthulhu',
        version: '4.0',
      },
    },

    // Wycisz debug w produkcji
    debug: process.env.NODE_ENV === 'development',

    // Ignoruj znane fałszywe alarmy
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      /^NetworkError/,
    ],
  });
}
