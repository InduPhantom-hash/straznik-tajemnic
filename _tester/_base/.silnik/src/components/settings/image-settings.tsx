'use client';

import type { SetStateAction, Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import type { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';
import { Switch } from '../ui/switch';

interface ImageSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

/**
 * Dedykowany panel ustawień generowania obrazów (Gemini Imagen) - Dark Art Déco.
 * Przywraca graczowi kontrolę nad suwakiem częstotliwości ilustracji scen (imageFrequency),
 * tożsamością postaci (useExistingPortraitForRegen) oraz parametrami wizualnymi kadrów.
 */
export function ImageSettings({ settings, setSettings }: ImageSettingsProps) {
  const t = useTranslations('ImageSettings');
  const enabled = settings.imageGenerationEnabled;
  const rep = settings.replicateSettings;

  const updateRep = (patch: Partial<AISettings['replicateSettings']>) => {
    setSettings({
      ...settings,
      replicateSettings: {
        ...rep,
        ...patch,
      },
    });
  };

  return (
    <div className="relative border border-brass/30 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-6 shadow-[0_0_22px_rgba(13,148,136,0.08)]">
      {/* Narożniki déco */}
      <span className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brass/60" />
      <span className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brass/60" />
      <span className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brass/60" />
      <span className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brass/60" />

      {/* Nagłówek sekcji z master togglem */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-special-elite uppercase text-[14px] tracking-[0.32em] text-primary">
            {t('eyebrow')}
          </div>
          <h3 className="mt-1 font-display uppercase text-2xl tracking-[0.1em] text-foreground">
            {t('sectionTitle')}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`font-special-elite uppercase text-[14px] tracking-[0.1em] ${
              enabled ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {enabled ? t('stateEnabled') : t('stateDisabled')}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) =>
              setSettings({
                ...settings,
                imageGenerationEnabled: checked,
              })
            }
          />
          <HelpIcon content={t('enableHelp')} />
        </div>
      </div>

      {/* Separator déco */}
      <div className="flex items-center gap-4 my-5">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/35" />
        <span className="w-2 h-2 bg-brass rotate-45" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/35" />
      </div>

      {/* Zawartość panelu */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-2 gap-5 transition-opacity duration-200 ${
          enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
        }`}
      >
        {/* Lewa kolumna: Reżyseria kadrów (Częstotliwość i Styl) */}
        <div className="relative border border-brass/22 bg-[#16130f] p-5 flex flex-col gap-4">
          <div className="font-special-elite uppercase text-[14px] tracking-[0.16em] text-brass">
            {t('frequencySectionTitle')}
          </div>

          <div>
            <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
              {t('frequencyLabel')}
              <HelpIcon content={t('frequencyHelp')} />
            </label>
            <select
              value={rep.imageFrequency ?? 'normal'}
              onChange={(e) =>
                updateRep({
                  imageFrequency: e.target
                    .value as NonNullable<AISettings['replicateSettings']['imageFrequency']>,
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
              {t('styleLabel')}
              <HelpIcon content={t('styleHelp')} />
            </label>
            <select
              value={rep.style}
              onChange={(e) =>
                updateRep({
                  style: e.target.value as AISettings['replicateSettings']['style'],
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
              value={rep.quality}
              onChange={(e) =>
                updateRep({
                  quality: e.target.value as AISettings['replicateSettings']['quality'],
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
            <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
              {t('maxImagesLabel')}
              <HelpIcon content={t('maxImagesHelp')} />
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={rep.maxImagesPerMessage}
              onChange={(e) =>
                updateRep({
                  maxImagesPerMessage: parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded-lg text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Prawa kolumna: Spójność postaci i automatyczne ilustracje */}
        <div className="relative border border-brass/22 bg-[#16130f] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="font-special-elite uppercase text-[14px] tracking-[0.16em] text-brass">
              {t('consistencySectionTitle')}
            </div>

            {/* Toggle spójności wyglądu postaci */}
            <div className="flex items-start justify-between gap-3 p-3 border border-brass/20 bg-[#1f1a14] rounded-lg">
              <div className="space-y-1">
                <div className="font-display text-sm text-foreground">
                  {t('keepPortraitLabel')}
                </div>
                <div className="text-xs text-muted-foreground font-serif leading-relaxed">
                  {t('keepPortraitHelp')}
                </div>
              </div>
              <Switch
                checked={rep.useExistingPortraitForRegen ?? true}
                onCheckedChange={(checked) =>
                  updateRep({
                    useExistingPortraitForRegen: checked,
                  })
                }
              />
            </div>

            {/* Przełączniki automatycznych kadrów */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-2.5 border border-brass/15 bg-[#1a1611] rounded hover:border-brass/30 cursor-pointer">
                <span className="font-special-elite uppercase tracking-[0.08em] text-xs text-foreground flex items-center gap-2">
                  {t('autoPortraitsLabel')}
                  <HelpIcon content={t('autoPortraitsHelp')} />
                </span>
                <input
                  type="checkbox"
                  checked={rep.autoGeneratePortraits}
                  onChange={(e) =>
                    updateRep({
                      autoGeneratePortraits: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-primary bg-[#1f1a14] border border-brass/30 rounded focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 border border-brass/15 bg-[#1a1611] rounded hover:border-brass/30 cursor-pointer">
                <span className="font-special-elite uppercase tracking-[0.08em] text-xs text-foreground flex items-center gap-2">
                  {t('autoNpcsLabel')}
                  <HelpIcon content={t('autoNpcsHelp')} />
                </span>
                <input
                  type="checkbox"
                  checked={rep.autoGenerateNPCs}
                  onChange={(e) =>
                    updateRep({
                      autoGenerateNPCs: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-primary bg-[#1f1a14] border border-brass/30 rounded focus:ring-primary"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 border border-brass/15 bg-[#1a1611] rounded hover:border-brass/30 cursor-pointer">
                <span className="font-special-elite uppercase tracking-[0.08em] text-xs text-foreground flex items-center gap-2">
                  {t('autoLocationsLabel')}
                  <HelpIcon content={t('autoLocationsHelp')} />
                </span>
                <input
                  type="checkbox"
                  checked={rep.autoGenerateLocations}
                  onChange={(e) =>
                    updateRep({
                      autoGenerateLocations: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-primary bg-[#1f1a14] border border-brass/30 rounded focus:ring-primary"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
