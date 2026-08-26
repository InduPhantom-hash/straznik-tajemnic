'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import plMessages from '../../../messages/pl.json'
import enMessages from '../../../messages/en.json'

/**
 * not-found pod [locale] renderuje sie w wyizolowanym przebiegu 404, gdzie
 * kontekst next-intl (provider) nie jest dostepny po stronie klienta.
 * Język odczytujemy wprost z cookie NEXT_LOCALE (wzorzec jak w global-error),
 * a provider dostarczamy lokalnie, by móc używać hooka useTranslations.
 */
function getLocale(): 'pl' | 'en' {
  if (typeof document === 'undefined') return 'pl'
  return /(?:^|;\s*)NEXT_LOCALE=en(?:;|$)/.test(document.cookie) ? 'en' : 'pl'
}

function NotFoundContent() {
  const t = useTranslations('NotFound')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-2xl font-mono font-bold text-foreground mb-2">{t('title')}</h1>
          <p className="text-foreground/70 mb-4">{t('description')}</p>
        </div>

        <div className="bg-background border border-border rounded-md p-4 mb-6">
          <p className="text-sm text-foreground/60">{t('tip')}</p>
        </div>

        <div className="flex gap-3">
          <Link href="/" className="flex-1">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {t('homeButton')}
            </Button>
          </Link>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex-1"
          >
            {t('backButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function NotFound() {
  const locale = getLocale()

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={locale === 'en' ? enMessages : plMessages}
    >
      <NotFoundContent />
    </NextIntlClientProvider>
  )
}
