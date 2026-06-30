'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import type { GeminiHealth } from '@/app/api/health/gemini/route';
import type { PricingRefreshResponse } from '@/app/api/pricing/refresh/route';

interface HealthStatusPanelProps {
  className?: string;
}

/** Etykieta + kolor statusu klucza wg `GeminiHealth.status`. */
const STATUS_LABELS: Record<
  GeminiHealth['status'],
  { icon: string; text: string; className: string }
> = {
  ok: { icon: '✅', text: 'Klucz Gemini ważny', className: 'text-primary' },
  invalid_key: {
    icon: '❌',
    text: 'Klucz nieważny lub wygasły',
    className: 'text-red-400',
  },
  network_error: {
    icon: '⚠️',
    text: 'Nie udało się sprawdzić (problem sieci)',
    className: 'text-amber-400',
  },
  no_key: {
    icon: '⚠️',
    text: 'Brak klucza',
    className: 'text-amber-400',
  },
};

/** Etykieta źródła cennika (IND-273 T5b). */
const PRICING_SOURCE_LABELS: Record<PricingRefreshResponse['source'], string> =
  {
    fresh: 'Świeży (pobrany z API)',
    cached: 'Z pamięci podręcznej',
    bundled: 'Wbudowany',
  };

/**
 * IND-273 T6: panel „Zdrowie Strażnika" - widoczny payoff self-checku.
 *
 * Gracz (nie-techniczny) otwiera Ustawienia i WIDZI czy jego klucz Gemini działa
 * i jakie modele są żywe. Czyta `GET /api/health/gemini` (T2) z nagłówkiem BYOK
 * (route ma env-fallback gdy brak). Auto-sprawdza na mount + przycisk „Sprawdź teraz".
 */
export function HealthStatusPanel({ className }: HealthStatusPanelProps) {
  const [health, setHealth] = useState<GeminiHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingRefreshResponse | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health/gemini', {
        headers: getApiKeyHeaders(),
      });
      const data = (await res.json()) as GeminiHealth;
      setHealth(data);
    } catch {
      // Błąd sieci po stronie klienta - nie wywracaj UI, pokaż brak danych.
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // IND-273 T5b: świeżość cennika. Bez `force` tanio (serwer zwraca cache, bez LLM);
  // przycisk „Odśwież cennik" woła z `force=true` (Tier A LLM-extraction).
  const refreshPricing = useCallback(async (force = false) => {
    setPricingLoading(true);
    try {
      const res = await fetch(
        `/api/pricing/refresh${force ? '?force=true' : ''}`,
        { headers: getApiKeyHeaders() }
      );
      const data = (await res.json()) as PricingRefreshResponse;
      setPricing(data);
    } catch {
      setPricing(null);
    } finally {
      setPricingLoading(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
    refreshPricing(false);
  }, [runCheck, refreshPricing]);

  const status = health ? STATUS_LABELS[health.status] : null;
  const present = health?.registry.chatModelsPresent ?? [];
  const missing = health?.registry.chatModelsMissing ?? [];

  return (
    <div
      className={`relative bg-card rounded-lg p-5 border border-brass/30 ${className ?? ''}`}
    >
      {/* Narożniki déco */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-brass/60" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-brass/60" />

      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-display uppercase tracking-[0.1em] text-xl text-foreground flex items-center gap-2">
          🩺 Zdrowie Strażnika
        </h3>
        <Button
          onClick={runCheck}
          disabled={loading}
          variant="outline"
          className="border-brass/30 bg-brass/[0.04] px-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:border-brass/60 hover:text-brass"
        >
          {loading ? 'Sprawdzam…' : 'Sprawdź teraz'}
        </Button>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent to-gold/60" />

      {/* Status klucza */}
      <div className="mt-4">
        <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
          Klucz Gemini
        </div>
        {loading ? (
          <div className="font-display text-sm text-muted-foreground">
            Sprawdzam…
          </div>
        ) : status ? (
          <div
            className={`font-display text-sm font-semibold ${status.className}`}
          >
            {status.icon} {status.text}
          </div>
        ) : (
          <div className="font-display text-sm text-muted-foreground">
            Kliknij „Sprawdź teraz&rdquo;, by zweryfikować klucz.
          </div>
        )}
      </div>

      {/* Modele + embeddingi (tylko gdy mamy odpowiedź) */}
      {health && (
        <div className="mt-4 space-y-3">
          <div>
            <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Modele narracji
            </div>
            {present.length > 0 ? (
              <ul className="font-special-elite text-sm text-primary space-y-0.5">
                {present.map((id) => (
                  <li key={id}>✅ {id}</li>
                ))}
              </ul>
            ) : (
              <div className="font-display text-sm text-muted-foreground">
                Brak żywych modeli narracji.
              </div>
            )}
            {missing.length > 0 && (
              <ul className="mt-1 font-special-elite text-sm text-amber-400 space-y-0.5">
                {missing.map((id) => (
                  <li key={id}>⚠️ {id} - brak w żywym API</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Embeddingi RAG
            </div>
            <div
              className={`font-display text-sm font-semibold ${
                health.registry.embeddingPresent
                  ? 'text-primary'
                  : 'text-red-400'
              }`}
            >
              {health.registry.embeddingPresent ? '✅ Dostępne' : '❌ Brak'}
            </div>
          </div>

          <div className="font-special-elite text-[14px] uppercase tracking-[0.1em] text-muted-foreground">
            Sprawdzono: {new Date(health.checkedAt).toLocaleString('pl-PL')}
          </div>
        </div>
      )}

      {/* IND-273 T5b: świeżość cennika + ręczne odświeżenie */}
      <div className="mt-4">
        <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
          Cennik
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-sm text-foreground">
            {pricingLoading ? (
              'Odświeżam…'
            ) : pricing ? (
              <>
                {PRICING_SOURCE_LABELS[pricing.source]} ·{' '}
                <span className="text-muted-foreground">
                  {pricing.lastVerified}
                </span>
              </>
            ) : (
              '-'
            )}
          </div>
          <Button
            onClick={() => refreshPricing(true)}
            disabled={pricingLoading}
            variant="outline"
            className="border-brass/30 bg-brass/[0.04] px-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:border-brass/60 hover:text-brass"
          >
            Odśwież cennik
          </Button>
        </div>
      </div>
    </div>
  );
}
