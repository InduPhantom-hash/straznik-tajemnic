import type { SetStateAction, Dispatch } from 'react';
import type { AISettings } from '@/lib/ai-settings';
import type { AvailableVoice } from '@/hooks/useSettingsModal';
import { HelpIcon } from '../../ui/tooltip';
import { Button } from '../../ui/button';

interface GoogleSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
  availableVoices: AvailableVoice[];
  isLoading: boolean;
}

export function GoogleSettings({
  settings,
  setSettings,
  availableVoices,
  isLoading,
}: GoogleSettingsProps) {
  const playSample = async () => {
    if (!settings.voiceSettings.voiceId) return;
    try {
      const response = await fetch('/api/tts/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Witaj, jestem Twoim narratorem w tej mrocznej opowieści.',
          settings: {
            languageCode: 'pl-PL',
            voiceName: settings.voiceSettings.voiceId,
            gender: 'NEUTRAL',
            speakingRate: settings.voiceSettings.speakingRate || 0.9,
            pitch: settings.voiceSettings.pitchControl || -2,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const audio = new Audio(data.audioUrl);
        audio.volume = (settings.voiceSettings.volume || 85) / 100;
        await audio.play();
      }
    } catch (e) {
      console.error(e);
      alert('Błąd odtwarzania próbki');
    }
  };

  return (
    <>
      <div className="col-span-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-special-elite uppercase text-[14px] tracking-[0.16em] text-brass">
            Wybór głosu (Google)
          </span>
          <HelpIcon content="Wybierz głos narratora. Chirp3 HD to najwyższa jakość. Wavenet to wysoka jakość neuronowa." />
        </div>
        <div className="flex gap-2">
          <select
            value={settings.voiceSettings.voiceId || ''}
            onChange={(e) =>
              setSettings({
                ...settings,
                voiceSettings: {
                  ...settings.voiceSettings,
                  voiceId: e.target.value,
                },
              })
            }
            className="flex-1 px-3 py-2.5 bg-[#0e0c08] border border-brass/30 text-foreground font-special-elite text-sm focus:border-primary focus:outline-none focus:shadow-[0_0_14px_rgba(13,148,136,0.18)] cursor-pointer"
          >
            <option value="">Wybierz głos...</option>
            {['Chirp3 HD', 'Wavenet', 'Neural', 'Standard'].map((type) => {
              const voicesOfType = availableVoices.filter(
                (v) => v.type === type
              );
              if (voicesOfType.length === 0) return null;
              return (
                <optgroup key={type} label={`${type} (${voicesOfType.length})`}>
                  {voicesOfType.map((voice) => (
                    <option key={voice.voiceId} value={voice.voiceId}>
                      {voice.name} - {voice.description}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!settings.voiceSettings.voiceId || isLoading}
            onClick={playSample}
            className="font-display font-semibold uppercase tracking-[0.16em] text-brass bg-brass/[0.04] border-brass/45 hover:bg-brass/10"
          >
            ▶ Próbka
          </Button>
        </div>
      </div>
    </>
  );
}

export function GooglePitchSlider({
  settings,
  setSettings,
}: Pick<GoogleSettingsProps, 'settings' | 'setSettings'>) {
  const pitch = settings.voiceSettings.pitchControl ?? -2;
  const pct = ((pitch + 20) / 40) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 font-special-elite uppercase text-[14px] tracking-[0.12em] text-muted-foreground">
          Wysokość głosu (Google)
          <HelpIcon content="Tylko dla Google TTS. -20 = niski, +20 = wysoki." />
        </label>
        <span className="font-special-elite text-sm text-primary">
          {pitch > 0 ? '+' : ''}
          {pitch}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-special-elite text-[14px] text-muted-foreground min-w-[1.8rem]">
          -20
        </span>
        <div className="flex-1">
          <input
            type="range"
            min="-20"
            max="20"
            step="1"
            value={pitch}
            onChange={(e) =>
              setSettings({
                ...settings,
                voiceSettings: {
                  ...settings.voiceSettings,
                  pitchControl: parseFloat(e.target.value),
                },
              })
            }
            className="w-full h-3 rounded-lg appearance-none cursor-pointer slider-thumb"
            style={{
              background: `linear-gradient(to right, rgb(var(--primary)) 0%, rgb(var(--primary)) ${pct}%, #2a241b ${pct}%, #2a241b 100%)`,
            }}
          />
        </div>
        <span className="font-special-elite text-[14px] text-muted-foreground min-w-[1.8rem] text-right">
          +20
        </span>
      </div>
    </div>
  );
}
