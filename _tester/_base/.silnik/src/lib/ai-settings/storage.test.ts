import { defaultAISettings } from './defaults';
import { loadAISettings, isAIFeatureAvailable, resetAISettings } from './storage';

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

  it('Issue #366: domyślnie lektor (TTS) jest włączony w defaultAISettings oraz loadAISettings', () => {
    expect(defaultAISettings.voiceSettings.enabled).toBe(true);
    expect(loadAISettings().voiceSettings.enabled).toBe(true);
  });

  it('Issue #280: domyślnie Push-to-Talk (transkrypcja mowy) jest wyłączona w defaultAISettings oraz loadAISettings', () => {
    expect(defaultAISettings.pushToTalkEnabled).toBe(false);
    expect(defaultAISettings.voiceSettings.pushToTalkEnabled).toBe(false);
    expect(loadAISettings().pushToTalkEnabled).toBe(false);
    expect(loadAISettings().voiceSettings.pushToTalkEnabled).toBe(false);
  });

  it('Issue #280: poprawnie wczytuje włączone Push-to-Talk z localStorage', () => {
    localStorage.setItem(
      'ai_settings',
      JSON.stringify({
        pushToTalkEnabled: true,
      })
    );

    const loaded = loadAISettings();
    expect(loaded.pushToTalkEnabled).toBe(true);
    expect(loaded.voiceSettings.pushToTalkEnabled).toBe(true);
  });

  it('Issue #280: normalizuje pushToTalkEnabled gdy tylko voiceSettings.pushToTalkEnabled było zapisane', () => {
    localStorage.setItem(
      'ai_settings',
      JSON.stringify({
        voiceSettings: {
          pushToTalkEnabled: true,
        },
      })
    );

    const loaded = loadAISettings();
    expect(loaded.pushToTalkEnabled).toBe(true);
    expect(loaded.voiceSettings.pushToTalkEnabled).toBe(true);
  });

  it('Issue #280: isAIFeatureAvailable zwraca false domyślnie i true po włączeniu pushToTalkEnabled', () => {
    expect(isAIFeatureAvailable('pushToTalkEnabled')).toBe(false);

    localStorage.setItem(
      'ai_settings',
      JSON.stringify({
        pushToTalkEnabled: true,
      })
    );
    expect(isAIFeatureAvailable('pushToTalkEnabled')).toBe(true);
  });

  it('Issue #280: resetAISettings przywraca pushToTalkEnabled na false', () => {
    localStorage.setItem(
      'ai_settings',
      JSON.stringify({
        pushToTalkEnabled: true,
      })
    );
    expect(loadAISettings().pushToTalkEnabled).toBe(true);

    const reset = resetAISettings();
    expect(reset.pushToTalkEnabled).toBe(false);
    expect(reset.voiceSettings.pushToTalkEnabled).toBe(false);
    expect(loadAISettings().pushToTalkEnabled).toBe(false);
  });
});
