/**
 * CharacterSheet - derive stats helper (IND-185 M3, sesja 132).
 *
 * Pure function obliczająca podstawowe cechy + cechy pochodne (HP/SAN/MP)
 * + cechy walki (move/damageBonus/build) z fallbackami CoC 7e.
 *
 * Wycięte z character-sheet.tsx (lin 94-110 "Oblicz pochodne").
 */

import type { Character } from '@/lib/types';
import { getSkillValue } from '@/lib/types';
import { getDamageAndBuild, getMovement } from '@/lib/character/derived-stats';

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
  /** Maksymalne PR (override z `character.maxSan` lub 99 - Mity Cthulhu). */
  maxSan: number;
  /** Maksymalne PM (override z `character.maxMp` lub floor(MOC/5)). */
  maxMp: number;
  /** Ruch (override z `character.move` lub wyliczony z CoC 7e RAW). */
  move: number;
  /** Bonus do obrażeń (override z `character.damageBonus` lub wyliczony z CoC 7e RAW). */
  damageBonus: string;
  /** Krzepa (override z `character.build` lub wyliczona z CoC 7e RAW). */
  build: number;
}

/**
 * Buduje obiekt cech pochodnych z Character. Pure function - bez side
 * effects. Fallback 50 dla każdej cechy podstawowej, fallback CoC 7e
 * formuły dla maxHp/maxSan/maxMp/move/damageBonus/build.
 */
export function deriveStats(character: Character): DerivedStats {
  const stats = {
    str: character.str ?? 50,
    con: character.con ?? 50,
    siz: character.siz ?? 50,
    dex: character.dex ?? 50,
    app: character.app ?? 50,
    int: character.int ?? 50,
    pow: character.pow ?? 50,
    edu: character.edu ?? 50,
  };

  const calculatedHp = Math.floor((stats.con + stats.siz) / 10);
  const calculatedMp = Math.floor(stats.pow / 5);

  const mythosValue = getSkillValue(
    character.skills?.['Mity Cthulhu'] ??
      character.skills?.['mity_cthulhu'] ??
      character.skills?.['Cthulhu Mythos'] ??
      character.skills?.['cthulhu_mythos']
  );
  const calculatedMaxSan = Math.max(0, 99 - mythosValue);

  const { damageBonus: calcDb, build: calcBuild } = getDamageAndBuild(
    stats.str,
    stats.siz
  );
  const calcMove = getMovement(
    stats.str,
    stats.dex,
    stats.siz,
    character.age ?? 30
  );

  const maxHp =
    typeof character.maxHp === 'number' && character.maxHp > 0
      ? character.maxHp
      : calculatedHp;
  const maxSan =
    typeof character.maxSan === 'number' && character.maxSan > 0
      ? character.maxSan
      : calculatedMaxSan;
  const maxMp =
    typeof character.maxMp === 'number' && character.maxMp > 0
      ? character.maxMp
      : calculatedMp;
  const move =
    typeof character.move === 'number' && character.move > 0
      ? character.move
      : calcMove;
  const damageBonus =
    typeof character.damageBonus === 'string' &&
    character.damageBonus.trim() !== ''
      ? character.damageBonus
      : calcDb;
  const build =
    typeof character.build === 'number' ? character.build : calcBuild;

  return {
    stats,
    maxHp,
    maxSan,
    maxMp,
    move,
    damageBonus,
    build,
  };
}
