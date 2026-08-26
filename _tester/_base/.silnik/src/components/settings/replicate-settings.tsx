import type { SetStateAction, Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { AISettings } from '@/lib/ai-settings';
import type { TestResults } from '@/hooks/useApiTester';
import { HelpIcon } from '../ui/tooltip';
import { Button } from '../ui/button';

// IND-209: beta/BYOK - tester widzi tylko swój klucz Gemini. Replicate to klucz
// SERWEROWY właściciela (REPLICATE_API_TOKEN, env) - fallback obrazów działa bez
// klucza testera. Ukrywamy całą sekcję (wzorzec flag bety, commit 619e174).
// false = pełna sekcja dla właściciela.
const BETA_HIDE_REPLICATE = true;

interface ReplicateSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
  testResults: TestResults;
  isLoading: boolean;
  testAPI: (apiType: string) => Promise<void>;
  getTestResultColor: (result: boolean | null) => string;
  getTestResultIcon: (result: boolean | null) => string;
}

export function ReplicateSettings({
  settings,
  setSettings,
  testResults,
  isLoading,
  testAPI,
  getTestResultColor,
  getTestResultIcon,
}: ReplicateSettingsProps) {
  const t = useTranslations('ReplicateSettings');
  if (BETA_HIDE_REPLICATE) return null;

  return (
    <div className="relative border border-brass/30 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-4 shadow-[0_0_22px_rgba(13,148,136,0.08)]">
      <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brass/50" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brass/50" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold">
          {t('sectionTitle')}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`text-lg ${getTestResultColor(testResults.replicate)}`}
          >
            {getTestResultIcon(testResults.replicate)}
          </span>
          <Button
            size="sm"
            onClick={() => testAPI('replicate')}
            disabled={isLoading}
            className="text-brass bg-brass/[0.04] border border-brass/45 hover:bg-brass/10 font-display font-semibold uppercase tracking-[0.16em]"
          >
            {t('testApi')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            {t('enableLabel')}
            <HelpIcon content={t('enableHelp')} />
          </label>
          <input
            type="checkbox"
            checked={settings.imageGenerationEnabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                imageGenerationEnabled: e.target.checked,
              })
            }
            className="w-4 h-4 accent-primary bg-[#1f1a14] border border-brass/30 rounded focus:ring-primary"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            {t('apiKeyLabel')}
            <HelpIcon content={t('apiKeyHelp')} />
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={settings.replicateApiKey || ''}
            onChange={(e) =>
              setSettings({ ...settings, replicateApiKey: e.target.value })
            }
            placeholder={t('apiKeyPlaceholder')}
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            {t('styleLabel')}
            <HelpIcon content={t('styleHelp')} />
          </label>
          <select
            value={settings.replicateSettings.style}
            onChange={(e) =>
              setSettings({
                ...settings,
                replicateSettings: {
                  ...settings.replicateSettings,
                  style: e.target
                    .value as AISettings['replicateSettings']['style'],
                },
              })
            }
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded-lg text-foreground focus:border-primary focus:outline-none"
          >
            <option value="realistic">{t('styleRealistic')}</option>
            <option value="artistic">{t('styleArtistic')}</option>
            <option value="horror">{t('styleHorror')}</option>
            <option value="vintage">{t('styleVintage')}</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            {t('qualityLabel')}
            <HelpIcon content={t('qualityHelp')} />
          </label>
          <select
            value={settings.replicateSettings.quality}
            onChange={(e) =>
              setSettings({
                ...settings,
                replicateSettings: {
                  ...settings.replicateSettings,
                  quality: e.target
                    .value as AISettings['replicateSettings']['quality'],
                },
              })
            }
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded-lg text-foreground focus:border-primary focus:outline-none"
          >
            <option value="low">{t('qualityLow')}</option>
            <option value="medium">{t('qualityMedium')}</option>
            <option value="high">{t('qualityHigh')}</option>
            <option value="ultra">{t('qualityUltra')}</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.replicateSettings.autoGeneratePortraits}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  replicateSettings: {
                    ...settings.replicateSettings,
                    autoGeneratePortraits: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 accent-primary bg-[#1f1a14] border border-brass/30 rounded focus:ring-primary"
            />
            <span className="ml-2">{t('autoPortraitsLabel')}</span>
            <HelpIcon content={t('autoPortraitsHelp')} />
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.replicateSettings.autoGenerateNPCs}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  replicateSettings: {
                    ...settings.replicateSettings,
                    autoGenerateNPCs: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 accent-primary bg-[#1f1a14] border border-brass/30 rounded focus:ring-primary"
            />
            <span className="ml-2">{t('autoNpcsLabel')}</span>
            <HelpIcon content={t('autoNpcsHelp')} />
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.replicateSettings.autoGenerateLocations}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  replicateSettings: {
                    ...settings.replicateSettings,
                    autoGenerateLocations: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 accent-primary bg-[#1f1a14] border border-brass/30 rounded focus:ring-primary"
            />
            <span className="ml-2">{t('autoLocationsLabel')}</span>
            <HelpIcon content={t('autoLocationsHelp')} />
          </label>
        </div>

        {/* M9 sesja 146 (D4): globalny toggle Flux Kontext Pro dla NPC consistency */}
        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={
                settings.replicateSettings.useExistingPortraitForRegen ?? true
              }
              onChange={(e) =>
                setSettings({
                  ...settings,
                  replicateSettings: {
                    ...settings.replicateSettings,
                    useExistingPortraitForRegen: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 accent-primary bg-[#1f1a14] border border-brass/30 rounded focus:ring-primary"
            />
            <span className="ml-2">
              {t('keepPortraitLabel')}
            </span>
            <HelpIcon content={t('keepPortraitHelp')} />
          </label>
        </div>

        {/* IND-259: suwak częstotliwości ilustracji scen (łączy się z trybem narracji) */}
        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            {t('frequencyLabel')}
            <HelpIcon content={t('frequencyHelp')} />
          </label>
          <select
            value={settings.replicateSettings.imageFrequency ?? 'normal'}
            onChange={(e) =>
              setSettings({
                ...settings,
                replicateSettings: {
                  ...settings.replicateSettings,
                  imageFrequency: e.target
                    .value as AISettings['replicateSettings']['imageFrequency'],
                },
              })
            }
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded-lg text-foreground focus:border-primary focus:outline-none"
          >
            <option value="rare">{t('frequencyRare')}</option>
            <option value="normal">{t('frequencyNormal')}</option>
            <option value="often">{t('frequencyOften')}</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            {t('maxImagesLabel')}
            <HelpIcon content={t('maxImagesHelp')} />
          </label>
          <input
            type="number"
            min="1"
            max="5"
            value={settings.replicateSettings.maxImagesPerMessage}
            onChange={(e) =>
              setSettings({
                ...settings,
                replicateSettings: {
                  ...settings.replicateSettings,
                  maxImagesPerMessage: parseInt(e.target.value) || 1,
                },
              })
            }
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded-lg text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
