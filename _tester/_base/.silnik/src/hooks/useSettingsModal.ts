'use client';

import { useEffect } from 'react';
import { AISettings } from '@/lib/ai-settings';
import {
  useSettingsInit,
  type UseSettingsInitOptions,
} from './useSettingsInit';
import { useVoiceLoaders } from './useVoiceLoaders';
import { useUsageStats } from './useUsageStats';
import { useFullReset, type UseFullResetReturn } from './useFullReset';
import { useApiTester, type UseApiTesterReturn } from './useApiTester';
import type { UsageStats } from '@/lib/ai-cost-tracker';
import type { CostStats } from '@/lib/cost-event-emitter';
import type { AvailableVoice } from './useVoiceLoaders';

/**
 * Główny hook orkiestrujący SettingsModal.
 *
 * Cieńszy orkiestrator (IND-31) - agreguje 6 sub-hooków:
 *  - `useSettingsInit` (settings state + init + drift detector + handleSave/Reset)
 *  - `useVoiceLoaders` (Google + ElevenLabs voice lists)
 *  - `useUsageStats` (token/cost stats + costEmitter subscribe)
 *  - `useApiTester` (testowanie 8 API)
 *  - `useFullReset` (2-stopniowy confirm pełnego resetu)
 *
 * Przepływ:
 *  1. Mount → useSettingsInit init useEffect → loadAISettings → setSettings
 *  2. useSettingsInit emituje `onSettingsLoaded(s)` GDY `s.elevenLabsApiKey` obecny
 *  3. Orkiestrator własny useEffect na mount → `voiceLoaders.loadAvailableVoices()` ZAWSZE
 *  4. Orkiestrator w callback `onSettingsLoaded` → `voiceLoaders.loadElevenVoices()`
 *
 * Wyodrębniony z `settings-modal.tsx` (sesja 18, IND-17), splittowany na sub-hooki
 * (sesja 40, IND-31). Pojedyncza zmiana zachowania od IND-31: setCostStats(getStats())
 * usunięte z setInterval 3min (patch K2) - costEmitter event-driven daje stats updates
 * przez subscribe bez polling.
 */

// Re-export typów dla backward compat (tts-settings.tsx:4 importuje AvailableVoice stąd)
export type { AvailableVoice } from './useVoiceLoaders';
export type { UsageStats };

export type UseSettingsModalOptions = Omit<
  UseSettingsInitOptions,
  'onSettingsLoaded'
>;

export interface UseSettingsModalReturn {
  // Core state
  settings: AISettings;
  setSettings: React.Dispatch<React.SetStateAction<AISettings>>;
  // Voices (M5 sesja 146: elevenVoices DROPPED per D2)
  availableVoices: AvailableVoice[];
  // Usage / costs
  usageStats: UsageStats | null;
  costStats: CostStats | null;
  // Handlers
  handleSave: () => Promise<void>;
  handleReset: () => void;
  loadAvailableVoices: () => Promise<void>;
  // Nested sub-hooki
  apiTester: UseApiTesterReturn;
  fullReset: UseFullResetReturn;
}

export function useSettingsModal(
  options: UseSettingsModalOptions
): UseSettingsModalReturn {
  const voiceLoaders = useVoiceLoaders();
  const usage = useUsageStats();

  const settingsInit = useSettingsInit({
    ...options,
    // M5 sesja 146: onSettingsLoaded gated by elevenLabsApiKey DROPPED per D2.
  });

  // Załaduj listę głosów Google ZAWSZE na mount/re-open modalu (analogicznie do
  // dawnego loadAvailableVoices() na lin 211 useSettingsModal pre-IND-31).
  useEffect(() => {
    voiceLoaders.loadAvailableVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.open]);

  const fullReset = useFullReset();
  const apiTester = useApiTester({
    getGeminiApiKey: () => settingsInit.settings.geminiApiKey ?? '',
    loadAvailableVoices: voiceLoaders.loadAvailableVoices,
  });

  return {
    settings: settingsInit.settings,
    setSettings: settingsInit.setSettings,
    availableVoices: voiceLoaders.availableVoices,
    usageStats: usage.usageStats,
    costStats: usage.costStats,
    handleSave: settingsInit.handleSave,
    handleReset: settingsInit.handleReset,
    loadAvailableVoices: voiceLoaders.loadAvailableVoices,
    apiTester,
    fullReset,
  };
}
