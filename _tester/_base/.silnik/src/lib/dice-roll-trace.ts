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
