import type { Character } from '@/lib/types';
import {
  getMaxSanity,
  getCharacterAnchors,
  recoverSanityFromAnchor,
  attemptSelfHelp,
  institutionalizeCare,
  resetDowntimeRecovery,
} from '@/lib/sanity/sanity-recovery';

describe('Sanity Recovery & Therapy Engine (CoC 7e RAW)', () => {
  const createMockCharacter = (overrides?: Partial<Character>): Character => ({
    id: 'char_test_1',
    name: 'Harvey Walters',
    occupation: 'Profesor archeologii',
    age: 42,
    gender: 'male',
    str: 40,
    con: 50,
    siz: 60,
    dex: 50,
    app: 50,
    int: 80,
    pow: 60,
    edu: 75,
    luck: 50,
    hp: 11,
    maxHp: 11,
    san: 45,
    maxSan: 87,
    mp: 12,
    maxMp: 12,
    background: 'Archeolog z Miskatonic University',
    playerName: 'Gracz 1',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 10,
    },
    skills: {
      'Archeologia': 70,
      'Mity Cthulhu': 12,
      'Majętność': 55,
    },
    developmentHistory: [],
    importantPeople: [
      {
        id: 'person_1',
        name: 'Eleanor Walters',
        relationship: 'Żona',
        status: 'alive',
        isKeyConnection: true,
      },
      {
        id: 'person_2',
        name: 'Prof. Armitage',
        relationship: 'Mentor',
        status: 'alive',
        isKeyConnection: false,
      },
    ],
    characterTraits: {
      phobias: ['Klaustrofobia'],
      manias: ['Ablutomania'],
      beliefs: [],
      habits: [],
      quirks: [],
      secrets: [],
    },
    ...overrides,
  });

  describe('Maksymalny pułap Poczytalności (getMaxSanity)', () => {
    it('oblicza max SAN jako 99 pomniejszone o Mity Cthulhu', () => {
      const char = createMockCharacter({ skills: { 'Mity Cthulhu': 14 } });
      expect(getMaxSanity(char)).toBe(85);
    });

    it('zwraca 99 gdy postać nie zna Mitów Cthulhu', () => {
      const char = createMockCharacter({ skills: {} });
      expect(getMaxSanity(char)).toBe(99);
    });

    it('nie pozwala na ujemny max SAN przy skrajnych Mitach Cthulhu', () => {
      const char = createMockCharacter({ skills: { 'Mity Cthulhu': 105 } });
      expect(getMaxSanity(char)).toBe(0);
    });
  });

  describe('Ekstrakcja i status kotwic (getCharacterAnchors)', () => {
    it('poprawnie parsuje listę ważnych osób z tła', () => {
      const char = createMockCharacter();
      const anchors = getCharacterAnchors(char);

      expect(anchors).toHaveLength(2);
      expect(anchors[0].name).toBe('Eleanor Walters');
      expect(anchors[0].isKeyConnection).toBe(true);
      expect(anchors[0].status).toBe('intact');
      expect(anchors[1].name).toBe('Prof. Armitage');
      expect(anchors[1].isKeyConnection).toBe(false);
    });

    it('jeśli postać ma tylko jedną ważną osobę, traktuje ją jako kluczową kotwicę', () => {
      const char = createMockCharacter({
        importantPeople: [
          {
            id: 'only_one',
            name: 'Siostra Maria',
            relationship: 'Siostra',
            status: 'alive',
          },
        ],
      });
      const anchors = getCharacterAnchors(char);

      expect(anchors).toHaveLength(1);
      expect(anchors[0].isKeyConnection).toBe(true);
    });

    it('tworzy fallback z significantPerson gdy importantPeople jest puste', () => {
      const char = createMockCharacter({
        importantPeople: [],
        significantPerson: 'Ciotka Agatha',
      });
      const anchors = getCharacterAnchors(char);

      expect(anchors).toHaveLength(1);
      expect(anchors[0].name).toBe('Ciotka Agatha');
      expect(anchors[0].isKeyConnection).toBe(true);
    });
  });

  describe('Odzyskiwanie SAN z kotwicy (recoverSanityFromAnchor)', () => {
    it('sukces testu SAN: przywraca 1k6 SAN (do pułapu) i zachowuje status więzi', () => {
      const char = createMockCharacter({ san: 45, maxSan: 87 });
      const result = recoverSanityFromAnchor(char, 'person_1', 'visit', {
        forceRoll: 30, // 30 <= 45 (sukces)
        forceGain: 4,
      });

      expect(result.success).toBe(true);
      expect(result.sanGained).toBe(4);
      expect(result.sanLost).toBe(0);
      expect(result.newStatus).toBe('intact');
      expect(result.nextCharacter.san).toBe(49);
      expect(result.nextCharacter.usedDowntimeRecovery).toBe(true);
      expect(result.narrativeSummary.pl).toContain('Eleanor Walters');
      expect(result.narrativeSummary.en).toContain('Eleanor Walters');
    });

    it('sukces testu SAN nie przekracza pułapu 99 - Mity Cthulhu', () => {
      const char = createMockCharacter({ san: 85, skills: { 'Mity Cthulhu': 12 } }); // maxSan = 87
      const result = recoverSanityFromAnchor(char, 'person_1', 'visit', {
        forceRoll: 20,
        forceGain: 6,
      });

      expect(result.success).toBe(true);
      expect(result.nextCharacter.san).toBe(87); // obcięte do maxSan 87, a nie 91
    });

    it('porażka testu SAN: traci 1 SAN i nadszarpuje nienaruszoną więź (intact -> damaged)', () => {
      const char = createMockCharacter({ san: 45 });
      const result = recoverSanityFromAnchor(char, 'person_1', 'visit', {
        forceRoll: 75, // 75 > 45 (porażka)
      });

      expect(result.success).toBe(false);
      expect(result.sanGained).toBe(0);
      expect(result.sanLost).toBe(1);
      expect(result.newStatus).toBe('damaged');
      expect(result.nextCharacter.san).toBe(44);
      expect(result.nextCharacter.importantPeople?.[0].damaged).toBe(true);
      expect(result.narrativeSummary.pl).toContain('Relacja została boleśnie nadszarpnięta');
    });

    it('kolejna porażka przy nadszarpniętej więzi trwale ją niszczy (damaged -> lost)', () => {
      const char = createMockCharacter({
        san: 45,
        importantPeople: [
          {
            id: 'person_1',
            name: 'Eleanor Walters',
            relationship: 'Żona',
            status: 'alive',
            damaged: true,
          },
        ],
      });

      const result = recoverSanityFromAnchor(char, 'person_1', 'correspondence', {
        forceRoll: 80,
      });

      expect(result.success).toBe(false);
      expect(result.newStatus).toBe('lost');
      expect(result.nextCharacter.importantPeople?.[0].lost).toBe(true);
      expect(result.narrativeSummary.pl).toContain('Więź została bezpowrotnie zerwana');
    });

    it('odrzuca próbę ukojenia przy bezpowrotnie utraconej kotwicy (lost)', () => {
      const char = createMockCharacter({
        importantPeople: [
          {
            id: 'person_1',
            name: 'Eleanor Walters',
            relationship: 'Żona',
            status: 'alive',
            lost: true,
          },
        ],
      });

      expect(() => {
        recoverSanityFromAnchor(char, 'person_1', 'visit');
      }).toThrow('została bezpowrotnie zerwana');
    });

    it('bezpiecznik częstotliwości: blokuje powtórne użycie w tej samej przerwie śledczej', () => {
      const char = createMockCharacter({ usedDowntimeRecovery: true });

      expect(() => {
        recoverSanityFromAnchor(char, 'person_1', 'visit');
      }).toThrow('Wykorzystano już próbę odzyskania Poczytalności w tej przerwie śledczej');
    });

    it('pozwala na użycie z flagą ignoreCooldown', () => {
      const char = createMockCharacter({ usedDowntimeRecovery: true });
      const result = recoverSanityFromAnchor(char, 'person_1', 'visit', {
        forceRoll: 10,
        forceGain: 3,
        ignoreCooldown: true,
      });

      expect(result.success).toBe(true);
      expect(result.nextCharacter.san).toBe(48);
    });
  });

  describe('Samopomoc dla fobii i manii (attemptSelfHelp)', () => {
    it('sukces testu SAN usuwa aktywną fobię z profilu postaci', () => {
      const char = createMockCharacter({ san: 50 });
      const result = attemptSelfHelp(
        char,
        { type: 'phobia', name: 'Klaustrofobia' },
        { forceRoll: 40 }
      );

      expect(result.success).toBe(true);
      expect(result.cured).toBe(true);
      expect(result.nextCharacter.characterTraits?.phobias).not.toContain('Klaustrofobia');
      expect(result.narrativeSummary.pl).toContain('Klaustrofobia');
    });

    it('porażka testu SAN pozostawia fobię bez zmian', () => {
      const char = createMockCharacter({ san: 50 });
      const result = attemptSelfHelp(
        char,
        { type: 'phobia', name: 'Klaustrofobia' },
        { forceRoll: 70 }
      );

      expect(result.success).toBe(false);
      expect(result.cured).toBe(false);
      expect(result.nextCharacter.characterTraits?.phobias).toContain('Klaustrofobia');
    });
  });

  describe('Hospitalizacja psychiatryczna (institutionalizeCare)', () => {
    it('państwowy azyl jest darmowy dla każdego (nawet ubogich)', () => {
      const char = createMockCharacter({ skills: { Majętność: 5 }, cash: 0 });
      const result = institutionalizeCare(char, 'public_asylum', {
        forceDoctorRoll: 30, // 30 <= 40 (sukces)
        forceSanRoll: 7,
      });

      expect(result.facility).toBe('public_asylum');
      expect(result.doctorSkill).toBe(40);
      expect(result.sanChange).toBe(7);
      expect(result.costMonthly).toBe(0);
      expect(result.curedIndefiniteInsanity).toBe(true);
      expect(result.nextCharacter.san).toBe(52);
    });

    it('prywatne sanatorium wymaga Majętności >= 50 lub gotówki >= $150', () => {
      const poorChar = createMockCharacter({ skills: { Majętność: 10 }, cash: 20 });

      expect(() => {
        institutionalizeCare(poorChar, 'private_sanitarium');
      }).toThrow('Niewystarczający poziom Majętności lub gotówki na prywatne sanatorium');
    });

    it('sukces twardy/krytyczny leczy czasową niepoczytalność oraz usuwa fobię lub manię', () => {
      const char = createMockCharacter({
        skills: { Majętność: 60 },
        insanityState: 'indefinite',
        underlyingInsanity: true,
      });

      const result = institutionalizeCare(char, 'private_sanitarium', {
        forceDoctorRoll: 15, // 15 <= 32 (hard success dla 65)
        forceSanRoll: 8,
      });

      expect(result.outcome).toBe('hard');
      expect(result.sanChange).toBe(8);
      expect(result.curedIndefiniteInsanity).toBe(true);
      expect(result.curedTrait).toBeDefined();
      expect(result.nextCharacter.insanityState).toBe('none');
      expect(result.nextCharacter.underlyingInsanity).toBe(false);
    });

    it('krytyczna porażka (Fumble) lekarza odbiera badaczowi 1k10 SAN', () => {
      const char = createMockCharacter();
      const result = institutionalizeCare(char, 'public_asylum', {
        forceDoctorRoll: 98, // fumble (> 95 przy skillu 40)
        forceSanRoll: 6,
      });

      expect(result.outcome).toBe('fumble');
      expect(result.sanChange).toBe(-6);
      expect(result.nextCharacter.san).toBe(39);
      expect(result.narrativeSummary.pl).toContain('Drastyczne metody leczenia');
    });
  });

  describe('Reset stanu w nowej sesji (resetDowntimeRecovery)', () => {
    it('czyści flagę usedDowntimeRecovery', () => {
      const char = createMockCharacter({ usedDowntimeRecovery: true });
      const resetChar = resetDowntimeRecovery(char);
      expect(resetChar.usedDowntimeRecovery).toBe(false);
    });
  });
});
