import type { SetStateAction, Dispatch } from 'react';
import type { AISettings } from '@/lib/ai-settings';
import type { TestResults } from '@/hooks/useApiTester';
import type { AvailableVoice } from '@/hooks/useSettingsModal';
import { HelpIcon } from '../../ui/tooltip';
import { Switch } from '../../ui/switch';
import { ProviderTestButton } from './provider-test-button';
import { GeminiSettings } from './gemini-settings';
import { VolumeSlider } from './shared-sliders';

interface TTSSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
  testResults: TestResults;
  isLoading: boolean;
  testAPI: (apiType: string) => Promise<void>;
  getTestResultColor: (result: boolean | null) => string;
  getTestResultIcon: (result: boolean | null) => string;
  availableVoices: AvailableVoice[];
  loadAvailableVoices: () => Promise<void>;
}

/**
 * Panel TTS - Zew Home (fork offline). Cały lektor idzie przez `/api/tts/gemini`
 * (jeden klucz Gemini; Google Cloud TTS wycięty ze ścieżki - to osobny klucz/SA).
 * Dlatego UI jest GEMINI-ONLY - schowane (martwe dla rozgrywki) kontrolki:
 *  - przełącznik providera Google/Gemini (`useTTS` nie czyta `voiceSettings.provider`),
 *  - pod-sekcja Google (głos/encoding/sampleRate/pitch - niekonsumowana przez narrację),
 *  - checkbox "Tylko narrator" (`useTTS` hardkoduje `isNarratorOnly:false` - niezaimpl.),
 *  - suwak "Prędkość" (`useTTS` nie ustawia `playbackRate`, route nie przyjmuje speed).
 * Kod sub-komponentów (`provider-switch`, `google-settings`, `SpeedSlider`) zostaje na
 * dysku - render przywracalny gdyby wróciła obsługa Google TTS (wzorzec jak Replicate).
 * `availableVoices`/`loadAvailableVoices` (były dla panelu Google) zostają w kontrakcie
 * propsów, bez destrukturyzacji - parent nadal je przekazuje.
 */
export function TTSSettings({
  settings,
  setSettings,
  testResults,
  isLoading,
  testAPI,
  getTestResultColor,
  getTestResultIcon,
}: TTSSettingsProps) {
  const enabled = settings.voiceSettings.enabled;

  return (
    <div className="relative border border-brass/30 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-6 shadow-[0_0_22px_rgba(13,148,136,0.08)]">
      {/* Narożniki déco */}
      <span className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brass/60" />
      <span className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brass/60" />
      <span className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brass/60" />
      <span className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brass/60" />

      {/* Nagłówek sekcji */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-special-elite uppercase text-[14px] tracking-[0.32em] text-primary">
            Głos Strażnika
          </div>
          <h3 className="mt-1 font-display uppercase text-2xl tracking-[0.1em] text-foreground">
            Lektor narracji
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`font-special-elite uppercase text-[14px] tracking-[0.1em] ${
              enabled ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {enabled ? 'Włączony' : 'Wyłączony'}
          </span>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) =>
              setSettings({
                ...settings,
                voiceSettings: { ...settings.voiceSettings, enabled: checked },
              })
            }
          />
          <HelpIcon content="Automatyczne odczytywanie wiadomości od Mistrza Gry głosem Gemini." />
        </div>
      </div>

      {/* Separator déco */}
      <div className="flex items-center gap-4 my-5">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/35" />
        <span className="w-2 h-2 bg-brass rotate-45" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/35" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Lewa kolumna - wybór głosu */}
        <GeminiSettings
          settings={settings}
          setSettings={setSettings}
          isLoading={isLoading}
        />

        {/* Prawa kolumna - parametry + test/próbka */}
        <div className="flex flex-col gap-4">
          <div className="relative border border-brass/22 bg-[#16130f] p-5">
            <div className="font-special-elite uppercase text-[14px] tracking-[0.16em] text-brass mb-4">
              Parametry głosu
            </div>
            <VolumeSlider settings={settings} setSettings={setSettings} />
          </div>

          <div className="relative border border-brass/22 bg-[#16130f] p-5 flex flex-col gap-3">
            <div className="font-special-elite uppercase text-[14px] tracking-[0.16em] text-brass">
              Diagnostyka silnika
            </div>
            <p className="font-serif italic text-base text-muted-foreground leading-relaxed m-0">
              „Mgła nad zatoką gęstnieje, a z głębi dobiega dźwięk, którego
              żaden człowiek nie powinien usłyszeć...&rdquo;
            </p>
            <div className="flex items-center justify-between mt-auto pt-1">
              <span className="font-special-elite uppercase text-[14px] tracking-[0.12em] text-muted-foreground">
                Test API · Gemini TTS
              </span>
              <ProviderTestButton
                provider="gemini"
                testResults={testResults}
                isLoading={isLoading}
                testAPI={testAPI}
                getTestResultColor={getTestResultColor}
                getTestResultIcon={getTestResultIcon}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
