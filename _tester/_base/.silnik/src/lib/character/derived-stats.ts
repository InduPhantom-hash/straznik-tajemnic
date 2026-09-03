/**
 * Obliczenia cech pochodnych CoC 7e (HP/SAN/MP/damageBonus/build/movement) + wealth lookup.
 *
 * IND-123 (sesja 90) — wyodrębnione z character-wizard.tsx Faza 2.
 */

import {
  type CharacterStats,
  type DerivedStats,
  DAMAGE_BUILD_TABLE,
  WEALTH_TABLE,
} from '@/lib/data/character';

export function getDamageAndBuild(
  str: number,
  siz: number
): { damageBonus: string; build: number } {
  const sum = str + siz;
  for (const row of DAMAGE_BUILD_TABLE) {
    if (sum >= row.min && sum <= row.max) {
      return { damageBonus: row.damageBonus, build: row.build };
    }
  }
  return { damageBonus: '+5K6', build: 6 }; // dla sum > 524
}

export function getMovement(
  str: number,
  dex: number,
  siz: number,
  age: number
): number {
  let base = 8;
  if (dex < siz && str < siz) base = 7;
  if (dex > siz && str > siz) base = 9;
  // Modyfikator wieku
  if (age >= 40 && age < 50) base -= 1;
  if (age >= 50 && age < 60) base -= 2;
  if (age >= 60 && age < 70) base -= 3;
  if (age >= 70 && age < 80) base -= 4;
  if (age >= 80) base -= 5;
  return Math.max(1, base);
}

export function calculateDerived(
  stats: CharacterStats,
  age: number
): DerivedStats {
  const hp = Math.floor((stats.con + stats.siz) / 10);
  const san = stats.pow;
  const mp = Math.floor(stats.pow / 5);
  const { damageBonus, build } = getDamageAndBuild(stats.str, stats.siz);
  const movement = getMovement(stats.str, stats.dex, stats.siz, age);
  return { hp, san, mp, damageBonus, build, movement };
}

export function getWealthInfo(creditRating: number) {
  for (const row of WEALTH_TABLE) {
    if (creditRating >= row.min && creditRating <= row.max) {
      return row;
    }
  }
  return WEALTH_TABLE[2]; // Przeciętny jako fallback
}

/**
 * Rozkłada łączną karę fizyczną (physPenalty) na cechy STR, CON i DEX (CoC 7e RAW)
 * dbając, aby żadna cecha nie spadła poniżej minimalnej wartości 15.
 */
export function distributePhysPenalty(
  stats: { str: number; con: number; dex: number },
  totalPenalty: number,
  minStat = 15
): { str: number; con: number; dex: number } {
  let { str, con, dex } = stats;
  let remaining = totalPenalty;

  while (remaining > 0) {
    const available = [
      { key: 'str' as const, val: str },
      { key: 'con' as const, val: con },
      { key: 'dex' as const, val: dex },
    ].filter((s) => s.val > minStat);

    if (available.length === 0) break;

    available.sort((a, b) => b.val - a.val);
    const target = available[0].key;

    if (target === 'str') str--;
    else if (target === 'con') con--;
    else dex--;

    remaining--;
  }

  return { str, con, dex };
}

/**
 * Aplikuje modyfikatory wieku dla nastolatka (15-19 lat wg CoC 7e RAW):
 * odejmuje 5 punktów łącznie z SIŁ lub BC oraz 5 punktów z WYK.
 */
export function applyTeenPenalty(
  stats: { str: number; siz: number; edu: number },
  minStat = 15
): { str: number; siz: number; edu: number } {
  let { str, siz, edu } = stats;
  let remaining = 5;

  while (remaining > 0) {
    const available = [
      { key: 'str' as const, val: str },
      { key: 'siz' as const, val: siz },
    ].filter((s) => s.val > minStat);

    if (available.length === 0) break;

    available.sort((a, b) => b.val - a.val);
    if (available[0].key === 'str') str--;
    else siz--;

    remaining--;
  }

  edu = Math.max(minStat, edu - 5);
  return { str, siz, edu };
}
