import {
  COC7E_POISONS,
  resolveFallingDamage,
  resolveFireDamage,
  resolveAcidDamage,
  resolveSuffocationRound,
  getMaxHoldBreathRounds,
  resolvePoisonEffect,
} from '@/lib/hazards-engine';

describe('hazards-engine CoC 7e RAW', () => {
  describe('Falling Damage (Upadki)', () => {
    it('poprawnie wylicza kości bazowe dla wysokości 3m, 6m, 9m i prędkości granicznej 30m+', () => {
      const fall3m = resolveFallingDamage(3, { skipJumpCheck: true, fixedDamageRoll: 4 });
      expect(fall3m.baseDiceCount).toBe(1);
      expect(fall3m.finalDamage).toBe(4);
      expect(fall3m.isTerminal).toBe(false);

      const fall6m = resolveFallingDamage(6, { skipJumpCheck: true, fixedDamageRoll: 7 });
      expect(fall6m.baseDiceCount).toBe(2);
      expect(fall6m.finalDamage).toBe(7);

      const fall9m = resolveFallingDamage(9, { skipJumpCheck: true, fixedDamageRoll: 11 });
      expect(fall9m.baseDiceCount).toBe(3);

      const fall35m = resolveFallingDamage(35, { skipJumpCheck: true, fixedDamageRoll: 35 });
      expect(fall35m.baseDiceCount).toBe(10);
      expect(fall35m.isTerminal).toBe(true);
    });

    it('amortyzuje upadek testem Skakania (Jump) zależnie od poziomu sukcesu', () => {
      // Skok ze zwykłym sukcesem (CON/Jump = 50, rzut 40 -> regular) redukuje o 1k6
      const fallRegular = resolveFallingDamage(6, {
        jumpSkillValue: 50,
        jumpRollTotal: 40,
        fixedDamageRoll: 3,
      });
      expect(fallRegular.jumpRoll?.outcome).toBe('regular');
      expect(fallRegular.jumpRoll?.diceReduced).toBe(1);
      expect(fallRegular.effectiveDiceCount).toBe(1); // 2k6 - 1k6 = 1k6

      // Skok z trudnym sukcesem (Jump = 50, rzut 20 -> hard <= 25) redukuje o 2k6
      const fallHard = resolveFallingDamage(9, {
        jumpSkillValue: 50,
        jumpRollTotal: 20,
        fixedDamageRoll: 4,
      });
      expect(fallHard.jumpRoll?.outcome).toBe('hard');
      expect(fallHard.jumpRoll?.diceReduced).toBe(2);
      expect(fallHard.effectiveDiceCount).toBe(1); // 3k6 - 2k6 = 1k6

      // Skok z ekstremalnym sukcesem przy upadku z 6m completely nullifies damage
      const fallExtreme = resolveFallingDamage(6, {
        jumpSkillValue: 50,
        jumpRollTotal: 5,
      });
      expect(fallExtreme.jumpRoll?.outcome).toBe('extreme');
      expect(fallExtreme.effectiveDiceCount).toBe(0);
      expect(fallExtreme.finalDamage).toBe(0);

      // Porażka w skoku (rzut 80 > 50) nie daje redukcji
      const fallFail = resolveFallingDamage(6, {
        jumpSkillValue: 50,
        jumpRollTotal: 80,
        fixedDamageRoll: 8,
      });
      expect(fallFail.jumpRoll?.outcome).toBe('fail');
      expect(fallFail.jumpRoll?.diceReduced).toBe(0);
      expect(fallFail.effectiveDiceCount).toBe(2);
      expect(fallFail.finalDamage).toBe(8);
    });

    it('podłoże miękkie (soft) redukuje obrażenia o połowę', () => {
      const softFall = resolveFallingDamage(6, {
        surface: 'soft',
        skipJumpCheck: true,
        fixedDamageRoll: 10,
      });
      expect(softFall.halvedBySurface).toBe(true);
      expect(softFall.finalDamage).toBe(5); // 10 / 2 = 5
    });
  });

  describe('Fire & Acid Damage (Ogień i kwas)', () => {
    it('oblicza obrażenia od ognia i ignoruje pancerz', () => {
      const minor = resolveFireDamage('minor', 1, 4);
      expect(minor.damageRolled).toBe(4);
      expect(minor.ignoresArmor).toBe(true);

      const major = resolveFireDamage('major', 2, 14);
      expect(major.rounds).toBe(2);
      expect(major.damageRolled).toBe(14);
      expect(major.ignoresArmor).toBe(true);
    });

    it('oblicza obrażenia od kwasu z pominięciem pancerza', () => {
      const splash = resolveAcidDamage('splash', 4);
      expect(splash.damageRolled).toBe(4);
      expect(splash.ignoresArmor).toBe(true);

      const immersion = resolveAcidDamage('immersion', 9);
      expect(immersion.damageRolled).toBe(9);
      expect(immersion.ignoresArmor).toBe(true);
    });
  });

  describe('Suffocation & Drowning (Uduszenie i tonięcie)', () => {
    it('poprawnie wyznacza liczbę rund wstrzymania tchu (CON/5 oraz CON/10)', () => {
      expect(getMaxHoldBreathRounds(60, false)).toBe(12); // 60 / 5 = 12
      expect(getMaxHoldBreathRounds(60, true)).toBe(6); // 60 / 10 = 6
      expect(getMaxHoldBreathRounds(20, true)).toBe(2); // 20 / 10 = 2
    });

    it('stosuje rosnące kości karne co rundę bez powietrza', () => {
      // Runda 1: brak kości karnych
      const r1 = resolveSuffocationRound(60, 1, { fixedRoll: 40 });
      expect(r1.penaltyDice).toBe(0);
      expect(r1.conRoll.success).toBe(true);
      expect(r1.damageTaken).toBe(0);

      // Runda 2: 1 kość karna
      const r2 = resolveSuffocationRound(60, 2, { fixedRoll: 70, fixedDamage: 5 });
      expect(r2.penaltyDice).toBe(-1);
      expect(r2.conRoll.success).toBe(false);
      expect(r2.damageTaken).toBe(5);

      // Runda 3+: 2 kości karne
      const r3 = resolveSuffocationRound(60, 3, { fixedRoll: 85, fixedDamage: 6 });
      expect(r3.penaltyDice).toBe(-2);
      expect(r3.conRoll.success).toBe(false);
      expect(r3.damageTaken).toBe(6);
    });
  });

  describe('Poison Table IV (Tabela Trucizn CoC 7e RAW)', () => {
    it('zawiera komplet 9 kanonicznych trucizn z prawidłowymi trudnościami', () => {
      expect(COC7E_POISONS.length).toBe(9);
      const cyanide = COC7E_POISONS.find((p) => p.id === 'cyanide');
      expect(cyanide?.difficulty).toBe('extreme');
      expect(cyanide?.isFatalOnFailure).toBe(true);

      const arsenic = COC7E_POISONS.find((p) => p.id === 'arsenic');
      expect(arsenic?.difficulty).toBe('hard');

      const chloroform = COC7E_POISONS.find((p) => p.id === 'chloroform');
      expect(chloroform?.difficulty).toBe('regular');
      expect(chloroform?.causesUnconsciousness).toBe(true);
    });

    it('cyjanek: porażka w teście ekstremalnym CON (rzut > CON/5) oznacza stan śmiertelny', () => {
      // CON = 60, próg ekstremalny = 12. Rzut 25 to hard, ale nie extreme -> porażka testu
      const res = resolvePoisonEffect('cyanide', 60, { fixedRoll: 25, fixedDamage: 18 });
      expect(res.conRoll.passedRequirement).toBe(false);
      expect(res.isFatal).toBe(true);
      expect(res.damageTaken).toBe(18);

      // Rzut 10 <= 12 -> sukces ekstremalny
      const passRes = resolvePoisonEffect('cyanide', 60, { fixedRoll: 10, fixedDamage: 6 });
      expect(passRes.conRoll.passedRequirement).toBe(true);
      expect(passRes.isFatal).toBe(false);
      expect(passRes.damageTaken).toBe(6);
    });

    it('chloroform: powoduje utratę przytomności', () => {
      const res = resolvePoisonEffect('chloroform', 60, { fixedRoll: 80 });
      expect(res.unconscious).toBe(true);
      expect(res.damageTaken).toBe(0);
    });
  });
});
