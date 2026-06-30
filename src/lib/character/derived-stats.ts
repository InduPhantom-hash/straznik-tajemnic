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
