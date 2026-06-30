'use client';

import type { SetStateAction, Dispatch } from 'react';
import { AISettings } from '@/lib/ai-settings';
import { Accordion } from '../ui/accordion';
import { HeaderSection } from './gemini-sections/header';
import { SamplingSection } from './gemini-sections/sampling';
import { OutputSection } from './gemini-sections/output';
import { CacheSection } from './gemini-sections/cache';
import { SafetySection } from './gemini-sections/safety';
import { ThinkingSection } from './gemini-sections/thinking';
import { ToolsSection } from './gemini-sections/tools';

interface GeminiSettingsProps {
  settings: AISettings;
  setSettings: Dispatch<SetStateAction<AISettings>>;
  testResults: { gemini: boolean | null };
  isLoading: boolean;
  testAPI: (apiType: string) => Promise<void>;
  getTestResultColor: (result: boolean | null) => string;
  getTestResultIcon: (result: boolean | null) => string;
}

/**
 * Panel ustawień Gemini API - orkiestrator.
 * Po IND-12 podzielony na 7 sub-plików w `gemini-sections/`:
 *   - header (enabled/apiKey/model + Test API)
 *   - sampling (temperature/topP/topK/seed/candidateCount/penalties)
 *   - output (maxOutputTokens/responseMimeType/stopSequences/responseSchema)
 *   - cache (enableCache/cacheTTL/cachedContent - placeholder dla IND-13)
 *   - safety (4 selecty + Horror authentic / Reset)
 *   - thinking (thinkingLevel + multimodal info)
 *   - tools (function calling - eksperymentalne)
 *
 * Eksport `GeminiSettings` zachowany - konsument: `src/components/ui/settings-modal.tsx`.
 */
export function GeminiSettings({
  settings,
  setSettings,
  testResults,
  isLoading,
  testAPI,
  getTestResultColor,
  getTestResultIcon,
}: GeminiSettingsProps) {
  const g = settings.geminiSettings;

  /** Patch helper - jedno źródło prawdy dla immutable update geminiSettings. */
  const updateGemini = (patch: Partial<AISettings['geminiSettings']>) =>
    setSettings({ ...settings, geminiSettings: { ...g, ...patch } });

  return (
    <div className="relative bg-card rounded-lg p-5 border border-brass/30">
      {/* Narożniki déco */}
      <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-brass/60" />
      <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-brass/60" />

      {/* Nagłówek déco: złoty eyebrow + tytuł Cinzel (wg makiety 32) */}
      <div className="mb-3">
        <div className="font-special-elite text-[14px] uppercase tracking-[0.32em] text-brass">
          Dla wtajemniczonych
        </div>
        <h3 className="mt-1 font-display font-bold uppercase tracking-[0.1em] text-2xl text-foreground">
          Gemini · zaawansowane
        </h3>
      </div>

      {/* Ostrzeżenie bordo (wg makiety 32) */}
      <div className="flex items-center gap-2.5 mb-4 px-4 py-3 border-l-2 border-destructive/50 bg-destructive/[0.06]">
        <span className="text-destructive">⚠</span>
        <p className="font-serif italic text-[15px] text-muted-foreground">
          Te ustawienia wpływają bezpośrednio na zachowanie modeli. Zmieniaj je
          tylko, jeśli wiesz, co czynisz.
        </p>
      </div>

      <HeaderSection
        settings={settings}
        setSettings={setSettings}
        testResults={testResults}
        isLoading={isLoading}
        testAPI={testAPI}
        getTestResultColor={getTestResultColor}
        getTestResultIcon={getTestResultIcon}
      />

      {/* Lista 1 (offline fork): sekcje zaawansowane zwinięte domyślnie -
          gra steruje presetem (QualityPresets), nie ręcznymi suwakami. */}
      <Accordion type="multiple" defaultValue={[]} className="w-full">
        <SamplingSection g={g} updateGemini={updateGemini} />
        <OutputSection g={g} updateGemini={updateGemini} />
        <CacheSection g={g} updateGemini={updateGemini} />
        <SafetySection g={g} updateGemini={updateGemini} />
        <ThinkingSection g={g} updateGemini={updateGemini} />
        <ToolsSection g={g} updateGemini={updateGemini} />
      </Accordion>
    </div>
  );
}
