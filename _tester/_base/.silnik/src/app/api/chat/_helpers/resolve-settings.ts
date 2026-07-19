/**
 * resolveSettings - pure function dla sekcji 5 route.ts (IND-183 micro 1/5).
 *
 * Merge'uje baseSettings (z loadAISettings) z clientAISettings (z request body)
 * zachowując 3-poziomowy deep merge dla zagnieżdżonych obiektów:
 *   1. Top-level: ...base, ...client
 *   2. geminiSettings: {...base.gemini, ...client.gemini}
 *   3. gameMasterNarration.behavior: {...base.behavior, ...client.behavior}
 *
 * Zachowuje 1:1 zachowanie z oryginalnego route.ts (lin 97-113 przed split).
 *
 * Pure function: brak side effects, brak async. Nie mutuje argumentów (immutable spread).
 */

import {
  normalizeSessionZeroSettings,
  type AISettings,
  type SessionZeroSettings,
} from '@/lib/ai-settings/types';

// Partial w typie clientAISettings nie wystarczy bo geminiSettings jest required w AISettings.
// Klient może wysłać tylko podzbiór pól, więc zagłębione obiekty też muszą być Partial.
export type ClientAISettingsPatch = Partial<
  Omit<AISettings, 'geminiSettings' | 'gameMasterNarration' | 'sessionZero'>
> & {
  geminiSettings?: Partial<AISettings['geminiSettings']>;
  gameMasterNarration?: Partial<
    Omit<AISettings['gameMasterNarration'], 'behavior'>
  > & {
    behavior?: Partial<AISettings['gameMasterNarration']['behavior']>;
  };
  sessionZero?: Partial<SessionZeroSettings>;
  // sessionId nie jest częścią AISettings ale klient wysyła go w tym samym obiekcie.
  sessionId?: string;
};

export function resolveSettings(
  baseSettings: AISettings,
  clientAISettings: ClientAISettingsPatch | undefined
): AISettings {
  const mergedSessionZero = clientAISettings?.sessionZero
    ? {
        ...baseSettings.sessionZero,
        ...clientAISettings.sessionZero,
      }
    : baseSettings.sessionZero;

  return {
    ...baseSettings,
    ...clientAISettings,
    geminiSettings: {
      ...baseSettings.geminiSettings,
      ...(clientAISettings?.geminiSettings || {}),
    },
    gameMasterNarration: {
      ...baseSettings.gameMasterNarration,
      ...(clientAISettings?.gameMasterNarration || {}),
      behavior: {
        ...baseSettings.gameMasterNarration?.behavior,
        ...(clientAISettings?.gameMasterNarration?.behavior || {}),
      },
    },
    sessionZero: normalizeSessionZeroSettings(mergedSessionZero),
  };
}
