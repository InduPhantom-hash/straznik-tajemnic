'use client';

import { useEffect } from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import plMessages from '../../messages/pl.json';
import enMessages from '../../messages/en.json';

/**
 * global-error zastępuje cały dokument (html/body) i żyje POZA layoutem [locale],
 * więc NextIntlClientProvider nie istnieje. Język odczytujemy wprost z cookie
 * NEXT_LOCALE ustawianego przez middleware next-intl, a provider dostarczamy
 * lokalnie, by móc używać hooka useTranslations.
 */
function getLocale(): 'pl' | 'en' {
  if (typeof document === 'undefined') return 'pl';
  return /(?:^|;\s*)NEXT_LOCALE=en(?:;|$)/.test(document.cookie) ? 'en' : 'pl';
}

function GlobalErrorContent({
  message,
  digest,
  onReset,
}: {
  message?: string;
  digest?: string;
  onReset: () => void;
}) {
  const t = useTranslations('GlobalError');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💥</span>
          </div>
          <h1 className="text-2xl font-mono font-bold text-foreground mb-2">{t('title')}</h1>
          <p className="text-foreground/70 mb-4">{t('description')}</p>
        </div>

        <div className="bg-background border border-border rounded-md p-4 mb-6">
          <p className="text-sm text-foreground/60 font-mono">{message || t('unknownError')}</p>
          {digest && (
            <p className="text-xs text-foreground/40 mt-2">
              {t('errorIdPrefix')} {digest}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium transition-colors"
          >
            {t('tryAgainButton')}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 border border-border hover:bg-background px-4 py-2 rounded-md font-medium transition-colors"
          >
            {t('homePageButton')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error)
  }, [error])

  const locale = getLocale();

  return (
    <html>
      <body>
        <NextIntlClientProvider locale={locale} messages={locale === 'en' ? enMessages : plMessages}>
          <GlobalErrorContent
            message={error.message}
            digest={error.digest}
            onReset={reset}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
