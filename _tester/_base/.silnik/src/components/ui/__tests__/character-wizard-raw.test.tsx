import fs from 'node:fs';
import path from 'node:path';
import '@testing-library/jest-dom';
import enMessages from '../../../../messages/en.json';
import plMessages from '../../../../messages/pl.json';
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

  describe('CharacterWizard i18n and conventions', () => {
    it('defines localized ruleset conventions and close button in PL and EN', () => {
      const pl = (plMessages as unknown as { CharacterWizard: Record<string, string> }).CharacterWizard;
      const en = (enMessages as unknown as { CharacterWizard: Record<string, string> }).CharacterWizard;

      expect(pl.rulesetConventionLabel).toBe('Konwencja reguł:');
      expect(en.rulesetConventionLabel).toBe('Rules convention:');

      expect(pl.rulesetClassic).toBe('Klasyczny');
      expect(en.rulesetClassic).toBe('Classic');

      expect(pl.rulesetPulp).toBe('Pulp');
      expect(en.rulesetPulp).toBe('Pulp');

      expect(pl.rulesetClassicShort).toBe('Klasyczny');
      expect(en.rulesetClassicShort).toBe('Classic');

      expect(pl.rulesetPulpShort).toBe('Pulp');
      expect(en.rulesetPulpShort).toBe('Pulp');

      expect(pl.rulesetClassicExplanation).toBeDefined();
      expect(en.rulesetClassicExplanation).toBeDefined();
      expect(pl.rulesetPulpExplanation).toBeDefined();
      expect(en.rulesetPulpExplanation).toBeDefined();

      expect(pl.close).toBe('Zamknij');
      expect(en.close).toBe('Close');
    });

    it('defines split skill counters i18n keys in PL and EN (Issue #411)', () => {
      const pl = (plMessages as unknown as { CharacterWizard: Record<string, string> }).CharacterWizard;
      const en = (enMessages as unknown as { CharacterWizard: Record<string, string> }).CharacterWizard;

      expect(pl.occupationPointsTitle).toBe('Punkty zawodowe');
      expect(en.occupationPointsTitle).toBe('Occupation points');

      expect(pl.interestPointsTitle).toBe('Punkty zainteresowań');
      expect(en.interestPointsTitle).toBe('Personal interest points');

      expect(pl.pointsSpentRatio).toBe('Wydano: {used} / {available} pkt');
      expect(en.pointsSpentRatio).toBe('Spent: {used} / {available} pts');

      expect(pl.pointsRemainingShort).toBe('Pozostało');
      expect(en.pointsRemainingShort).toBe('Remaining');

      expect(pl.creditRatingIncluded).toBe('(w tym Majętność: {count} pkt)');
      expect(en.creditRatingIncluded).toBe('(incl. Credit Rating: {count} pts)');

      expect(pl.hobbiesAndExcess).toBe('hobby i umiejętności poboczne');
      expect(en.hobbiesAndExcess).toBe('hobbies & personal interests');
    });

    it('defines reset skills button and confirmation modal i18n keys in PL and EN (Issue #433)', () => {
      const pl = (plMessages as unknown as { CharacterWizard: Record<string, string> }).CharacterWizard;
      const en = (enMessages as unknown as { CharacterWizard: Record<string, string> }).CharacterWizard;

      expect(pl.resetSkills).toBe('Resetuj punkty');
      expect(en.resetSkills).toBe('Reset points');

      expect(pl.resetSkillsConfirmTitle).toBe('Zresetować przydział punktów?');
      expect(en.resetSkillsConfirmTitle).toBe('Reset skill allocation?');

      expect(pl.resetSkillsConfirmDesc).toContain('{creditMin}');
      expect(en.resetSkillsConfirmDesc).toContain('{creditMin}');

      expect(pl.resetSkillsConfirmAction).toBe('Zresetuj punkty');
      expect(en.resetSkillsConfirmAction).toBe('Reset points');

      expect(pl.cancel).toBe('Anuluj');
      expect(en.cancel).toBe('Cancel');
    });

    it('enforces 2K responsiveness and no artificial max-h in Step 4 and Step 5 (Issue #435)', () => {
      const wizardPath = path.resolve(__dirname, '../character-wizard.tsx');
      const wizardCode = fs.readFileSync(wizardPath, 'utf8');

      // Step 4 skills grid should use 2xl:grid-cols-4 and not have max-h-[45vh]
      expect(wizardCode).not.toContain('max-h-[45vh]');
      expect(wizardCode).toContain('2xl:grid-cols-4');

      // Step 5 biography should not restrict grid to max-h-[60vh]
      expect(wizardCode).not.toContain('max-h-[60vh]');
      expect(wizardCode).toContain('2xl:h-36');
      expect(wizardCode).toContain('2xl:min-h-[280px]');

      // dialog.tsx wide variant responsiveness
      const dialogPath = path.resolve(__dirname, '../dialog.tsx');
      const dialogCode = fs.readFileSync(dialogPath, 'utf8');
      expect(dialogCode).toContain('2xl:w-[85vw]');
      expect(dialogCode).toContain('2xl:h-[84vh]');
    });
  });
});
