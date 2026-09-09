import type { SetStateAction, Dispatch } from 'react';
import { useTranslations } from 'next-intl';
import { AISettings } from '@/lib/ai-settings';
import { HelpIcon } from '../ui/tooltip';
import { GMPromptPanel } from './gm-prompt-panel';
import { GMStyleGrid } from './gm-style-grid';

interface GameMasterSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
}

export function GameMasterSettings({
  settings,
  setSettings,
}: GameMasterSettingsProps) {
  const t = useTranslations('GameMasterSettings');

  return (
    <div className="relative border border-brass/30 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-5 shadow-[0_0_22px_rgba(13,148,136,0.08)]">
      <span className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brass/60" />
      <span className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brass/60" />

      <div className="font-special-elite text-[14px] uppercase tracking-[0.32em] text-primary">
        {t('eyebrow')}
      </div>
      <h3 className="font-display uppercase text-brass text-xl font-bold tracking-[0.1em] mt-1.5 mb-5 flex items-center gap-2">
        {t('title')}
        <HelpIcon content={t('titleHelp')} />
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between border border-brass/22 bg-[#16130f] px-4 py-3">
          <label className="flex items-center gap-2 font-special-elite text-xs uppercase tracking-[0.06em] text-foreground">
            {t('enableNarrationLabel')}
            <HelpIcon content={t('enableNarrationHelp')} />
          </label>
          <input
            type="checkbox"
            checked={settings.gameMasterNarration.enabled}
            onChange={(e) =>
              setSettings({
                ...settings,
                gameMasterNarration: {
                  ...settings.gameMasterNarration,
                  enabled: e.target.checked,
                },
              })
            }
            className="w-4 h-4 text-primary bg-[#1f1a14] border-brass/30 rounded focus:ring-primary"
          />
        </div>

        <GMPromptPanel settings={settings} setSettings={setSettings} />
        <GMStyleGrid settings={settings} setSettings={setSettings} />
      </div>
    </div>
  );
}
