/**
 * Sentry — konfiguracja dla Edge Runtime
 *
 * Obsługuje middleware i Edge API Routes Next.js.
 */
import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    debug: process.env.NODE_ENV === 'development',
  });
}
