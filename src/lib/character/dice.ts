/**
 * Funkcje rzutów kostkami dla generowania cech postaci CoC 7e.
 *
 * IND-123 (sesja 90) — wyodrębnione z character-wizard.tsx Faza 2.
 *
 * UWAGA: używa `Math.random()` (non-seedable, pre-existing IND-127).
 */

import type { CharacterStats } from '@/lib/data/character';

export function roll(dice: number, sides: number): number {
  let sum = 0;
  for (let i = 0; i < dice; i++) {
    sum += Math.floor(Math.random() * sides) + 1;
  }
  return sum;
}

export const roll3d6x5 = () => roll(3, 6) * 5;
export const roll2d6plus6x5 = () => (roll(2, 6) + 6) * 5;

export const half = (v: number) => Math.floor(v / 2);
export const fifth = (v: number) => Math.floor(v / 5);

/**
 * Losowe wygenerowanie wszystkich 9 cech CoC 7e (str/con/siz/dex/app/int/pow/edu/luck).
 */
export function generateRandomStats(): CharacterStats {
  return {
    str: roll3d6x5(),
    con: roll3d6x5(),
    siz: roll2d6plus6x5(),
    dex: roll3d6x5(),
    app: roll3d6x5(),
    int: roll2d6plus6x5(),
    pow: roll3d6x5(),
    edu: roll2d6plus6x5(),
    luck: roll3d6x5(),
  };
}
