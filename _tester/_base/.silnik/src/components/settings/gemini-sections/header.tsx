'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SetStateAction, Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import type { AISettings } from '@/lib/ai-settings';
import { getApiKeyHeaders } from '@/lib/api-keys-service';
import type { GeminiHealth, ModelPingResult } from '@/app/api/health/gemini/route';
import { HelpIcon } from '../../ui/tooltip';
import { Button } from '../../ui/button';

interface HeaderSectionProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
  testResults: { gemini: boolean | null };
  isLoading: boolean;
  testAPI: (apiType: string) => Promise<void>;
  getTestResultColor: (result: boolean | null) => string;
  getTestResultIcon: (result: boolean | null) => string;
}

/** Pasek nagłówka panelu Gemini + 3 pola podstawowe (zawsze widoczne, poza accordion). */
export function HeaderSection({
  settings,
  setSettings,
  testResults,
  isLoading,
  testAPI,
  getTestResultColor,
  getTestResultIcon,
}: HeaderSectionProps) {
  const t = useTranslations('GeminiHeaderSection');
  const g = settings.geminiSettings;
  const [modelPing, setModelPing] = useState<ModelPingResult | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const requestIdRef = useRef(0);
  const hasMountedRef = useRef(false);
  const prevModelRef = useRef(g.model);

  const checkModelAvailability = useCallback(
    async (modelId: string, apiKeyOverride?: string) => {
      if (!modelId) return;
      const reqId = ++requestIdRef.current;
      setPingLoading(true);
      try {
        const headers: Record<string, string> = {
          ...getApiKeyHeaders(),
        };
        const trimmedKey = apiKeyOverride?.trim();
        if (trimmedKey) {
          headers['X-Gemini-Api-Key'] = trimmedKey;
        }
        const res = await fetch(
          `/api/health/gemini?model=${encodeURIComponent(modelId)}`,
          { headers }
        );
        const data = (await res.json()) as GeminiHealth;
        if (reqId !== requestIdRef.current) return;
        if (data.modelPing) {
          setModelPing(data.modelPing);
        } else {
          setModelPing({
            model: modelId,
            state: data.status === 'ok' ? 'available' : 'unavailable',
            latencyMs: null,
            reason: data.status === 'ok' ? 'ok' : 'invalid_key',
          });
        }
      } catch {
        if (reqId !== requestIdRef.current) return;
        setModelPing({
          model: modelId,
          state: 'unavailable',
          latencyMs: null,
          reason: 'error',
        });
      } finally {
        if (reqId === requestIdRef.current) {
          setPingLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const isInitialMount = !hasMountedRef.current;
    const isModelChange = prevModelRef.current !== g.model;
    hasMountedRef.current = true;
    prevModelRef.current = g.model;

    if (isInitialMount || isModelChange) {
      void checkModelAvailability(g.model, settings.geminiApiKey);
      return;
    }

    // Debounce przy ręcznym wpisywaniu klucza API znak po znaku
    const timerId = setTimeout(() => {
      void checkModelAvailability(g.model, settings.geminiApiKey);
    }, 250);
    return () => clearTimeout(timerId);
  }, [g.model, settings.geminiApiKey, checkModelAvailability]);

  const dotClass = pingLoading
    ? 'bg-brass/70 animate-pulse'
    : modelPing?.state === 'available'
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
      : modelPing?.state === 'overloaded'
        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]';

  const statusText = pingLoading
    ? t('modelStatusChecking')
    : modelPing?.state === 'available'
      ? t('modelStatusAvailable', { ms: modelPing.latencyMs ?? 1 })
      : modelPing?.state === 'overloaded'
        ? modelPing.reason === 'rate_limited'
          ? t('modelStatusRateLimited')
          : t('modelStatusOverloaded')
        : t('modelStatusUnavailable');

  const statusTextColor = pingLoading
    ? 'text-muted-foreground'
    : modelPing?.state === 'available'
      ? 'text-emerald-300'
      : modelPing?.state === 'overloaded'
        ? 'text-amber-300'
        : 'text-red-400';

  return (
    <>
      {/* === Header === */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display uppercase tracking-[0.16em] text-lg text-brass">
          🤖 {t('title')}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-lg ${getTestResultColor(testResults.gemini)}`}>
            {getTestResultIcon(testResults.gemini)}
          </span>
          <Button
            size="sm"
            onClick={() => {
              void checkModelAvailability(g.model, settings.geminiApiKey);
              void testAPI('gemini');
            }}
            disabled={isLoading}
            className="bg-primary hover:brightness-110 text-primary-foreground font-display uppercase tracking-[0.12em]"
          >
            {t('testApi')}
          </Button>
        </div>
      </div>

      {/* === 3 pola podstawowe === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
            {t('enableLabel')}
            <HelpIcon content={t('enableHelp')} />
          </label>
          <input
            type="checkbox"
            checked={settings.geminiEnabled}
            onChange={(e) =>
              setSettings({ ...settings, geminiEnabled: e.target.checked })
            }
            className="w-4 h-4 accent-primary bg-[#1f1a14] border-brass/40 rounded"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
            {t('apiKeyLabel')}
            <HelpIcon content={t('apiKeyHelp')} />
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={settings.geminiApiKey || ''}
            onChange={(e) =>
              setSettings({ ...settings, geminiApiKey: e.target.value })
            }
            placeholder={t('apiKeyPlaceholder')}
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground">
              {t('modelLabel')}
              <HelpIcon content={t('modelHelp')} />
            </label>
            <button
              type="button"
              onClick={() =>
                void checkModelAvailability(g.model, settings.geminiApiKey)
              }
              disabled={pingLoading}
              data-testid="gemini-model-status-indicator"
              data-state={
                pingLoading ? 'checking' : (modelPing?.state ?? 'unavailable')
              }
              className="inline-flex items-center gap-2 rounded border border-brass/25 bg-[#1f1a14] px-2.5 py-1 text-xs font-special-elite transition-colors hover:border-brass/60"
            >
              <span
                data-testid="gemini-model-status-dot"
                className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${dotClass}`}
              />
              <span className={statusTextColor}>{statusText}</span>
            </button>
          </div>
          <select
            value={g.model}
            onChange={(e) =>
              setSettings({
                ...settings,
                geminiSettings: {
                  ...g,
                  model: e.target
                    .value as AISettings['geminiSettings']['model'],
                },
              })
            }
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
          >
            <option value="gemini-flash-latest">
              {t('modelFlashLatest')}
            </option>
            <option value="gemini-flash-lite-latest">
              {t('modelFlashLiteLatest')}
            </option>
            <option value="gemini-pro-latest">{t('modelProLatest')}</option>
            <option value="gemini-3.8-flash">{t('model38Flash')}</option>
            <option value="gemini-3.7-flash">{t('model37Flash')}</option>
            <option value="gemini-3.6-flash">{t('model36Flash')}</option>
            <option value="gemini-3.1-pro-preview">
              {t('model31ProPreview')}
            </option>
            <option value="gemini-3.1-flash-lite">
              {t('model31FlashLite')}
            </option>
            <option value="gemini-3-flash-preview">
              {t('model3FlashPreview')}
            </option>
            <option value="gemini-2.5-pro">{t('model25Pro')}</option>
            <option value="gemini-2.5-flash">{t('model25Flash')}</option>
            <option value="gemini-2.5-flash-lite">
              {t('model25FlashLite')}
            </option>
            {[
              'gemini-2.0-flash',
              'gemini-2.0-flash-exp',
              'gemini-2.0-flash-lite',
              'gemini-3-pro-preview',
            ].includes(g.model) && (
              <option value={g.model} disabled>
                {g.model} ({t('modelDeprecated')})
              </option>
            )}
          </select>
        </div>
      </div>
    </>
  );
}

