/**
 * Normalizacja nazw umiejętności CoC 7e + budowanie zbioru rekomendowanych.
 *
 * Problem: umiejętności zawodowe w `OCCUPATIONS` bywają zapisane ze
 * specjalizacją w nawiasie - `Nauka (Biologia)`, `Język Obcy (łacina)`,
 * `Język Obcy (2)` - albo jako wolny wybór `Dowolna`. Klucze w `BASE_SKILLS`
 * NIE mają nawiasów. Bez normalizacji punkty trafiają do "kluczy-widm"
 * (np. `Nauka (Biologia)`), które nie istnieją w `state.skills`, nie
 * renderują się i nie podświetlają.
 *
 * Dlatego highlight (★) i deterministyczny auto-przydział MUSZĄ korzystać
 * z TEGO SAMEGO znormalizowanego zbioru - patrz `buildRecommendedSkills`.
 *
 * BUG #1 (fix/skill-points) - sesja redesign Dark Art Déco.
 */

import { BASE_SKILLS } from '../data/character/skills';

const SYNONYMS: Record<string, string> = {
  // Polskie synonimy i warianty
  'Korzystanie z Bibliotek': 'Biblioteka',
  'Korzystanie z Komputerów': 'Komputery',
  Charakteryzacja: 'Przebranie',
  Nawigacja: 'Orientacja',
  'Sztuka Przetrwania': 'Przetrwanie',
  Skakanie: 'Skok',
  Occultyzm: 'Okultyzm',
  'Broń Palna (Dowolna)': 'Broń Palna',
  'Walka Wręcz (Dowolna)': 'Walka Wręcz',
  'Pierwsza pomoc': 'Pierwsza Pomoc',
  'Język obcy': 'Język Obcy',
  'Język ojczysty': 'Język Ojczysty',
  'Mity cthulhu': 'Mity Cthulhu',

  // Angielskie nazwy Call of Cthulhu 7e RAW -> Kanoniczne klucze BASE_SKILLS
  Accounting: 'Księgowość',
  Anthropology: 'Antropologia',
  Appraise: 'Wycena',
  Archaeology: 'Archeologia',
  'Art and Craft': 'Sztuka/Rzemiosło',
  'Art / Craft': 'Sztuka/Rzemiosło',
  'Art/Craft': 'Sztuka/Rzemiosło',
  Art: 'Sztuka/Rzemiosło',
  Craft: 'Sztuka/Rzemiosło',
  Artillery: 'Broń Artyleryjska',
  Charm: 'Urok Osobisty',
  Climb: 'Wspinaczka',
  'Credit Rating': 'Majętność',
  'Cthulhu Mythos': 'Mity Cthulhu',
  Disguise: 'Przebranie',
  Dodge: 'Unik',
  'Drive Auto': 'Prowadzenie Samochodu',
  Driving: 'Prowadzenie Samochodu',
  'Electrical Repair': 'Elektryka',
  Electricity: 'Elektryka',
  'Fast Talk': 'Gadanina',
  'Fast-Talk': 'Gadanina',
  Fighting: 'Walka Wręcz',
  'Fighting (Brawl)': 'Walka Wręcz (Bijatyka)',
  Brawl: 'Walka Wręcz (Bijatyka)',
  'Fighting (Blunt)': 'Walka Wręcz (Broń Obuchowa)',
  'Fighting (Sword)': 'Walka Wręcz (Szabla/Miecz)',
  'Fighting (Axe)': 'Walka Wręcz (Broń Obuchowa)',
  Firearms: 'Broń Palna',
  'Firearms (Handgun)': 'Broń Palna (Krótka)',
  Handgun: 'Broń Palna (Krótka)',
  Pistol: 'Broń Palna (Krótka)',
  'Firearms (Rifle/Shotgun)': 'Broń Palna (Karabin)',
  'Firearms (Rifle)': 'Broń Palna (Karabin)',
  'Firearms (Shotgun)': 'Broń Palna (Karabin)',
  Rifle: 'Broń Palna (Karabin)',
  Shotgun: 'Broń Palna (Karabin)',
  'Firearms (Submachine Gun)': 'Broń Palna (Pistolet Maszynowy)',
  'Submachine Gun': 'Broń Palna (Pistolet Maszynowy)',
  SMG: 'Broń Palna (Pistolet Maszynowy)',
  'Firearms (Machine Gun)': 'Broń Palna (Karabin Maszynowy)',
  'Machine Gun': 'Broń Palna (Karabin Maszynowy)',
  'Firearms (Heavy Weapons)': 'Broń Palna (Broń Ciężka)',
  'Heavy Weapons': 'Broń Palna (Broń Ciężka)',
  'Firearms (Flamethrower)': 'Broń Palna (Miotacz Ognia)',
  Flamethrower: 'Broń Palna (Miotacz Ognia)',
  'Firearms (Bow)': 'Broń Palna (Łuk)',
  Bow: 'Broń Palna (Łuk)',
  'First Aid': 'Pierwsza Pomoc',
  History: 'Historia',
  'Heavy Machinery': 'Obsługa Ciężkiego Sprzętu',
  'Operate Heavy Machinery': 'Obsługa Ciężkiego Sprzętu',
  Intimidation: 'Zastraszanie',
  Jump: 'Skok',
  'Language (Other)': 'Język Obcy',
  'Foreign Language': 'Język Obcy',
  'Language (Own)': 'Język Ojczysty',
  'Native Language': 'Język Ojczysty',
  Law: 'Prawo',
  'Library Use': 'Biblioteka',
  Library: 'Biblioteka',
  Listen: 'Nasłuchiwanie',
  Locksmith: 'Ślusarstwo',
  'Mechanical Repair': 'Mechanika',
  Mechanics: 'Mechanika',
  Medicine: 'Medycyna',
  'Natural World': 'Wiedza o Naturze',
  Nature: 'Wiedza o Naturze',
  Navigate: 'Orientacja',
  Navigation: 'Orientacja',
  Occult: 'Okultyzm',
  'Occult Lore': 'Wiedza Tajemna',
  Persuasion: 'Perswazja',
  Pilot: 'Pilotowanie',
  Piloting: 'Pilotowanie',
  Psychoanalysis: 'Psychoanaliza',
  Psychology: 'Psychologia',
  Ride: 'Jeździectwo',
  Science: 'Nauka',
  'Sleight of Hand': 'Zręczne Palce',
  'Spot Hidden': 'Spostrzegawczość',
  Stealth: 'Skradanie',
  Survival: 'Przetrwanie',
  Swim: 'Pływanie',
  Swimming: 'Pływanie',
  Throw: 'Rzucanie',
  Throwing: 'Rzucanie',
  Track: 'Tropienie',
  Tracking: 'Tropienie',
};

/**
 * Sprowadza nazwę umiejętności do kanonicznego klucza zgodnego z `BASE_SKILLS`.
 *
 * - `Nauka (Biologia)` -> `Nauka`
 * - `Język Obcy (łacina)` -> `Język Obcy`
 * - `Spot Hidden` -> `Spostrzegawczość`
 * - `Library Use` -> `Biblioteka`
 * - `Broń Palna (Karabin)` -> `Broń Palna (Karabin)` (istnieje wprost w BASE_SKILLS)
 * - `Dowolna` / `Any` -> `null` (wolny wybór gracza - nie jest konkretną umiejętnością)
 * - nierozpoznana / pusta / białe znaki -> `null` (ochrona przed kluczami-widmami)
 *
 * @param raw surowa nazwa umiejętności (może być po polsku lub angielsku, ze specjalizacją)
 * @returns kanoniczny klucz umiejętności lub `null`, gdy nazwa nie mapuje się
 *   na poprawną umiejętność.
 */
export function normalizeSkillName(raw: string): string | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // `Dowolna` / `Any` = wolny wybór gracza, nie konkretna umiejętność - odrzuć.
  const trimmedLower = trimmed.toLowerCase();
  if (trimmedLower === 'dowolna' || trimmedLower === 'any') return null;

  if (trimmed in SYNONYMS) return SYNONYMS[trimmed];
  if (trimmed in BASE_SKILLS) return trimmed;

  // Sprawdzenie case-insensitive
  for (const [k, v] of Object.entries(SYNONYMS)) {
    if (k.toLowerCase() === trimmedLower) return v;
  }
  for (const k of Object.keys(BASE_SKILLS)) {
    if (k.toLowerCase() === trimmedLower) return k;
  }

  // Usuń specjalizację w nawiasie (cyfry, litery, dowolny tekst) + spacje wokół.
  const stripped = trimmed.replace(/\s*\([^)]*\)\s*$/, '').trim();

  if (stripped.length === 0) return null;
  const strippedLower = stripped.toLowerCase();
  if (strippedLower === 'dowolna' || strippedLower === 'any') return null;
  if (stripped in SYNONYMS) return SYNONYMS[stripped];
  if (stripped in BASE_SKILLS) return stripped;

  for (const [k, v] of Object.entries(SYNONYMS)) {
    if (k.toLowerCase() === strippedLower) return v;
  }
  for (const k of Object.keys(BASE_SKILLS)) {
    if (k.toLowerCase() === strippedLower) return k;
  }

  return null;
}

/**
 * Buduje JEDEN, znormalizowany zbiór umiejętności rekomendowanych dla postaci.
 *
 * Zbiór = umiejętności archetypu ∪ umiejętności zawodowe. Specjalizacje są
 * znormalizowane (`Nauka (Biologia)` -> `Nauka`), a `Dowolna` odrzucona.
 * Kolejność zachowuje pierwsze wystąpienie (archetyp przed zawodem), bez
 * duplikatów.
 *
 * To JEDYNE źródło prawdy dla highlight (★) ORAZ deterministycznego
 * auto-przydziału - dzięki temu podświetlenie i przydział nie rozjeżdżają się.
 *
 * @param archetypeSkills lista umiejętności kluczowych archetypu
 * @param occupationalSkills lista umiejętności zawodowych (mogą mieć nawiasy)
 * @returns uporządkowana, znormalizowana lista bez duplikatów
 */
export function buildRecommendedSkills(
  archetypeSkills: readonly string[],
  occupationalSkills: readonly string[]
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of [...archetypeSkills, ...occupationalSkills]) {
    const normalized = normalizeSkillName(raw);
    if (normalized === null) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}
