'use client'

import { useEffect } from 'react'

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

  return (
    <html>
      <body>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💥</span>
              </div>
              <h1 className="text-2xl font-mono font-bold text-foreground mb-2">
                Krytyczny błąd aplikacji
              </h1>
              <p className="text-foreground/70 mb-4">
                Wystąpił poważny błąd, który uniemożliwia działanie aplikacji.
              </p>
            </div>
            
            <div className="bg-background border border-border rounded-md p-4 mb-6">
              <p className="text-sm text-foreground/60 font-mono">
                {error.message || 'Nieznany błąd'}
              </p>
              {error.digest && (
                <p className="text-xs text-foreground/40 mt-2">
                  ID błędu: {error.digest}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium transition-colors"
              >
                Spróbuj ponownie
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 border border-border hover:bg-background px-4 py-2 rounded-md font-medium transition-colors"
              >
                Strona główna
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
