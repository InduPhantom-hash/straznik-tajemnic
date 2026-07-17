import type { SetStateAction, Dispatch } from 'react';
import type { AISettings } from '@/lib/ai-settings';
import { GEMINI_VOICES, DEFAULT_GEMINI_VOICE } from '@/lib/gemini-voices';
import { HelpIcon } from '../../ui/tooltip';

interface ProviderSwitchProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
  availableVoicesCount: number;
  loadAvailableVoices: () => Promise<void>;
}

export function ProviderSwitch({
  settings,
  setSettings,
  availableVoicesCount,
  loadAvailableVoices,
}: ProviderSwitchProps) {
  const provider = settings.voiceSettings.provider;
  const isGoogle = !provider || provider === 'google';

  return (
    <div className="md:col-span-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-special-elite uppercase text-[14px] tracking-[0.16em] text-brass">
          Dostawca TTS
        </span>
        <HelpIcon content="Wybierz silnik syntezy mowy. Google = standardowy (Wavenet/Chirp3-HD). Gemini = nowy (Pro narrator/Flash NPC, audio tags)." />
      </div>
      <div className="flex flex-wrap gap-3">
        <label
          className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors flex-1 min-w-[200px] ${
            isGoogle
              ? 'border-primary bg-primary/[0.08] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
              : 'border-brass/22 bg-[#16130f] hover:border-brass/45'
          }`}
        >
          <input
            type="radio"
            name="ttsProvider"
            value="google"
            checked={isGoogle}
            onChange={() => {
              setSettings({
                ...settings,
                voiceSettings: {
                  ...settings.voiceSettings,
                  provider: 'google',
                },
              });
              if (availableVoicesCount === 0) loadAvailableVoices();
            }}
            className="text-primary accent-primary"
          />
          <div className="flex flex-col">
            <span className="font-display uppercase tracking-[0.1em] text-sm text-foreground">
              Google Cloud
            </span>
            <span className="font-special-elite text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
              Standardowa jakość, szybki
            </span>
          </div>
        </label>

        <label
          className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors flex-1 min-w-[200px] ${
            provider === 'gemini'
              ? 'border-primary bg-primary/[0.08] shadow-[0_0_14px_rgba(13,148,136,0.18)]'
              : 'border-brass/22 bg-[#16130f] hover:border-brass/45'
          }`}
        >
          <input
            type="radio"
            name="ttsProvider"
            value="gemini"
            checked={provider === 'gemini'}
            onChange={() =>
              setSettings({
                ...settings,
                voiceSettings: {
                  ...settings.voiceSettings,
                  provider: 'gemini',
                  voiceId:
                    settings.voiceSettings.voiceId &&
                    GEMINI_VOICES.some(
                      (v) => v.voiceId === settings.voiceSettings.voiceId
                    )
                      ? settings.voiceSettings.voiceId
                      : DEFAULT_GEMINI_VOICE,
                },
              })
            }
            className="text-primary accent-primary"
          />
          <div className="flex flex-col">
            <span className="font-display uppercase tracking-[0.1em] text-sm text-foreground">
              Gemini Flash TTS
            </span>
            <span className="font-special-elite text-[14px] uppercase tracking-[0.08em] text-muted-foreground">
              Tani (~50× taniej od ElevenLabs), preview
            </span>
          </div>
        </label>

        {/* M3 sesja 146: OpenAI + ElevenLabs radio buttons DROPPED per D2.
            Pozostały Google (Wavenet/Chirp3-HD) + Gemini (Pro/Flash z auto-route w useTTS). */}
      </div>
    </div>
  );
}
