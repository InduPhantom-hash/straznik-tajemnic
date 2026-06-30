/**
 * Wspólne typy + stałe modułowe dla sub-komponentów panelu Gemini Settings.
 * Refaktor sub-files w Fazie 4Db IND-12 (gdy gemini-settings.tsx urósł do 800+ linii).
 */

import type { AISettings } from '@/lib/ai-settings';

/** Props dla sub-sekcji operującej tylko na geminiSettings (większość). */
export interface GeminiSectionProps {
  g: AISettings['geminiSettings'];
  updateGemini: (patch: Partial<AISettings['geminiSettings']>) => void;
}

// === Safety (dla SafetySection) ===
export type SafetyLevel = AISettings['geminiSettings']['safetySettings']['harassment'];
export type SafetyKey = keyof AISettings['geminiSettings']['safetySettings'];

/** 4 poziomy safety w kolejności od najmniej do najbardziej restrykcyjnego, z color-coded badge. */
export const SAFETY_LEVELS: ReadonlyArray<{ value: SafetyLevel; label: string; badge: string }> = [
  { value: 'BLOCK_NONE',             label: 'Wyłączone (BLOCK_NONE)',           badge: 'bg-muted text-muted-foreground' },
  { value: 'BLOCK_ONLY_HIGH',        label: 'Tylko wysokie (BLOCK_ONLY_HIGH)',  badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40' },
  { value: 'BLOCK_MEDIUM_AND_ABOVE', label: 'Średnie+ (default)',               badge: 'bg-amber-500/20 text-amber-200 border-amber-500/40' },
  { value: 'BLOCK_LOW_AND_ABOVE',    label: 'Niskie+ (najsurowsze)',            badge: 'bg-red-500/20 text-red-200 border-red-500/40' },
];

/** 4 kategorie safety + odpowiadający im klucz w GEMINI_HELP. */
export const SAFETY_KEYS: ReadonlyArray<{
  key: SafetyKey;
  helpKey: 'safetyHarassment' | 'safetyHateSpeech' | 'safetySexuallyExplicit' | 'safetyDangerousContent';
}> = [
  { key: 'harassment',       helpKey: 'safetyHarassment' },
  { key: 'hateSpeech',       helpKey: 'safetyHateSpeech' },
  { key: 'sexuallyExplicit', helpKey: 'safetySexuallyExplicit' },
  { key: 'dangerousContent', helpKey: 'safetyDangerousContent' },
];

export const HORROR_PRESET: AISettings['geminiSettings']['safetySettings'] = {
  harassment: 'BLOCK_ONLY_HIGH',
  hateSpeech: 'BLOCK_ONLY_HIGH',
  sexuallyExplicit: 'BLOCK_ONLY_HIGH',
  dangerousContent: 'BLOCK_ONLY_HIGH',
};

export const SAFETY_DEFAULT: AISettings['geminiSettings']['safetySettings'] = {
  harassment: 'BLOCK_MEDIUM_AND_ABOVE',
  hateSpeech: 'BLOCK_MEDIUM_AND_ABOVE',
  sexuallyExplicit: 'BLOCK_MEDIUM_AND_ABOVE',
  dangerousContent: 'BLOCK_MEDIUM_AND_ABOVE',
};
