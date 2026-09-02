'use client';

import type { SetStateAction, Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import type { AISettings } from '@/lib/ai-settings';
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
            onClick={() => testAPI('gemini')}
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
          <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
            {t('modelLabel')}
            <HelpIcon content={t('modelHelp')} />
          </label>
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
