import {
  CANONICAL_SPELLS,
  CANONICAL_TOMES,
  getSpellDefinition,
  getTomeDefinition,
  findSpellByAnyName,
  findTomeByAnyName,
} from './catalog';
import { DeterministicMagicDiceRoller } from './dice-roller';
import { MagicEngine } from './magic-engine';
import { TomeEngine } from './tome-engine';
import type { CastingRequest, InitialReadingRequest, FullStudyRequest } from './types';

describe('Magia i Tomiska CoC 7e RAW & Poradniki MG (Issue #252)', () => {
  describe('Katalog kanoniczny (Catalog & Provenance)', () => {
    it('zawiera oficjalne zaklęcia z Księgi Strażnika CoC 7e i Wielkiego Grymuaru z numerami stron', () => {
      const spells = ['wither-limb', 'elder-sign', 'flesh-ward', 'dominate', 'shriveling'];
      for (const id of spells) {
        const spell = getSpellDefinition(id);
        expect(spell).toBeDefined();
        expect(spell?.source.page).toBeGreaterThan(0);
        expect(spell?.diegeticNames.pl.length).toBeGreaterThan(0);
        expect(spell?.diegeticNames.en.length).toBeGreaterThan(0);
      }
    });

    it('wyszukuje zaklęcia po alternatywnych nazwach diegetycznych', () => {
      const byPlAlias = findSpellByAnyName('Pieśń Bólu');
      expect(byPlAlias?.id).toBe('wither-limb');

      const byEnAlias = findSpellByAnyName('Black Rot Hex');
      expect(byEnAlias?.id).toBe('wither-limb');

      const byDirectName = findSpellByAnyName('Znak Starszych Bogów');
      expect(byDirectName?.id).toBe('elder-sign');
    });

    it('zawiera oficjalne tomy Mitów z pełnymi parametrami RAW', () => {
      const necro = getTomeDefinition('necronomicon-latin');
      expect(necro).toBeDefined();
      expect(necro?.initialReading.cmi).toBe(5);
      expect(necro?.fullStudy.cmf).toBe(11);
      expect(necro?.fullStudy.mr).toBe(48);
      expect(necro?.spells).toContain('wither-limb');
      expect(necro?.spells).toContain('resurrection');
    });

    it('wyszukuje tomy po nazwie, tytule lub autorze', () => {
      const byTitle = findTomeByAnyName('Księga Eibona');
      expect(byTitle?.id).toBe('book-of-eibon-english');

      const byAuthor = findTomeByAnyName('Abdul Alhazred');
      expect(byAuthor?.id).toBe('necronomicon-latin');

      const byLatin = findTomeByAnyName('Vermis');
      expect(byLatin?.id).toBe('de-vermis-mysteris');
    });
  });

  describe('Bramka Wiary (Belief Gate - Seth Skorkowsky & RAW)', () => {
    it('blokuje rzucanie czarów u sceptyka, który nie wierzy w Mity Cthulhu', () => {
      const engine = new MagicEngine();
      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Prof. Armitage',
        casterPow: 60,
        casterMp: 12,
        casterHp: 10,
        casterSan: 50,
        belief: 'skeptic', // sceptyk
        spellId: 'wither-limb',
      };

      const result = engine.resolveCasting(request);
      expect(result.success).toBe(false);
      expect(result.costPaid.mp).toBe(0);
      expect(result.costPaid.san).toBe(0);
      expect(result.message.pl).toContain('podchodzi do tekstu czysto akademicko');
    });
  });

  describe('Rzucanie zaklęć: Pierwsze rzucenie (First Cast - Hard POW)', () => {
    it('sukces w teście Trudnego POW oznacza udane pierwsze rzucenie', () => {
      // Hard POW dla 60 wynosi 30. Wstrzykujemy rzut 25 (sukces).
      const roller = new DeterministicMagicDiceRoller({ d100: [25] });
      const engine = new MagicEngine(roller);

      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Harvey Walters',
        casterPow: 60,
        casterMp: 12,
        casterHp: 10,
        casterSan: 50,
        belief: 'believer',
        spellId: 'wither-limb',
        isFirstCastOverride: true,
      };

      const result = engine.resolveCasting(request);
      expect(result.success).toBe(true);
      expect(result.isFirstCast).toBe(true);
      expect(result.hardPowThreshold).toBe(30);
      expect(result.firstCastRoll?.roll).toBe(25);
      expect(result.firstCastRoll?.success).toBe(true);
      expect(result.costPaid.mp).toBe(8);
      expect(result.statChanges.mpDelta).toBe(-8);
      expect(result.characterUpdates.isFirstCastDone).toBe(true);
    });

    it('porażka pierwszego rzucenia pobiera koszty PM i SAN zgodnie z RAW, lecz zaklęcie zawodzi', () => {
      // Hard POW dla 60 wynosi 30. Wstrzykujemy rzut 45 (porażka).
      const roller = new DeterministicMagicDiceRoller({ d100: [45], formula: [4] });
      const engine = new MagicEngine(roller);

      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Harvey Walters',
        casterPow: 60,
        casterMp: 12,
        casterHp: 10,
        casterSan: 50,
        belief: 'believer',
        spellId: 'wither-limb',
        isFirstCastOverride: true,
      };

      const result = engine.resolveCasting(request);
      expect(result.success).toBe(false);
      expect(result.isFirstCast).toBe(true);
      expect(result.firstCastRoll?.success).toBe(false);
      // Koszty są pobrane pomimo porażki!
      expect(result.costPaid.mp).toBe(8);
      expect(result.costPaid.san).toBe(4);
      expect(result.statChanges.mpDelta).toBe(-8);
      expect(result.statChanges.sanDelta).toBe(-4);
      expect(result.characterUpdates.isFirstCastDone).toBe(false);
      expect(result.message.pl).toContain('koszty (8 PM, 4 SAN) zostały poniesione');
    });

    it('porażka forsowania pierwszego rzucenia (Pushed Roll) wyzwala zaklęcie z katastrofą', () => {
      // Hard POW dla 60 wynosi 30. Wstrzykujemy rzut 55 (porażka forsowania) oraz 3 dla katastrofy.
      const roller = new DeterministicMagicDiceRoller({ d100: [55], formula: [3] });
      const engine = new MagicEngine(roller);

      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Harvey Walters',
        casterPow: 60,
        casterMp: 12,
        casterHp: 10,
        casterSan: 50,
        belief: 'believer',
        spellId: 'wither-limb',
        isFirstCastOverride: true,
        isPush: true, // Forsowanie
      };

      const result = engine.resolveCasting(request);
      // Zgodnie z RAW i Seth Skorkowsky: zaklęcie zadziałało, ale z katastrofą!
      expect(result.success).toBe(true);
      expect(result.firstCastRoll?.isPushed).toBe(true);
      expect(result.firstCastRoll?.pushedFailedCatastrophe).toBe(true);
      expect(result.message.pl).toContain('KATASTROFA FORSOWANIA');
      expect(result.characterUpdates.isFirstCastDone).toBe(true);
    });
  });

  describe('Rzucanie zaklęć: Kolejne rzucenia (Subsequent Casts - Automatyczny sukces)', () => {
    it('kolejne rzucenia udają się automatycznie bez wykonywania rzutu kością', () => {
      const engine = new MagicEngine();
      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Harvey Walters',
        casterPow: 60,
        casterMp: 12,
        casterHp: 10,
        casterSan: 50,
        belief: 'believer',
        spellId: 'wither-limb',
        isFirstCastOverride: false, // Kolejne rzucenie!
      };

      const result = engine.resolveCasting(request);
      expect(result.success).toBe(true);
      expect(result.isFirstCast).toBe(false);
      expect(result.firstCastRoll).toBeUndefined(); // brak rzutu kością!
      expect(result.costPaid.mp).toBe(8);
      expect(result.message.pl).toContain('Sukces automatyczny CoC 7e RAW');
    });
  });

  describe('Gospodarka zasobami (MP, HP i trwałe POW)', () => {
    it('wymaga zgody gracza na konwersję MP na HP w relacji 1:1, gdy brakuje Punktów Magii', () => {
      const engine = new MagicEngine();
      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Harvey Walters',
        casterPow: 60,
        casterMp: 5, // Za mało (Uwiąd Kończyny wymaga 8 PM)
        casterHp: 12,
        casterSan: 50,
        belief: 'believer',
        spellId: 'wither-limb',
        isFirstCastOverride: false,
        allowHpConversion: false, // Gracz nie wyraził jeszcze zgody
      };

      const result = engine.resolveCasting(request);
      expect(result.success).toBe(false);
      expect(result.message.pl).toContain('Niewystarczająca liczba Punktów Magii (5/8)');
      expect(result.message.pl).toContain('brakujących 3 PM bezpośrednio z Punktów Wytrzymałości (HP 1:1)');
    });

    it('pobiera brakujące punkty z HP (1:1), gdy gracz wyrazi zgodę', () => {
      const engine = new MagicEngine();
      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Harvey Walters',
        casterPow: 60,
        casterMp: 5, // 5 PM
        casterHp: 12, // 12 HP
        casterSan: 50,
        belief: 'believer',
        spellId: 'wither-limb', // wymaga 8 PM -> 5 PM + 3 HP
        isFirstCastOverride: false,
        allowHpConversion: true, // Zgoda gracza
      };

      const result = engine.resolveCasting(request);
      expect(result.success).toBe(true);
      expect(result.costPaid.mp).toBe(5);
      expect(result.costPaid.hpFromMp).toBe(3);
      expect(result.statChanges.mpDelta).toBe(-5);
      expect(result.statChanges.hpDelta).toBe(-3);
    });

    it('trwale obniża POW dla rytuałów takich jak Znak Starszych Bogów', () => {
      const engine = new MagicEngine();
      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Harvey Walters',
        casterPow: 60,
        casterMp: 12,
        casterHp: 12,
        casterSan: 50,
        belief: 'believer',
        spellId: 'elder-sign', // Koszt: 10 POW trwale
        isFirstCastOverride: false,
      };

      const result = engine.resolveCasting(request);
      expect(result.success).toBe(true);
      expect(result.costPaid.powPermanent).toBe(10);
      expect(result.statChanges.powDelta).toBe(-10);
      expect(result.message.pl).toContain('10 POW trwale');
    });
  });

  describe('Rzuty sporne Mocy (Opposed POW - Seth Skorkowsky & RAW)', () => {
    it('rozstrzyga starcie woli w zaklęciu Zdominowanie i kwalifikuje do rozwoju POW', () => {
      // Caster POW: 70, rzut: 12 (Extreme success).
      // Target POW: 60, rzut: 50 (Regular success).
      const roller = new DeterministicMagicDiceRoller({ d100: [12, 50] });
      const engine = new MagicEngine(roller);

      const request: CastingRequest = {
        casterId: 'inv-1',
        casterName: 'Harvey Walters',
        casterPow: 70,
        casterMp: 12,
        casterHp: 12,
        casterSan: 50,
        belief: 'believer',
        spellId: 'dominate',
        isFirstCastOverride: false,
        target: { name: 'Kultysta Silas', pow: 60 },
      };

      const result = engine.resolveCasting(request);
      expect(result.success).toBe(true);
      expect(result.opposedRoll?.winner).toBe('caster');
      expect(result.opposedRoll?.casterPowImprovementEligible).toBe(true);
    });
  });

  describe('Silnik Tomisk Mitów (Tome Study & Belief Rule)', () => {
    it('wstępny przegląd u sceptyka nie odbiera natychmiast SAN, lecz odkłada dług psychiczny', () => {
      // Test języka łacińskiego (skill 60): rzut 25 (sukces). Strata SAN: 6.
      const roller = new DeterministicMagicDiceRoller({ d100: [25], formula: [6] });
      const tomeEngine = new TomeEngine(roller);

      const request: InitialReadingRequest = {
        investigatorLanguageSkill: 60,
        languageDifficulty: 'regular',
        tomeId: 'necronomicon-latin',
        belief: 'skeptic', // Sceptyk
      };

      const result = tomeEngine.resolveInitialReading(request);
      expect(result.success).toBe(true);
      expect(result.cmiGained).toBe(5);
      expect(result.sanLoss).toBe(0); // Brak natychmiastowej straty!
      expect(result.deferredSanLoss).toBe(6); // Odłożono 6 SAN
      expect(result.spellsDiscovered).toContain('wither-limb');
      expect(result.message.pl).toContain('nie traci teraz SAN (odłożono 6 SAN długu psychicznego)');
    });

    it('konwersja sceptyka w wierzącego natychmiast uderza całą odłożoną stratą SAN', () => {
      const tomeEngine = new TomeEngine();
      const conversion = tomeEngine.convertBeliefToBeliever('Harvey Walters', 12, 5);

      expect(conversion.newBelief).toBe('believer');
      expect(conversion.sanLossApplied).toBe(12);
      expect(conversion.intCheckRequired).toBe(true);
      expect(conversion.message.pl).toContain('natychmiastowy test Inteligencji (INT) z powodu utraty ≥5 SAN');
    });

    it('sprawdzenie referencyjne (Reference Check) weryfikuje rzut przeciwko Mythos Rating', () => {
      // 1k4 h = 2h. Rzut: 35 vs MR 48 (Necronomicon) -> sukces.
      const roller = new DeterministicMagicDiceRoller({ formula: [2], d100: [35] });
      const tomeEngine = new TomeEngine(roller);

      const result = tomeEngine.resolveReferenceCheck({ tomeId: 'necronomicon-latin' });
      expect(result.success).toBe(true);
      expect(result.hoursSpent).toBe(2);
      expect(result.roll).toBe(35);
      expect(result.mythosRating).toBe(48);
    });

    it('pełne studium (Full Study) wykonuje rzut obronny SAN i podwaja czas przy kolejnym czytaniu', () => {
      // De Vermis Mysteriis: fullStudy: 48 tygodni, MR: 36, cmf: 8, sanCost: 1k10.
      // Rzut SAN (d100): 40 vs SAN 50 (sukces - strata zmniejszona o połowę). Koszt 1k10 = 6 -> strata 3 SAN.
      const roller = new DeterministicMagicDiceRoller({ d100: [40], formula: [6] });
      const tomeEngine = new TomeEngine(roller);

      const request: FullStudyRequest = {
        tomeId: 'de-vermis-mysteris',
        investigatorSan: 50,
        investigatorMythos: 30, // 30 + 8 = 38, ale MR = 36 -> zysk tylko 6 CMF!
        studyCount: 1, // druga lektura: 48 * 2 = 96 tygodni!
        belief: 'believer',
      };

      const result = tomeEngine.resolveFullStudy(request);
      expect(result.weeksRequired).toBe(96);
      expect(result.sanRoll.success).toBe(true);
      expect(result.sanLoss).toBe(3); // 6 / 2 = 3
      expect(result.cmfGained).toBe(6); // 36 - 30 = 6 (limit MR!)
      expect(result.mythosCappedAtMr).toBe(true);
      expect(result.message.pl).toContain('osiągnięto limit MR 36');
    });
  });
});
