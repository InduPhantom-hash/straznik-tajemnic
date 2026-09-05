/**
 * @file opposed-rolls.test.ts
 * Testy jednostkowe silnika testów przeciwstawnych CoC 7e RAW (opposed-rolls.ts).
 */

import {
  evaluateOpposedResolution,
  calculateOpposedThresholds,
  rollSide,
  rollAndResolveOpposed,
  formatOpposedRollForChat,
  formatOpposedRollForSystemContext,
  type OpposedRollSideResult,
} from '@/lib/opposed-rolls';

function createMockSide(
  name: string,
  skillName: string,
  skillValue: number,
  outcome: OpposedRollSideResult['outcome'],
  total: number = 50,
  bonusDice: number = 0
): OpposedRollSideResult {
  return {
    name,
    skillName,
    skillValue,
    bonusDice,
    total,
    tensResults: [Math.floor(total / 10) * 10],
    unitsResult: total % 10,
    outcome,
    thresholds: calculateOpposedThresholds(skillValue),
  };
}

describe('opposed-rolls (CoC 7e RAW)', () => {
  describe('Hierarchia stopni sukcesu', () => {
    it('Krytyk (01) bije Sukces Ekstremalny', () => {
      const sideA = createMockSide('Badacz', 'Siła', 60, 'critical', 1);
      const sideB = createMockSide('Kultysta', 'Siła', 80, 'extreme', 12);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('sideA');
      expect(res.tieBreaker).toBe('outcome_rank');
      expect(res.isDraw).toBe(false);
      expect(res.winnerName).toBe('Badacz');
    });

    it('Sukces Ekstremalny bije Trudny Sukces', () => {
      const sideA = createMockSide('Badacz', 'Ukrywanie', 50, 'hard', 25);
      const sideB = createMockSide('Strażnik', 'Spostrzegawczość', 60, 'extreme', 10);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('sideB');
      expect(res.tieBreaker).toBe('outcome_rank');
      expect(res.winnerName).toBe('Strażnik');
    });

    it('Trudny Sukces bije Zwykły Sukces', () => {
      const sideA = createMockSide('Badacz', 'Zastraszanie', 70, 'hard', 30);
      const sideB = createMockSide('Świadek', 'Psychologia', 50, 'regular', 45);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('sideA');
      expect(res.tieBreaker).toBe('outcome_rank');
    });

    it('Zwykły Sukces bije Porażkę', () => {
      const sideA = createMockSide('Badacz', 'Zręczność', 40, 'regular', 35);
      const sideB = createMockSide('Prześladowca', 'Zręczność', 80, 'fail', 85);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('sideA');
      expect(res.tieBreaker).toBe('outcome_rank');
    });

    it('Zwykły Sukces bije Fumble', () => {
      const sideA = createMockSide('Badacz', 'Siła', 50, 'regular', 40);
      const sideB = createMockSide('Potwór', 'Siła', 40, 'fumble', 98);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('sideA');
      expect(res.tieBreaker).toBe('outcome_rank');
    });
  });

  describe('Obopólna porażka (Mutual Failure)', () => {
    it('gdy obie strony poniosą zwykłą porażkę (fail vs fail), wynik to impas', () => {
      const sideA = createMockSide('Badacz', 'Skradanie', 50, 'fail', 65);
      const sideB = createMockSide('Kultysta', 'Nasłuchiwanie', 60, 'fail', 75);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('draw');
      expect(res.tieBreaker).toBe('mutual_failure');
      expect(res.isDraw).toBe(true);
      expect(res.canReroll).toBe(true);
    });

    it('gdy jedna strona ma fail, a druga fumble, nikt nie osiąga sukcesu', () => {
      const sideA = createMockSide('Badacz', 'Skradanie', 30, 'fumble', 99);
      const sideB = createMockSide('Kultysta', 'Nasłuchiwanie', 50, 'fail', 80);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('draw');
      expect(res.tieBreaker).toBe('mutual_failure');
      expect(res.isDraw).toBe(true);
    });

    it('gdy obie strony wyrzucą fumble, wynik to obopólna porażka', () => {
      const sideA = createMockSide('Badacz', 'Siła', 40, 'fumble', 97);
      const sideB = createMockSide('Kultysta', 'Siła', 45, 'fumble', 100);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('draw');
      expect(res.tieBreaker).toBe('mutual_failure');
    });
  });

  describe('Rozstrzyganie remisów stopni sukcesu (Tie-breaker CoC 7e RAW)', () => {
    it('przy tym samym stopniu sukcesu (obaj zwykły) wygrywa strona o wyższej wartości bazowej', () => {
      const sideA = createMockSide('Badacz', 'Siła', 65, 'regular', 40);
      const sideB = createMockSide('Zbir', 'Siła', 50, 'regular', 30);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('sideA');
      expect(res.tieBreaker).toBe('skill_value');
      expect(res.winnerName).toBe('Badacz');
    });

    it('przy tym samym stopniu sukcesu (obaj trudny) wygrywa strona o wyższej wartości bazowej (nawet jeśli jej rzut był wyższy)', () => {
      const sideA = createMockSide('Badacz', 'Perswazja', 60, 'hard', 28); // 28 <= 30
      const sideB = createMockSide('Detektyw', 'Psychologia', 70, 'hard', 32); // 32 <= 35

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('sideB');
      expect(res.tieBreaker).toBe('skill_value');
      expect(res.winnerName).toBe('Detektyw');
    });

    it('przy remisie absolutnym (ten sam stopień sukcesu i ta sama wartość bazowa) występuje pat z opcją reroll', () => {
      const sideA = createMockSide('Badacz', 'Siłowanie', 55, 'regular', 42);
      const sideB = createMockSide('Rywale', 'Siłowanie', 55, 'regular', 23);

      const res = evaluateOpposedResolution(sideA, sideB);
      expect(res.winner).toBe('draw');
      expect(res.tieBreaker).toBe('exact_tie');
      expect(res.isDraw).toBe(true);
      expect(res.canReroll).toBe(true);
    });
  });

  describe('calculateOpposedThresholds', () => {
    it('poprawnie wylicza progi CoC 7e dla wartości standardowej 65%', () => {
      const thresholds = calculateOpposedThresholds(65);
      expect(thresholds.regular).toBe(65);
      expect(thresholds.hard).toBe(32);
      expect(thresholds.extreme).toBe(13);
      expect(thresholds.fumble).toBe(100);
    });

    it('poprawnie wylicza próg fumble 96 dla umiejętności poniżej 50%', () => {
      const thresholds = calculateOpposedThresholds(45);
      expect(thresholds.regular).toBe(45);
      expect(thresholds.hard).toBe(22);
      expect(thresholds.extreme).toBe(9);
      expect(thresholds.fumble).toBe(96);
    });
  });

  describe('rollSide i rollAndResolveOpposed', () => {
    it('wykonuje rzut dla strony z uwzględnieniem kości premiowej', () => {
      const sideResult = rollSide({
        name: 'Badacz',
        skillName: 'Spostrzegawczość',
        skillValue: 60,
        bonusDice: 1,
      });

      expect(sideResult.name).toBe('Badacz');
      expect(sideResult.skillValue).toBe(60);
      expect(sideResult.total).toBeGreaterThanOrEqual(1);
      expect(sideResult.total).toBeLessThanOrEqual(100);
      expect(sideResult.tensResults.length).toBe(2); // 1 bazowa + 1 premiowa
    });

    it('wykonuje pełne losowanie i rozstrzygnięcie dwóch stron', () => {
      const res = rollAndResolveOpposed(
        { name: 'Gracz', skillName: 'STR', skillValue: 50 },
        { name: 'Wróg', skillName: 'STR', skillValue: 50 }
      );

      expect(['sideA', 'sideB', 'draw']).toContain(res.winner);
      expect(res.sideA.total).toBeGreaterThanOrEqual(1);
      expect(res.sideB.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Formatowanie czatu i kontekstu systemowego', () => {
    it('formatOpposedRollForChat generuje czytelny opis z werdyktem', () => {
      const sideA = createMockSide('Badacz', 'Siła', 65, 'regular', 40);
      const sideB = createMockSide('Zbir', 'Siła', 50, 'regular', 30);
      const res = evaluateOpposedResolution(sideA, sideB);

      const text = formatOpposedRollForChat(res);
      expect(text).toContain('Badacz');
      expect(text).toContain('Zbir');
      expect(text).toContain('Zwycięża');
      expect(text).toContain('wyższą wartością bazową');
    });

    it('formatOpposedRollForSystemContext tworzy poprawny JSON do narracji MG', () => {
      const sideA = createMockSide('Badacz', 'Siła', 65, 'regular', 40);
      const sideB = createMockSide('Zbir', 'Siła', 50, 'fail', 80);
      const res = evaluateOpposedResolution(sideA, sideB);

      const jsonStr = formatOpposedRollForSystemContext(res);
      const parsed = JSON.parse(jsonStr);
      expect(parsed.type).toBe('opposed_roll_resolution');
      expect(parsed.winner).toBe('sideA');
      expect(parsed.sideA.value).toBe(65);
      expect(parsed.sideB.value).toBe(50);
    });
  });
});
