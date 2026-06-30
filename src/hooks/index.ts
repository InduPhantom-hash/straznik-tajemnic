/**
 * Indeks hooków React wyodrębnionych z page.tsx
 * Zgodność z GEMINI.md: "Nie twórz plików > 200 linii bez rozbicia na moduły"
 */

export { useTTS, removeDidaskalia } from './useTTS';
export type { TTSState, UseTTSReturn } from './useTTS';

export { useChat } from './useChat';
export type { UseChatReturn, ImageToGenerate } from './useChat';

export { useCharacterManagement } from './useCharacterManagement';
export type { UseCharacterManagementReturn } from './useCharacterManagement';

export { usePdfMemory } from './usePdfMemory';
export type { PdfMemory, UsePdfMemoryReturn } from './usePdfMemory';

export { useFullSave } from './useFullSave';
export type { UseFullSaveReturn } from './useFullSave';

// Re-export istniejących hooków
export {
  useSettingsSubscription,
  useSettingsSelector,
  useSettingsWithUpdate,
} from './use-settings-subscription';

// IND-17: extraction settings-modal logic
export { useSettingsModal } from './useSettingsModal';
export type {
  UseSettingsModalReturn,
  UseSettingsModalOptions,
  UsageStats,
  AvailableVoice,
  // M5 sesja 146: ElevenVoice DROPPED per D2.
} from './useSettingsModal';

// IND-31: split useSettingsModal na sub-hooki
export { useVoiceLoaders } from './useVoiceLoaders';
export type { UseVoiceLoadersReturn } from './useVoiceLoaders';

export { useSettingsInit } from './useSettingsInit';
export type {
  UseSettingsInitReturn,
  UseSettingsInitOptions,
} from './useSettingsInit';

export { useUsageStats } from './useUsageStats';
export type { UseUsageStatsReturn } from './useUsageStats';

export { useApiTester } from './useApiTester';
export type {
  UseApiTesterReturn,
  UseApiTesterOptions,
  TestResults,
} from './useApiTester';

export { useFullReset } from './useFullReset';
export type { UseFullResetReturn } from './useFullReset';
