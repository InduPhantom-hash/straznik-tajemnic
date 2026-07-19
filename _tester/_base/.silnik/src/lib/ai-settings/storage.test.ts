import { defaultAISettings } from './defaults';
import { loadAISettings } from './storage';

const sessionZero = {
  era: 'classic' as const,
  tone: 'purist' as const,
  difficulty: 'normal' as const,
  narrativeMode: 'full_rpg' as const,
  lines: [],
  veils: [],
  safetyWord: '',
  playerName: 'Aga',
  completed: true,
};

describe('loadAISettings session mechanics migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('keeps legacy Session Zero settings without activating mechanics', () => {
    localStorage.setItem('ai_settings', JSON.stringify({ sessionZero }));

    expect(loadAISettings().sessionZero).toEqual({
      ...sessionZero,
      mechanics: undefined,
    });
  });

  it('keeps only a valid version 1 mechanics contract', () => {
    localStorage.setItem(
      'ai_settings',
      JSON.stringify({
        sessionZero: {
          ...sessionZero,
          mechanics: {
            schemaVersion: 1,
            enabled: true,
            pacing: 'detailed',
            combatDetail: 'standard',
            chaseDetail: 'narrative',
          },
        },
      })
    );

    expect(loadAISettings().sessionZero?.mechanics).toEqual({
      schemaVersion: 1,
      enabled: true,
      pacing: 'detailed',
      combatDetail: 'standard',
      chaseDetail: 'narrative',
    });
  });

  it('falls back when the stored mechanics contract is malformed', () => {
    localStorage.setItem(
      'ai_settings',
      JSON.stringify({
        sessionZero: {
          ...sessionZero,
          mechanics: { schemaVersion: 2, enabled: true },
        },
      })
    );

    expect(loadAISettings().sessionZero?.mechanics).toBeUndefined();
    expect(loadAISettings().qualityPreset).toBe(defaultAISettings.qualityPreset);
  });

  it('keeps pure narrative free of mechanics even for a valid stored contract', () => {
    localStorage.setItem(
      'ai_settings',
      JSON.stringify({
        sessionZero: {
          ...sessionZero,
          narrativeMode: 'pure_narrative',
          mechanics: {
            schemaVersion: 1,
            enabled: true,
            pacing: 'detailed',
            combatDetail: 'detailed',
            chaseDetail: 'detailed',
          },
        },
      })
    );

    expect(loadAISettings().sessionZero?.mechanics).toBeUndefined();
  });
});
