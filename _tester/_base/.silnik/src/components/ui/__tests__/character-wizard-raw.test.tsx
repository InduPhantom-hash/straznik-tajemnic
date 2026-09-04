import '@testing-library/jest-dom';
import {
  distributePhysPenalty,
  applyTeenPenalty,
  calculateDerived,
  getMovement,
  getWealthInfo,
} from '@/lib/character';
import { AGE_MODIFIERS, WEALTH_TABLE } from '@/lib/data/character';
import type { CharacterStats } from '@/lib/data/character';

describe('Character Wizard CoC 7e RAW Mechanics', () => {
  describe('distributePhysPenalty', () => {
    it('distributes 5 points penalty across STR, CON, DEX without dropping below 15', () => {
      const stats = { str: 60, con: 50, dex: 70 };
      const initialSum = stats.str + stats.con + stats.dex;
      const result = distributePhysPenalty(stats, 5);

      const newSum = result.str + result.con + result.dex;
      expect(initialSum - newSum).toBe(5);
      expect(result.str).toBeGreaterThanOrEqual(15);
      expect(result.con).toBeGreaterThanOrEqual(15);
      expect(result.dex).toBeGreaterThanOrEqual(15);
    });

    it('distributes large age penalties (e.g. 80 pts for 80+ years) respecting minStat floor 15', () => {
      const stats = { str: 40, con: 40, dex: 40 };
      const result = distributePhysPenalty(stats, 80, 15);

      expect(result.str).toBeGreaterThanOrEqual(15);
      expect(result.con).toBeGreaterThanOrEqual(15);
      expect(result.dex).toBeGreaterThanOrEqual(15);
    });
  });

  describe('applyTeenPenalty', () => {
    it('deducts 5 points combined from STR or SIZ, and 5 points from EDU', () => {
      const stats = { str: 60, siz: 55, edu: 60 };
      const result = applyTeenPenalty(stats);

      const physicalDiff = (stats.str + stats.siz) - (result.str + result.siz);
      expect(physicalDiff).toBe(5);
      expect(result.edu).toBe(55);
    });

    it('does not reduce stats below 15 for teenagers', () => {
      const stats = { str: 18, siz: 16, edu: 18 };
      const result = applyTeenPenalty(stats, 15);

      expect(result.str).toBeGreaterThanOrEqual(15);
      expect(result.siz).toBeGreaterThanOrEqual(15);
      expect(result.edu).toBeGreaterThanOrEqual(15);
    });
  });

  describe('getMovement & calculateDerived', () => {
    it('applies age penalties to movement rate according to CoC 7e RAW', () => {
      // str > siz && dex > siz -> base 9
      expect(getMovement(70, 70, 50, 25)).toBe(9);
      expect(getMovement(70, 70, 50, 45)).toBe(8); // -1 at 40s
      expect(getMovement(70, 70, 50, 55)).toBe(7); // -2 at 50s
      expect(getMovement(70, 70, 50, 65)).toBe(6); // -3 at 60s
      expect(getMovement(70, 70, 50, 75)).toBe(5); // -4 at 70s
      expect(getMovement(70, 70, 50, 85)).toBe(4); // -5 at 80+
    });

    it('calculates derived stats (hp, san, mp, damageBonus, build, movement)', () => {
      const stats: CharacterStats = {
        str: 60,
        con: 50,
        siz: 70,
        dex: 65,
        app: 50,
        int: 70,
        pow: 60,
        edu: 75,
        luck: 50,
      };
      const derived = calculateDerived(stats, 25);

      expect(derived.hp).toBe(12); // (50 + 70) / 10 = 12
      expect(derived.san).toBe(60); // pow
      expect(derived.mp).toBe(12); // 60 / 5 = 12
      expect(derived.build).toBe(1); // str + siz = 130 -> build 1, db +1K4
      expect(derived.damageBonus).toBe('+1K4');
      expect(derived.movement).toBe(7); // both str (60) and dex (65) < siz (70) -> base 7
    });
  });

  describe('WEALTH_TABLE and AGE_MODIFIERS data integrity', () => {
    it('contains i18n keys for all wealth levels', () => {
      expect(WEALTH_TABLE.length).toBe(6);
      WEALTH_TABLE.forEach((tier) => {
        expect(tier.key).toBeDefined();
        expect(typeof tier.key).toBe('string');
      });
    });

    it('contains i18n keys for all age brackets', () => {
      expect(AGE_MODIFIERS.length).toBe(7);
      AGE_MODIFIERS.forEach((mod) => {
        expect(mod.key).toBeDefined();
        expect(typeof mod.key).toBe('string');
      });
    });

    it('returns proper wealth tier for Credit Rating values', () => {
      expect(getWealthInfo(0).key).toBe('pauper');
      expect(getWealthInfo(5).key).toBe('poor');
      expect(getWealthInfo(20).key).toBe('average');
      expect(getWealthInfo(60).key).toBe('wealthy');
      expect(getWealthInfo(95).key).toBe('rich');
      expect(getWealthInfo(99).key).toBe('superrich');
    });
  });
});
