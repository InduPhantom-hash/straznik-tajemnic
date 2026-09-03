import type { Character } from '@/lib/types';
import {
  calculateEffectiveSanLoss,
  applySanityDelta,
  resolveIntelligenceTest,
  resetDailySanTracking,
  BOUTS_REAL_TIME,
  BOUTS_SUMMARY,
  rollBoutOfMadness,
  type SanityEvent,
} from '@/lib/sanity/sanity-engine';
import {
  applyStatChangesFromText,
  applyStatChangesToParty,
} from '@/lib/character/apply-stat-changes';

function createMockCharacter(overrides?: Partial<Character>): Character {
  return {
    id: 'char_1',
    name: 'Harvey Walters',
    str: 50,
    dex: 50,
    con: 50,
    app: 50,
    pow: 60,
    edu: 70,
    siz: 60,
    int: 75,
    luck: 50,
    hp: 11,
    san: 60,
    mp: 12,
    maxHp: 11,
    maxSan: 99,
    skills: {},
    occupation: 'Dziennikarz',
    age: 38,
    background: '',
    playerName: 'Jakub',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 10,
    },
    developmentHistory: [],
    ...overrides,
  };
}

describe('Sanity & Madness Engine (CoC 7e RAW)', () => {
  describe('Próg Mitów Cthulhu > Poczytalność (halving SAN loss)', () => {
    it('zwykły badacz traci pełną liczbę punktów SAN', () => {
      const c = createMockCharacter({ san: 60 });
      const res = calculateEffectiveSanLoss(c, 6);
      expect(res.effectiveLoss).toBe(6);
      expect(res.mythosHalved).toBe(false);
    });

    it('badacz z Mitami Cthulhu wyższymi niż SAN traci tylko połowę punktów SAN', () => {
      const c = createMockCharacter({
        san: 25,
        skills: {
          'Mity Cthulhu': 35,
        },
      });
      const res = calculateEffectiveSanLoss(c, 6);
      expect(res.effectiveLoss).toBe(3);
      expect(res.mythosHalved).toBe(true);
      expect(res.mythosActive).toBe(true);
    });

    it('flaga mythosExceedsSanity zachowuje odporność na stałe', () => {
      const c = createMockCharacter({
        san: 70, // SAN odzyskane powyżej poziomu mitów
        mythosExceedsSanity: true,
      });
      const res = calculateEffectiveSanLoss(c, 7);
      expect(res.effectiveLoss).toBe(3); // Math.floor(7 / 2) = 3
      expect(res.mythosHalved).toBe(true);
    });
  });

  describe('Próg pojedynczej straty >= 5 SAN i Test Inteligencji', () => {
    it('strata 1-4 SAN nie wyzwala wymogu testu Inteligencji', () => {
      const c = createMockCharacter({ san: 60 });
      const { nextCharacter, events } = applySanityDelta(c, -3, 'widok krwi');
      expect(nextCharacter.san).toBe(57);
      expect(events.length).toBe(0);
    });

    it('jednorazowa strata >= 5 SAN wyzwala zdarzenie int_check_required', () => {
      const c = createMockCharacter({ san: 60 });
      const { nextCharacter, events } = applySanityDelta(c, -5, 'widok zmasakrowanego ciała');
      expect(nextCharacter.san).toBe(55);
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('int_check_required');
      expect(events[0].loss).toBe(5);
    });

    it('porażka testu INT oznacza wyparcie grozy i brak ataku szaleństwa', () => {
      const c = createMockCharacter({ san: 55 });
      const { nextCharacter, bout, event } = resolveIntelligenceTest(c, false);
      expect(bout).toBeUndefined();
      expect(nextCharacter.insanityState).toBeUndefined();
      expect(event?.message.pl).toContain('wypiera');
    });

    it('sukces testu INT oznacza zrozumienie koszmaru i Chwilową Niepoczytalność', () => {
      const c = createMockCharacter({ san: 55 });
      const { nextCharacter, bout, event } = resolveIntelligenceTest(c, true, {
        mode: 'real_time',
        forceBoutIndex: 3, // Paranoja
      });
      expect(bout).toBeDefined();
      expect(bout?.type).toBe('paranoia');
      expect(bout?.unit).toBe('rounds');
      expect(nextCharacter.insanityState).toBe('temporary');
      expect(nextCharacter.activeBoutOfMadness?.type).toBe('paranoia');
      expect(event?.type).toBe('temporary_insanity');
    });
  });

  describe('Próg 1/5 dziennej straty i Czasowa Niepoczytalność', () => {
    it('utrata 1/5 SAN w ciągu doby wyzwala Indefinite Insanity i stan Underlying Insanity', () => {
      const c = createMockCharacter({ san: 50, dayStartSan: 50, dailySanLoss: 0 });
      // Próg 1/5 to 10 punktów.
      // Krok 1: strata 4 SAN
      const step1 = applySanityDelta(c, -4);
      expect(step1.nextCharacter.san).toBe(46);
      expect(step1.nextCharacter.dailySanLoss).toBe(4);
      expect(step1.nextCharacter.insanityState).toBeUndefined();

      // Krok 2: strata 4 SAN (łącznie 8)
      const step2 = applySanityDelta(step1.nextCharacter, -4);
      expect(step2.nextCharacter.san).toBe(42);
      expect(step2.nextCharacter.dailySanLoss).toBe(8);
      expect(step2.nextCharacter.insanityState).toBeUndefined();

      // Krok 3: strata 3 SAN (łącznie 11 >= 10)
      const step3 = applySanityDelta(step2.nextCharacter, -3, 'widok pradawnego symbolu', {
        forceBoutIndex: 0, // Amnezja
      });
      expect(step3.nextCharacter.san).toBe(39);
      expect(step3.nextCharacter.dailySanLoss).toBe(11);
      expect(step3.nextCharacter.insanityState).toBe('indefinite');
      expect(step3.nextCharacter.underlyingInsanity).toBe(true);
      expect(step3.nextCharacter.activeBoutOfMadness?.type).toBe('amnesia');

      const indefEvent = step3.events.find((e) => e.type === 'indefinite_insanity');
      expect(indefEvent).toBeDefined();
      expect(indefEvent?.bout?.type).toBe('amnesia');
    });

    it('będąc w stanie Underlying Insanity, każda kolejna strata SAN odpala nowy Atak Szaleństwa', () => {
      const c = createMockCharacter({
        san: 39,
        dayStartSan: 50,
        dailySanLoss: 11,
        insanityState: 'indefinite',
        underlyingInsanity: true,
      });

      // Utrata zaledwie 1 punktu SAN
      const res = applySanityDelta(c, -1, 'niepokojący szelest', {
        forceBoutIndex: 5, // Omdlenie
      });

      expect(res.nextCharacter.san).toBe(38);
      expect(res.events.length).toBe(1);
      expect(res.events[0].type).toBe('bout_of_madness');
      expect(res.events[0].bout?.type).toBe('fainting');
      expect(res.nextCharacter.activeBoutOfMadness?.type).toBe('fainting');
    });
  });

  describe('Próg 0 SAN i Nieodwracalny Obłęd', () => {
    it('spadek SAN do 0 oznacza Permanent Insanity', () => {
      const c = createMockCharacter({ san: 3 });
      const { nextCharacter, events } = applySanityDelta(c, -5, 'ujrzenie Azathotha');
      expect(nextCharacter.san).toBe(0);
      expect(nextCharacter.insanityState).toBe('permanent');
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('permanent_insanity');
    });
  });

  describe('Reset i Odpoczynek Dzienny', () => {
    it('resetDailySanTracking czyści dzienną stratę i chwilową niepoczytalność', () => {
      const c = createMockCharacter({
        san: 45,
        dayStartSan: 60,
        dailySanLoss: 15,
        insanityState: 'temporary',
        activeBoutOfMadness: rollBoutOfMadness(),
      });

      const rested = resetDailySanTracking(c);
      expect(rested.dayStartSan).toBe(45);
      expect(rested.dailySanLoss).toBe(0);
      expect(rested.insanityState).toBe('none');
      expect(rested.activeBoutOfMadness).toBeNull();
    });

    it('resetDailySanTracking NIE czyści Czasowej Niepoczytalności bez leczenia', () => {
      const c = createMockCharacter({
        san: 40,
        dayStartSan: 60,
        dailySanLoss: 20,
        insanityState: 'indefinite',
        underlyingInsanity: true,
      });

      const rested = resetDailySanTracking(c);
      expect(rested.dayStartSan).toBe(40);
      expect(rested.dailySanLoss).toBe(0);
      expect(rested.insanityState).toBe('indefinite');
      expect(rested.underlyingInsanity).toBe(true);
    });
  });

  describe('Integracja z tagami narracji w applyStatChanges', () => {
    it('parsuje tag [SANITY: -5] i wywołuje callback zdarzeń', () => {
      const c = createMockCharacter({ san: 60 });
      const capturedEvents: SanityEvent[] = [];

      const updated = applyStatChangesFromText(
        c,
        'W kącie leżało ciało. [SANITY: -5: zmasakrowane szczątki]',
        (ev) => capturedEvents.push(ev)
      );

      expect(updated.san).toBe(55);
      expect(capturedEvents.length).toBe(1);
      expect(capturedEvents[0].type).toBe('int_check_required');
      expect(capturedEvents[0].loss).toBe(5);
    });

    it('obsługuje party-aware zmiany w duecie', () => {
      const char1 = createMockCharacter({ id: 'c1', name: 'Harvey', san: 60 });
      const char2 = createMockCharacter({ id: 'c2', name: 'Eleonora', san: 50 });

      const res = applyStatChangesToParty(
        [char1, char2],
        char1,
        'Scena grozy! [SANITY:@Eleonora: -6: makabra] [HP: -2: skaleczenie]'
      );

      expect(res.changed).toBe(true);
      const updatedEleonora = res.characters.find((c) => c.id === 'c2')!;
      expect(updatedEleonora.san).toBe(44);
      expect(res.activeCharacter.hp).toBe(9); // Harvey dostał HP -2
      expect(res.sanityEvents.length).toBe(1);
      expect(res.sanityEvents[0].characterName).toBe('Eleonora');
      expect(res.sanityEvents[0].type).toBe('int_check_required');
    });
  });

  describe('Tabele Objawów Szaleństwa (CoC 7e RAW)', () => {
    it('zawiera 10 objawów w czasie rzeczywistym i 10 w podsumowaniu', () => {
      expect(BOUTS_REAL_TIME.length).toBe(10);
      expect(BOUTS_SUMMARY.length).toBe(10);
      expect(BOUTS_REAL_TIME[0].type).toBe('amnesia');
      expect(BOUTS_REAL_TIME[3].type).toBe('paranoia');
      expect(BOUTS_REAL_TIME[5].type).toBe('fainting');
      expect(BOUTS_REAL_TIME[6].type).toBe('fleeing');
    });
  });
});
