'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('Error')
  const [copied, setCopied] = useState(false)

  // 1. Zrzut awarii do lokalnego endpointu (fire-and-forget)
  useEffect(() => {
    console.error('Application error:', error)

    const payload = {
      error: error.message || 'Unknown Error',
      stack: error.stack,
      digest: error.digest,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
    }

    try {
      localStorage.setItem('straznik_last_crash_dump', JSON.stringify(payload))
    } catch {
      // Ignoruj błędy zapisu do localStorage
    }

    void fetch('/api/diagnostics/crash-dump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Ignoruj błędy sieciowe przy zgłaszaniu crashu
    })
  }, [error])

  // 2. Kopiowanie czystego raportu markdown bezpośrednio dla asystenta AI
  const handleCopyReport = useCallback(() => {
    const report = [
      '### ⚠️ Strażnik Tajemnic AI - Raport Awarii',
      `- **Błąd:** \`${error.message || 'Nieznany błąd'}\``,
      `- **Ścieżka:** \`${typeof window !== 'undefined' ? window.location.pathname : 'N/A'}\``,
      `- **Data:** \`${new Date().toISOString()}\``,
      error.digest ? `- **Digest:** \`${error.digest}\`` : '',
      '',
      '**Stack trace:**',
      '```',
      error.stack || 'Brak stack trace',
      '```',
    ]
      .filter(Boolean)
      .join('\n')

    void navigator.clipboard.writeText(report).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center shadow-xl">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-mono font-bold text-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-foreground/70 mb-4">
            {t('description')}
          </p>
        </div>

        <div className="bg-background border border-border rounded-md p-4 mb-4 text-left">
          <p className="text-sm text-foreground/80 font-mono break-words">
            {error.message || t('unknownError')}
          </p>
          {error.digest && (
            <p className="text-xs text-foreground/40 mt-2 font-mono">
              {t('errorIdPrefix')} {error.digest}
            </p>
          )}
        </div>

        <div className="mb-6">
          <Button
            onClick={handleCopyReport}
            variant="outline"
            className="w-full border-brass/50 text-foreground hover:border-brass flex items-center justify-center gap-2"
          >
            <span>📋</span>
            <span>{copied ? t('copiedDiagnosis') : t('copyDiagnosisButton')}</span>
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={reset}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {t('tryAgainButton')}
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="flex-1"
          >
            {t('homePageButton')}
          </Button>
        </div>
      </div>
    </div>
  )
}