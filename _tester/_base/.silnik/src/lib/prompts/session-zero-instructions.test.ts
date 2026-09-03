import { buildSessionZeroInstructions } from './session-zero-instructions';
import type { SessionZeroSettings } from '../ai-settings/types';

describe('buildSessionZeroInstructions', () => {
  const baseSettings: SessionZeroSettings = {
    era: 'classic',
    tone: 'purist',
    difficulty: 'normal',
    narrativeMode: 'full_rpg',
    lines: ['Przemoc wobec dzieci', 'Przemoc seksualna'],
    veils: ['Tortury (fade to black)', 'Szczegółowe obrażenia ciała'],
    safetyWord: 'CZERWONY',
    playerName: 'Badacz',
    completed: true,
  };

  it('returns empty string when sessionZero is undefined or not completed', () => {
    expect(buildSessionZeroInstructions(undefined)).toBe('');
    expect(
      buildSessionZeroInstructions({
        ...baseSettings,
        completed: false,
      })
    ).toBe('');
  });

  it('generates complete Polish instructions by default', () => {
    const prompt = buildSessionZeroInstructions(baseSettings, 'pl');

    expect(prompt).toContain('## STYL NARRACJI: PURYSTYCZNY');
    expect(prompt).toContain('## POZIOM TRUDNOŚCI: NORMALNY');
    expect(prompt).toContain('## TRYB NARRACJI: PEŁNE RPG');
    expect(prompt).toContain('## LINIE (TEMATY ABSOLUTNIE ZAKAZANE)');
    expect(prompt).toContain('- Przemoc wobec dzieci');
    expect(prompt).toContain('- Przemoc seksualna');
    expect(prompt).toContain('## ZASŁONY (FADE TO BLACK)');
    expect(prompt).toContain('- Tortury (fade to black)');
    expect(prompt).toContain('## SŁOWO BEZPIECZEŃSTWA');
    expect(prompt).toContain('Jeśli gracz napisze "CZERWONY"');
  });

  it('generates complete English instructions when locale is en', () => {
    const enSettings: SessionZeroSettings = {
      ...baseSettings,
      lines: ['Violence against children', 'Sexual violence'],
      veils: ['Torture (fade to black)', 'Detailed bodily injuries'],
      safetyWord: 'RED',
    };

    const prompt = buildSessionZeroInstructions(enSettings, 'en');

    expect(prompt).toContain('## NARRATIVE STYLE: PURIST');
    expect(prompt).toContain('## DIFFICULTY LEVEL: NORMAL');
    expect(prompt).toContain('## NARRATIVE MODE: FULL RPG');
    expect(prompt).toContain('## LINES (ABSOLUTELY FORBIDDEN TOPICS)');
    expect(prompt).toContain('- Violence against children');
    expect(prompt).toContain('## VEILS (FADE TO BLACK)');
    expect(prompt).toContain('- Torture (fade to black)');
    expect(prompt).toContain('## SAFETY WORD');
    expect(prompt).toContain('If the player writes "RED"');
  });

  it('omits safetyWord section when safetyWord is empty', () => {
    const promptPl = buildSessionZeroInstructions(
      { ...baseSettings, safetyWord: '' },
      'pl'
    );
    expect(promptPl).not.toContain('## SŁOWO BEZPIECZEŃSTWA');

    const promptEn = buildSessionZeroInstructions(
      { ...baseSettings, safetyWord: '' },
      'en'
    );
    expect(promptEn).not.toContain('## SAFETY WORD');
  });
});
