import type { SetStateAction, Dispatch } from 'react';
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
  if (BETA_HIDE_REPLICATE) return null;

  return (
    <div className="relative border border-brass/30 bg-gradient-to-br from-[#1a1610] to-[#100d09] p-4 shadow-[0_0_22px_rgba(13,148,136,0.08)]">
      <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-brass/50" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-brass/50" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display uppercase tracking-[0.24em] text-brass text-xs font-semibold">
          Replicate API (Generowanie Obrazów)
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
            Test API
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            Włącz Replicate
            <HelpIcon content="Włącza generowanie obrazów AI dla postaci i lokacji. Wymaga klucza API Replicate." />
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
            API Key
            <HelpIcon content="Klucz API Replicate do generowania obrazów. Uzyskaj klucz na: https://replicate.com" />
          </label>
          <input
            type="password"
            value={settings.replicateApiKey || ''}
            onChange={(e) =>
              setSettings({ ...settings, replicateApiKey: e.target.value })
            }
            placeholder="Wprowadź klucz Replicate API"
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            Styl obrazów
            <HelpIcon content="Realistyczny: Fotorealistyczne obrazy • Artystyczny: Malarski styl • Horror: Mroczny i przerażający • Vintage: Styl retro" />
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
            <option value="realistic">Realistyczny</option>
            <option value="artistic">Artystyczny</option>
            <option value="horror">Horror</option>
            <option value="vintage">Vintage</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            Jakość
            <HelpIcon content="Niska: Szybkie, tanie • Średnia: Zbalansowana • Wysoka: Lepsza jakość • Ultra: Najlepsza jakość, ale wolniejsze i droższe" />
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
            <option value="low">Niska (szybkie)</option>
            <option value="medium">Średnia</option>
            <option value="high">Wysoka</option>
            <option value="ultra">Ultra (wolne)</option>
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
            <span className="ml-2">Automatyczne portrety postaci</span>
            <HelpIcon content="Automatycznie generuj portrety dla nowych postaci graczy." />
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
            <span className="ml-2">Automatyczne ilustracje NPC</span>
            <HelpIcon content="Automatycznie generuj ilustracje dla postaci niezależnych (NPC) spotykanych w grze." />
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
            <span className="ml-2">Automatyczne ilustracje lokacji</span>
            <HelpIcon content="Automatycznie generuj ilustracje dla nowych lokacji odwiedzanych w grze." />
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
              Zachowuj wygląd NPC przy regeneracji portretu
            </span>
            <HelpIcon content="Gdy włączone, regeneracja portretu używa Flux Kontext Pro (image-to-image, $0.04) zachowując tożsamość postaci. Gdy wyłączone - generuje od zera przez Imagen 4 Ultra ($0.06)." />
          </label>
        </div>

        {/* IND-259: suwak częstotliwości ilustracji scen (łączy się z trybem narracji) */}
        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            Częstotliwość ilustracji scen
            <HelpIcon content="Jak często AI generuje obrazy scen w grze. Łączy się z trybem narracji (Sesja Zero): tryb ustala bazę, ten suwak ją przesuwa. Rzadko = płynniejsza narracja, mniej obrazów i niższy koszt. Często = więcej obrazów. W trybie Czysta Narracja obrazy i tak są minimalne." />
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
            <option value="rare">Rzadko (płynność narracji)</option>
            <option value="normal">Normalnie</option>
            <option value="often">Często (więcej obrazów)</option>
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 font-special-elite uppercase tracking-[0.1em] text-xs text-muted-foreground mb-2">
            Maksymalna liczba obrazów na wiadomość
            <HelpIcon content="Ile obrazów może wygenerować AI w jednej wiadomości. Wyższe wartości = więcej obrazów ale wyższy koszt." />
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
