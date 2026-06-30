'use client';

/**
 * Barrel re-export - IND-144 (sesja 129).
 *
 * NarrativeFormatter splittnięty z 627-lin pliku na 9 sub-modułów w
 * `./narrative/` (każdy <200 lin guardrail). Ten barrel zachowuje path
 * stability dla 4 callerów (ChatWindow, 2 testy, ind-145-regression).
 *
 * Pattern z TTS sesja 122 (settings/tts.ts barrel).
 */
export { NarrativeFormatter, default } from './narrative';
export type { Section, SectionType, HandoutType } from './narrative';
