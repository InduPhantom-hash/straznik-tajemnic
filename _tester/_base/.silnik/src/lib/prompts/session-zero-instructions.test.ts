import { buildSessionZeroInstructions } from './session-zero-instructions';
import type { SessionZeroSettings } from '../ai-settings/types';

describe('buildSessionZeroInstructions', () => {
  it('keeps both Hot Seat players in the GM context', () => {
    const prompt = buildSessionZeroInstructions(
      {
        tone: 'purist',
        difficulty: 'normal',
        narrativeMode: 'full_rpg',
        lines: [],
        veils: [],
        safetyWord: '',
        completed: true,
        players: [
          {
            characterId: 'char-1',
            playerName: 'Jakub',
            characterName: 'Edward Carnby',
            investigatorHook: 'Dług karciany',
            anchors: { keyConnection: 'Siostra Clara' },
          },
          {
            characterId: 'char-2',
            playerName: 'Marta',
            characterName: 'Evelyn Reed',
            investigatorHook: 'Zaginiony brat',
            anchors: { importantPlace: 'Biblioteka Miskatonic' },
          },
        ],
      },
      'pl'
    );

    expect(prompt).toContain('## KONTEKST DRUŻYNY (2 GRACZY)');
    expect(prompt).toContain('Gracz 1 (Jakub) - Badacz: Edward Carnby');
    expect(prompt).toContain('Gracz 2 (Marta) - Badacz: Evelyn Reed');
    expect(prompt).toContain('Utrzymuj w fabule obecność każdego badacza');

    const promptEn = buildSessionZeroInstructions(
      {
        tone: 'purist',
        difficulty: 'normal',
        narrativeMode: 'full_rpg',
        lines: [],
        veils: [],
        safetyWord: '',
        completed: true,
        players: [
          { characterId: 'char-1', playerName: 'Jakub', characterName: 'Edward Carnby' },
          { characterId: 'char-2', playerName: 'Marta', characterName: 'Evelyn Reed' },
        ],
      },
      'en'
    );
    expect(promptEn).toContain('## PARTY CONTEXT (2 PLAYERS)');
    expect(promptEn).toContain('Player 2 (Marta) - Investigator: Evelyn Reed');
  });

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
      eraFilter: 'historical_realia',
    };

    const promptPl = buildSessionZeroInstructions(rawSettings, 'pl');
    expect(promptPl).toContain('## MOTYWACJA I HACZYK BADACZA');
    expect(promptPl).toContain('Śledztwo na zlecenie wdowy po profesorze');
    expect(promptPl).toContain('## KOTWICE PSYCHICZNE I WIĘZI (CoC 7e RAW)');
    expect(promptPl).toContain('Ważna Osoba (Kluczowa Więź - odzyskiwanie SAN): Siostra Clara w Bostonie');
    expect(promptPl).toContain('Ważne Miejsce: Gabinet w Arkham');
    expect(promptPl).toContain('Cenny Przedmiot: Zegarek kieszonkowy ojca');
    expect(promptPl).toContain('## FILTR EPOKI: REALIA HISTORYCZNE');
    expect(promptPl).toContain('Pełna wierność realiom historycznym: autentyczne struktury społeczne');
    expect(promptPl).toContain('bez współczesnej cenzury, moralizatorstwa i bez anachronizmów');

    const promptEn = buildSessionZeroInstructions(
      {
        ...rawSettings,
        investigatorHook: 'Investigation commissioned by professor widow',
        anchors: {
          keyConnection: 'Sister Clara in Boston',
          importantPlace: 'Arkham Study',
          treasuredItem: 'Father pocket watch',
        },
        eraFilter: 'historical_realia',
      },
      'en'
    );
    expect(promptEn).toContain('## INVESTIGATOR MOTIVATION & HOOK');
    expect(promptEn).toContain('Investigation commissioned by professor widow');
    expect(promptEn).toContain('## PSYCHOLOGICAL ANCHORS & CONNECTIONS (CoC 7e RAW)');
    expect(promptEn).toContain('Key Connection (Important Person - SAN recovery): Sister Clara in Boston');
    expect(promptEn).toContain('Significant Location: Arkham Study');
    expect(promptEn).toContain('Treasured Possession: Father pocket watch');
    expect(promptEn).toContain('## ERA FILTER: HISTORICAL REALIA');
    expect(promptEn).toContain('Full fidelity to historical realities: period-accurate social structures');
    expect(promptEn).toContain('without contemporary censorship, moralizing, or anachronisms');

    const promptModern = buildSessionZeroInstructions(
      {
        ...rawSettings,
        eraFilter: 'modern_sensibilities',
      },
      'pl'
    );
    expect(promptModern).toContain('## FILTR EPOKI: WSPÓŁCZESNA WRAŻLIWOŚĆ');
    expect(promptModern).toContain('łagodząc uprzedzenia i dyskryminację epoki');
  });

  it('generates diegetic briefing and Strong Start instructions when briefing is present', () => {
    const briefingSettings: SessionZeroSettings = {
      ...baseSettings,
      briefing: 'Pilny telegram od prof. Armitage: przyjedź natychmiast do Arkham.',
    };

    const promptPl = buildSessionZeroInstructions(briefingSettings, 'pl');
    expect(promptPl).toContain('## BRIEFING ŚLEDCZY I DEPESZA STARTOWA (STRONG START)');
    expect(promptPl).toContain('Pilny telegram od prof. Armitage: przyjedź natychmiast do Arkham.');
    expect(promptPl).toContain('posłaniec na progu, pociąg wjeżdżający na stację, telegram w dłoni');

    const promptEn = buildSessionZeroInstructions(
      {
        ...briefingSettings,
        briefing: 'Urgent telegram from Prof. Armitage: come to Arkham at once.',
      },
      'en'
    );
    expect(promptEn).toContain('## DIEGETIC BRIEFING & CASE DISPATCH (STRONG START)');
    expect(promptEn).toContain('Urgent telegram from Prof. Armitage: come to Arkham at once.');
    expect(promptEn).toContain('courier on the doorstep, train arriving at the station, holding the telegram');
  });
});
