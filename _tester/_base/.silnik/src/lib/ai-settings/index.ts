/**
 * AI Settings - Modular Index
 *
 * Re-eksportuje wszystko z głównego pliku dla kompatybilności wstecznej.
 * Zgodność z GEMINI.md: przygotowanie pod przyszłą modularyzację.
 */

// Re-eksporty dla kompatybilności wstecznej (z ../)
export {
  QUALITY_PRESETS,
  getPreset,
  getPresetDescription,
} from '../ai-presets';
export type { QualityPresetName, QualityPreset } from '../ai-presets';

// IND-52: `canMakeAIRequest as checkCanMakeAIRequest` alias usunięty —
// duplikat zdropowany z ai-cost-tracker.ts. Single source of truth:
// `canMakeAIRequest` z `./cost-control` (re-export przez `export *` poniżej).
export {
  calculateReplicateCost,
  getUsageHistory,
  getUsageStats,
  saveUsageRecord,
  incrementDailyUsage,
  updateDailyTokens,
} from '../ai-cost-tracker';

// Eksporty z nowych modułów (./)
export * from './types';
export * from './defaults';
export * from './storage';
export * from './prompts-generator';
export * from './cost-control';
