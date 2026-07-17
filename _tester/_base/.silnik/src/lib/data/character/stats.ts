/**
 * Opisy cech głównych i pochodnych Call of Cthulhu 7e.
 * Source of truth: character-wizard tooltips + character-sheet.
 *
 * IND-123 (sesja 90) - wyodrębnione z character-wizard.tsx Faza 1.
 */

export interface CharacterStats {
  str: number;
  con: number;
  siz: number;
  dex: number;
  app: number;
  int: number;
  pow: number;
  edu: number;
  luck: number;
}

export interface DerivedStats {
  hp: number;
  san: number;
  mp: number;
  damageBonus: string;
  build: number;
  movement: number;
}

export const STAT_DESCRIPTIONS: Record<string, string> = {
  str: 'SIŁA (S) - Fizyczna siła postaci. Wpływa na obrażenia w walce wręcz i podnoszenie ciężarów. Rzut: 3K6×5',
  con: 'KONDYCJA (KON) - Zdrowie i wytrzymałość. Wpływa na Punkty Wytrzymałości i odporność na choroby. Rzut: 3K6×5',
  siz: 'BUDOWA CIAŁA (BC) - Wzrost i masa ciała. Wpływa na PW i Modyfikator Obrażeń. Rzut: 2K6+6×5',
  dex: 'ZRĘCZNOŚĆ (ZR) - Szybkość i koordynacja ruchowa. Wpływa na uniki i inicjatywę. Rzut: 3K6×5',
  app: 'WYGLĄD (WYG) - Atrakcyjność i charyzma. Przydatny w kontaktach towarzyskich. Rzut: 3K6×5',
  int: 'INTELIGENCJA (INT) - Zdolność rozumowania i uczenia się. Określa punkty zainteresowań. Rzut: 2K6+6×5',
  pow: 'MOC (MOC) - Siła woli i odporność psychiczna. Określa początkową Poczytalność i Punkty Magii. Rzut: 3K6×5',
  edu: 'WYKSZTAŁCENIE (WYK) - Formalna edukacja i wiedza. Określa punkty umiejętności zawodowych. Rzut: 2K6+6×5',
  luck: 'SZCZĘŚCIE - Szczęście postaci. Można je wydać na przerzuty. Rzut: 3K6×5',
};

export const DERIVED_DESCRIPTIONS: Record<string, string> = {
  hp: 'PUNKTY WYTRZYMAŁOŚCI (PW) - Ilość obrażeń jakie może przyjąć postać. Gdy spadną do 0, postać jest nieprzytomna lub martwa. Wzór: (KON + BC) / 10',
  san: 'POCZYTALNOŚĆ (PP) - Zdrowie psychiczne postaci. Spada przy spotkaniu z kosmiczną grozą. Początkowa wartość = MOC',
  mp: 'PUNKTY MAGII (PM) - Energia magiczna. Używana do rzucania zaklęć. Wzór: MOC / 5',
  damageBonus:
    'MODYFIKATOR OBRAŻEŃ (MO) - Dodatkowe obrażenia w walce wręcz. Zależy od sumy S + BC',
  build:
    'KRZEPA - Wielkość i siła fizyczna. Używana do manewrów jak przewrócenie. Zależy od S + BC',
  movement:
    'RUCH - Szybkość poruszania się. Zależy od S, ZR, BC i wieku postaci',
};
