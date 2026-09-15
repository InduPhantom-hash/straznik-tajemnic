import { traceForD100, traceForD100Bonus, traceForDice } from '@/lib/dice-roll-trace';
import { PHYSICAL_DIE_GEOMETRY } from '@/lib/dice-geometry';

describe('DiceRollTrace', () => {
  it('uses the intended physical solid and face count for each die', () => {
    expect(PHYSICAL_DIE_GEOMETRY).toEqual({
      d3: { solid: 'triangular-prism', faces: 5 }, d4: { solid: 'tetrahedron', faces: 4 },
      d6: { solid: 'cube', faces: 6 }, d8: { solid: 'octahedron', faces: 8 },
      d10: { solid: 'pentagonal-trapezohedron', faces: 10 }, d12: { solid: 'dodecahedron', faces: 12 },
      d20: { solid: 'icosahedron', faces: 20 },
    });
  });
  it.each(['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'] as const)(
    'preserves every %s die result and total',
    (type) => {
      const trace = traceForDice(type, [1, 2], 3, 'test', 0);
      expect(trace.dice.map((die) => die.value)).toEqual([1, 2]);
      expect(trace.total).toBe(3);
      expect(trace.dice.every((die) => die.type === type)).toBe(true);
    }
  );

  it('represents 00 + 0 as 100 with separate tens and units dice', () => {
    const trace = traceForD100(100, 'test');
    expect(trace.dice).toEqual([
      expect.objectContaining({ role: 'tens', value: 0, type: 'd10' }),
      expect.objectContaining({ role: 'units', value: 0, type: 'd10' }),
    ]);
    expect(trace.total).toBe(100);
  });

  it('keeps every bonus/penalty tens die and marks only the chosen die', () => {
    const trace = traceForD100Bonus(25, [20, 70], 5, 1, 'test');
    expect(trace.dice.map((die) => die.role)).toEqual(['tens', 'bonus', 'units']);
    expect(trace.dice.map((die) => die.selected)).toEqual([true, false, true]);
    expect(trace.dice.map((die) => die.value)).toEqual([20, 70, 5]);
  });
});
