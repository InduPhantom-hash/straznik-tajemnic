/**
 * CharacterSheet - derive stats helper (IND-185 M3, sesja 132).
 *
 * Pure function obliczająca podstawowe cechy + cechy pochodne (HP/SAN/MP)
 * + cechy walki (move/damageBonus/build) z fallbackami CoC 7e.
 *
 * Wycięte z character-sheet.tsx (lin 94-110 "Oblicz pochodne").
 */

import type { Character } from '@/lib/types';

export interface DerivedStats {
  /** 8 cech podstawowych (CoC 7e) z fallback 50 dla undefined. */
  stats: {
    str: number;
    con: number;
    siz: number;
    dex: number;
    app: number;
    int: number;
    pow: number;
    edu: number;
  };
  /** Maksymalne PŻ (override z `character.maxHp` lub floor((CON+SIZ)/10)). */
  maxHp: number;
  /** Maksymalne PR (override z `character.maxSan` lub MOC). */
  maxSan: number;
  /** Maksymalne PM (override z `character.maxMp` lub floor(MOC/5)). */
  maxMp: number;
  /** Ruch (override z `character.move` lub 8). */
  move: number;
  /** Bonus do obrażeń (override z `character.damageBonus` lub '+0'). */
  damageBonus: string;
  /** Krzepa (override z `character.build` lub 0). */
  build: number;
}

/**
 * Buduje obiekt cech pochodnych z Character. Pure function - bez side
 * effects. Fallback 50 dla każdej cechy podstawowej, fallback CoC 7e
 * formuły dla maxHp/maxSan/maxMp.
 */
export function deriveStats(character: Character): DerivedStats {
  const stats = {
    str: character.str || 50,
    con: character.con || 50,
    siz: character.siz || 50,
    dex: character.dex || 50,
    app: character.app || 50,
    int: character.int || 50,
    pow: character.pow || 50,
    edu: character.edu || 50,
  };
  return {
    stats,
    maxHp: character.maxHp || Math.floor((stats.con + stats.siz) / 10),
    maxSan: character.maxSan || stats.pow,
    maxMp: character.maxMp || Math.floor(stats.pow / 5),
    move: character.move || 8,
    damageBonus: character.damageBonus || '+0',
    build: character.build || 0,
  };
}
