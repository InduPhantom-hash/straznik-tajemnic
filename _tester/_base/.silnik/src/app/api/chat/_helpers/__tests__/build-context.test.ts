import {
  buildAdditionalContext,
  buildPlayerEquipmentSection,
  buildPlayerFinancesSection,
  buildPlayerVisualProfileSection,
  buildActiveInvestigationSection,
} from '../build-context';
import type { GameContext } from '@/lib/prompt-section-parser';
import type { Character } from '@/lib/types';

describe('buildAdditionalContext', () => {
  it('should include directorEventSection if provided', () => {
    const dummyGameContext: GameContext = {
      mode: 'investigation',
      hasNPCs: false,
      recentSANLoss: false,
      findingDocument: false,
      inDarkness: false,
      nightTime: false,
    };

    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      directorEventSection: '## INSTRUKCJA REŻYSERSKA\nEvent here.',
    });

    expect(result).toContain('## INSTRUKCJA REŻYSERSKA\nEvent here.');
    expect(result).toContain('Time Prompt');
  });

  it('should not include directorEventSection if omitted', () => {
    const dummyGameContext: GameContext = {
      mode: 'investigation',
      hasNPCs: false,
      recentSANLoss: false,
      findingDocument: false,
      inDarkness: false,
      nightTime: false,
    };

    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
    });

    const hasDirectorEvent = result.some((section) =>
      section.includes('INSTRUKCJA REŻYSERSKA')
    );
    expect(hasDirectorEvent).toBe(false);
  });

  it('wstrzykuje sekcję ekwipunku i finansów jeśli zostały przekazane', () => {
    const dummyGameContext: GameContext = {
      mode: 'investigation',
      hasNPCs: false,
      recentSANLoss: false,
      findingDocument: false,
      inDarkness: false,
      nightTime: false,
    };

    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      playerEquipmentSection: '## EKWIPUNEK POSTACI\n- Latarka elektryczna',
      playerFinancesSection: '## MAJĄTEK I STATUS FINANSOWY\n- Zamożność: 50%',
    });

    expect(result).toContain('## EKWIPUNEK POSTACI\n- Latarka elektryczna');
    expect(result).toContain('## MAJĄTEK I STATUS FINANSOWY\n- Zamożność: 50%');
  });
});

describe('buildPlayerEquipmentSection', () => {
  it('zwraca pusty string gdy postać nie ma ekwipunku lub jest null', () => {
    expect(buildPlayerEquipmentSection(null)).toBe('');
    expect(buildPlayerEquipmentSection(undefined)).toBe('');
    expect(buildPlayerEquipmentSection({ equipment: [] } as unknown as Character)).toBe('');
  });

  it('filtruje broń i wstrzykuje tylko przedmioty użytkowe z opisami', () => {
    const character = {
      id: 'char_1',
      name: 'Tomasz Nowicki',
      equipment: [
        { id: 'eq_1', name: 'Rewolwer .38', category: 'weapon' },
        { id: 'eq_2', name: 'Latarka metalowa', description: 'Ciężka latarka z zapasową żarówką', category: 'tool' },
        { id: 'eq_3', name: 'Notes dziennikarski', category: 'tool' },
        { id: 'eq_4', name: 'Nóż myśliwski', category: 'weapon' },
      ],
    } as unknown as Character;

    const section = buildPlayerEquipmentSection(character);

    expect(section).toContain('## EKWIPUNEK POSTACI (posiadane przedmioty)');
    expect(section).toContain('**Latarka metalowa**: Ciężka latarka z zapasową żarówką');
    expect(section).toContain('**Notes dziennikarski**');
    expect(section).not.toContain('Rewolwer .38');
    expect(section).not.toContain('Nóż myśliwski');
    expect(section).toContain('Brak odpowiedniego narzędzia');
  });

  it('zwraca pusty string gdy postać ma wyłącznie broń', () => {
    const character = {
      id: 'char_2',
      equipment: [
        { id: 'eq_1', name: 'Strzelba dwururka', category: 'weapon' },
      ],
    } as unknown as Character;

    expect(buildPlayerEquipmentSection(character)).toBe('');
  });
});

describe('buildPlayerFinancesSection', () => {
  it('zwraca pusty string gdy postać jest null lub undefined', () => {
    expect(buildPlayerFinancesSection(null)).toBe('');
    expect(buildPlayerFinancesSection(undefined)).toBe('');
  });

  it('poprawnie wylicza progi CoC 7e dla przeciętnej postaci (Credit Rating 35%)', () => {
    const character = {
      id: 'char_average',
      skills: { 'Majętność': 35 },
    } as unknown as Character;

    const section = buildPlayerFinancesSection(character);

    expect(section).toContain('## MAJĄTEK I STATUS FINANSOWY POSTACI (CoC 7e RAW)');
    expect(section).toContain('Zamożność (Credit Rating): 35% [Poziom: Przeciętny]');
    expect(section).toContain('10 $ dziennie'); // Spending Level dla Average
    expect(section).toContain('Gotówka pod ręką (Cash): 70 $'); // 35 * 2
    expect(section).toContain('Majątek trwały (Assets): 1750 $'); // 35 * 50
    expect(section).toContain('[TEST: Majętność | zwykły | ... | powód]');
  });

  it('poprawnie wylicza postać zamożną (Credit Rating 60%)', () => {
    const character = {
      id: 'char_wealthy',
      skills: { 'Credit Rating': 60 },
    } as unknown as Character;

    const section = buildPlayerFinancesSection(character);

    expect(section).toContain('Zamożność (Credit Rating): 60% [Poziom: Zamożny]');
    expect(section).toContain('50 $ dziennie'); // Spending Level dla Wealthy
    expect(section).toContain('Gotówka pod ręką (Cash): 300 $'); // 60 * 5
    expect(section).toContain('Majątek trwały (Assets): 30000 $'); // 60 * 500
  });

  it('obsługuje postać bez grosza (Credit Rating 0%)', () => {
    const character = {
      id: 'char_poor',
      skills: {},
    } as unknown as Character;

    const section = buildPlayerFinancesSection(character);

    expect(section).toContain('Zamożność (Credit Rating): 0% [Poziom: Bez grosza]');
    expect(section).toContain('0.5 $ dziennie');
  });
});

describe('buildPlayerVisualProfileSection', () => {
  it('zwraca pusty string gdy postać jest null lub brak cech', () => {
    expect(buildPlayerVisualProfileSection(null)).toBe('');
    expect(buildPlayerVisualProfileSection(undefined)).toBe('');
    expect(buildPlayerVisualProfileSection({ name: 'Nijaki' } as unknown as Character)).toBe('');
  });

  it('wstrzykuje komplet cech fizycznych Badacza do promptu', () => {
    const character = {
      id: 'char_visual_1',
      name: 'Arthur Pendelton',
      gender: 'male',
      age: 42,
      occupation: 'Archeolog',
      appearance: 'Wysoki, szczupły mężczyzna o siwiejących skroniach i drucianych okularach. Nosi tweedową marynarkę.',
      traits: ['blizna na lewym policzku', 'zawsze w kaszkiecie'],
    } as unknown as Character;

    const section = buildPlayerVisualProfileSection(character);

    expect(section).toContain('## PROFIL WIZUALNY BADACZA (VISUAL DNA)');
    expect(section).toContain('Badacz gracza to **Arthur Pendelton**');
    expect(section).toContain('Płeć: mężczyzna');
    expect(section).toContain('Wiek: 42 lat');
    expect(section).toContain('Zawód / Profesja: Archeolog');
    expect(section).toContain('drucianych okularach');
    expect(section).toContain('blizna na lewym policzku');
    expect(section).toContain('ZAWSZE wplataj powyższe cechy fizyczne');
  });
});

describe('buildActiveInvestigationSection (Issue #68 - Memory Loop)', () => {
  it('zwraca pusty string gdy brak jakichkolwiek poszlak, wniosków i celów', () => {
    expect(buildActiveInvestigationSection({})).toBe('');
    expect(
      buildActiveInvestigationSection({
        character: {
          id: 'c1',
          name: 'Edward',
          investigatorDossier: { clues: [], npcs: [], locations: [], notes: [] },
        } as unknown as Character,
      })
    ).toBe('');
  });

  it('wstrzykuje do 5 kluczowych poszlak, wnioski i aktywny cel śledczy', () => {
    const character = {
      id: 'c1',
      name: 'Edward Carnby',
      investigatorDossier: {
        clues: [
          {
            id: 'clue_1',
            title: 'Dziennik Westona',
            description: 'Wskazuje na spotkanie w Magazynie nr 7.',
            category: 'document',
            status: 'confirmed',
            isKeyClue: true,
            timestamp: 1000,
          },
          {
            id: 'clue_2',
            title: 'Ślady stóp przy nabrzeżu',
            description: 'Nietypowy kształt płetwiastych stóp w błocie.',
            category: 'forensic',
            status: 'confirmed',
            isKeyClue: false,
            timestamp: 2000,
          },
        ],
        notes: [
          {
            id: 'n1',
            title: 'Hipoteza kultu',
            content: 'Rybacy z Innsmouth odprawiają rytuały podczas nowiu.',
          },
        ],
        npcs: [],
        locations: [],
      },
    } as unknown as Character;

    const section = buildActiveInvestigationSection({
      character,
      locale: 'pl',
    });

    expect(section).toContain('## AKTYWNE ŚLEDZTWO I WIEDZA BADACZA');
    expect(section).toContain('**Kluczowe potwierdzone poszlaki:**');
    expect(section).toContain('- **Dziennik Westona**: Wskazuje na spotkanie w Magazynie nr 7.');
    expect(section).toContain('- **Ślady stóp przy nabrzeżu**: Nietypowy kształt płetwiastych stóp w błocie.');
    expect(section).toContain('**Wnioski i hipotezy badacza:**');
    expect(section).toContain('- Rybacy z Innsmouth odprawiają rytuały podczas nowiu.');
  });

  it('generuje wersję angielską przy locale: "en"', () => {
    const character = {
      id: 'c2',
      name: 'Thomas Malone',
      investigatorDossier: {
        clues: [
          {
            id: 'clue_en',
            title: 'Bloody Key',
            description: 'Opens room 302 at the hotel.',
            category: 'forensic',
            status: 'confirmed',
            isKeyClue: true,
          },
        ],
        notes: [],
        npcs: [],
        locations: [],
      },
    } as unknown as Character;

    const section = buildActiveInvestigationSection({
      character,
      locale: 'en',
    });

    expect(section).toContain('## ACTIVE INVESTIGATION & INVESTIGATOR KNOWLEDGE');
    expect(section).toContain('**Key confirmed clues:**');
    expect(section).toContain('- **Bloody Key**: Opens room 302 at the hotel.');
  });

  it('wstrzykuje sekcję śledztwa w buildAdditionalContext gdy postać posiada poszlaki', () => {
    const dummyGameContext: GameContext = {
      mode: 'investigation',
      hasNPCs: false,
      recentSANLoss: false,
      findingDocument: false,
      inDarkness: false,
      nightTime: false,
    };

    const character = {
      id: 'c3',
      name: 'Harvey Walters',
      investigatorDossier: {
        clues: [
          {
            id: 'clue_3',
            title: 'Szyfr armitage',
            description: 'Trzyczęściowy kod do sejfu.',
            status: 'confirmed',
            isKeyClue: true,
          },
        ],
        notes: [],
        npcs: [],
        locations: [],
      },
    } as unknown as Character;

    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      characters: [character],
    });

    const hasInvestigationSection = result.some((s) =>
      s.includes('AKTYWNE ŚLEDZTWO I WIEDZA BADACZA')
    );
    expect(hasInvestigationSection).toBe(true);
  });
});
