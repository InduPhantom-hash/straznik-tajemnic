import { Character } from './types';
import { createSeededRandom } from './utils/seedable-random';

// Lista zawodów CoC7 z podstawowymi umiejętnościami
const occupations = [
  {
    name: 'Antykwariusz',
    skills: [
      'Bibliotekarstwo',
      'Język (inny)',
      'Język (inny)',
      'Ocena',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
    ],
  },
  {
    name: 'Artysta',
    skills: [
      'Sztuka (inna)',
      'Sztuka (inna)',
      'Sztuka (inna)',
      'Kredyt',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
    ],
  },
  {
    name: 'Dziennikarz',
    skills: [
      'Bibliotekarstwo',
      'Kredyt',
      'Język (inny)',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
      'Śledztwo',
    ],
  },
  {
    name: 'Detektyw',
    skills: [
      'Bibliotekarstwo',
      'Kredyt',
      'Język (inny)',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
      'Śledztwo',
    ],
  },
  {
    name: 'Lekarz',
    skills: [
      'Bibliotekarstwo',
      'Kredyt',
      'Język (inny)',
      'Medycyna',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
    ],
  },
  {
    name: 'Naukowiec',
    skills: [
      'Bibliotekarstwo',
      'Kredyt',
      'Język (inny)',
      'Nauka (inna)',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
    ],
  },
  {
    name: 'Policjant',
    skills: [
      'Bibliotekarstwo',
      'Kredyt',
      'Język (inny)',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
      'Śledztwo',
    ],
  },
  {
    name: 'Profesor',
    skills: [
      'Bibliotekarstwo',
      'Kredyt',
      'Język (inny)',
      'Nauka (inna)',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
    ],
  },
  {
    name: 'Psychiatra',
    skills: [
      'Bibliotekarstwo',
      'Kredyt',
      'Język (inny)',
      'Medycyna',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
    ],
  },
  {
    name: 'Pisarz',
    skills: [
      'Bibliotekarstwo',
      'Kredyt',
      'Język (inny)',
      'Perswazja',
      'Psychologia',
      'Sztuka (inna)',
      'Zastraszanie',
      'Śledztwo',
    ],
  },
];

const maleNames = [
  'Aleksander',
  'Bartosz',
  'Cezary',
  'Dariusz',
  'Eryk',
  'Filip',
  'Grzegorz',
  'Henryk',
  'Igor',
  'Jakub',
  'Kamil',
  'Łukasz',
  'Marcin',
  'Norbert',
  'Oskar',
  'Piotr',
  'Rafał',
  'Sebastian',
  'Tomasz',
  'Wojciech',
  'Zbigniew',
  'Adrian',
  'Błażej',
  'Cyprian',
];

const femaleNames = [
  'Anna',
  'Barbara',
  'Celina',
  'Dorota',
  'Ewa',
  'Franciszka',
  'Grażyna',
  'Hanna',
  'Irena',
  'Joanna',
  'Katarzyna',
  'Łucja',
  'Magdalena',
  'Natalia',
  'Oliwia',
  'Patrycja',
  'Renata',
  'Sylwia',
  'Teresa',
  'Urszula',
  'Weronika',
  'Zofia',
  'Agnieszka',
  'Beata',
];

const surnames = [
  'Nowak',
  'Kowalski',
  'Wiśniewski',
  'Dąbrowski',
  'Lewandowski',
  'Wójcik',
  'Kamiński',
  'Kowalczyk',
  'Zieliński',
  'Szymański',
  'Woźniak',
  'Kozłowski',
  'Jankowski',
  'Wojciechowski',
  'Kwiatkowski',
  'Kaczmarek',
  'Mazur',
  'Krawczyk',
  'Piotrowski',
  'Grabowski',
  'Nowakowski',
  'Pawłowski',
  'Michalski',
  'Król',
];

const playerNames = [
  'Marcin',
  'Anna',
  'Piotr',
  'Kasia',
  'Tomek',
  'Magda',
  'Łukasz',
  'Ola',
  'Paweł',
  'Natalia',
  'Krzysztof',
  'Monika',
  'Michał',
  'Agnieszka',
  'Jakub',
  'Ewa',
];

const backgrounds = [
  'Urodzony w małym miasteczku, zawsze marzył o wielkich przygodach.',
  'Wychowany w bogatej rodzinie, ma dostęp do najlepszych uniwersytetów.',
  'Były żołnierz, który po wojnie szuka nowego celu w życiu.',
  'Sierota wychowana przez dziadków, nauczyła się samodzielności.',
  'Emigrant z Europy Wschodniej, szuka nowego życia w Ameryce.',
  'Dziedzic starej rodziny, obciążony tradycjami i oczekiwaniami.',
  'Samotny podróżnik, który zwiedził już pół świata.',
  'Były więzień, który próbuje zacząć nowe życie.',
  'Artysta z bohemy, żyjący na marginesie społeczeństwa.',
  'Naukowiec z uniwersytetu, zafascynowany tajemnicami świata.',
];

// Funkcje rzutu kośćmi przyjmują RNG (default Math.random przez createSeededRandom)
function roll3d6(rng: () => number): number {
  return (
    Math.floor(rng() * 6) + Math.floor(rng() * 6) + Math.floor(rng() * 6) + 3
  );
}

function roll2d6plus6(rng: () => number): number {
  return Math.floor(rng() * 6) + Math.floor(rng() * 6) + 6 + 2;
}

function roll1d6plus6(rng: () => number): number {
  return Math.floor(rng() * 6) + 6 + 1;
}

/**
 * Generuje losową postać CoC7.
 *
 * @param seed - opcjonalny seed dla deterministycznej generacji (sesja replay, testy regresji).
 *               Bez seed używa Math.random.
 */
export function generateRandomCharacter(seed?: number): Character {
  const rng = createSeededRandom(seed);

  const isMale = rng() > 0.5;
  const firstName = isMale
    ? maleNames[Math.floor(rng() * maleNames.length)]
    : femaleNames[Math.floor(rng() * femaleNames.length)];
  const surname = surnames[Math.floor(rng() * surnames.length)];
  const name = `${firstName} ${surname}`;

  const playerName = playerNames[Math.floor(rng() * playerNames.length)];
  const occupation = occupations[Math.floor(rng() * occupations.length)];
  const background = backgrounds[Math.floor(rng() * backgrounds.length)];

  // Generowanie cech podstawowych.
  // CoC 7e używa skali percentylowej 15-90 (rzut ×5), nie surowych 3-18.
  // 3d6×5 → 15-90; (2d6+6)×5 → 40-90. Bez ×5 cechy pochodne wychodzą absurdalnie
  // niskie (PŻ 2 / SAN 10) bo formuły niżej zakładają skalę 15-90 (jak deriveStats).
  const str = roll3d6(rng) * 5;
  const dex = roll3d6(rng) * 5;
  const con = roll3d6(rng) * 5;
  const app = roll3d6(rng) * 5;
  const pow = roll3d6(rng) * 5;
  const edu = roll2d6plus6(rng) * 5;
  const siz = roll2d6plus6(rng) * 5;
  const int = roll2d6plus6(rng) * 5;
  const luck = roll3d6(rng) * 5;

  // Obliczanie cech pochodnych (CoC 7e, spójne z character-sheet/utils/derive-stats.ts)
  const hp = Math.floor((con + siz) / 10);
  const san = pow;
  const mp = Math.floor(pow / 5);

  // Suppress unused warning - roll1d6plus6 reserved for future use (legacy import).
  void roll1d6plus6;

  // Generowanie umiejętności zawodowych
  const skills: { [key: string]: number } = {};

  // Umiejętności podstawowe (wszyscy mają)
  skills['Walka wręcz'] = 25;
  skills['Strzelanie'] = 20;
  skills['Skakanie'] = 20;
  skills['Pływanie'] = 20;
  skills['Wspinaczka'] = 20;
  skills['Ukrywanie'] = 20;
  skills['Słuchanie'] = 20;
  skills['Obserwacja'] = 25;
  skills['Śledztwo'] = 20;
  skills['Perswazja'] = 10;
  skills['Zastraszanie'] = 15;
  skills['Psychologia'] = 10;
  skills['Bibliotekarstwo'] = 20;
  skills['Kredyt'] = 0;
  skills['Język (inny)'] = 0;
  skills['Nauka (inna)'] = 1;
  skills['Sztuka (inna)'] = 5;
  skills['Medycyna'] = 1;

  // Umiejętności zawodowe (4x EDU + 2x INT)
  const totalSkillPoints = edu * 4 + int * 2;
  const occupationSkills = occupation.skills;

  // Rozdaj punkty umiejętności zawodowych
  let remainingPoints = totalSkillPoints;
  for (const skill of occupationSkills) {
    if (remainingPoints <= 0) break;
    const points = Math.min(remainingPoints, Math.floor(rng() * 50) + 20);
    skills[skill] = (skills[skill] || 0) + points;
    remainingPoints -= points;
  }

  // Wiek (20-60 lat)
  const age = Math.floor(rng() * 40) + 20;

  // Generowanie ID
  const id = Date.now().toString() + rng().toString(36).substring(2, 11);

  return {
    id,
    name,
    str,
    dex,
    con,
    app,
    pow,
    edu,
    siz,
    int,
    luck,
    hp,
    san,
    mp,
    // Świeża postać: bieżące = maksymalne (clamp w apply-stat-changes.ts używa max*)
    maxHp: hp,
    maxSan: san,
    maxMp: mp,
    skills,
    occupation: occupation.name,
    age,
    background,
    playerName,
    campaignId: undefined,
    isActive: false,
    lastUsed: new Date(),
    notes: '',
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 0,
    },
    developmentHistory: [],
  };
}

/**
 * Generuje wiele losowych postaci.
 *
 * @param count - liczba postaci
 * @param seed - opcjonalny seed (z seed wszystkie postacie są deterministyczne dla tego seeda)
 */
export function generateRandomCharacters(
  count: number,
  seed?: number
): Character[] {
  const characters: Character[] = [];
  for (let i = 0; i < count; i++) {
    // Per-character seed offset gdy seed podany, inaczej każda postać random
    const charSeed = seed !== undefined ? seed + i : undefined;
    characters.push(generateRandomCharacter(charSeed));
  }
  return characters;
}
