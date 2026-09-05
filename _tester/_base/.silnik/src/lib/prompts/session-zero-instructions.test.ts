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

  it('generates investigator hook, psychological anchors, and era filter (PL and EN)', () => {
    const rawSettings: SessionZeroSettings = {
      ...baseSettings,
      investigatorHook: 'Śledztwo na zlecenie wdowy po profesorze',
      anchors: {
        keyConnection: 'Siostra Clara w Bostonie',
        importantPlace: 'Gabinet w Arkham',
        treasuredItem: 'Zegarek kieszonkowy ojca',
      },
      eraFilter: 'authentic_1920s',
    };

    const promptPl = buildSessionZeroInstructions(rawSettings, 'pl');
    expect(promptPl).toContain('## MOTYWACJA I HACZYK BADACZA');
    expect(promptPl).toContain('Śledztwo na zlecenie wdowy po profesorze');
    expect(promptPl).toContain('## KOTWICE PSYCHICZNE I WIĘZI (CoC 7e RAW)');
    expect(promptPl).toContain('Ważna Osoba (Kluczowa Więź - odzyskiwanie SAN): Siostra Clara w Bostonie');
    expect(promptPl).toContain('Ważne Miejsce: Gabinet w Arkham');
    expect(promptPl).toContain('Cenny Przedmiot: Zegarek kieszonkowy ojca');
    expect(promptPl).toContain('## FILTR EPOKI: HISTORYCZNY AUTENTYZM LAT 20.');

    const promptEn = buildSessionZeroInstructions(
      {
        ...rawSettings,
        investigatorHook: 'Investigation commissioned by professor widow',
        anchors: {
          keyConnection: 'Sister Clara in Boston',
          importantPlace: 'Arkham Study',
          treasuredItem: 'Father pocket watch',
        },
        eraFilter: 'modern_sensibilities',
      },
      'en'
    );
    expect(promptEn).toContain('## INVESTIGATOR MOTIVATION & HOOK');
    expect(promptEn).toContain('Investigation commissioned by professor widow');
    expect(promptEn).toContain('## PSYCHOLOGICAL ANCHORS & CONNECTIONS (CoC 7e RAW)');
    expect(promptEn).toContain('Key Connection (Important Person - SAN recovery): Sister Clara in Boston');
    expect(promptEn).toContain('Significant Location: Arkham Study');
    expect(promptEn).toContain('Treasured Possession: Father pocket watch');
    expect(promptEn).toContain('## ERA FILTER: MODERN SENSIBILITIES');
  });
});
