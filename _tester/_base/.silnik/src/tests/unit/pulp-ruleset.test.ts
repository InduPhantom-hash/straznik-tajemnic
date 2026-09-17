import { calculateDerived } from '@/lib/character/derived-stats';
import { applyCombatDamage } from '@/lib/combat/combat-resolver';
import { advanceDailyRest, advanceTimeSkipRecovery, applyFirstAid } from '@/lib/health/recovery-tracker';
import { reduceSanityLossWithLuck } from '@/lib/sanity/sanity-engine';
import { PULP_ARCHETYPES, getPulpArchetype } from '@/lib/data/character/pulp-archetypes';
import { PULP_TALENTS, getPulpTalent } from '@/lib/data/character/pulp-talents';
import { buildPlayerPulpSection } from '@/app/api/chat/_helpers/build-context';
import type { Character } from '@/lib/types';
import type { CharacterStats } from '@/lib/data/character';

describe('Pulp Cthulhu RAW Ruleset Implementation', () => {
  const baseStats: CharacterStats = {
    str: 60,
    con: 70,
    siz: 65,
    dex: 50,
    app: 45,
    int: 75,
    pow: 60,
    edu: 65,
    luck: 60,
  };

  describe('1. Derived Stats & Health Calculation', () => {
    it('calculates HP as floor((CON + SIZ) / 10) in classic mode', () => {
      const derived = calculateDerived(baseStats, 30, 'classic');
      // (70 + 65) / 10 = 13.5 -> 13
      expect(derived.hp).toBe(13);
    });

    it('calculates doubled HP as floor((CON + SIZ) / 5) in pulp mode', () => {
      const derived = calculateDerived(baseStats, 30, 'pulp');
      // (70 + 65) / 5 = 27
      expect(derived.hp).toBe(27);
    });
  });

  describe('2. Combat & Major Wounds in Pulp', () => {
    it('does NOT trigger a Major Wound in pulp when damage is half max HP but less than full max HP', () => {
      const result = applyCombatDamage({
        hp: 26,
        maxHp: 26,
        con: 70,
        damage: 15, // > 13 (half), but < 26 (full)
        hadMajorWound: false,
        conRoll: 50,
        convention: 'pulp',
      });

      expect(result.hpAfter).toBe(11);
      expect(result.hasMajorWound).toBe(false);
    });

    it('triggers a Major Wound in pulp only when damage equals or exceeds full max HP', () => {
      const result = applyCombatDamage({
        hp: 26,
        maxHp: 26,
        con: 70,
        damage: 26,
        hadMajorWound: false,
        conRoll: 50,
        convention: 'pulp',
      });

      expect(result.hpAfter).toBe(0);
      expect(result.hasMajorWound).toBe(true);
      expect(result.isDying).toBe(true);
    });

    it('does NOT put an investigator into dying state at 0 HP if the final blow dealt less than half max HP', () => {
      const result = applyCombatDamage({
        hp: 4,
        maxHp: 26,
        con: 70,
        damage: 6, // brings to 0 HP, but 6 < 13 (halfMaxHp)
        hadMajorWound: false,
        conRoll: 50,
        convention: 'pulp',
      });

      expect(result.hpAfter).toBe(0);
      expect(result.isUnconscious).toBe(true);
      expect(result.isDying).toBe(false); // stable, unconscious!
    });
  });

  describe('3. Mook (Minion) Rules in Combat', () => {
    it('eliminates a minion instantly when dealt lethal or half-HP damage in pulp', () => {
      const result = applyCombatDamage({
        hp: 10,
        maxHp: 10,
        con: 50,
        damage: 5, // 50% maxHp
        convention: 'pulp',
        isMook: true,
      });

      expect(result.hpAfter).toBe(0);
      expect(result.isUnconscious).toBe(true);
      expect(result.isDying).toBe(false);
    });
  });

  describe('4. Recovery & Healing in Pulp', () => {
    const pulpChar: Character = {
      id: 'pulp-hero-1',
      name: 'Jack Malone',
      occupation: 'Awanturnik',
      age: 32,
      str: 60,
      con: 70,
      siz: 65,
      dex: 60,
      app: 50,
      int: 70,
      pow: 60,
      edu: 60,
      luck: 50,
      hp: 10,
      maxHp: 27,
      san: 60,
      maxSan: 99,
      mp: 12,
      maxMp: 12,
      rulesetVariant: 'pulp',
      skills: {},
    } as unknown as Character;

    it('regenerates 2 HP per day of natural rest in pulp (instead of 1 HP in classic)', () => {
      const res = advanceDailyRest(pulpChar, 3);
      expect(res.hpGained).toBe(6); // 2 HP * 3 days
      expect(res.character.hp).toBe(16);
    });

    it('recovers 1d4 HP with First Aid in pulp mode', () => {
      const res = applyFirstAid(pulpChar, 70, { forceRoll: 20 });
      expect(res.hpGained).toBeGreaterThanOrEqual(1);
      expect(res.hpGained).toBeLessThanOrEqual(4);
    });

    it('clears wounds and skips weekly checks during time skip in pulp', () => {
      const woundedChar: Character = {
        ...pulpChar,
        hasMajorWound: true,
      };
      const res = advanceTimeSkipRecovery(woundedChar, '1_week');
      expect(res.wasMajorWoundCleared).toBe(true);
      expect(res.nextCharacter.hasMajorWound).toBe(false);
      expect(res.weeklyLogs.length).toBe(0);
    });
  });

  describe('5. Sanity & Luck Spending (2:1 Ratio)', () => {
    const pulpCharWithLuck: Character = {
      id: 'pulp-luck-1',
      name: 'Lucky',
      occupation: 'Awanturnik',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      luck: 30,
      hp: 20,
      maxHp: 20,
      san: 50,
      maxSan: 99,
      mp: 10,
      maxMp: 10,
      rulesetVariant: 'pulp',
      skills: {},
    } as unknown as Character;

    it('allows halving SAN loss by spending Luck at 2:1 ratio', () => {
      const res = reduceSanityLossWithLuck(pulpCharWithLuck, 6);
      // Half of 6 is 3 saved. Saved * 2 = 6 Luck spent.
      expect(res.reducedLoss).toBe(3);
      expect(res.luckSpent).toBe(6);
      expect(res.nextCharacter.luck).toBe(24);
    });

    it('reduces only up to available luck if character has limited luck', () => {
      const lowLuckChar: Character = {
        ...pulpCharWithLuck,
        luck: 4,
      };
      const res = reduceSanityLossWithLuck(lowLuckChar, 10);
      // Can save up to 5 SAN, but 4 Luck only buys 2 SAN reduction.
      expect(res.reducedLoss).toBe(8);
      expect(res.luckSpent).toBe(4);
      expect(res.nextCharacter.luck).toBe(0);
    });
  });

  describe('6. Data Registries (Pulp Archetypes & Talents)', () => {
    it('contains all 17 pulp archetypes with valid core characteristics and bonus skill points', () => {
      expect(PULP_ARCHETYPES.length).toBeGreaterThanOrEqual(17);
      const swashbuckler = getPulpArchetype('swashbuckler');
      expect(swashbuckler).toBeDefined();
      expect(swashbuckler?.bonusSkillPoints).toBe(100);
      expect(swashbuckler?.coreCharacteristics).toContain('dex');
    });

    it('contains pulp talents across 4 categories', () => {
      expect(PULP_TALENTS.length).toBeGreaterThan(20);
      const keenVision = getPulpTalent('keen_vision');
      expect(keenVision?.category).toBe('physical');
      expect(keenVision?.name.pl).toBe('Bystry Wzrok');
    });
  });

  describe('7. AI Keeper Prompt Injection', () => {
    it('injects pulp profile section into prompt for pulp characters', () => {
      const char: Character = {
        id: 'hero',
        name: 'Indiana',
        occupation: 'Archeolog',
        rulesetVariant: 'pulp',
        archetype: 'Awanturnik',
        pulpTalents: ['Szybka Regeneracja', 'Bystry Wzrok'],
        hp: 28,
        maxHp: 28,
        san: 60,
        maxSan: 99,
        mp: 12,
        maxMp: 12,
        skills: {},
      } as unknown as Character;

      const promptSection = buildPlayerPulpSection(char);
      expect(promptSection).toContain('## PROFIL PULPOWY BADACZA');
      expect(promptSection).toContain('Awanturnik');
      expect(promptSection).toContain('Szybka Regeneracja');
      expect(promptSection).toContain('(KON+BUD)/5');
    });

    it('returns empty string for non-pulp characters', () => {
      const classicChar: Character = {
        id: 'classic',
        name: 'Edward',
        occupation: 'Detektyw',
        rulesetVariant: 'classic',
        hp: 10,
        maxHp: 10,
        san: 50,
        maxSan: 99,
        mp: 10,
        maxMp: 10,
        skills: {},
      } as unknown as Character;

      expect(buildPlayerPulpSection(classicChar)).toBe('');
    });
  });
});
