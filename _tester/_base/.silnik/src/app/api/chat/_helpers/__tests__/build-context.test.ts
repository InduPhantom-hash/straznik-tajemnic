import {
  buildAdditionalContext,
  buildPlayerEquipmentSection,
  buildPlayerFinancesSection,
  buildPlayerVisualProfileSection,
  buildActiveInvestigationSection,
  injectDepthInjection,
  injectDepthInjectionInPlace,
  isDepthInjectionMessage,
  buildDynamicScenePacingInjection,
} from '../build-context';
import type { GameContext } from '@/lib/prompt-section-parser';
import type { Character } from '@/lib/types';

describe('buildAdditionalContext', () => {
  it.each(['pl', 'en'] as const)('drops source channels without dropping campaign memory (%s)', (locale) => {
    const opts = {
      timePromptSection: 'TIME', gmProtocol: 'PROTOCOL', resolvedCachedContent: null,
      gameContext: { mode: 'investigation' as const, hasNPCs: false, recentSANLoss: false, findingDocument: false, inDarkness: false, nightTime: false },
      gameContextPrompt: 'SYNTHETIC_DOCUMENT_CONTEXT', handoutsSection: 'SYNTHETIC_HANDOUT',
      truthAnchor: { culprit: 'SYNTHETIC_CULPRIT', immutableFacts: ['SYNTHETIC_FACT'] },
      ragSection: 'CANONICAL_CAMPAIGN_EVENT', locale,
    };
    const result = buildAdditionalContext(opts).join('\n');
    expect(result).not.toContain('SYNTHETIC_');
    expect(result).toContain('CANONICAL_CAMPAIGN_EVENT');
    expect(opts.gameContextPrompt).toBe('SYNTHETIC_DOCUMENT_CONTEXT');
    expect(opts.truthAnchor.culprit).toBe('SYNTHETIC_CULPRIT');
  });
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

  it('wstrzykuje sekcję Stowarzyszenia Badaczy z postaci lub jawnego parametru', () => {
    const dummyGameContext: GameContext = {
      mode: 'investigation',
      hasNPCs: false,
      recentSANLoss: false,
      findingDocument: false,
      inDarkness: false,
      nightTime: false,
    };

    // 1. W scenariuszu / oneshocie stowarzyszenie jest bezwzględnie zablokowane
    const resultFromScenario = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      adventureDocumentType: 'scenario',
      isCampaign: false,
      characters: [
        {
          id: 'char-1',
          name: 'Jan Kowalski',
          organizationId: 'the-cleaners',
        } as unknown as Character,
      ],
      locale: 'pl',
    });
    expect(
      resultFromScenario.some((s) =>
        s.includes('STOWARZYSZENIE BADACZY I MECENAT: CZYŚCICIELE')
      )
    ).toBe(false);

    // 2. W kampanii sekcja organizacji jest wstrzykiwana z jawnego parametru
    const resultFromOpt = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      isCampaign: true,
      organizationSection: 'CUSTOM_ORGANIZATION_SECTION',
    });
    expect(resultFromOpt).toContain('CUSTOM_ORGANIZATION_SECTION');

    const resultWithoutOpt = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      isCampaign: true,
    });
    expect(resultWithoutOpt).not.toContain('CUSTOM_ORGANIZATION_SECTION');
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
    expect(section).toContain('**Ujawnione poszlaki (uwzględnij status):**');
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
    expect(section).toContain('**Revealed clues (status matters):**');
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

  it('pomija poszlaki ze statusem superseded lub disproven (Arcanum: Fact Supersession)', () => {
    const character = {
      id: 'c4',
      name: 'Thomas Malone',
      investigatorDossier: {
        clues: [
          {
            id: 'clue_old',
            title: 'Fałszywe alibi lokaja',
            description: 'Lokaj twierdził, że był w spiżarni.',
            status: 'superseded',
            supersededBy: 'Przyznanie się lokaja',
          },
          {
            id: 'clue_new',
            title: 'Przyznanie się lokaja',
            description: 'Lokaj przyznał się do kradzieży klucza.',
            status: 'confirmed',
          },
          {
            id: 'clue_refuted',
            title: 'Ślady kół powozu',
            description: 'Ślady okazały się należeć do mleczarza.',
            status: 'disproven',
          },
        ],
        notes: [],
        npcs: [],
        locations: [],
      },
    } as unknown as Character;

    const section = buildActiveInvestigationSection({
      character,
      locale: 'pl',
    });

    expect(section).toContain('- **Przyznanie się lokaja**: Lokaj przyznał się do kradzieży klucza.');
    expect(section).not.toContain('Fałszywe alibi lokaja');
    expect(section).not.toContain('Ślady kół powozu');
  });

  it('wstrzykuje etykiety proweniencji [Zaobserwowane], [Zeznanie], [Dedukcja], [Handout] (PL/EN)', () => {
    const character = {
      id: 'c_prov',
      name: 'Detektyw Pierce',
      investigatorDossier: {
        clues: [
          {
            id: 'c1',
            title: 'Plamy krwi',
            description: 'Zaschnięta krew na podłodze.',
            provenance: 'observed',
            status: 'confirmed',
          },
          {
            id: 'c2',
            title: 'Relacja świadka',
            description: 'Krzyki o północy.',
            provenance: 'testimony',
            status: 'confirmed',
          },
          {
            id: 'c3',
            title: 'Analiza trucizny',
            description: 'Związki arszeniku w herbacie.',
            provenance: 'deduction',
            status: 'confirmed',
          },
          {
            id: 'c4',
            title: 'List z pogróżkami',
            description: 'Anonim wysłany z Bostonu.',
            provenance: 'handout',
            status: 'confirmed',
          },
        ],
        notes: [],
        npcs: [],
        locations: [],
      },
    } as unknown as Character;

    const sectionPl = buildActiveInvestigationSection({ character, locale: 'pl' });
    expect(sectionPl).toContain('- **Plamy krwi** [Zaobserwowane]: Zaschnięta krew na podłodze.');
    expect(sectionPl).toContain('- **Relacja świadka** [Zeznanie]: Krzyki o północy.');
    expect(sectionPl).toContain('- **Analiza trucizny** [Dedukcja]: Związki arszeniku w herbacie.');
    expect(sectionPl).toContain('- **List z pogróżkami** [Handout]: Anonim wysłany z Bostonu.');

    const sectionEn = buildActiveInvestigationSection({ character, locale: 'en' });
    expect(sectionEn).toContain('- **Plamy krwi** [Observed]: Zaschnięta krew na podłodze.');
    expect(sectionEn).toContain('- **Relacja świadka** [Testimony]: Krzyki o północy.');
    expect(sectionEn).toContain('- **Analiza trucizny** [Deduction]: Związki arszeniku w herbacie.');
    expect(sectionEn).toContain('- **List z pogróżkami** [Handout]: Anonim wysłany z Bostonu.');
  });

  it('stosuje Context Stuffing: nie obcina poszlak do 5 i nie skraca opisu do 100 znaków', () => {
    const longFact =
      'Dokładny raport z oględzin miejsca zbrodni zawierający szczegółowe pomiary odcisków butów w błocie, analizę trajektorii pocisku oraz wzmiankę o zapachu ozonu unoszącym się w powietrzu.';
    expect(longFact.length).toBeGreaterThan(150);

    const cluesList = Array.from({ length: 8 }, (_, i) => ({
      id: `clue_${i}`,
      title: `Poszlaka nr ${i + 1}`,
      description: `Fakt poszlaki nr ${i + 1}: ${longFact}`,
      status: 'confirmed',
      provenance: 'observed' as const,
      timestamp: 1000 + i,
    }));

    const character = {
      id: 'c_stuffing',
      name: 'Detektyw Pierce',
      investigatorDossier: {
        clues: cluesList,
        notes: [],
        npcs: [],
        locations: [],
      },
    } as unknown as Character;

    const section = buildActiveInvestigationSection({ character, locale: 'pl' });

    // Wszystkie 8 poszlak jest obecnych (brak limitu do 5 dla dossier)
    for (let i = 1; i <= 8; i++) {
      expect(section).toContain(`Poszlaka nr ${i}`);
    }

    // Pełny opis nie został ucięty wielokropkiem (...)
    expect(section).toContain(longFact);
    expect(section).not.toContain('...');
  });

  it('agreguje poszlaki od wszystkich postaci z drużyny w trybie Party / Hot Seat', () => {
    const char1 = {
      id: 'c_party_1',
      name: 'Edward',
      investigatorDossier: {
        clues: [
          {
            id: 'clue_edward',
            title: 'List Westona',
            description: 'List z ostrzeżeniem przed kultem.',
            status: 'confirmed',
            provenance: 'handout' as const,
          },
        ],
        notes: [],
        npcs: [],
        locations: [],
      },
    } as unknown as Character;

    const char2 = {
      id: 'c_party_2',
      name: 'Eleanor',
      investigatorDossier: {
        clues: [
          {
            id: 'clue_eleanor',
            title: 'Ślady w ogrodzie',
            description: 'Zdeptane grządki kwiatowe.',
            status: 'confirmed',
            provenance: 'observed' as const,
          },
        ],
        notes: [],
        npcs: [],
        locations: [],
      },
    } as unknown as Character;

    const section = buildActiveInvestigationSection({
      characters: [char1, char2],
      locale: 'pl',
    });

    expect(section).toContain('- **List Westona** [Handout]: List z ostrzeżeniem przed kultem.');
    expect(section).toContain('- **Ślady w ogrodzie** [Zaobserwowane]: Zdeptane grządki kwiatowe.');
  });

  it('automatycznie wnioskuje proweniencję, gdy poszlaka pochodzi z dziennika postaci (fallback B)', () => {
    const character = {
      id: 'c_no_prov',
      name: 'Thomas',
      journal: [
        {
          id: 'j_doc_1',
          type: 'clue',
          title: 'Wycinek z gazety',
          content: 'Artykuł o pożarze magazynu.',
        },
      ],
    } as unknown as Character;

    const section = buildActiveInvestigationSection({ character, locale: 'pl' });
    expect(section).toContain('- **Wycinek z gazety** [Handout]: Artykuł o pożarze magazynu.');
  });
});

describe('Arcanum RPGs Benchmark 2026: Scene Presence & Sealed Envelope', () => {
  const dummyGameContext: GameContext = {
    mode: 'investigation',
    hasNPCs: true,
    recentSANLoss: false,
    findingDocument: false,
    inDarkness: false,
    nightTime: false,
  };

  it('wstrzykuje sekcję twardej obecności w scenie [OBECNI_NPC] dopasowując lokację', () => {
    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      currentLocation: 'Gabinet profesora',
      npcs: [
        { name: 'Profesor Armitage', location: 'Gabinet profesora', status: 'alive' },
        { name: 'Kapitan Marsh', location: 'Doki', status: 'alive' },
      ],
      locale: 'pl',
    });

    const presenceSection = result.find((s) => s.includes('OBECNOŚĆ W SCENIE I HORYZONT INFORMACYJNY'));
    expect(presenceSection).toBeDefined();
    expect(presenceSection).toContain('[OBECNI_NPC: Profesor Armitage]');
    expect(presenceSection).not.toContain('Kapitan Marsh');
  });

  it('wstrzykuje sekcję [PRESENT_NPCS] w języku angielskim przy locale: en', () => {
    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      currentLocation: 'Library',
      presentNpcs: [{ name: 'Librarian' }],
      locale: 'en',
    });

    const presenceSection = result.find((s) => s.includes('SCENE PRESENCE & INFORMATION HORIZON'));
    expect(presenceSection).toBeDefined();
    expect(presenceSection).toContain('[PRESENT_NPCS: Librarian]');
    expect(presenceSection).toContain('STRICT RULE: ONLY NPCs explicitly listed');
  });

  it('nie przekazuje niezweryfikowanej koperty scenariusza do modelu', () => {
    const result = buildAdditionalContext({
      timePromptSection: 'Time Prompt',
      gmProtocol: 'Protocol',
      gameContext: dummyGameContext,
      resolvedCachedContent: null,
      truthAnchor: {
        culprit: 'Doktor Henry Armitage',
        motive: 'Pozyskanie księgi Necronomicon',
        murderWeapon: 'Arszenik w herbacie',
        keyAlibi: 'Lokaj Barnaba był w areszcie o 22:00',
        immutableFacts: ['Ślady błota pochodzą z cmentarza'],
      },
      locale: 'pl',
    });

    const truthSection = result.find((s) => s.includes('NIEZMIENNA PRAWDA ŚLEDZTWA (ZAMKNIĘTA KOPERTA)'));
    expect(truthSection).toBeUndefined();
    expect(result.join('\n')).not.toContain('Doktor Henry Armitage');
    expect(result.join('\n')).not.toContain('Ślady błota pochodzą z cmentarza');
  });

  describe('Concordia Pattern: MakeObservation & Epistemic Fog of War', () => {
    it('wstrzykuje dyrektywę Epistemicznej Mgły Wojny do additionalContext', () => {
      const result = buildAdditionalContext({
        timePromptSection: 'Time Prompt',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        playerCharacterName: 'Arthur',
        currentLocation: 'Gabinet',
        locale: 'pl',
      });

      const observationSection = result.find((s) =>
        s.includes('EPISTEMICZNA MGŁA WOJNY & MAKEOBSERVATION')
      );
      expect(observationSection).toBeDefined();
      expect(observationSection).toContain('ZAPORA EPISTEMICZNA');
      expect(observationSection).toContain('WARUNKOWE UJAWNIANIE POSZLAK');
    });

    it('obsługuje separację epistemiczną w Hot Seat z 2+ graczami', () => {
      const result = buildAdditionalContext({
        timePromptSection: 'Time Prompt',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        characters: [
          {
            id: 'c1',
            name: 'Arthur',
            san: 45,
            maxSan: 90,
            occupation: 'Detektyw',
          } as unknown as Character,
          {
            id: 'c2',
            name: 'Eleanor',
            san: 20,
            maxSan: 80,
            activeBoutOfMadness: { id: 'bout-1' },
            occupation: 'Dziennikarka',
          } as unknown as Character,
        ],
        hotSeatConfig: {
          enabled: true,
          players: [{ characterName: 'Arthur' }, { characterName: 'Eleanor' }],
        },
        locale: 'pl',
      });

      const observationSection = result.find((s) =>
        s.includes('SEPARACJA EPISTEMICZNA W TRYBIE DRUŻYNY / HOT SEAT')
      );
      expect(observationSection).toBeDefined();
      expect(observationSection).toContain('Arthur');
      expect(observationSection).toContain('Eleanor');
      expect(observationSection).toContain('@ImięPostaci:');
      expect(observationSection).toContain('AKTYWNE ZNIEKSZTAŁCENIA POCZYTALNOŚCI BOHATERÓW');
    });

    it('zachowuje stan postaci, ale pomija niezweryfikowaną kopertę dokumentu', () => {
      const result = buildAdditionalContext({
        timePromptSection: 'Time Prompt',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        characters: [
          {
            id: 'c1',
            name: 'Arthur',
            san: 60,
            investigatorDossier: {
              clues: [
                { id: 'clue-1', title: 'Zakrwawiony sztylet', discoveryStatus: 'unrevealed' },
              ],
            },
          } as unknown as Character,
          {
            id: 'c2',
            name: 'Eleanor',
            san: 50,
            investigatorBoard: {
              nodes: [
                { id: 'node-2', title: 'Szyfr kultu', discoveryStatus: 'unrevealed' },
              ],
            },
          } as unknown as Character,
        ],
        truthAnchor: {
          unrevealedClueTitles: ['Sekretny dziennik'],
        },
        locale: 'pl',
      });

      const observationSection = result.find((s) =>
        s.includes('EPISTEMICZNA MGŁA WOJNY & MAKEOBSERVATION')
      );
      expect(observationSection).toBeDefined();
      expect(observationSection).toContain('Zakrwawiony sztylet');
      expect(observationSection).toContain('Szyfr kultu');
      expect(observationSection).not.toContain('Sekretny dziennik');
    });
  });

  describe('Concordia Pattern: EventResolution & Intent Adjudication', () => {
    const dummyGameContext: GameContext = {
      mode: 'investigation',
      hasNPCs: false,
      recentSANLoss: false,
      findingDocument: false,
      inDarkness: false,
      nightTime: false,
    };

    it('wstrzykuje dyrektywę adjudykacji intencji gdy przekazano playerMessage', () => {
      const result = buildAdditionalContext({
        timePromptSection: 'Time Prompt',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        playerMessage: 'Wyważam drzwi do gabinetu',
        playerCharacterName: 'Edward',
        locale: 'pl',
      });

      const eventResolutionSection = result.find((s) =>
        s.includes('ADJUDYKACJA ZDARZEŃ I INTENCJI GRACZA (CONCORDIA EVENT RESOLUTION)')
      );
      expect(eventResolutionSection).toBeDefined();
      expect(eventResolutionSection).toContain('UGRUNTOWANY FAKT (REAL EVENT):');
      expect(eventResolutionSection).toContain('ŻELAZNY ZAKAZ AUTOSUKCESU');
    });

    it('obsługuje bezpośrednio przekazaną dyrektywę eventResolutionDirective', () => {
      const result = buildAdditionalContext({
        timePromptSection: 'Time Prompt',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        eventResolutionDirective: '## CUSTOM_EVENT_RESOLUTION_DIRECTIVE',
      });

      expect(result).toContain('## CUSTOM_EVENT_RESOLUTION_DIRECTIVE');
    });

    it('pomija adjudykację intencji gdy isGameStart jest true', () => {
      const result = buildAdditionalContext({
        timePromptSection: 'Time Prompt',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        isGameStart: true,
        playerMessage: 'Zaczynamy przygodę! Strzelam z karabinu.',
        playerCharacterName: 'Edward',
        locale: 'pl',
      });

      const eventResolutionSection = result.find((s) =>
        s.includes('ADJUDYKACJA ZDARZEŃ I INTENCJI GRACZA (CONCORDIA EVENT RESOLUTION)')
      );
      expect(eventResolutionSection).toBeUndefined();
    });

    it('wstrzykuje dyrektywę rozstrzygnięcia rzutu gdy playerMessage to wynik z Tacki', () => {
      const rollMessage = `[🎲 Test: Skradanie (50%)]
Wynik: 23 → ✅ Zwykły sukces
Progi: Zwykły ≤50 | Trudny ≤25 | Ekstremalny ≤10
(Rzut wirtualny)`;

      const result = buildAdditionalContext({
        timePromptSection: 'Time Prompt',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        playerMessage: rollMessage,
        playerCharacterName: 'Edward',
        locale: 'pl',
      });

      const eventResolutionSection = result.find((s) =>
        s.includes('UGRUNTOWANY FAKT (ROZSTRZYGNIĘCIE RZUTU):')
      );
      expect(eventResolutionSection).toBeDefined();
      expect(eventResolutionSection).toContain('INWARIANT DOMKNIĘCIA RZUTU (ZAKAZ ZAPĘTLANIA TESTÓW)');
      expect(eventResolutionSection).toContain('BEZWZGLĘDNY ZAKAZ ponownego emitowania tagu [TEST:]');
    });
  });

  describe('Author\'s Note & Depth Injection (SillyTavern Adaptation - Issue #349)', () => {
    const dummyGameContext: GameContext = {
      mode: 'combat',
      hasNPCs: true,
      recentSANLoss: false,
      findingDocument: false,
      inDarkness: false,
      nightTime: false,
    };

    it('injectDepthInjection wstrzykuje dyrektywę dokładnie 3 wiadomości przed końcem', () => {
      const messages = [
        { role: 'user', content: 'Wiadomość 1' },
        { role: 'assistant', content: 'Wiadomość 2' },
        { role: 'user', content: 'Wiadomość 3' },
        { role: 'assistant', content: 'Wiadomość 4' },
        { role: 'user', content: 'Wiadomość 5' },
        { role: 'assistant', content: 'Wiadomość 6' },
      ];

      const injection = '[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]\nAtmosfera: Strach\n[/PRZYPOMNIENIE DLA MG]';
      const result = injectDepthInjection(messages, injection, 3);

      expect(result).toHaveLength(7);
      // Indeks wstawienia: 6 - 3 = 3
      expect(result[3].content).toBe(injection);
      expect(result[3].role).toBe('system');
      // 3 wiadomości pozostają za wstrzyknięciem (indeksy 4, 5, 6)
      expect(result[4].content).toBe('Wiadomość 4');
      expect(result[5].content).toBe('Wiadomość 5');
      expect(result[6].content).toBe('Wiadomość 6');
      // Oryginalna tablica nie została zmodyfikowana
      expect(messages).toHaveLength(6);
    });

    it('injectDepthInjection wstawia na początek gdy historia jest krótsza niż depth', () => {
      const messages = [
        { role: 'user', content: 'Jedyna wiadomość' },
      ];
      const injection = '[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]';
      const result = injectDepthInjection(messages, injection, 3);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe(injection);
      expect(result[1].content).toBe('Jedyna wiadomość');
    });

    it('injectDepthInjectionInPlace modyfikuje tablicę w miejscu', () => {
      const messages = [
        { role: 'user', content: 'A' },
        { role: 'assistant', content: 'B' },
      ];
      injectDepthInjectionInPlace(messages, 'INJECTION', 2, 'user');
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('INJECTION');
      expect(messages[0].role).toBe('user');
    });

    it('buildAdditionalContext wstrzykuje dyrektywę do przekazanej tablicy messages (Depth Injection)', () => {
      const messages = [
        { role: 'user', content: 'Start' },
        { role: 'assistant', content: 'Odpowiedź MG' },
        { role: 'user', content: 'Akcja gracza' },
        { role: 'assistant', content: 'Dalsza narracja' },
      ];

      const result = buildAdditionalContext({
        timePromptSection: 'Time',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        messages,
        depthInjectionDepth: 2,
        locale: 'pl',
      });

      // messages powinno mieć wstrzykniętą notatkę na indeksie 4 - 2 = 2
      expect(messages).toHaveLength(5);
      expect(messages[2].content).toContain('[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]');
      expect(messages[2].content).toContain('BIEG 3 (PRZEŁAMANIE): 30-70 słów');
      expect(messages[3].content).toBe('Akcja gracza');
      expect(messages[4].content).toBe('Dalsza narracja');
    });

    it('buildAdditionalContext wstrzykuje dyrektywę do additionalContext gdy brak historii wiadomości', () => {
      const result = buildAdditionalContext({
        timePromptSection: 'Time',
        gmProtocol: 'Protocol',
        gameContext: dummyGameContext,
        resolvedCachedContent: null,
        locale: 'en',
      });

      const hasDepthInjection = result.some((s) =>
        s.includes('[GM DIRECTIVE: DYNAMIC SCENE & PACING INJECTION]') &&
        s.includes('GEAR 3 (HARD MOVE): 30-70 words') &&
        s.includes('CoC 7e RAW: Enforce horror, fail-forward')
      );
      expect(hasDepthInjection).toBe(true);
    });

    it('injectDepthInjection nie wstawia pustej wiadomości gdy injection jest pusty lub sam biały znak', () => {
      const messages = [
        { role: 'user', content: 'Wiadomość 1' },
        { role: 'assistant', content: 'Odpowiedź 1' },
      ];
      const res1 = injectDepthInjection(messages, '');
      expect(res1).toHaveLength(2);
      expect(res1).toEqual(messages);

      const res2 = injectDepthInjection(messages, '   ');
      expect(res2).toHaveLength(2);

      const msgsInPlace = [...messages];
      injectDepthInjectionInPlace(msgsInPlace, '');
      expect(msgsInPlace).toHaveLength(2);
    });

    it('injectDepthInjection zastępuje poprzednią dyrektywę z wcześniejszej tury zamiast kumulować duplikaty', () => {
      const messages = [
        { role: 'user', content: 'Tura 1' },
        { role: 'assistant', content: 'Narracja 1' },
        { role: 'user', content: 'Tura 2' },
        { role: 'assistant', content: 'Narracja 2' },
      ];

      // Tura 1: wstrzyknięcie pierwszej dyrektywy
      const turn1 = injectDepthInjection(messages, '[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]\nAtmosfera: Mrok 1\n[/PRZYPOMNIENIE DLA MG]', 2);
      expect(turn1).toHaveLength(5);
      expect(turn1.filter(isDepthInjectionMessage)).toHaveLength(1);

      // Nowa wypowiedź gracza w Turze 2
      turn1.push({ role: 'user', content: 'Tura 3' });
      expect(turn1).toHaveLength(6);

      // Tura 2: ponowne wstrzyknięcie nowej dyrektywy pacingu
      const turn2 = injectDepthInjection(turn1, '[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]\nAtmosfera: Walka 2\n[/PRZYPOMNIENIE DLA MG]', 2);
      // Nadal dokładnie JEDNA dyrektywa w całej historii, zaktualizowana i umieszczona na nowej głębokości
      expect(turn2.filter(isDepthInjectionMessage)).toHaveLength(1);
      const activeDirective = turn2.find(isDepthInjectionMessage);
      expect(activeDirective?.content).toContain('Walka 2');
      expect(activeDirective?.content).not.toContain('Mrok 1');
    });
  });
});
