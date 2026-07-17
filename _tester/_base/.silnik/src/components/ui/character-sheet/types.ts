/**
 * CharacterSheet types + stałe - sub-moduł types (IND-185 M1, sesja 132).
 *
 * Wycięte z `character-sheet.tsx` jako pierwszy mikrokomit splitu 936→<200 lin.
 * Pattern bottom-up extraction (analog sesji 131 IND-144 Wariant C).
 */

import type { Character } from '@/lib/types';

export interface CharacterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: Character;
  onCharacterUpdate?: (character: Character) => void;
  characters?: Character[];
  onCharacterChange?: (character: Character) => void;
}

/**
 * Mapowanie skrótów cech CoC 7e na 3-literowe etykiety PL.
 * Wyświetlane w sekcji CECHY GŁÓWNE (StatCard).
 */
export const STAT_NAMES: Record<string, string> = {
  str: 'SIŁ',
  con: 'KON',
  siz: 'BUD',
  dex: 'ZRE',
  app: 'WYG',
  int: 'INT',
  pow: 'MOC',
  edu: 'WYK',
};

/**
 * Pełne nazwy cech CoC 7e (czytelność - kreator + karta postaci).
 * STAT_NAMES (skróty) zostaje pod testem CS3; tutaj nowa stała dla pełnych
 * etykiet wyświetlanych obok skrótu jako głównej nazwy.
 */
export const STAT_FULL_NAMES: Record<string, string> = {
  str: 'Siła',
  con: 'Kondycja',
  siz: 'Budowa',
  dex: 'Zręczność',
  app: 'Wygląd',
  int: 'Inteligencja',
  pow: 'Moc',
  edu: 'Wykształcenie',
  luck: 'Szczęście',
};

/**
 * Pomocnicze opisy sekcji karty postaci (tooltipy na HelpIcon).
 * IND-126 (sesja 97): drop lokalny STAT_DESCRIPTIONS - import z @/lib/data/character.
 */
export const SECTION_HELP = {
  stan: 'PŻ = Punkty Życia (SIŁ+BC)/10. PR = Poczytalność (MOC). PM = Punkty Magii (MOC/5). SZC = Szczęście.',
  walka:
    'Bonus DMG zależy od SIŁ+BC. Krzepa określa możliwość szarpania/unieruchamiania. Ruch = dystans w metrach na rundę.',
  skills:
    'Każdy test umiejętności to rzut k% ≤ wartości. Sukces krytyczny = 01-05. Wynik pogrubiony = zawodowa.',
};
