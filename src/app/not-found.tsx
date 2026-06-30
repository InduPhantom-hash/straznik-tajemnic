'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-2xl font-mono font-bold text-foreground mb-2">
            Strona nie znaleziona
          </h1>
          <p className="text-foreground/70 mb-4">
            Przepraszamy, ale strona której szukasz nie istnieje lub została przeniesiona.
          </p>
        </div>
        
        <div className="bg-background border border-border rounded-md p-4 mb-6">
          <p className="text-sm text-foreground/60">
            Sprawdź czy adres URL jest poprawny lub wróć do strony głównej.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/" className="flex-1">
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Strona główna
            </Button>
          </Link>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex-1"
          >
            Wstecz
          </Button>
        </div>
      </div>
    </div>
  )
}
