/**
 * Prompty AI dla per-field generation w krok Historia.
 *
 * IND-123 (sesja 90) — wyodrębnione z character-wizard.tsx Faza 1.
 */

export const FIELD_PROMPTS: Record<string, string> = {
  name: 'imię i nazwisko pasujące do ery, płci i pochodzenia (polskie lub angielskie zależnie od lokalizacji)',
  birthplace:
    'miejsce urodzenia pasujące do zawodu i ery (miasto, region, kraj)',
  description:
    'krótki opis wyglądu: wzrost, budowa, kolor włosów/oczu, charakterystyczne cechy, styl ubioru',
  ideology:
    'głębokie przekonanie lub ideologię pasującą do tła postaci (1-2 zdania)',
  importantPeople:
    'ważną osobę w życiu postaci - imię, relacja, dlaczego jest ważna (1-2 zdania)',
  significantPlaces:
    'znaczące miejsce dla postaci - nazwa, opis, dlaczego jest ważne',
  personalItems:
    'szczególny przedmiot - nazwa i dlaczego jest ważny dla postaci',
  traits:
    '2-3 cechy charakteru oddzielone przecinkami, pasujące do historii postaci',
  keyConnection:
    'najważniejszą więź łączącą wszystkie elementy tła postaci (2-3 zdania)',
};
