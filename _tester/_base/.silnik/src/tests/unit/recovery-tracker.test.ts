import type { Character } from '@/lib/types';
import {
  getMaxHp,
  getMajorWoundThreshold,
  generateHitLocationScar,
  advanceDailyRest,
  advanceWeeklyRecovery,
  advanceTimeSkipRecovery,
  applyFirstAid,
  applyMedicine,
  getFacilityWeeklyCost,
} from '@/lib/health/recovery-tracker';
import { applyStatChangesFromText } from '@/lib/character/apply-stat-changes';

describe('Health Recovery & Major Wounds Tracker (CoC 7e RAW)', () => {
  const createMockCharacter = (overrides?: Partial<Character>): Character => ({
    id: 'char_test_1',
    name: 'Harvey Walters',
    occupation: 'Profesor archeologii',
    age: 42,
    gender: 'male',
    str: 40,
    con: 60,
    siz: 60,
    dex: 50,
    app: 50,
    int: 80,
    pow: 60,
    edu: 75,
    luck: 50,
    hp: 12,
    maxHp: 12,
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
      'Pierwsza pomoc': 50,
      'Medycyna': 40,
      'Majętność': 30,
    },
    developmentHistory: [],
    cash: 250,
    ...overrides,
  });

  describe('Basic Thresholds & Scars', () => {
    it('calculates maxHp and major wound threshold accurately', () => {
      const char = createMockCharacter({ maxHp: 12 });
      expect(getMaxHp(char)).toBe(12);
      expect(getMajorWoundThreshold(char)).toBe(6); // floor(12 / 2)
    });

    it('generates hit location scars according to CoC 7e RAW and Seth Skorkowsky hit location table', () => {
      const scarLeg = generateHitLocationScar(1);
      expect(scarLeg.location).toBe('Udo / Nogi');
      expect(scarLeg.descriptionPl).toContain('szrama na udzie');

      const scarFace = generateHitLocationScar(10);
      expect(scarFace.location).toBe('Twarz / Szyja');
      expect(scarFace.descriptionPl).toContain('policzek');
    });
  });

  describe('Daily Rest (Without Major Wound)', () => {
    it('restores 1 HP per day of rest up to max HP', () => {
      const char = createMockCharacter({ hp: 8, maxHp: 12, hasMajorWound: false });
      const res = advanceDailyRest(char, 3);

      expect(res.hpGained).toBe(3);
      expect(res.character.hp).toBe(11);
      expect(res.character.healthRecoveryState?.daysElapsed).toBe(3);
    });

    it('clamps daily healing at max HP', () => {
      const char = createMockCharacter({ hp: 11, maxHp: 12, hasMajorWound: false });
      const res = advanceDailyRest(char, 5);

      expect(res.hpGained).toBe(1);
      expect(res.character.hp).toBe(12);
    });

    it('clears unconsciousness when HP recovers above 0', () => {
      const char = createMockCharacter({ hp: 0, maxHp: 10, isUnconscious: true });
      const res = advanceDailyRest(char, 2);

      expect(res.character.hp).toBe(2);
      expect(res.character.isUnconscious).toBe(false);
    });
  });

  describe('Weekly Recovery with Major Wound', () => {
    it('restores 1k3 HP on regular success and retains Major Wound if below threshold', () => {
      const char = createMockCharacter({
        hp: 3,
        maxHp: 12,
        con: 60,
        hasMajorWound: true,
      });

      // Rzut 40 vs 60 (Regular success)
      const res = advanceWeeklyRecovery(char, 'home', {
        forceRoll: 40,
        forceHpGain: 2,
      });

      expect(res.outcome).toBe('regular');
      expect(res.hpGained).toBe(2);
      expect(res.nextCharacter.hp).toBe(5);
      // threshold is 6, 5 <= 6 so wound remains
      expect(res.wasMajorWoundCleared).toBe(false);
      expect(res.nextCharacter.hasMajorWound).toBe(true);
    });

    it('clears Major Wound when HP exceeds half max HP threshold', () => {
      const char = createMockCharacter({
        hp: 5,
        maxHp: 12,
        con: 60,
        hasMajorWound: true,
      });

      // Rzut 35 vs 60 -> +2 HP -> HP becomes 7 (threshold is 6, 7 > 6)
      const res = advanceWeeklyRecovery(char, 'home', {
        forceRoll: 35,
        forceHpGain: 2,
        forceScarRoll: 5, // chest
      });

      expect(res.nextCharacter.hp).toBe(7);
      expect(res.wasMajorWoundCleared).toBe(true);
      expect(res.nextCharacter.hasMajorWound).toBe(false);
      expect(res.nextCharacter.scars).toHaveLength(1);
      expect(res.newScar?.location).toBe('Klatka piersiowa');
    });

    it('clears Major Wound immediately on Extreme Success even if HP is below threshold', () => {
      const char = createMockCharacter({
        hp: 2,
        maxHp: 12,
        con: 60,
        hasMajorWound: true,
      });

      // CON 60 -> extreme threshold is 12. Roll 10 = extreme
      const res = advanceWeeklyRecovery(char, 'public_hospital', {
        forceRoll: 10,
        forceHpGain: 3,
        forceScarRoll: 2,
      });

      expect(res.outcome).toBe('extreme');
      expect(res.wasMajorWoundCleared).toBe(true);
      expect(res.nextCharacter.hasMajorWound).toBe(false);
      expect(res.nextCharacter.scars).toHaveLength(1);
    });

    it('triggers infection and HP loss on fumble in home or public hospital', () => {
      const char = createMockCharacter({
        hp: 8,
        maxHp: 12,
        con: 60,
        hasMajorWound: true,
      });

      // Rzut 100 = Fumble
      const res = advanceWeeklyRecovery(char, 'home', {
        forceRoll: 100,
        forceHpLoss: 4,
      });

      expect(res.outcome).toBe('fumble');
      expect(res.infectionOccurred).toBe(true);
      expect(res.hpLost).toBe(4);
      expect(res.nextCharacter.hp).toBe(4);
      expect(res.nextCharacter.healthRecoveryState?.hasInfection).toBe(true);
    });

    it('protects against infection fumble when in private clinic due to strict antisepsis', () => {
      const char = createMockCharacter({
        hp: 8,
        maxHp: 12,
        con: 60,
        hasMajorWound: true,
        cash: 300,
      });

      const res = advanceWeeklyRecovery(char, 'private_clinic', {
        forceRoll: 100,
      });

      expect(res.outcome).toBe('fumble');
      expect(res.infectionOccurred).toBe(false); // Antisepsis prevents infection
      expect(res.hpLost).toBe(0);
      expect(res.nextCharacter.healthRecoveryState?.hasInfection).toBe(false);
    });

    it('handles facility costs correctly based on Credit Rating and facility tier', () => {
      const wealthyChar = createMockCharacter({
        skills: { 'Majętność': 45 },
      });
      const modestChar = createMockCharacter({
        skills: { 'Majętność': 25 },
      });

      expect(getFacilityWeeklyCost(wealthyChar, 'private_clinic')).toBe(0); // CR >= 40 covers private care
      expect(getFacilityWeeklyCost(modestChar, 'private_clinic')).toBe(100);
      expect(getFacilityWeeklyCost(modestChar, 'public_hospital')).toBe(10);
      expect(getFacilityWeeklyCost(modestChar, 'home')).toBe(0);
    });
  });

  describe('Time-Skip Simulation', () => {
    it('advances natural healing when character has no Major Wound', () => {
      const char = createMockCharacter({ hp: 6, maxHp: 12, hasMajorWound: false });
      const res = advanceTimeSkipRecovery(char, '1_week');

      expect(res.daysAdvanced).toBe(7);
      expect(res.hpGained).toBe(6); // 6 + 6 = 12 (maxHp)
      expect(res.finalHp).toBe(12);
    });

    it('runs weekly check loop and transitions to natural healing once Major Wound heals', () => {
      const char = createMockCharacter({
        hp: 5,
        maxHp: 12,
        con: 60,
        hasMajorWound: true,
      });

      // 2 weeks (14 days):
      // Week 1: rolls 30 (regular), gains 2 HP -> HP = 7 (> threshold 6) -> Major Wound clears!
      // Week 2: no longer has major wound -> natural healing +7 HP (up to max 12) -> HP = 12
      const res = advanceTimeSkipRecovery(char, '2_weeks', 'public_hospital', {
        forceRolls: [30],
        forceHpGains: [2],
      });

      expect(res.daysAdvanced).toBe(14);
      expect(res.wasMajorWoundCleared).toBe(true);
      expect(res.finalHp).toBe(12);
      expect(res.nextCharacter.hasMajorWound).toBe(false);
      expect(res.weeklyLogs).toHaveLength(2);
      expect(res.weeklyLogs[0].notes.pl).toContain('zaleczona');
    });
  });

  describe('First Aid & Medicine Procedures', () => {
    it('heals 1 HP and stabilizes dying investigator on First Aid success', () => {
      const dyingChar = createMockCharacter({
        hp: 0,
        maxHp: 10,
        hasMajorWound: true,
        isDying: true,
      });

      const res = applyFirstAid(dyingChar, 50, { forceRoll: 30 });

      expect(res.success).toBe(true);
      expect(res.hpGained).toBe(1);
      expect(res.stabilized).toBe(true);
      expect(res.nextCharacter.hp).toBe(1);
      expect(res.nextCharacter.isDying).toBe(false);
    });

    it('heals 1k3 HP on Medicine regular success', () => {
      const char = createMockCharacter({ hp: 4, maxHp: 12 });
      const res = applyMedicine(char, 50, { forceRoll: 40, forceHpGain: 3 });

      expect(res.success).toBe(true);
      expect(res.hpGained).toBe(3);
      expect(res.nextCharacter.hp).toBe(7);
    });
  });

  describe('applyStatChangesFromText (Damage & Major Wound Detection)', () => {
    it('sets hasMajorWound to true when single damage is >= half maxHp', () => {
      const char = createMockCharacter({ hp: 12, maxHp: 12 });
      // 12 / 2 = 6. Damage of -6 triggers Major Wound
      const next = applyStatChangesFromText(char, 'Potwór uderza badacza [HP: -6: cios maczugą].');

      expect(next.hp).toBe(6);
      expect(next.hasMajorWound).toBe(true);
      expect(next.isDying).toBeFalsy();
    });

    it('does not trigger Major Wound when damage is less than half maxHp', () => {
      const char = createMockCharacter({ hp: 12, maxHp: 12 });
      const next = applyStatChangesFromText(char, 'Drobne zadrapanie [HP: -3: szkło].');

      expect(next.hp).toBe(9);
      expect(next.hasMajorWound).toBeFalsy();
    });

    it('triggers dying and unconscious state when HP reaches 0 with a Major Wound', () => {
      const char = createMockCharacter({ hp: 7, maxHp: 12 });
      // Damage of -7 is >= 6 (major wound) AND drops HP to 0 -> dying!
      const next = applyStatChangesFromText(char, 'Potworny cios [HP: -7: zmiażdżenie].');

      expect(next.hp).toBe(0);
      expect(next.hasMajorWound).toBe(true);
      expect(next.isUnconscious).toBe(true);
      expect(next.isDying).toBe(true);
    });
  });
});
