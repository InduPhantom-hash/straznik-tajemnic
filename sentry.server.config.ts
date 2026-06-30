/**
 * Sentry — konfiguracja po stronie serwera (Node.js)
 *
 * Przechwytuje błędy z endpointów /api/*, Server Actions, SSR.
 * Aktywuje się gdy SENTRY_DSN jest ustawiony.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Tagi globalne
    initialScope: {
      tags: {
        app: 'zew-cthulhu',
        layer: 'server',
        version: '4.0',
      },
    },

    debug: process.env.NODE_ENV === 'development',

    // Nie loguj żądań do endpointów health-check
    ignoreTransactions: ['/api/health'],
  });
}
