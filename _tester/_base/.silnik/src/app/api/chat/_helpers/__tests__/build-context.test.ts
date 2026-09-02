import {
  buildAdditionalContext,
  buildPlayerEquipmentSection,
  buildPlayerFinancesSection,
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
