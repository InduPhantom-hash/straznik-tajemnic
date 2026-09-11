import {
  generateRandomCharacter,
  generateRandomCharacters,
  generateRandomIIRPCharacter,
} from './random-character-generator';
import {
  NAMES_IIRP_MALE,
  NAMES_IIRP_FEMALE,
  MINORITY_JEWISH_MALE,
  MINORITY_JEWISH_FEMALE,
  MINORITY_GERMAN_MALE,
  MINORITY_GERMAN_FEMALE,
  MINORITY_EASTERN_MALE,
  MINORITY_EASTERN_FEMALE,
} from './data/character/names-iirp';
import { OCCUPATIONS } from './data/character';
import { calculateOccupationPoints } from './character/occupation-points';

describe('random-character-generator (CoC 7e RAW)', () => {
  it('generuje poprawną postać z kanonicznymi cechami i cechami pochodnymi', () => {
    const char = generateRandomCharacter(42);

    expect(char.name).toBeDefined();
    expect(char.occupation).toBeDefined();
    expect(char.age).toBeGreaterThanOrEqual(15);
    expect(char.age).toBeLessThanOrEqual(75);

    // Cechy podstawowe w skali CoC 7e (15-99)
    expect(char.str).toBeGreaterThanOrEqual(15);
    expect(char.dex).toBeGreaterThanOrEqual(15);
    expect(char.con).toBeGreaterThanOrEqual(15);
    expect(char.app).toBeGreaterThanOrEqual(15);
    expect(char.pow).toBeGreaterThanOrEqual(15);
    expect(char.edu).toBeGreaterThanOrEqual(15);
    expect(char.siz).toBeGreaterThanOrEqual(15);
    expect(char.int).toBeGreaterThanOrEqual(15);
    expect(char.luck).toBeGreaterThanOrEqual(15);

    // Cechy pochodne RAW
    expect(char.hp).toBe(Math.floor((char.con + char.siz) / 10));
    expect(char.san).toBe(char.pow);
    expect(char.mp).toBe(Math.floor(char.pow / 5));
    expect(char.maxHp).toBe(char.hp);
    expect(char.maxSan).toBe(char.san);
    expect(char.maxMp).toBe(char.mp);

    // Umiejętności dynamiczne RAW
    expect(char.skills['Język Ojczysty']).toBe(char.edu);
    expect(char.skills['Unik']).toBe(Math.floor(char.dex / 2));
  });

  it('nie zawiera nielicencjonowanych zamakietowanych umiejętności', () => {
    // Generujemy 20 losowych postaci, aby przetestować różne zawody
    for (let i = 0; i < 20; i++) {
      const char = generateRandomCharacter(100 + i);

      // Usunięte niekanoniczne klucze
      expect(char.skills['Śledztwo']).toBeUndefined();
      expect(char.skills['Bibliotekarstwo']).toBeUndefined();
      expect(char.skills['Kredyt']).toBeUndefined();
      expect(char.skills['Ocena']).toBeUndefined();
      expect(char.skills['Słuchanie']).toBeUndefined();

      // Kanoniczne umiejętności RAW obecne
      expect(char.skills['Biblioteka']).toBeDefined();
      expect(char.skills['Spostrzegawczość']).toBeDefined();
      expect(char.skills['Majętność']).toBeDefined();

      // Blokada kreacji dla Mitów Cthulhu (RAW: zawsze 0% przy kreacji)
      expect(char.skills['Mity Cthulhu']).toBe(0);

      // Poprawka literówki: Okultyzm obecny, Occultyzm usunięty
      expect(char.skills['Okultyzm']).toBeDefined();
      expect(char.skills['Occultyzm']).toBeUndefined();

      // Nowe umiejętności z Podręcznika Badacza CoC 7e RAW
      expect(char.skills['Obsługa Ciężkiego Sprzętu']).toBeDefined();
      expect(char.skills['Zręczne Palce']).toBeDefined();
      expect(char.skills['Psychoanaliza']).toBeDefined();
      expect(char.skills['Wiedza o Naturze']).toBeDefined();
      expect(char.skills['Wiedza Tajemna']).toBeDefined();
      expect(char.skills['Broń Palna (Karabin)']).toBeDefined();
      expect(char.skills['Walka Wręcz (Bijatyka)']).toBeDefined();
    }
  });

  it('losuje Majętność ściśle w widełkach zawodu RAW', () => {
    for (let i = 0; i < 30; i++) {
      const char = generateRandomCharacter(500 + i);
      const occ = OCCUPATIONS.find((o) => o.name === char.occupation);
      expect(occ).toBeDefined();
      if (!occ) continue;

      const majetnosc = char.skills['Majętność'] as number;
      expect(majetnosc).toBeGreaterThanOrEqual(occ.creditMin);
      expect(majetnosc).toBeLessThanOrEqual(occ.creditMax);
    }
  });

  it('zapewnia determinizm przy podaniu seeda', () => {
    const char1 = generateRandomCharacter(9999);
    const char2 = generateRandomCharacter(9999);

    expect(char1.name).toBe(char2.name);
    expect(char1.occupation).toBe(char2.occupation);
    expect(char1.age).toBe(char2.age);
    expect(char1.str).toBe(char2.str);
    expect(char1.dex).toBe(char2.dex);
    expect(char1.con).toBe(char2.con);
    expect(char1.app).toBe(char2.app);
    expect(char1.pow).toBe(char2.pow);
    expect(char1.edu).toBe(char2.edu);
    expect(char1.siz).toBe(char2.siz);
    expect(char1.int).toBe(char2.int);
    expect(char1.luck).toBe(char2.luck);
    expect(char1.skills).toEqual(char2.skills);
  });

  it('generateRandomCharacters zwraca zadaną liczbę postaci', () => {
    const list = generateRandomCharacters(5, 777);
    expect(list).toHaveLength(5);
    // Każda postać ma unikalne imię lub identyfikator
    const ids = new Set(list.map((c) => c.id));
    expect(ids.size).toBe(5);
  });

  it('generateRandomIIRPCharacter generuje postac w realiach II RP', () => {
    const char = generateRandomIIRPCharacter(1925);

    expect(char.era).toBe('1920s-poland');
    expect(char.currency).toBe('PLN');
    expect(char.spendingLevel).toBeDefined();
    expect(char.cash).toBeDefined();
    expect(char.assets).toBeDefined();

    // Sprawdz czy imie pochodzi z puli II RP
    const [firstName] = char.name.split(' ');
    const isPolishName =
      NAMES_IIRP_MALE.includes(firstName) ||
      NAMES_IIRP_FEMALE.includes(firstName) ||
      MINORITY_JEWISH_MALE.includes(firstName) ||
      MINORITY_JEWISH_FEMALE.includes(firstName) ||
      MINORITY_GERMAN_MALE.includes(firstName) ||
      MINORITY_GERMAN_FEMALE.includes(firstName) ||
      MINORITY_EASTERN_MALE.includes(firstName) ||
      MINORITY_EASTERN_FEMALE.includes(firstName);
    expect(isPolishName).toBe(true);
  });

  it('generateRandomCharacter z opcja era: 1920s-poland ustawia polska walute i realia', () => {
    const char = generateRandomCharacter({ seed: 1930, era: '1920s-poland' });
    expect(char.era).toBe('1920s-poland');
    expect(char.currency).toBe('PLN');
    expect(char.spendingLevel).toBeGreaterThan(0);
    expect(char.cash).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateOccupationPoints', () => {
  const mockStats = {
    str: 60,
    con: 50,
    siz: 65,
    dex: 70,
    app: 40,
    int: 75,
    pow: 80,
    edu: 60,
    luck: 50,
  };

  it('prawidłowo oblicza punkty dla WYK × 4', () => {
    // Antiquarian ma WYK x 4
    const pts = calculateOccupationPoints('antiquarian', mockStats);
    expect(pts).toBe(mockStats.edu * 4); // 240
  });

  it('prawidłowo oblicza punkty dla formuł z wyborem cechy (np. WYK × 2 + (MOC × 2 lub ZR × 2))', () => {
    // Artist ma WYK x 2 + (MOC x 2 lub ZR x 2)
    // mockStats: edu=60 (120), pow=80 (160), dex=70 (140) -> max(160, 140) = 160 -> 120+160 = 280
    const pts = calculateOccupationPoints('artist', mockStats);
    expect(pts).toBe(mockStats.edu * 2 + mockStats.pow * 2); // 280
  });

  it('działa przy przekazaniu nazwy zawodu zamiast id', () => {
    const pts = calculateOccupationPoints('Artysta', mockStats);
    expect(pts).toBe(mockStats.edu * 2 + mockStats.pow * 2);
  });

  it('oblicza punkty zawodowe dla wszystkich 94 profesji bez błędów', () => {
    for (const occ of OCCUPATIONS) {
      const pts = calculateOccupationPoints(occ.id, mockStats);
      expect(typeof pts).toBe('number');
      expect(pts).toBeGreaterThanOrEqual(mockStats.edu * 2);
      expect(Number.isNaN(pts)).toBe(false);
    }
  });
});
