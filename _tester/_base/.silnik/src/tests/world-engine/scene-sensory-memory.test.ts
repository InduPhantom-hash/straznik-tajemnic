import {
  extractMacroLocation,
  extractSubLocation,
  isSameMacroLocation,
  deriveSceneSensoryMemoryFromMessages,
  buildWorldEngineDirectives,
  dispatchWorldEngines,
  extractIntentFeatures,
} from '@/lib/world-engine';
import { buildLocationEraGuidanceSection } from '@/lib/location-era-validator';
import {
  buildNarrativeStyleInstructions,
  buildActiveTurnAntiHabituationSection,
} from '@/lib/prompts/narrative-style-instructions';
import type { NPC } from '@/lib/types';

describe('Scene Sensory Memory & Anti-Habituation (Issue #563)', () => {
  describe('Macro-Location & Zone Extraction', () => {
    it('extracts macro-location prefix before hyphens, colons, slashes, commas, and parentheses', () => {
      expect(extractMacroLocation('Szpital Miejski w Arkham - Sala Chorych')).toBe('Szpital Miejski w Arkham');
      expect(extractMacroLocation('Szpital Miejski w Arkham – Gabinet Ordynatora')).toBe('Szpital Miejski w Arkham');
      expect(extractMacroLocation('Uniwersytet Miskatonic: Biblioteka Główna')).toBe('Uniwersytet Miskatonic');
      expect(extractMacroLocation('Rezydencja Blackwoodów / Piwnica')).toBe('Rezydencja Blackwoodów');
      expect(extractMacroLocation('Doki w Arkham, Magazyn nr 4')).toBe('Doki w Arkham');
      expect(extractMacroLocation('Szpital św. Marii (Kostnica)')).toBe('Szpital św. Marii');
      expect(extractMacroLocation('Pojedyncza Lokacja')).toBe('Pojedyncza Lokacja');
      expect(extractMacroLocation('')).toBe('');
    });

    it('extracts sub-location room correctly', () => {
      expect(extractSubLocation('Szpital Miejski w Arkham - Sala Chorych')).toBe('Sala Chorych');
      expect(extractSubLocation('Uniwersytet Miskatonic: Czytelnia')).toBe('Czytelnia');
      expect(extractSubLocation('Szpital św. Marii (Kostnica)')).toBe('Kostnica');
      expect(extractSubLocation('Kostnica Szpitala Miejskiego')).toBe('Kostnica');
      expect(extractSubLocation('Samodzielny Budynek')).toBeUndefined();
      expect(extractSubLocation('')).toBeUndefined();
    });

    it('identifies whether two locations share the same macro-location zone (including non-hyphenated inflected names)', () => {
      expect(
        isSameMacroLocation(
          'Szpital Miejski w Arkham - Sala Chorych',
          'Szpital Miejski w Arkham - Kostnica'
        )
      ).toBe(true);

      expect(
        isSameMacroLocation(
          'Szpital Miejski',
          'Kostnica Szpitala Miejskiego'
        )
      ).toBe(true);

      expect(
        isSameMacroLocation(
          'Szpital św. Marii',
          'Korytarz w Szpitalu św. Marii'
        )
      ).toBe(true);

      expect(
        isSameMacroLocation(
          'Rezydencja Blackwoodów',
          'Piwnica Rezydencji Blackwoodów'
        )
      ).toBe(true);

      expect(
        isSameMacroLocation(
          'Szpital Miejski w Arkham - Sala Chorych',
          'Posterunek Policji w Arkham - Cela'
        )
      ).toBe(false);

      expect(isSameMacroLocation('', 'Szpital')).toBe(false);
    });
  });

  describe('deriveSceneSensoryMemoryFromMessages (F5 Reload, useGameStart & Multi-Room Transitions)', () => {
    it('returns turn 0 and empty visitedMacroLocations for brand-new session', () => {
      const derived = deriveSceneSensoryMemoryFromMessages([], 'Szpital Miejski - Recepcja');
      expect(derived).toEqual({
        currentLocation: 'Szpital Miejski - Recepcja',
        turnsInCurrentLocation: 0,
        visitedMacroLocations: [],
      });
    });

    it('hydrates turnsInCurrentLocation=1 and visitedMacroLocations after opening assistant turn (useGameStart or F5 reload)', () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Wchodzisz do budynku. [LOKACJA: Szpital Miejski w Arkham - Recepcja: Zapach karbolu]',
        },
      ];
      const derived = deriveSceneSensoryMemoryFromMessages(messages, 'Szpital Miejski w Arkham - Recepcja');
      expect(derived.currentLocation).toBe('Szpital Miejski w Arkham - Recepcja');
      expect(derived.turnsInCurrentLocation).toBe(1);
      expect(derived.visitedMacroLocations).toEqual(['Szpital Miejski w Arkham']);
    });

    it('resets turnsInCurrentLocation to 0 on room change within the same facility while keeping macro-location visited', () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Stoisz w recepcji. [LOKACJA: Szpital Miejski - Recepcja: Karbol]',
        },
        {
          role: 'user',
          content: 'Schodzę do kostnicy',
        },
        {
          role: 'assistant',
          content: 'Otwierasz drzwi kostnicy. [LOKACJA: Szpital Miejski - Kostnica: Chłód]',
        },
      ];
      const derived = deriveSceneSensoryMemoryFromMessages(messages);
      expect(derived.currentLocation).toBe('Szpital Miejski - Kostnica');
      expect(derived.turnsInCurrentLocation).toBe(0);
      expect(derived.visitedMacroLocations).toEqual(['Szpital Miejski']);
    });

    it('does not prematurely mark a brand-new facility as visited before the first turn inside it completes', () => {
      const messages = [
        {
          role: 'assistant',
          content: 'Stoisz w recepcji. [LOKACJA: Szpital Miejski - Recepcja: Karbol]',
        },
        {
          role: 'user',
          content: 'Jadę do biblioteki uniwersyteckiej',
        },
        {
          role: 'assistant',
          content: 'Docierasz przed gmach uczelni. [LOKACJA: Uniwersytet Miskatonic - Biblioteka: Cisza]',
        },
      ];
      const derived = deriveSceneSensoryMemoryFromMessages(messages);
      expect(derived.currentLocation).toBe('Uniwersytet Miskatonic - Biblioteka');
      expect(derived.turnsInCurrentLocation).toBe(0);
      expect(derived.visitedMacroLocations).toEqual(['Szpital Miejski']);

      const directives = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: derived.currentLocation,
        turnsInCurrentLocation: derived.turnsInCurrentLocation,
        visitedMacroLocations: derived.visitedMacroLocations,
      });
      expect(directives).toContain('[PAMIĘĆ_STREFY: Wejście do nowego obiektu "Uniwersytet Miskatonic"');
    });
  });

  describe('Sensory Anti-Habituation Directive (PO Decision 1)', () => {
    it('turn 0 allows standard initial sensory framing', () => {
      const outputPl = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Szpital Miejski w Arkham - Sala Chorych',
        turnsInCurrentLocation: 0,
      });

      expect(outputPl).toContain('[SENSORY_DYREKTYWA:');
      expect(outputPl).not.toContain('ANTY-HABITUACJA');

      const outputEn = buildWorldEngineDirectives({
        locale: 'en',
        currentLocation: 'Arkham General Hospital - Ward',
        turnsInCurrentLocation: 0,
      });

      expect(outputEn).toContain('[SENSORY_DIRECTIVE:');
      expect(outputEn).not.toContain('ANTI-HABITUATION');
    });

    it('turn > 0 activates strict Anti-Habituation directive with dynamic senses rotation (tactile+visual / dotyk+wzrok) in Polish and English', () => {
      const outputPl = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Szpital Miejski w Arkham - Sala Chorych',
        turnsInCurrentLocation: 1,
      });

      expect(outputPl).toContain('ANTY-HABITUACJA');
      expect(outputPl).toContain('dotyk+wzrok');
      expect(outputPl).toContain('tactile+visual');
      expect(outputPl).toMatch(/zakaz powtarzania stałego tła|zakaz powtarzania tła/i);
      expect(outputPl).toMatch(/karbol|mróz|cisza|piece kaflowe|stałych cech/i);

      const outputEn = buildWorldEngineDirectives({
        locale: 'en',
        currentLocation: 'Arkham General Hospital - Ward',
        turnsInCurrentLocation: 2,
      });

      expect(outputEn).toContain('ANTI-HABITUATION');
      expect(outputEn).toContain('tactile+visual');
      expect(outputEn).toMatch(/forbid repeating static|sensory habituation/i);
    });

    it('suppresses static void variable (dead silence) on turns > 0 to prevent repetition', () => {
      const turn0Output = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Opuszczony szpital na wzgórzu',
        turnsInCurrentLocation: 0,
      });
      expect(turn0Output).toContain('Złowroga cisza');

      const turn1Output = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Opuszczony szpital na wzgórzu',
        turnsInCurrentLocation: 1,
      });
      // In turn 1+, static silence void must be suppressed
      expect(turn1Output).not.toContain('Void: Złowroga cisza lub brak zwyczajnego ludzkiego gwaru');
    });
  });

  describe('Two-Level Zone / Macro-Location Memory (PO Decision 2)', () => {
    it('first entry to macro-location marks entrance to new facility', () => {
      const output = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Szpital Miejski w Arkham - Recepcja',
        turnsInCurrentLocation: 0,
        visitedMacroLocations: [],
      });

      expect(output).toContain('PAMIĘĆ_STREFY');
      expect(output).toMatch(/Nowy obiekt|Wejście do nowego obiektu/i);
      expect(output).toContain('Szpital Miejski w Arkham');
    });

    it('moving to another room in same facility warns against repeating building-wide traits and shifts primary sense away from olfactory', () => {
      const outputPl = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Szpital Miejski w Arkham - Piwnica',
        turnsInCurrentLocation: 0,
        visitedMacroLocations: ['Szpital Miejski w Arkham'],
      });

      expect(outputPl).toContain('PAMIĘĆ_STREFY');
      expect(outputPl).toMatch(/Znana strefa|kolejny pokój/i);
      expect(outputPl).toMatch(/nie powtarzaj zapachu|cech całego budynku/i);
      expect(outputPl).toContain('tactile+auditory');
      expect(outputPl).not.toContain('Void: Złowroga cisza');

      const outputNonHyphenPl = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Kostnica Szpitala Miejskiego',
        turnsInCurrentLocation: 0,
        visitedMacroLocations: ['Szpital Miejski'],
      });
      expect(outputNonHyphenPl).toMatch(/Znana strefa/i);

      const outputEn = buildWorldEngineDirectives({
        locale: 'en',
        currentLocation: 'Arkham General Hospital - Morgue',
        turnsInCurrentLocation: 0,
        visitedMacroLocations: ['Arkham General Hospital'],
      });

      expect(outputEn).toContain('ZONE_MEMORY');
      expect(outputEn).toMatch(/Known zone|already introduced/i);
      expect(outputEn).toContain('tactile+auditory');
    });
  });

  describe('Investigation-First / Fiction-First Directive (PO Decision 3)', () => {
    it('emits fiction-first directive with no filler on turnsInCurrentLocation > 0', () => {
      const outputPl = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Szpital Miejski w Arkham - Sala Chorych',
        turnsInCurrentLocation: 1,
      });

      expect(outputPl).toMatch(/AKCJA_ŚLEDCZA|FICTION-FIRST/);
      expect(outputPl).toMatch(/100%|posuwaniu śledztwa|badanych detalach/i);

      const outputEn = buildWorldEngineDirectives({
        locale: 'en',
        currentLocation: 'Arkham General Hospital - Ward',
        turnsInCurrentLocation: 1,
      });

      expect(outputEn).toMatch(/INVESTIGATION_DIRECTIVE|FICTION-FIRST/);
      expect(outputEn).toMatch(/100%|progressing the investigation|examined details/i);
    });
  });

  describe('Dispatcher sensory intent score dampening on turns > 0', () => {
    it('dampens baseline sensory score to 0.1 when turnsInCurrentLocation > 0 and keeps 0.25 on turn 0 dialogue (0.65 default)', () => {
      const featuresTurn0 = extractIntentFeatures({
        playerMessage: 'Sprawdzam papiery na biurku',
        currentLocation: 'Gabinet',
        turnsInCurrentLocation: 0,
      });

      const featuresTurn0Dialogue = extractIntentFeatures({
        playerMessage: 'Dzień dobry panie doktorze, co słychać?',
        currentLocation: 'Gabinet',
        turnsInCurrentLocation: 0,
      });

      const featuresTurn1 = extractIntentFeatures({
        playerMessage: 'Sprawdzam papiery na biurku',
        currentLocation: 'Gabinet',
        turnsInCurrentLocation: 1,
      });

      expect(featuresTurn0.sensory).toBe(0.65);
      expect(featuresTurn0Dialogue.sensory).toBe(0.25);
      expect(featuresTurn1.sensory).toBe(0.1);
      expect(featuresTurn1.sensory).toBeLessThan(featuresTurn0.sensory);
    });

    it('boosts sensory score when player explicitly declares sensory inspection even on turn > 0', () => {
      const featuresExplicit = extractIntentFeatures({
        playerMessage: 'Wącham płyn w fiolce i wsłuchuję się w szmer za drzwiami',
        currentLocation: 'Gabinet',
        turnsInCurrentLocation: 2,
      });

      expect(featuresExplicit.sensory).toBeGreaterThanOrEqual(0.7);
    });

    it('propagates turnsInCurrentLocation through dispatchWorldEngines', () => {
      const decision = dispatchWorldEngines({
        playerMessage: 'Badam szufladę biurka',
        currentLocation: 'Gabinet',
        turnsInCurrentLocation: 1,
      });
      expect(decision.activeEngineIds).toContain('clue');
    });
  });

  describe('Location Era Validator Anti-Habituation Integration', () => {
    it('adapts material era guidance on turnsInCurrentLocation > 0 and known macro-location to prohibit static re-exposition', () => {
      const guidanceTurn0 = buildLocationEraGuidanceSection('1920s', 'Szpital Miejski', {
        turnsInCurrentLocation: 0,
      });
      expect(guidanceTurn0).toContain('MATERIALNE USER STORY');
      expect(guidanceTurn0).not.toContain('TURA KOLEJNA W LOKACJI');

      const guidanceNewRoomKnownBuilding = buildLocationEraGuidanceSection('1920s', 'Szpital Miejski - Kostnica', {
        turnsInCurrentLocation: 0,
        macroLocationContext: {
          macroLocation: 'Szpital Miejski',
          isNewMacro: false,
        },
      });
      expect(guidanceNewRoomKnownBuilding).toContain('ANTY-HABITUACJA STREFOWA');
      expect(guidanceNewRoomKnownBuilding).toContain('PAMIĘĆ STREFOWA (STREFA: "Szpital Miejski")');

      const guidanceTurn1 = buildLocationEraGuidanceSection('1920s', 'Szpital Miejski - Kostnica', {
        turnsInCurrentLocation: 1,
        macroLocationContext: {
          macroLocation: 'Szpital Miejski',
          isNewMacro: false,
        },
      });
      expect(guidanceTurn1).toMatch(/ANTY-HABITUACJA|TURA KOLEJNA/i);
      expect(guidanceTurn1).toMatch(/zakaz ponownego|dynamiczne zmiany/i);
      expect(guidanceTurn1).toContain('PAMIĘĆ STREFOWA (STREFA: "Szpital Miejski")');
      expect(guidanceTurn1).toContain('NASTAWIENIE NA AKCJĘ ŚLEDCZĄ');
    });
  });

  describe('Narrative Style Instructions Anti-Habituation Integration', () => {
    it('always includes the baseline Anti-Habituation (Single Anchor) rule and adds active subsequent-turn enforcement when turnsInCurrentLocation > 0', () => {
      const instructionsDefault = buildNarrativeStyleInstructions(
        { responseLength: 'medium', detailLevel: 'standard' },
        { creativity: 'balanced', contextMemory: 10 },
        'pl'
      );
      expect(instructionsDefault).toContain('Anti-Habituation (Single Anchor');
      expect(instructionsDefault).not.toContain('AKTYWNA TURA KOLEJNA W LOKACJI');

      const instructionsTurn0 = buildNarrativeStyleInstructions(
        { responseLength: 'medium', detailLevel: 'standard' },
        { creativity: 'balanced', contextMemory: 10 },
        'pl',
        { turnsInCurrentLocation: 0 }
      );
      expect(instructionsTurn0).toContain('Anti-Habituation (Single Anchor');
      expect(instructionsTurn0).not.toContain('AKTYWNA TURA KOLEJNA W LOKACJI');

      const instructionsPl = buildNarrativeStyleInstructions(
        { responseLength: 'medium', detailLevel: 'standard' },
        { creativity: 'balanced', contextMemory: 10 },
        'pl',
        { turnsInCurrentLocation: 1 }
      );
      expect(instructionsPl).toContain('Anti-Habituation (Single Anchor');
      expect(instructionsPl).toContain('AKTYWNA TURA KOLEJNA W LOKACJI');
      expect(instructionsPl).toMatch(/ANTI-HABITUATION|habituacja|likwidacja pętli/i);

      const instructionsEn = buildNarrativeStyleInstructions(
        { responseLength: 'medium', detailLevel: 'standard' },
        { creativity: 'balanced', contextMemory: 10 },
        'en',
        { turnsInCurrentLocation: 1 }
      );
      expect(instructionsEn).toContain('Anti-Habituation (Single Anchor');
      expect(instructionsEn).toContain('ACTIVE SUBSEQUENT TURN IN LOCATION');
      expect(instructionsEn).toMatch(/ANTI-HABITUATION|sensory memory/i);
    });

    it('builds concise active-turn anti-habituation section without duplicating style/length/creativity instructions', () => {
      expect(buildActiveTurnAntiHabituationSection(0, 'pl')).toBe('');

      const activeSectionPl = buildActiveTurnAntiHabituationSection(1, 'pl');
      expect(activeSectionPl).toContain('AKTYWNA TURA KOLEJNA W LOKACJI');
      expect(activeSectionPl).toContain('Anti-Habituation (Single Anchor) AKTYWNE');
      expect(activeSectionPl).not.toContain('KALIBRACJA STYLU I DŁUGOŚCI NARRACJI MG');
      expect(activeSectionPl).not.toContain('Długość odpowiedzi');

      const activeSectionEn = buildActiveTurnAntiHabituationSection(2, 'en');
      expect(activeSectionEn).toContain('ACTIVE SUBSEQUENT TURN IN LOCATION (Turn #3');
      expect(activeSectionEn).toContain('Anti-Habituation (Single Anchor) ACTIVE');
      expect(activeSectionEn).not.toContain('KEEPER NARRATION STYLE & PACING CALIBRATION');
    });
  });

  describe('Edge Case: Room transition in same facility combined with explicit sensory verb', () => {
    it('handles turnsInCurrentLocation === 0, isNewMacroLocation === false, and explicit sensory verb cleanly', () => {
      const playerMessage = 'Wącham dziwny osad na stole sekcyjnym i nasłuchuję szelestu za drzwiami';
      const currentLocation = 'Szpital Miejski w Arkham - Kostnica';
      const visitedMacroLocations = ['Szpital Miejski w Arkham'];

      const features = extractIntentFeatures({
        playerMessage,
        currentLocation,
        turnsInCurrentLocation: 0,
        macroLocation: 'Szpital Miejski w Arkham',
        isNewMacroLocation: false,
      });

      expect(features.sensory).toBe(1);

      const directives = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation,
        playerMessage,
        turnsInCurrentLocation: 0,
        visitedMacroLocations,
        isNewMacroLocation: false,
      });

      expect(directives).toContain('[SENSORY_DYREKTYWA: Oprzyj kadr na zmysłach (tactile+auditory)');
      expect(directives).toContain('Unikalne wyposażenie, przedmioty i detale właściwe wyłącznie dla tego pomieszczenia: Szpital Miejski w Arkham - Kostnica');
      expect(directives).toContain('[PAMIĘĆ_STREFY: Znana strefa "Szpital Miejski w Arkham"');
      expect(directives).not.toContain('ANTY-HABITUACJA (Tura w tej samej lokacji');
    });
  });

  describe('Lovecraft Sensory Corpus & Cadence Gear (Issue #641)', () => {
    it('applies Cadence Gear 1 (concise 1-2 sentences) during dialogue scenes', () => {
      const directives = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Komisariat Policji w Arkham',
        playerMessage: 'Inspektorze, co stało się z aktami Corbitta?',
        npcs: [{ id: 'npc-1', name: 'Inspektor Hansen' }] as unknown as NPC[],
        turnsInCurrentLocation: 1,
      });

      expect(directives).toContain('Bieg 1 (Dialog/Szybka akcja)');
      expect(directives).toContain('Zwięzłe 1-2 zdania');
      expect(directives).toContain('pomiń ciężkie opisy zmysłowe otoczenia');
    });

    it('injects Lovecraftian motifs during exploration turns in thematic locations', () => {
      const directives = buildWorldEngineDirectives({
        locale: 'pl',
        currentLocation: 'Doki w Innsmouth',
        playerMessage: 'Rozglądam się po nabrzeżu',
        turnsInCurrentLocation: 0,
        isNewMacroLocation: true,
      });

      expect(directives).toContain('fetor');
      expect(directives).toContain('morszczyn');
    });
  });
});

