'use client';

import type { SetStateAction, Dispatch } from 'react';
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
  const g = settings.geminiSettings;

  return (
    <>
      {/* === Header === */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display uppercase tracking-[0.16em] text-lg text-brass">
          🤖 Gemini API (Google AI)
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
            Test API
          </Button>
        </div>
      </div>

      {/* === 3 pola podstawowe === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
            Włącz Gemini API
            <HelpIcon content="Włącza główną funkcjonalność AI do generowania tekstu i narracji mistrza gry. Wymagany do działania systemu AI." />
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
            API Key
            <HelpIcon content="Klucz API z Google AI Studio. Bez tego klucza funkcje AI nie będą działać. Uzyskaj klucz na: https://aistudio.google.com" />
          </label>
          <input
            type="password"
            value={settings.geminiApiKey || ''}
            onChange={(e) =>
              setSettings({ ...settings, geminiApiKey: e.target.value })
            }
            placeholder="Wprowadź klucz API"
            className="w-full px-3 py-2 bg-[#1f1a14] border border-brass/30 rounded text-foreground font-special-elite text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
            Model
            <HelpIcon content="Flash: Najszybszy i najtańszy • Pro: Najlepszy, ale droższy • 1.0 Pro: Stabilny, sprawdzony model" />
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
            <option value="gemini-3.1-pro-preview">
              Gemini 3.1 Pro Preview (najnowszy, ULTRA)
            </option>
            <option value="gemini-3-pro-preview">Gemini 3 Pro Preview</option>
            <option value="gemini-3-flash-preview">
              Gemini 3 Flash Preview (szybki)
            </option>
            <option value="gemini-2.5-pro">
              Gemini 2.5 Pro (stabilny, zaawansowany)
            </option>
            <option value="gemini-2.5-flash">
              Gemini 2.5 Flash (stabilny, szybki)
            </option>
            <option value="gemini-2.5-flash-lite">
              Gemini 2.5 Flash-Lite (lekki)
            </option>
            <option value="gemini-2.0-flash">
              Gemini 2.0 Flash (sprawdzony)
            </option>
            <option value="gemini-2.0-flash-exp">
              Gemini 2.0 Flash Experimental
            </option>
            <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
            <option value="gemini-flash-latest">
              Gemini Flash Latest (automatyczny)
            </option>
            <option value="gemini-pro-latest">
              Gemini Pro Latest (automatyczny)
            </option>
          </select>
        </div>
      </div>
    </>
  );
}
