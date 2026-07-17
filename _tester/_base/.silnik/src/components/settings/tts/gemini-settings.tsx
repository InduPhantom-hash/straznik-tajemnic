import type { SetStateAction, Dispatch } from 'react';
import type { AISettings } from '@/lib/ai-settings';
import {
  DEFAULT_GEMINI_VOICE,
  getGeminiVoicesByRole,
  type GeminiVoiceRole,
} from '@/lib/gemini-voices';
import { HelpIcon } from '../../ui/tooltip';
import { Button } from '../../ui/button';

const ROLE_LABELS: Record<GeminiVoiceRole, string> = {
  narrator: 'Narrator',
  male: 'Męski',
  female: 'Kobiecy',
  young: 'Młodzi',
  old: 'Starsi',
  monster: 'Potwór',
};

const ROLES = [
  'narrator',
  'male',
  'female',
  'young',
  'old',
  'monster',
] as const satisfies readonly GeminiVoiceRole[];

interface GeminiSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
  isLoading: boolean;
}

export function GeminiSettings({
  settings,
  setSettings,
  isLoading,
}: GeminiSettingsProps) {
  const playSample = async () => {
    try {
      const response = await fetch('/api/tts/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Witaj, jestem Twoim narratorem w tej mrocznej opowieści. Przemawiam głosem Gemini.',
          voice: settings.voiceSettings.voiceId || DEFAULT_GEMINI_VOICE,
          languageCode: 'pl-PL',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.volume = (settings.voiceSettings.volume || 85) / 100;
          await audio.play();
        }
      } else {
        const err = await response.json();
        alert(`Błąd Gemini TTS: ${err.error || 'nieznany'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Błąd odtwarzania próbki Gemini');
    }
  };

  return (
    <div className="relative border border-brass/22 bg-[#16130f] p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-special-elite uppercase text-[14px] tracking-[0.16em] text-brass">
          Wybór głosu
        </span>
        <HelpIcon content="Prebuilt głosy Gemini Flash TTS. Status preview - brak dedykowanych głosów PL, jakość akcentu zależy od prebuiltu (smoke test rekomendowany)." />
      </div>

      <select
        value={settings.voiceSettings.voiceId || DEFAULT_GEMINI_VOICE}
        onChange={(e) =>
          setSettings({
            ...settings,
            voiceSettings: {
              ...settings.voiceSettings,
              voiceId: e.target.value,
            },
          })
        }
        className="w-full px-3 py-2.5 bg-[#0e0c08] border border-brass/30 text-foreground font-special-elite text-sm focus:border-primary focus:outline-none focus:shadow-[0_0_14px_rgba(13,148,136,0.18)] cursor-pointer"
      >
        {ROLES.map((role) => {
          const voicesOfRole = getGeminiVoicesByRole(role);
          if (voicesOfRole.length === 0) return null;
          return (
            <optgroup
              key={role}
              label={`${ROLE_LABELS[role]} (${voicesOfRole.length})`}
            >
              {voicesOfRole.map((voice) => (
                <option
                  key={voice.voiceId}
                  value={voice.voiceId}
                  title={voice.characteristic}
                >
                  {voice.name} - {voice.description}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>

      <p className="font-serif italic text-sm text-muted-foreground leading-relaxed mt-3 mb-4">
        Wybierz barwę, która poprowadzi opowieść. Posłuchaj próbki, nim
        powierzysz jej swój los.
      </p>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isLoading}
        onClick={playSample}
        className="mt-auto self-start font-display font-semibold uppercase tracking-[0.16em] text-brass bg-brass/[0.04] border-brass/45 hover:bg-brass/10"
      >
        ▶ Odtwórz próbkę
      </Button>
    </div>
  );
}
