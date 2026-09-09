import { rollD100, rollDiceFormula } from '@/lib/dice-utils';

export interface IMagicDiceRoller {
  rollD100(): number;
  rollFormula(formula: string | number): number;
}

export class StandardMagicDiceRoller implements IMagicDiceRoller {
  rollD100(): number {
    return rollD100();
  }

  rollFormula(formula: string | number): number {
    if (typeof formula === 'number') {
      return formula;
    }
    const clean = formula.trim().toLowerCase();
    if (!clean) return 0;
    const asNum = parseInt(clean, 10);
    if (!isNaN(asNum) && asNum.toString() === clean) {
      return asNum;
    }
    // Zamiana 'k' na 'd' dla polskich formuł (np. 1k6 -> 1d6)
    const normalized = clean.replace(/k/g, 'd');
    const rolled = rollDiceFormula(normalized);
    return rolled ? Math.abs(rolled.total) : 0;
  }
}

/**
 * Deterministyczny roller kości pod testy jednostkowe.
 * Pozwala wstrzyknąć dokładne wyniki rzutów kośćmi, weryfikując każdą ścieżkę RAW.
 */
export class DeterministicMagicDiceRoller implements IMagicDiceRoller {
  private d100Queue: number[] = [];
  private formulaQueue: number[] = [];

  constructor(options?: { d100?: number[]; formula?: number[] }) {
    if (options?.d100) this.d100Queue = [...options.d100];
    if (options?.formula) this.formulaQueue = [...options.formula];
  }

  pushD100(...rolls: number[]): void {
    this.d100Queue.push(...rolls);
  }

  pushFormula(...rolls: number[]): void {
    this.formulaQueue.push(...rolls);
  }

  rollD100(): number {
    if (this.d100Queue.length > 0) {
      return this.d100Queue.shift()!;
    }
    return 50; // domyślny neutralny
  }

  rollFormula(formula: string | number): number {
    if (typeof formula === 'number') return formula;
    if (this.formulaQueue.length > 0) {
      return this.formulaQueue.shift()!;
    }
    const asNum = parseInt(formula, 10);
    return !isNaN(asNum) ? asNum : 1;
  }
}
