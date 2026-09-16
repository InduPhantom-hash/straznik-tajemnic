export type PhysicalDieType = 'd3' | 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

export interface DiceRollTraceDie {
  id: string;
  type: PhysicalDieType;
  value: number;
  role: 'die' | 'damage' | 'tens' | 'units' | 'bonus' | 'penalty';
  selected?: boolean;
}

export interface DiceRollTrace {
  dice: DiceRollTraceDie[];
  total: number;
  modifier: number;
  formula?: string;
  source: string;
}

export function traceForDice(type: PhysicalDieType, values: number[], total: number, source: string, modifier = 0): DiceRollTrace {
  return { dice: values.map((value, index) => ({ id: `${type}-${index}`, type, value, role: 'die', selected: true })), total, modifier, source };
}

export function traceForD100(total: number, source: string): DiceRollTrace {
  const raw = total === 100 ? 0 : total;
  return {
    total,
    modifier: 0,
    source,
    dice: [
      { id: 'tens', type: 'd10', value: Math.floor(raw / 10) * 10, role: 'tens', selected: true },
      { id: 'units', type: 'd10', value: raw % 10, role: 'units', selected: true },
    ],
  };
}

export function traceForD100Bonus(total: number, tens: number[], units: number, bonus: number, source: string): DiceRollTrace {
  const selectedTens = total === 100 ? 0 : Math.floor(total / 10) * 10;
  let selected = false;
  return {
    total, modifier: 0, source,
    dice: [
      ...tens.map((value, index) => {
        const isSelected = !selected && value === selectedTens;
        if (isSelected) selected = true;
        return { id: `tens-${index}`, type: 'd10' as const, value, role: index === 0 ? 'tens' as const : bonus > 0 ? 'bonus' as const : 'penalty' as const, selected: isSelected };
      }),
      { id: 'units', type: 'd10', value: units, role: 'units', selected: true },
    ],
  };
}

export function traceForFormula(formula: string, source = 'formula'): DiceRollTrace {
  const clean = formula.toLowerCase().replace(/k/g, 'd').trim();
  const regex = /([+-]?\s*(?:\d+)?d\d+|[+-]?\s*\d+)/g;
  const matches = clean.match(regex);

  if (!matches) {
    const raw = Math.floor(Math.random() * 100) + 1;
    return traceForD100(raw, source);
  }

  const dice: DiceRollTraceDie[] = [];
  let modifier = 0;
  let total = 0;
  let dieIdx = 0;

  for (let token of matches) {
    token = token.replace(/\s+/g, '');
    if (!token) continue;

    if (token.includes('d')) {
      const sign = token.startsWith('-') ? -1 : 1;
      const unsigned = token.replace(/^[+-]/, '');
      const parts = unsigned.split('d');
      const count = parts[0] === '' ? 1 : Math.min(10, Math.max(1, parseInt(parts[0], 10)));
      const sides = parseInt(parts[1], 10);

      if (sides === 100) {
        for (let c = 0; c < count; c++) {
          const raw = Math.floor(Math.random() * 100) + 1;
          const val = raw === 100 ? 0 : raw;
          const tens = Math.floor(val / 10) * 10;
          const units = val % 10;
          dice.push({ id: `tens-${dieIdx}`, type: 'd10', value: tens, role: 'tens', selected: true });
          dice.push({ id: `units-${dieIdx}`, type: 'd10', value: units, role: 'units', selected: true });
          total += sign * raw;
          dieIdx++;
        }
      } else {
        let dieType: PhysicalDieType = 'd6';
        if (sides <= 3) dieType = 'd3';
        else if (sides <= 4) dieType = 'd4';
        else if (sides <= 6) dieType = 'd6';
        else if (sides <= 8) dieType = 'd8';
        else if (sides <= 10) dieType = 'd10';
        else if (sides <= 12) dieType = 'd12';
        else dieType = 'd20';

        for (let c = 0; c < count; c++) {
          const val = Math.floor(Math.random() * sides) + 1;
          dice.push({ id: `${dieType}-${dieIdx++}`, type: dieType, value: val, role: 'die', selected: true });
          total += sign * val;
        }
      }
    } else {
      const modVal = parseInt(token, 10);
      if (!isNaN(modVal)) {
        modifier += modVal;
        total += modVal;
      }
    }
  }

  return {
    dice,
    total,
    modifier,
    formula,
    source,
  };
}

