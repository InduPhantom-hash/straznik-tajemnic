import { defaultAISettings } from '@/lib/ai-settings/defaults';
import type { AISettings } from '@/lib/ai-settings/types';
import { resolveSettings, type ClientAISettingsPatch } from './resolve-settings';

const sessionZero = {
  era: 'classic' as const,
  tone: 'purist' as const,
  difficulty: 'normal' as const,
  narrativeMode: 'full_rpg' as const,
  lines: ['Przemoc wobec dzieci'],
  veils: [],
  safetyWord: '',
  playerName: 'Aga',
  completed: true,
};

function createBaseSettings(): AISettings {
  return {
    ...defaultAISettings,
    sessionZero: {
      ...sessionZero,
      mechanics: {
        schemaVersion: 1,
        enabled: true,
        pacing: 'standard',
        combatDetail: 'standard',
        chaseDetail: 'standard',
      },
    },
  };
}

describe('resolveSettings Session Zero merge', () => {
  it('deep merges a partial Session Zero patch without losing mechanics', () => {
    const result = resolveSettings(createBaseSettings(), {
      sessionZero: { playerName: 'Bartek' },
    });

    expect(result.sessionZero).toEqual({
      ...sessionZero,
      playerName: 'Bartek',
      mechanics: {
        schemaVersion: 1,
        enabled: true,
        pacing: 'standard',
        combatDetail: 'standard',
        chaseDetail: 'standard',
      },
    });
  });

  it('drops a malformed mechanics patch after merging it at the request boundary', () => {
    const malformedPatch = {
      sessionZero: {
        mechanics: { schemaVersion: 99, enabled: true },
      },
    } as unknown as ClientAISettingsPatch;

    expect(
      resolveSettings(createBaseSettings(), malformedPatch).sessionZero?.mechanics
    ).toBeUndefined();
  });

  it('keeps pure narrative free of mechanics after a partial client patch', () => {
    const result = resolveSettings(createBaseSettings(), {
      sessionZero: { narrativeMode: 'pure_narrative' },
    });

    expect(result.sessionZero).toMatchObject({
      narrativeMode: 'pure_narrative',
      mechanics: undefined,
    });
  });
});
