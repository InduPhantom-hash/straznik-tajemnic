import { Character } from './types';
import { createSeededRandom } from './utils/seedable-random';
import {
  OCCUPATIONS,
  BASE_SKILLS,
  AGE_MODIFIERS,
} from './data/character';
import {
  distributePhysPenalty,
  applyTeenPenalty,
  calculateDerived,
  calculateOccupationPoints,
} from './character';
import { normalizeSkillName } from './character/normalize-skill-name';

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

/**
 * Generuje losową postać CoC7 zgodnie z regułami CoC 7e RAW.
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
  const occupation = OCCUPATIONS[Math.floor(rng() * OCCUPATIONS.length)];
  const background = backgrounds[Math.floor(rng() * backgrounds.length)];

  // Wiek: 15-75 lat (obejmuje nastolatków oraz dojrzałych badaczy)
  const age = Math.floor(rng() * 61) + 15;

  // Cechy podstawowe CoC 7e: skala percentylowa 15-90
  let str = roll3d6(rng) * 5;
  let dex = roll3d6(rng) * 5;
  let con = roll3d6(rng) * 5;
  let app = roll3d6(rng) * 5;
  const pow = roll3d6(rng) * 5;
  let edu = roll2d6plus6(rng) * 5;
  let siz = roll2d6plus6(rng) * 5;
  const int = roll2d6plus6(rng) * 5;
  let luck = roll3d6(rng) * 5;

  // Modyfikatory wieku CoC 7e RAW
  const ageMod =
    AGE_MODIFIERS.find((m) => age >= m.min && age <= m.max) ||
    AGE_MODIFIERS[1];

  if (ageMod.key === 'age_15_19') {
    // Rzut na Szczęście 2x i wybór wyższego
    const luck2 = roll3d6(rng) * 5;
    luck = Math.max(luck, luck2);
    // Kara dla nastolatka: -5 z SIŁ/BC i -5 z WYK
    const teenStats = applyTeenPenalty({ str, siz, edu });
    str = teenStats.str;
    siz = teenStats.siz;
    edu = teenStats.edu;
  }

  if (ageMod.physPenalty > 0) {
    const phys = distributePhysPenalty(
      { str, con, dex },
      ageMod.physPenalty
    );
    str = phys.str;
    con = phys.con;
    dex = phys.dex;
  }

  if (ageMod.appPenalty > 0) {
    app = Math.max(15, app - ageMod.appPenalty);
  }

  if (ageMod.eduChecks > 0) {
    for (let i = 0; i < ageMod.eduChecks; i++) {
      const checkRoll = Math.floor(rng() * 100) + 1;
      if (checkRoll > edu) {
        const bonus = Math.floor(rng() * 10) + 1;
        edu = Math.min(99, edu + bonus);
      }
    }
  }

  // Cechy pochodne CoC 7e
  const stats = { str, con, siz, dex, app, int, pow, edu, luck };
  const derived = calculateDerived(stats, age);
  const hp = derived.hp;
  const san = derived.san;
  const mp = derived.mp;

  // Inicjalizacja umiejętności: baza z BASE_SKILLS + dynamiczne
  const skills: Record<string, number> = { ...BASE_SKILLS };
  skills['Język Ojczysty'] = edu;
  skills['Unik'] = Math.floor(dex / 2);

  // Majętność: losowana w widełkach zawodu (RAW)
  const crMin = occupation.creditMin ?? 0;
  const crMax = occupation.creditMax ?? 99;
  const crValue = crMin + Math.floor(rng() * (crMax - crMin + 1));
  skills['Majętność'] = crValue;

  // Punkty zawodowe: wyliczenie z formuły zawodu, odjęcie punktów na Majętność
  const occPoints = calculateOccupationPoints(occupation.id, stats);
  let remainingOccPoints = Math.max(0, occPoints - crValue);

  const allBaseSkillKeys = Object.keys(BASE_SKILLS).filter(
    (k) => k !== 'Mity Cthulhu' && k !== 'Majętność'
  );

  // Przygotowanie listy umiejętności zawodowych postaci (zastąpienie Dowolna/specjalizacji)
  const candidateOccSkills: string[] = [];
  for (const rawSkill of occupation.skills) {
    if (rawSkill === 'Majętność') continue;
    const normalized = normalizeSkillName(rawSkill);
    if (
      normalized &&
      normalized in BASE_SKILLS &&
      !candidateOccSkills.includes(normalized)
    ) {
      candidateOccSkills.push(normalized);
    } else {
      const available = allBaseSkillKeys.filter(
        (k) => !candidateOccSkills.includes(k)
      );
      if (available.length > 0) {
        const pick = available[Math.floor(rng() * available.length)];
        candidateOccSkills.push(pick);
      }
    }
  }

  // Rozdział punktów zawodowych (limit startowy 75% RAW)
  const MAX_STARTING_SKILL = 75;
  let attempts = 0;
  while (remainingOccPoints > 0 && attempts < 100) {
    attempts++;
    const validSkills = candidateOccSkills.filter(
      (s) => (skills[s] ?? BASE_SKILLS[s] ?? 1) < MAX_STARTING_SKILL
    );
    if (validSkills.length === 0) break;
    const targetSkill =
      validSkills[Math.floor(rng() * validSkills.length)];
    const currentVal = skills[targetSkill] ?? BASE_SKILLS[targetSkill] ?? 1;
    const room = MAX_STARTING_SKILL - currentVal;
    const add = Math.min(
      room,
      remainingOccPoints,
      Math.floor(rng() * 20) + 5
    );
    skills[targetSkill] = currentVal + add;
    remainingOccPoints -= add;
  }

  // Punkty zainteresowań: INT * 2 na 4 dowolne nie-zawodowe umiejętności
  let personalPoints = int * 2;
  const personalCandidates: string[] = [];
  const availableForPersonal = allBaseSkillKeys.filter(
    (k) => !candidateOccSkills.includes(k)
  );
  for (let i = 0; i < 4 && availableForPersonal.length > 0; i++) {
    const pickIdx = Math.floor(rng() * availableForPersonal.length);
    personalCandidates.push(availableForPersonal[pickIdx]);
    availableForPersonal.splice(pickIdx, 1);
  }

  attempts = 0;
  while (personalPoints > 0 && attempts < 100) {
    attempts++;
    const validSkills = personalCandidates.filter(
      (s) => (skills[s] ?? BASE_SKILLS[s] ?? 1) < MAX_STARTING_SKILL
    );
    if (validSkills.length === 0) break;
    const targetSkill =
      validSkills[Math.floor(rng() * validSkills.length)];
    const currentVal = skills[targetSkill] ?? BASE_SKILLS[targetSkill] ?? 1;
    const room = MAX_STARTING_SKILL - currentVal;
    const add = Math.min(room, personalPoints, Math.floor(rng() * 15) + 5);
    skills[targetSkill] = currentVal + add;
    personalPoints -= add;
  }

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
