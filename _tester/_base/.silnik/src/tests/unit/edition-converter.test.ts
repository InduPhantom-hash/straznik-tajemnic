/**
 * Testy jednostkowe dla modułu konwersji cech x5 ze starych edycji CoC 1-6 na CoC 7e RAW.
 *
 * TASK-RAW-04 / Issue #638
 * Podręcznik: Księga Strażnika 7e, Rozdział 16, str. 441 (PDF 442) oraz Tabela I (str. 38).
 */

import {
  convertClassicTo7e,
  calculateThresholds,
  type ClassicCharacteristics,
} from '@/lib/character/edition-converter';

describe('edition-converter (Księga Strażnika 7e str. 441 - konwersja x5)', () => {
  it('poprawnie wylicza progi 1/2 (Hard) i 1/5 (Extreme) zaokrąglając w dół', () => {
    const t55 = calculateThresholds(55);
    expect(t55.value).toBe(55);
    expect(t55.hard).toBe(27); // floor(55 / 2)
    expect(t55.extreme).toBe(11); // floor(55 / 5)

    const t60 = calculateThresholds(60);
    expect(t60.value).toBe(60);
    expect(t60.hard).toBe(30);
    expect(t60.extreme).toBe(12);
  });

  it('konwertuje klasyczne cechy Badacza mnożąc każdą przez 5 i generując progi', () => {
    const classicInvestigator: ClassicCharacteristics = {
      STR: 12,
      CON: 15,
      SIZ: 14,
      DEX: 11,
      APP: 9,
      INT: 16,
      POW: 13,
      EDU: 17,
    };

    const result = convertClassicTo7e(classicInvestigator);

    // Weryfikacja mnożnika x5
    expect(result.characteristics.STR.value).toBe(60);
    expect(result.characteristics.CON.value).toBe(75);
    expect(result.characteristics.SIZ.value).toBe(70);
    expect(result.characteristics.DEX.value).toBe(55);
    expect(result.characteristics.APP.value).toBe(45);
    expect(result.characteristics.INT.value).toBe(80);
    expect(result.characteristics.POW.value).toBe(65);
    expect(result.characteristics.EDU.value).toBe(85);

    // Weryfikacja progów Hard (1/2) i Extreme (1/5)
    expect(result.characteristics.STR.hard).toBe(30);
    expect(result.characteristics.STR.extreme).toBe(12);

    expect(result.characteristics.CON.hard).toBe(37);
    expect(result.characteristics.CON.extreme).toBe(15);

    expect(result.characteristics.DEX.hard).toBe(27);
    expect(result.characteristics.DEX.extreme).toBe(11);

    expect(result.characteristics.EDU.hard).toBe(42);
    expect(result.characteristics.EDU.extreme).toBe(17);

    // Weryfikacja współczynników pochodnych:
    // STR 60 + SIZ 70 = 130 -> Tabela I: przedział 125-164 -> DB: '+1K4', Build: 1
    expect(result.damageBonus).toBe('+1K4');
    expect(result.build).toBe(1);

    // HP = floor((CON 75 + SIZ 70) / 10) = floor(145 / 10) = 14
    expect(result.hp).toBe(14);

    // MP = floor(POW 65 / 5) = 13
    expect(result.mp).toBe(13);

    // Początkowa SAN równa POW
    expect(result.san).toBe(65);
  });

  it('poprawnie wylicza ujemny Modyfikator Obrażeń i ujemną Krzepę dla małych istot', () => {
    const smallCreature: ClassicCharacteristics = {
      STR: 6,
      CON: 10,
      SIZ: 6,
      DEX: 14,
      APP: 8,
      INT: 10,
      POW: 10,
      EDU: 10,
    };

    const result = convertClassicTo7e(smallCreature);

    // STR 30 + SIZ 30 = 60 -> Tabela I: przedział 2-64 -> DB: '-2', Build: -2
    expect(result.damageBonus).toBe('-2');
    expect(result.build).toBe(-2);
    expect(result.hp).toBe(8); // floor((50 + 30) / 10)
  });

  it('poprawnie wylicza ogromny Modyfikator Obrażeń dla potworów i bóstw Mitów', () => {
    const shoggoth: ClassicCharacteristics = {
      STR: 63,
      CON: 45,
      SIZ: 84,
      DEX: 11,
      APP: 0,
      INT: 10,
      POW: 10,
      EDU: 0,
    };

    const result = convertClassicTo7e(shoggoth);

    // STR 315 + SIZ 420 = 735 -> powyżej 524 -> DB: '+5K6', Build: 6
    expect(result.damageBonus).toBe('+5K6');
    expect(result.build).toBe(6);
    expect(result.hp).toBe(64); // floor((225 + 420) / 10)
  });
});
