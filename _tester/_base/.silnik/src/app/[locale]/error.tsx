'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('Error');

  useEffect(() => {
    
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
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
        
        <div className="bg-background border border-border rounded-md p-4 mb-6">
          <p className="text-sm text-foreground/60 font-mono">
            {error.message || t('unknownError')}
          </p>
          {error.digest && (
            <p className="text-xs text-foreground/40 mt-2">
              {t('errorIdPrefix')} {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={reset}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {t('tryAgainButton')}
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
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