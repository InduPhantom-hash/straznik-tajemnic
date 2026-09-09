import {
  normalizePoisonSeverity,
  resolveAcidDamage,
  resolveFallingDamage,
  resolveFireDamage,
  resolvePoisonEffect,
  resolveSuffocationRound,
} from '@/lib/hazards-engine';

describe('hazards-engine CoC 7e RAW', () => {
  describe('upadki', () => {
    it('nie zaokrągla rozpoczętego odcinka 3 m w dół', () => {
      expect(resolveFallingDamage(3.1, { skipJumpCheck: true, fixedDamageRoll: 2 }).baseDiceCount).toBe(2);
    });

    it('nalicza kość za każde rozpoczęte 3 m i ogranicza wynik do 10 kości', () => {
      expect(resolveFallingDamage(1, { skipJumpCheck: true, fixedDamageRoll: 2 }).baseDiceCount).toBe(1);
      expect(resolveFallingDamage(4, { skipJumpCheck: true, fixedDamageRoll: 7 }).baseDiceCount).toBe(2);
      const terminal = resolveFallingDamage(35, { skipJumpCheck: true, fixedDamageRoll: 40 });
      expect(terminal.baseDiceCount).toBe(10);
      expect(terminal.isTerminal).toBe(true);
    });

    it.each([
      ['soft', 3, '2d3'],
      ['water', 3, '2d3'],
      ['normal', 6, '2d6'],
      ['hard', 10, '2d10'],
    ] as const)('dobiera kość RAW dla podłoża %s', (surface, die, formula) => {
      const result = resolveFallingDamage(6, { surface, skipJumpCheck: true, fixedDamageRoll: 8 });
      expect(result.damageDie).toBe(die);
      expect(result.damageFormula).toBe(formula);
    });

    it.each([
      [40, 'regular'],
      [20, 'hard'],
      [5, 'extreme'],
    ] as const)('każdy sukces Skakania odejmuje dokładnie jedną kość', (roll, outcome) => {
      const result = resolveFallingDamage(9, {
        jumpSkillValue: 50,
        jumpRollTotal: roll,
        fixedDamageRoll: 7,
      });
      expect(result.jumpRoll?.outcome).toBe(outcome);
      expect(result.jumpRoll?.diceReduced).toBe(1);
      expect(result.effectiveDiceCount).toBe(2);
    });
  });

  it('stosuje tabelę RAW dla ognia i kwasu', () => {
    expect(resolveFireDamage('minor', 1, 4).damageFormula).toBe('1x(1d6)');
    expect(resolveFireDamage('major', 2, 13).damageFormula).toBe('2x(1d10)');
    expect(resolveAcidDamage('splash', 2).damageFormula).toBe('1d3');
    expect(resolveAcidDamage('immersion', 5).damageFormula).toBe('1d6');
  });

  describe('uduszenie i tonięcie', () => {
    it('testuje CON co rundę do pierwszej porażki', () => {
      const success = resolveSuffocationRound(60, 1, { kind: 'smoke', fixedRoll: 40 });
      expect(success.conRoll?.success).toBe(true);
      expect(success.damageTaken).toBe(0);

      const failure = resolveSuffocationRound(60, 2, {
        kind: 'smoke', fixedRoll: 80, fixedDamage: 3, currentHp: 3,
      });
      expect(failure.conFailed).toBe(true);
      expect(failure.damageFormula).toBe('1d3');
      expect(failure.damageTaken).toBe(3);
      expect(failure.deathAtZero).toBe(true);
    });

    it('po pierwszej porażce zadaje obrażenia bez kolejnego testu', () => {
      const result = resolveSuffocationRound(60, 3, {
        kind: 'water', conFailed: true, fixedDamage: 5,
      });
      expect(result.conRoll).toBeNull();
      expect(result.damageFormula).toBe('1d6');
      expect(result.damageTaken).toBe(5);
    });
  });

  describe('trucizny', () => {
    it('używa kategorii obrażeń RAW', () => {
      expect(resolvePoisonEffect('mild', 60, { fixedRoll: 80, fixedDamage: 8 }).damageFormulaUsed).toBe('1d10');
      expect(resolvePoisonEffect('strong', 60, { fixedRoll: 80, fixedDamage: 14 }).damageFormulaUsed).toBe('2d10');
      expect(resolvePoisonEffect('lethal', 60, { fixedRoll: 80, fixedDamage: 25 }).damageFormulaUsed).toBe('4d10');
    });

    it('ekstremalny CON zmniejsza obrażenia o połowę z zaokrągleniem w dół', () => {
      const result = resolvePoisonEffect('lethal', 60, { fixedRoll: 10, fixedDamage: 25 });
      expect(result.conRoll.extremeSuccess).toBe(true);
      expect(result.damageTaken).toBe(12);
    });

    it('normalizuje stare nazwy i POT wyłącznie podczas migracji', () => {
      expect(normalizePoisonSeverity('cyanide')).toBe('lethal');
      expect(normalizePoisonSeverity('nieznana')).toBeNull();
      expect(normalizePoisonSeverity(undefined, 65)).toBe('strong');
    });
  });
});
