/**
 * Moduł konwersji cech i statystyk z klasycznych edycji Call of Cthulhu (edycje 1-6)
 * na standard Call of Cthulhu 7. edycji RAW (Księga Strażnika str. 441 / PDF 442).
 *
 * TASK-RAW-04 / Issue #638
 */

import { getDamageAndBuild } from './derived-stats';

/**
 * Cechy klasyczne w skali 3-18 (lub wyższej dla potworów/istot mitycznych)
 */
export interface ClassicCharacteristics {
  STR: number;
  CON: number;
  SIZ: number;
  DEX: number;
  APP: number;
  INT: number;
  POW: number;
  EDU: number;
  SAN?: number;
  LUCK?: number;
}

/**
 * Próg cechy w CoC 7e: wartość podstawowa, Hard (1/2) i Extreme (1/5)
 */
export interface StatThreshold {
  value: number;
  hard: number;
  extreme: number;
}

/**
 * Przekonwertowany zestaw cech CoC 7e wraz z progami i współczynnikami bojowymi
 */
export interface ConvertedCharacteristics {
  characteristics: {
    STR: StatThreshold;
    CON: StatThreshold;
    SIZ: StatThreshold;
    DEX: StatThreshold;
    APP: StatThreshold;
    INT: StatThreshold;
    POW: StatThreshold;
    EDU: StatThreshold;
  };
  /** Modyfikator Obrażeń (MO) wg Tabeli I CoC 7e (np. '0', '+1K4', '-1') */
  damageBonus: string;
  /** Krzepa (Build) wg Tabeli I CoC 7e (np. 0, 1, -1) */
  build: number;
  /** Punkty Wytrzymałości (PW = floor((CON + SIZ) / 10)) */
  hp: number;
  /** Punkty Magii (PM = floor(POW / 5)) */
  mp: number;
  /** Poczytalność początkowa równa POW */
  san: number;
}

/**
 * Wylicza progi 1/2 (Hard) oraz 1/5 (Extreme) zaokrąglane w dół (RAW)
 */
export function calculateThresholds(value: number): StatThreshold {
  return {
    value,
    hard: Math.floor(value / 2),
    extreme: Math.floor(value / 5),
  };
}

/**
 * Konwertuje klasyczne cechy (skala 3-18) na CoC 7e (mnożnik x5)
 *
 * Zgodnie z Księgą Strażnika str. 441:
 * "Aby przekonwertować cechy z wcześniejszych edycji, po prostu pomnóż każdą
 * wartość przez 5. Następnie wylicz wartości trudne (połowa) i ekstremalne (jedna piąta)."
 */
export function convertClassicTo7e(classic: ClassicCharacteristics): ConvertedCharacteristics {
  const str7e = classic.STR * 5;
  const con7e = classic.CON * 5;
  const siz7e = classic.SIZ * 5;
  const dex7e = classic.DEX * 5;
  const app7e = classic.APP * 5;
  const int7e = classic.INT * 5;
  const pow7e = classic.POW * 5;
  const edu7e = classic.EDU * 5;

  const { damageBonus, build } = getDamageAndBuild(str7e, siz7e);
  const hp = Math.floor((con7e + siz7e) / 10);
  const mp = Math.floor(pow7e / 5);
  const san = classic.SAN !== undefined ? classic.SAN : pow7e;

  return {
    characteristics: {
      STR: calculateThresholds(str7e),
      CON: calculateThresholds(con7e),
      SIZ: calculateThresholds(siz7e),
      DEX: calculateThresholds(dex7e),
      APP: calculateThresholds(app7e),
      INT: calculateThresholds(int7e),
      POW: calculateThresholds(pow7e),
      EDU: calculateThresholds(edu7e),
    },
    damageBonus,
    build,
    hp,
    mp,
    san,
  };
}
