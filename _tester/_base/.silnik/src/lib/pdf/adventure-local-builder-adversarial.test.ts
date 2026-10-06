/**
 * Adversarial Security & Anti-Leakage Test Suite for adventure-local-builder.ts
 * Empirical Challenger M2-2 Gen2
 */
import {
  cleanRawHandoutText,
  isKeeperOrTacticalHandout,
  evaluateGmSafety,
  extractHandoutsFromScenarioText,
} from './adventure-local-builder';
import { buildHandoutsContext } from '@/app/api/chat/_helpers/build-handouts-context';

describe('Adversarial Security & Anti-Leakage Suite (Challenger M2-2 Gen2)', () => {
  describe('Test Group 1: Stripped Keywords & Title Leakage Vulnerabilities', () => {
    it('ATTACK-1.1: Keeper keyword in header with innocuous label must NOT leak to player', () => {
      const scenarioText = `
ROZDZIAŁ 1
TYLKO DLA STRAŻNIKA: Prawdziwy testament Corbitta
W rzeczywistości Walter Corbitt nie zmarł z przyczyn naturalnych.
Testament wskazuje na piwnicę jako miejsce ukrycia zwłok.
      `;

      const handouts = extractHandoutsFromScenarioText(scenarioText, 'Test Scenariusza', 'pl');
      expect(handouts.length).toBeGreaterThan(0);
      const h = handouts[0];

      // Security check: Must be keeper-only!
      expect(h.keeperOnly).toBe(true);
      expect(h.isPlayerFacing).toBe(false);
    });

    it('ATTACK-1.2: MAPA DLA STRAŻNIKA with innocent location label must NOT leak to player', () => {
      const scenarioText = `
ROZDZIAŁ 1
MAPA DLA STRAŻNIKA: Podziemia klasztoru
Korytarze są ciemne i wilgotne.
      `;

      const handouts = extractHandoutsFromScenarioText(scenarioText, 'Test Scenariusza', 'pl');
      expect(handouts.length).toBeGreaterThan(0);
      const h = handouts[0];

      expect(h.keeperOnly).toBe(true);
      expect(h.isPlayerFacing).toBe(false);
    });

    it('ATTACK-1.3: PLAN DLA STRAŻNIKA with innocent label must NOT leak to player', () => {
      const scenarioText = `
ROZDZIAŁ 1
PLAN DLA STRAŻNIKA: Ukryte przejścia rezydencji
Za biblioteczką znajduje się zapadnia prowadząca do krypty.
      `;

      const handouts = extractHandoutsFromScenarioText(scenarioText, 'Test Scenariusza', 'pl');
      expect(handouts.length).toBeGreaterThan(0);
      const h = handouts[0];

      expect(h.keeperOnly).toBe(true);
      expect(h.isPlayerFacing).toBe(false);
    });

    it('ATTACK-1.4: English KEEPER ONLY header with innocent label must NOT leak to player', () => {
      const scenarioText = `
CHAPTER 1
KEEPER ONLY: The Cultist Roster
List of undercover cultists in town: Mayor, Sheriff, Coroner.
      `;

      const handouts = extractHandoutsFromScenarioText(scenarioText, 'Test Scenario', 'en');
      expect(handouts.length).toBeGreaterThan(0);
      const h = handouts[0];

      expect(h.keeperOnly).toBe(true);
      expect(h.isPlayerFacing).toBe(false);
    });

    it('ATTACK-1.5: English GM ONLY header with innocent label must NOT leak to player', () => {
      const scenarioText = `
CHAPTER 1
GM ONLY: Secret Underground Entrances
The drainage tunnel behind the slaughterhouse leads to the shrine.
      `;

      const handouts = extractHandoutsFromScenarioText(scenarioText, 'Test Scenario', 'en');
      expect(handouts.length).toBeGreaterThan(0);
      const h = handouts[0];

      expect(h.keeperOnly).toBe(true);
      expect(h.isPlayerFacing).toBe(false);
    });

    it('ATTACK-1.6: Header without label defaulting to Pomoc #N must NOT leak Keeper secrets', () => {
      const scenarioText = `
ROZDZIAŁ 1
TYLKO DLA STRAŻNIKA 1
To jest ściśle tajna notatka z rozwiązaniem zagadki.
      `;

      const handouts = extractHandoutsFromScenarioText(scenarioText, 'Test Scenariusza', 'pl');
      expect(handouts.length).toBeGreaterThan(0);
      const h = handouts[0];

      expect(h.keeperOnly).toBe(true);
      expect(h.isPlayerFacing).toBe(false);
    });
  });

  describe('Test Group 2: Tactical Floorplan Bypass Attacks (False Negatives)', () => {
    const tacticalTitles = [
      'Plan sanatorium psychiatrycznego',
      'Plan szpitala św. Marii',
      'Plan posesji Blackwoodów',
      'Plan kopalni srebra',
      'Plan fabryki chemicznej',
      'Plan prosektorium miejskiego',
      'Plan muzeum Miskatonic',
      'Plan teatru miejskiego',
      'Plan willi Corbitta',
      'Plan zamku Czocha',
      'Plan dworu w dolinie',
      'Plan posterunku policji',
      'Plan kostnicy miejskiej',
      'Plan laboratorium profesora',
      'Plan statku pasażerskiego',
      'Plan latarni morskiej na cyplu',
      'Plan schronu przeciwlotniczego',
      'Rzut prosektorium',
      'Rzut szpitala',
      'Rzut willi',
      'Rzut posterunku',
      'Blueprint of the Sanitarium',
      'Asylum Layout and Security Checkpoints',
      'Battle map of the Cult Temple',
      'Site plan of the Estate Grounds',
    ];

    tacticalTitles.forEach((t) => {
      it(`evaluates tactical plan "${t}" as keeperOnly: true`, () => {
        const safety = evaluateGmSafety(t);
        expect(safety.keeperOnly).toBe(true);
        expect(safety.isPlayerFacing).toBe(false);
      });
    });
  });

  describe('Test Group 3: Hidden Keeper Secrets Past 1000 Characters Limit', () => {
    it('ATTACK-3.1: Catches Keeper secrets located at character 1200 in a long text', () => {
      const innocentPadding = 'To jest niewinny tekst policyjnego protokołu przesłuchania świadka. '.repeat(20);
      const secretEnding = '\nTYLKO DLA STRAŻNIKA: Świadek kłamie, mordercą jest sam komisarz.';
      const longText = innocentPadding + secretEnding;

      expect(longText.length).toBeGreaterThan(1200);

      const safety = evaluateGmSafety('Zeznanie świadka', longText);
      expect(safety.keeperOnly).toBe(true);
      expect(safety.isPlayerFacing).toBe(false);
    });

    it('ATTACK-3.2: Catches tactical floorplan annotations at character 1500 in a long text', () => {
      const innocentPadding = 'Opis architektoniczny i historia posiadłości od roku 1850. '.repeat(25);
      const tacticalEnding = '\nRozmieszczenie wartowników: dwóch przy głównej bramie, jeden na wieży.';
      const longText = innocentPadding + tacticalEnding;

      expect(longText.length).toBeGreaterThan(1500);

      const safety = evaluateGmSafety('Opis posiadłości', longText);
      expect(safety.keeperOnly).toBe(true);
      expect(safety.isPlayerFacing).toBe(false);
    });
  });

  describe('Test Group 4: Diegetic Guards and False Alarm Resistance', () => {
    const safeDiegeticTitles = [
      'DODATEK 1: Zapiski strażnika latarni morskiej',
      'DODATEK 2: Raport strażnika więziennego',
      'DODATEK 3: Notatnik strażnika nocnego',
      'DODATEK 4: Zeznanie strażnika miejskiego',
      'DODATEK 5: Oświadczenie strażnika muzealnego',
      'DODATEK 6: Dziennik strażnika bankowego',
      'DODATEK 7: Klucze strażnika bramy',
      'DODATEK 8: Zapiski strażnika kolejowego',
      'DODATEK 9: Raport strażnika granicznego',
      'DODATEK 10: Zapiski strażnika leśnego',
      'DODATEK 11: Dziennik strażnika cmentarza',
      'DODATEK 12: Relacja strażnika portowego',
      'DODATEK 13: Zeznania strażnika skarbca',
      'DODATEK 14: Notatki strażnika grobowca',
      'DODATEK 15: Wyznanie strażnika świątynnego',
    ];

    safeDiegeticTitles.forEach((t) => {
      it(`does NOT falsely flag diegetic guard "${t}" as keeper-only`, () => {
        const safety = evaluateGmSafety(t, 'Noc minęła spokojnie, słyszałem tylko wiatr.');
        expect(safety.keeperOnly).toBe(false);
        expect(safety.isPlayerFacing).toBe(true);
      });
    });
  });

  describe('Test Group 5: Precedence Conflict & Spoofed Player Headers', () => {
    it('ATTACK-5.1: Floorplan spoofed with POMOC DLA GRACZY header must remain keeperOnly if tactical', () => {
      const spoofedTitle = 'POMOC DLA GRACZY #5 - Plan kondygnacji rezydencji';
      const safety = evaluateGmSafety(spoofedTitle);
      expect(safety.keeperOnly).toBe(true);
      expect(safety.isPlayerFacing).toBe(false);
    });

    it('ATTACK-5.2: English Player Handout header spoofing a floor plan', () => {
      const spoofedTitle = 'Player Handout 4: Floor plan of the asylum';
      const safety = evaluateGmSafety(spoofedTitle);
      expect(safety.keeperOnly).toBe(true);
      expect(safety.isPlayerFacing).toBe(false);
    });

    it('ATTACK-5.3: Legitimate player hand-drawn map remains player facing', () => {
      const handDrawnMap = 'POMOC DLA GRACZY #1 - Odręczny szkic drogi do młyna';
      const safety = evaluateGmSafety(handDrawnMap);
      expect(safety.keeperOnly).toBe(false);
      expect(safety.isPlayerFacing).toBe(true);
    });
  });

  describe('Test Group 6: Prompt Integration & Containment Verification', () => {
    it('INTEGRATION: Tactical floorplans and Keeper secrets NEVER generate [HANDOUT:<slug>] in prompt', () => {
      const scenarioText = `
ROZDZIAŁ 1
POMOC DLA GRACZY #1 - List doktora Armitagea
Nie przyjeżdżaj do Dunwich.

MAPA DLA STRAŻNIKA: Podziemia Dunwich
Sekretne przejście pod ołtarzem.

DODATEK 3: Plan kondygnacji domu Whateleyów
Parter i strych z potworem.
      `;

      const handouts = extractHandoutsFromScenarioText(scenarioText, 'Zgroza w Dunwich', 'pl');
      expect(handouts.length).toBe(3);

      const promptContext = buildHandoutsContext(handouts, null, {
        activeChapterId: 'rozdzial-1',
      });

      // Legitimate player handout MUST have tag instruction
      expect(promptContext).toContain('DOSTĘPNE HANDOUTY');
      expect(promptContext).toContain(`[HANDOUT:${handouts[0].slug}]`);

      // Keeper and tactical handouts MUST NOT have tag instruction
      expect(promptContext).not.toContain(`[HANDOUT:${handouts[1].slug}]`);
      expect(promptContext).not.toContain(`[HANDOUT:${handouts[2].slug}]`);

      // Keeper and tactical handouts MUST be listed in Keeper section
      expect(promptContext).toContain('MATERIAŁY I PLANY STRAŻNIKA');
    });
  });
});
