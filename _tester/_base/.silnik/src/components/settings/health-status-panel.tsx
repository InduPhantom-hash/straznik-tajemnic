'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import { loadAISettings } from '@/lib/ai-settings';
import { settingsEmitter } from '@/lib/settings-event-emitter';
import type { GeminiHealth } from '@/app/api/health/gemini/route';
import type { PricingRefreshResponse } from '@/app/api/pricing/refresh/route';

interface HealthStatusPanelProps {
  className?: string;
  selectedModel?: string;
}

/**
 * IND-273 T6 + #521: panel „Zdrowie Strażnika" - widoczny payoff self-checku
 * oraz 3-stanowy wskaźnik dostępności wybranego modelu Gemini.
 */
/** Pomocnicza funkcja wykonująca fetch z limitem czasowym (timeout). */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function HealthStatusPanel({
  className,
  selectedModel,
}: HealthStatusPanelProps) {
  const t = useTranslations('HealthStatusPanel');
  const [activeModel, setActiveModel] = useState<string>(
    () => selectedModel || loadAISettings().geminiSettings.model
  );
  const [health, setHealth] = useState<GeminiHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingRefreshResponse | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const checkRequestIdRef = useRef(0);

  useEffect(() => {
    if (selectedModel) {
      setActiveModel(selectedModel);
      return;
    }
    setActiveModel(loadAISettings().geminiSettings.model);
    const unsubscribe = settingsEmitter.subscribe((updated) => {
      if (updated?.geminiSettings?.model) {
        setActiveModel(updated.geminiSettings.model);
      }
    });
    return unsubscribe;
  }, [selectedModel]);

  /** Etykieta + kolor statusu klucza wg `GeminiHealth.status`. */
  const STATUS_LABELS: Record<
    GeminiHealth['status'],
    { icon: string; text: string; className: string }
  > = {
    ok: { icon: '✅', text: t('statusOk'), className: 'text-primary' },
    invalid_key: {
      icon: '❌',
      text: t('statusInvalidKey'),
      className: 'text-red-400',
    },
    network_error: {
      icon: '⚠️',
      text: t('statusNetworkError'),
      className: 'text-brass',
    },
    no_key: {
      icon: '⚠️',
      text: t('statusNoKey'),
      className: 'text-brass',
    },
  };

  /** Etykieta źródła cennika (IND-273 T5b). */
  const PRICING_SOURCE_LABELS: Record<
    PricingRefreshResponse['source'],
    string
  > = {
    fresh: t('pricingFresh'),
    cached: t('pricingCached'),
    bundled: t('pricingBundled'),
  };

  const runCheck = useCallback(async () => {
    const reqId = ++checkRequestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const query = activeModel
        ? `?model=${encodeURIComponent(activeModel)}`
        : '';
      const res = await fetchWithTimeout(`/api/health/gemini${query}`, {
        headers: getApiKeyHeaders(),
      });
      const data = (await res.json()) as GeminiHealth;
      if (reqId !== checkRequestIdRef.current) return;
      setHealth(data);
    } catch (err) {
      if (reqId !== checkRequestIdRef.current) return;
      if (err instanceof Error && err.name === 'AbortError') {
        setError(t('healthTimeout'));
      } else {
        setError(t('networkError'));
      }
      setHealth(null);
    } finally {
      if (reqId === checkRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [activeModel, t]);

  // IND-273 T5b: świeżość cennika. Bez `force` tanio (serwer zwraca cache, bez LLM);
  // przycisk „Odśwież cennik" woła z `force=true` (Tier A LLM-extraction).
  const refreshPricing = useCallback(async (force = false) => {
    setPricingLoading(true);
    setPricingError(null);
    try {
      const res = await fetchWithTimeout(
        `/api/pricing/refresh${force ? '?force=true' : ''}`,
        { headers: getApiKeyHeaders() },
        25000 // Tier A pobiera HTML i wywołuje LLM (Gemini Flash)
      );
      const data = (await res.json()) as PricingRefreshResponse;
      setPricing(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setPricingError(t('pricingTimeout'));
      } else {
        setPricingError(t('networkError'));
      }
      setPricing(null);
    } finally {
      setPricingLoading(false);
    }
  }, [t]);

  useEffect(() => {
    runCheck();
    refreshPricing(false);
  }, [runCheck, refreshPricing]);

  const status = health ? STATUS_LABELS[health.status] : null;
  const present = health?.registry.chatModelsPresent ?? [];
  const missing = health?.registry.chatModelsMissing ?? [];
  const modelPing = health?.modelPing;

  const modelPingDotClass =
    modelPing?.state === 'available'
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
      : modelPing?.state === 'overloaded'
        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]';

  const modelPingTextClass =
    modelPing?.state === 'available'
      ? 'text-emerald-300'
      : modelPing?.state === 'overloaded'
        ? 'text-amber-300'
        : 'text-red-400';

  const modelPingLabel =
    modelPing?.state === 'available'
      ? t('modelPingAvailable', { ms: modelPing.latencyMs ?? 1 })
      : modelPing?.state === 'overloaded'
        ? modelPing.reason === 'rate_limited'
          ? t('modelPingRateLimited')
          : t('modelPingOverloaded')
        : t('modelPingUnavailable');

  return (
    <div
      className={`relative bg-card rounded-lg p-5 border border-brass/30 ${className ?? ''}`}
    >
      {/* Narożniki déco */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-brass/60" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-brass/60" />

      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="font-display uppercase tracking-[0.1em] text-xl text-foreground flex items-center gap-2">
          🩺 {t('title')}
        </h3>
        <Button
          onClick={runCheck}
          disabled={loading}
          variant="outline"
          className="border-brass/30 bg-brass/[0.04] px-4 font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:border-brass/60 hover:text-brass"
        >
          {loading ? t('checking') : t('checkNow')}
        </Button>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent to-gold/60" />

      {/* Status klucza */}
      <div className="mt-4">
        <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
          {t('geminiKey')}
        </div>
        {loading ? (
          <div className="font-display text-sm text-muted-foreground">
            {t('checking')}
          </div>
        ) : error ? (
          <div className="font-display text-sm font-semibold text-red-400">
            ⚠️ {error}
          </div>
        ) : status ? (
          <div
            className={`font-display text-sm font-semibold ${status.className}`}
          >
            {status.icon} {status.text}
          </div>
        ) : (
          <div className="font-display text-sm text-muted-foreground">
            {t('clickToVerify')}
          </div>
        )}
      </div>

      {/* Modele + ping wybranego modelu + embeddingi (tylko gdy mamy odpowiedź) */}
      {health && (
        <div className="mt-4 space-y-3">
          {modelPing && (
            <div data-testid="health-panel-model-status" data-state={modelPing.state}>
              <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                {t('selectedModelStatus')}
              </div>
              <div className="flex flex-wrap items-center gap-2 font-special-elite text-sm">
                <span
                  data-testid="health-panel-model-status-dot"
                  className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${modelPingDotClass}`}
                />
                <span className="text-foreground font-semibold">
                  {modelPing.model}:
                </span>
                <span className={modelPingTextClass}>{modelPingLabel}</span>
              </div>
            </div>
          )}

          <div>
            <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              {t('narrationModels')}
            </div>
            {present.length > 0 ? (
              <ul className="font-special-elite text-sm text-primary space-y-0.5">
                {present.map((id) => (
                  <li key={id}>✅ {id}</li>
                ))}
              </ul>
            ) : (
              <div className="font-display text-sm text-muted-foreground">
                {t('noLiveModels')}
              </div>
            )}
            {missing.length > 0 && (
              <ul className="mt-1 font-special-elite text-sm text-brass space-y-0.5">
                {missing.map((id) => (
                  <li key={id}>⚠️ {t('modelMissing', { id })}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
              {t('ragEmbeddings')}
            </div>
            <div
              className={`font-display text-sm font-semibold ${
                health.registry.embeddingPresent
                  ? 'text-primary'
                  : 'text-red-400'
              }`}
            >
              {health.registry.embeddingPresent
                ? t('embeddingsAvailable')
                : t('embeddingsMissing')}
            </div>
          </div>

          <div className="font-special-elite text-[14px] uppercase tracking-[0.1em] text-muted-foreground">
            {t('checkedAt', {
              time: new Date(health.checkedAt).toLocaleString('pl-PL'),
            })}
          </div>
        </div>
      )}

      {/* IND-273 T5b: świeżość cennika + ręczne odświeżenie */}
      <div className="mt-4">
        <div className="font-special-elite text-[14px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
          {t('pricing')}
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-sm text-foreground">
            {pricingLoading ? (
              t('refreshing')
            ) : pricingError ? (
              <span className="text-red-400 font-semibold">⚠️ {pricingError}</span>
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
            {t('refreshPricing')}
          </Button>
        </div>
      </div>
    </div>
  );
}

