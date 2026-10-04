import {
  normalizePoisonSeverity,
  resolveAcidDamage,
  resolveFallingDamage,
  resolveFireDamage,
  resolvePoisonEffect,
  resolveSuffocationRound,
  resolveVehicleCollision,
  resolveVehicleExternalDamage,
  COC7E_VEHICLES,
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

  it('zwraca pojedyncze kości obrażeń wyłącznie dla rzeczywistego rzutu', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(resolveFallingDamage(6, { surface: 'normal', skipJumpCheck: true }).damageDiceResults).toEqual([1, 1]);
    expect(resolveFireDamage('major', 2).damageDiceResults).toEqual([1, 1]);
    expect(resolveAcidDamage('splash').damageDiceResults).toEqual([1]);
    random.mockRestore();
    expect(resolveAcidDamage('splash', 2).damageDiceResults).toEqual([]);
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

  describe('pojazdy i kolizje (Księga Strażnika str. 162-167, Tabela V i VI RAW)', () => {
    it('zawiera poprawne statystyki pojazdów z Tabeli V', () => {
      expect(COC7E_VEHICLES.standard_car).toEqual({
        id: 'standard_car',
        nameKey: 'Samochód standardowy',
        movement: 14,
        build: 4,
        armor: 2,
        passengers: 5,
      });
      expect(COC7E_VEHICLES.six_ton_truck.build).toBe(7);
      expect(COC7E_VEHICLES.eighteen_wheeler.build).toBe(9);
    });

    it('zderzenie z drzewem (Poważna kolizja) redukuje Krzepę pojazdu', () => {
      const res = resolveVehicleCollision(4, 'major', 4, { fixedBuildDamage: 2 });
      expect(res.buildDamage).toBe(2);
      expect(res.remainingBuild).toBe(2);
      // Krzepa 2 z 4 to 50% -> nakłada kość karną do prowadzenia
      expect(res.penaltyDieApplied).toBe(true);
      expect(res.destroyedInSingleEvent).toBe(false);
      expect(res.passengerDamage).toBe(0);
    });

    it('zniszczenie pojazdu w pojedynczym zdarzeniu katastrofalnym wymaga rzutu na Szczęście', () => {
      // Katastrofalne uderzenie (obrażenia 5 >= Krzepa 4)
      const resLucky = resolveVehicleCollision(4, 'catastrophic', 4, {
        fixedBuildDamage: 5,
        passengerLuck: 60,
        fixedLuckRoll: 40, // sukces w teście Szczęścia
        fixedPassengerDamage: 12,
      });
      expect(resLucky.remainingBuild).toBe(0);
      expect(resLucky.destroyedInSingleEvent).toBe(true);
      expect(resLucky.luckRollRequired).toBe(true);
      expect(resLucky.luckRollPassed).toBe(true);
      expect(resLucky.passengerKilledInstantly).toBe(false);
      expect(resLucky.passengerDamageFormula).toBe('2d10');
      expect(resLucky.passengerDamage).toBe(12);

      // Porażka w teście Szczęścia oznacza natychmiastową śmierć
      const resUnlucky = resolveVehicleCollision(4, 'catastrophic', 4, {
        fixedBuildDamage: 5,
        passengerLuck: 30,
        fixedLuckRoll: 75, // porażka
      });
      expect(resUnlucky.luckRollPassed).toBe(false);
      expect(resUnlucky.passengerKilledInstantly).toBe(true);
    });

    it('skumulowane wyzerowanie Krzepy zadaje 1K10 obrażeń bez natychmiastowego zgonu', () => {
      // Pojazd miał 1 Krzepę z 4 (wcześniej uszkodzony), drobna kolizja dobija go o 1
      const res = resolveVehicleCollision(1, 'minor', 4, {
        fixedBuildDamage: 1,
        fixedPassengerDamage: 6,
      });
      expect(res.remainingBuild).toBe(0);
      expect(res.destroyedInSingleEvent).toBe(false);
      expect(res.passengerDamageFormula).toBe('1d10');
      expect(res.passengerDamage).toBe(6);
      expect(res.passengerKilledInstantly).toBe(false);
    });

    it('obrażenia z zewnątrz: każde pełne 10 pkt odejmuje 1 Krzepę, mniejsze są ignorowane', () => {
      expect(resolveVehicleExternalDamage(4, 9)).toEqual({ buildLost: 0, remainingBuild: 4 });
      expect(resolveVehicleExternalDamage(4, 15)).toEqual({ buildLost: 1, remainingBuild: 3 });
      expect(resolveVehicleExternalDamage(4, 25)).toEqual({ buildLost: 2, remainingBuild: 2 });
      expect(resolveVehicleExternalDamage(4, 50)).toEqual({ buildLost: 5, remainingBuild: 0 });
    });
  });
});
