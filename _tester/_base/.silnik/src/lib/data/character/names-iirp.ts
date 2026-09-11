/**
 * Tabela imion i nazwisk polskich z lat 20. XX wieku (II Rzeczpospolita)
 * Źródło: Zew Cthulhu 7ed. Podręcznik Badacza, Rozdział 9 (s. 208).
 *
 * Zawiera:
 * - 100 imion męskich
 * - 100 imion żeńskich
 * - 100 nazwisk polskich
 * - 10 imion męskich, żeńskich i nazwisk mniejszości żydowskiej
 * - 10 imion męskich, żeńskich i nazwisk mniejszości niemieckiej
 * - 10 imion męskich, żeńskich i nazwisk mniejszości wschodniej (rosyjskiej, ukraińskiej, białoruskiej)
 */

export interface IIRPNameEntry {
  number: number;
  male: string;
  female: string;
  surname: string;
}

export interface MinorityNameEntry {
  number: number;
  male: string;
  female: string;
  surname: string;
}

/** 100 kanonicznych imion męskich z Podręcznika Badacza (s. 208) */
export const IIRP_MALE_NAMES: readonly string[] = [
  'Adam', 'Adolf', 'Albert', 'Aleksander', 'Aleksy',
  'Alfred', 'Alojz', 'Alojzy', 'Amadeusz', 'Anastazy',
  'Anatol', 'Andrzej', 'Antoni', 'Artur', 'Bartłomiej',
  'Bartosz', 'Bogumił', 'Bogusław', 'Bolesław', 'Borys',
  'Bronisław', 'Brunon', 'Cezary', 'Cyryl', 'Czesław',
  'Dariusz', 'Dezydery', 'Dominik', 'Dorian', 'Edward',
  'Eliasz', 'Emilian', 'Ernest', 'Eugeniusz', 'Eustachy',
  'Felicjan', 'Florian', 'Franciszek', 'Fryderyk', 'Gabriel',
  'Grzegorz', 'Gustaw', 'Henryk', 'Hieronim', 'Hubert',
  'Ignacy', 'Igor', 'Ireneusz', 'Iwo', 'Jakub',
  'Jan', 'January', 'Janusz', 'Jeremi', 'Jerzy',
  'Jędrzej', 'Józef', 'Julian', 'Juliusz', 'Kacper',
  'Kajetan', 'Karol', 'Kazimierz', 'Klemens', 'Konrad',
  'Konstanty', 'Kornel', 'Krystian', 'Ksawery', 'Lech',
  'Leon', 'Leopold', 'Lucjan', 'Ludwik', 'Maciej',
  'Maksymilian', 'Marceli', 'Marcin', 'Marian', 'Mariusz',
  'Miłosz', 'Mirosław', 'Nikodem', 'Norbert', 'Olgierd',
  'Paweł', 'Piotr', 'Robert', 'Roman', 'Ryszard',
  'Stanisław', 'Stefan', 'Tadeusz', 'Tomasz', 'Tytus',
  'Wincenty', 'Władysław', 'Wojciech', 'Zbigniew', 'Zygmunt',
] as const;

/** 100 kanonicznych imion żeńskich z Podręcznika Badacza (s. 208) */
export const IIRP_FEMALE_NAMES: readonly string[] = [
  'Adela', 'Adrianna', 'Agata', 'Agnieszka', 'Aleksandra',
  'Alicja', 'Alina', 'Amelia', 'Anastazja', 'Aniela',
  'Anna', 'Antonina', 'Apolonia', 'Aurelia', 'Balbina',
  'Barbara', 'Beata', 'Berenika', 'Bernadeta', 'Bianka',
  'Blandyna', 'Bogna', 'Bogumiła', 'Bogusława', 'Cecylia',
  'Celina', 'Czesława', 'Dagmara', 'Daniela', 'Danuta',
  'Diana', 'Dobrosława', 'Dorota', 'Edyta', 'Eleonora',
  'Eliza', 'Elwira', 'Elżbieta', 'Emilia', 'Ewa',
  'Faustyna', 'Felicja', 'Florentyna', 'Franciszka', 'Gabriela',
  'Genowefa', 'Grażyna', 'Halina', 'Hanna', 'Helena',
  'Honorata', 'Irena', 'Irmina', 'Izabela', 'Izyda',
  'Jadwiga', 'Jagoda', 'Janina', 'Joanna', 'Jolanta',
  'Jowita', 'Józefa', 'Julia', 'Justyna', 'Kalina',
  'Karolina', 'Katarzyna', 'Klara', 'Klementyna', 'Konstancja',
  'Krystyna', 'Laura', 'Lena', 'Leokadia', 'Lidia',
  'Lilianna', 'Lucyna', 'Łucja', 'Magdalena', 'Maja',
  'Małgorzata', 'Marcelina', 'Maria', 'Marianna', 'Marlena',
  'Melania', 'Michalina', 'Mirosława', 'Natalia', 'Nina',
  'Oktawia', 'Pola', 'Róża', 'Sabina', 'Stanisława',
  'Stefania', 'Teresa', 'Weronika', 'Zofia', 'Zuzanna',
] as const;

/** 100 kanonicznych nazwisk z Podręcznika Badacza (s. 208) */
export const IIRP_SURNAMES: readonly string[] = [
  'Adamski', 'Andrzejewski', 'Barański', 'Borowski', 'Brzeziński',
  'Chmielewski', 'Chojnacki', 'Cieślak', 'Czarnecki', 'Czerwiński',
  'Dąbrowski', 'Domański', 'Gajda', 'Gajewski', 'Głowacki',
  'Górski', 'Grabowski', 'Jabłoński', 'Jakubowski', 'Jankowski',
  'Jarosz', 'Jasiński', 'Jastrzębski', 'Jaworski', 'Kaczmarek',
  'Kamiński', 'Karpiński', 'Kaźmierczak', 'Kołodziejczyk', 'Kopeć',
  'Kot', 'Kowalczyk', 'Kowalewski', 'Kowalski', 'Kozioł',
  'Kozłowski', 'Krajewski', 'Krawczyk', 'Król', 'Kubiak',
  'Kurek', 'Kwiatkowski', 'Laskowski', 'Lewandowski', 'Łuczak',
  'Maciejewski', 'Majewski', 'Makowski', 'Malinowski', 'Marciniak',
  'Mazur', 'Michalak', 'Michalski', 'Mikołajczyk', 'Mróz',
  'Nowacki', 'Nowak', 'Nowakowski', 'Nowicki', 'Olszewski',
  'Ostrowski', 'Pawlak', 'Pawłowski', 'Pietrzak', 'Piotrowski',
  'Przybylczak', 'Sadowski', 'Sikora', 'Sikorski', 'Sobczak',
  'Sokołowski', 'Stankiewicz', 'Szczepański', 'Szewczyk', 'Szulc',
  'Szymański', 'Szymczak', 'Tomaszewski', 'Tomczak', 'Urbaniak',
  'Walczak', 'Wasilewski', 'Wawrzyniak', 'Wieczorek', 'Wilk',
  'Wiśniewski', 'Witkowski', 'Włodarczyk', 'Wojciechowski', 'Woźniak',
  'Wójcik', 'Wójtowicz', 'Wróbel', 'Wróblewski', 'Wysocki',
  'Zając', 'Zakrzewski', 'Zalewski', 'Zawadzki', 'Zieliński',
] as const;

/** Mniejszość żydowska w II RP (s. 208) */
export const IIRP_JEWISH_MINORITY: readonly MinorityNameEntry[] = [
  { number: 1, male: 'Aaron', female: 'Ada', surname: 'Cymermann' },
  { number: 2, male: 'Ariel', female: 'Debora', surname: 'Fisher' },
  { number: 3, male: 'Dawid', female: 'Eleonora', surname: 'Geldmann' },
  { number: 4, male: 'Icek', female: 'Estera', surname: 'Ginsberg' },
  { number: 5, male: 'Izaak', female: 'Gouda', surname: 'Goldbaum' },
  { number: 6, male: 'Izajasz', female: 'Ksymena', surname: 'Lankamer' },
  { number: 7, male: 'Jakub', female: 'Leila', surname: 'Liwszyc' },
  { number: 8, male: 'Mosze', female: 'Miriam', surname: 'Mendel' },
  { number: 9, male: 'Salomon', female: 'Nina', surname: 'Moritz' },
  { number: 10, male: 'Szymon', female: 'Rachela', surname: 'Szancer' },
] as const;

/** Mniejszość niemiecka w II RP (s. 208) */
export const IIRP_GERMAN_MINORITY: readonly MinorityNameEntry[] = [
  { number: 1, male: 'Gerd', female: 'Anne', surname: 'Bauer' },
  { number: 2, male: 'Anton', female: 'Erika', surname: 'Baumann' },
  { number: 3, male: 'Josef', female: 'Gertrude', surname: 'Hertzmann' },
  { number: 4, male: 'Hans', female: 'Grete', surname: 'Koch' },
  { number: 5, male: 'Fritz', female: 'Ilse', surname: 'Kugel' },
  { number: 6, male: 'Johann', female: 'Ingrid', surname: 'Lange' },
  { number: 7, male: 'Wernherr', female: 'Isabele', surname: 'Odermann' },
  { number: 8, male: 'Lutipold', female: 'Marie', surname: 'Schmidt' },
  { number: 9, male: 'Kurt', female: 'Ode', surname: 'Steiner' },
  { number: 10, male: 'Rudolf', female: 'Urlika', surname: 'Wanke' },
] as const;

/** Mniejszość wschodnia (rosyjska, ukraińska, białoruska) w II RP (s. 208) */
export const IIRP_EASTERN_MINORITY: readonly MinorityNameEntry[] = [
  { number: 1, male: 'Borys', female: 'Anna', surname: 'Bogdanow' },
  { number: 2, male: 'Dennis', female: 'Dina', surname: 'Woronin' },
  { number: 3, male: 'Dymitr', female: 'Irmina', surname: 'Klimow' },
  { number: 4, male: 'Georgij', female: 'Lidia', surname: 'Marunik' },
  { number: 5, male: 'Iwan', female: 'Maria', surname: 'Piotrow' },
  { number: 6, male: 'Paweł', female: 'Marina', surname: 'Ostapienko' },
  { number: 7, male: 'Piotr', female: 'Nadia', surname: 'Sokołow' },
  { number: 8, male: 'Roman', female: 'Natalia', surname: 'Gawriłow' },
  { number: 9, male: 'Sasza', female: 'Natasza', surname: 'Lebiediew' },
  { number: 10, male: 'Sergiej', female: 'Sława', surname: 'Popow' },
] as const;

/** Wszystkie mniejszości razem */
export const IIRP_ALL_MINORITIES = [
  ...IIRP_JEWISH_MINORITY,
  ...IIRP_GERMAN_MINORITY,
  ...IIRP_EASTERN_MINORITY,
] as const;

/**
 * Losuje imię męskie z puli II RP (1-100).
 */
export function getRandomIIRPMaleName(rng: () => number = Math.random): string {
  const index = Math.floor(rng() * IIRP_MALE_NAMES.length);
  return IIRP_MALE_NAMES[index];
}

/**
 * Losuje imię żeńskie z puli II RP (1-100).
 */
export function getRandomIIRPFemaleName(rng: () => number = Math.random): string {
  const index = Math.floor(rng() * IIRP_FEMALE_NAMES.length);
  return IIRP_FEMALE_NAMES[index];
}

/**
 * Losuje nazwisko z puli II RP (1-100).
 */
export function getRandomIIRPSurname(rng: () => number = Math.random): string {
  const index = Math.floor(rng() * IIRP_SURNAMES.length);
  return IIRP_SURNAMES[index];
}

export interface IIRPNameOptions {
  gender?: 'male' | 'female';
  includeMinorities?: boolean;
  minorityWeight?: number; // domyślnie ok. 15% szansy na nazwisko mniejszości w II RP
}

/**
 * Generuje pełne imię i nazwisko dla Badacza w II RP.
 */
export function getRandomIIRPCharacterName(
  options: IIRPNameOptions = {},
  rng: () => number = Math.random
): { firstName: string; surname: string; fullName: string; isMinority?: boolean } {
  const { gender, includeMinorities = false, minorityWeight = 0.15 } = options;
  const isMale = gender ? gender === 'male' : rng() > 0.5;

  if (includeMinorities && rng() < minorityWeight) {
    const minorityPool = IIRP_ALL_MINORITIES;
    const minorityEntry = minorityPool[Math.floor(rng() * minorityPool.length)];
    const firstName = isMale ? minorityEntry.male : minorityEntry.female;
    const surname = minorityEntry.surname;
    return {
      firstName,
      surname,
      fullName: `${firstName} ${surname}`,
      isMinority: true,
    };
  }

  const firstName = isMale ? getRandomIIRPMaleName(rng) : getRandomIIRPFemaleName(rng);
  const surname = getRandomIIRPSurname(rng);
  return {
    firstName,
    surname,
    fullName: `${firstName} ${surname}`,
    isMinority: false,
  };
}

// Aliasy dla zgodności nazewniczej
export const NAMES_IIRP_MALE = IIRP_MALE_NAMES;
export const NAMES_IIRP_FEMALE = IIRP_FEMALE_NAMES;
export const SURNAMES_IIRP = IIRP_SURNAMES;

export const MINORITY_JEWISH_MALE: readonly string[] = IIRP_JEWISH_MINORITY.map((m) => m.male);
export const MINORITY_JEWISH_FEMALE: readonly string[] = IIRP_JEWISH_MINORITY.map((m) => m.female);
export const MINORITY_GERMAN_MALE: readonly string[] = IIRP_GERMAN_MINORITY.map((m) => m.male);
export const MINORITY_GERMAN_FEMALE: readonly string[] = IIRP_GERMAN_MINORITY.map((m) => m.female);
export const MINORITY_EASTERN_MALE: readonly string[] = IIRP_EASTERN_MINORITY.map((m) => m.male);
export const MINORITY_EASTERN_FEMALE: readonly string[] = IIRP_EASTERN_MINORITY.map((m) => m.female);

export function getRandomIIRPName(
  gender: 'male' | 'female',
  minority?: 'jewish' | 'german' | 'eastern',
  rng: () => number = Math.random
): string {
  if (minority === 'jewish') {
    const list = gender === 'male' ? MINORITY_JEWISH_MALE : MINORITY_JEWISH_FEMALE;
    return list[Math.floor(rng() * list.length)];
  }
  if (minority === 'german') {
    const list = gender === 'male' ? MINORITY_GERMAN_MALE : MINORITY_GERMAN_FEMALE;
    return list[Math.floor(rng() * list.length)];
  }
  if (minority === 'eastern') {
    const list = gender === 'male' ? MINORITY_EASTERN_MALE : MINORITY_EASTERN_FEMALE;
    return list[Math.floor(rng() * list.length)];
  }
  return gender === 'male' ? getRandomIIRPMaleName(rng) : getRandomIIRPFemaleName(rng);
}

export function getRandomIIRPFullName(
  gender: 'male' | 'female',
  minority?: 'jewish' | 'german' | 'eastern',
  rng: () => number = Math.random
): string {
  const first = getRandomIIRPName(gender, minority, rng);
  if (minority === 'jewish') {
    return `${first} ${IIRP_JEWISH_MINORITY[Math.floor(rng() * IIRP_JEWISH_MINORITY.length)].surname}`;
  }
  if (minority === 'german') {
    return `${first} ${IIRP_GERMAN_MINORITY[Math.floor(rng() * IIRP_GERMAN_MINORITY.length)].surname}`;
  }
  if (minority === 'eastern') {
    return `${first} ${IIRP_EASTERN_MINORITY[Math.floor(rng() * IIRP_EASTERN_MINORITY.length)].surname}`;
  }
  return `${first} ${getRandomIIRPSurname(rng)}`;
}

