import {
  NAMES_IIRP_MALE,
  NAMES_IIRP_FEMALE,
  SURNAMES_IIRP,
  MINORITY_JEWISH_MALE,
  MINORITY_JEWISH_FEMALE,
  MINORITY_GERMAN_MALE,
  MINORITY_GERMAN_FEMALE,
  MINORITY_EASTERN_MALE,
  MINORITY_EASTERN_FEMALE,
  getRandomIIRPName,
  getRandomIIRPSurname,
  getRandomIIRPFullName,
} from './names-iirp';

describe('names-iirp (Podrecznik Badacza CoC 7ed, s. 208)', () => {
  it('zawiera dokladnie 100 unikalnych polskich imion meskich', () => {
    expect(NAMES_IIRP_MALE).toHaveLength(100);
    const unique = new Set(NAMES_IIRP_MALE);
    expect(unique.size).toBe(100);
    NAMES_IIRP_MALE.forEach((name) => {
      expect(typeof name).toBe('string');
      expect(name.trim().length).toBeGreaterThan(0);
    });
  });

  it('zawiera dokladnie 100 unikalnych polskich imion zenskich', () => {
    expect(NAMES_IIRP_FEMALE).toHaveLength(100);
    const unique = new Set(NAMES_IIRP_FEMALE);
    expect(unique.size).toBe(100);
    NAMES_IIRP_FEMALE.forEach((name) => {
      expect(typeof name).toBe('string');
      expect(name.trim().length).toBeGreaterThan(0);
    });
  });

  it('zawiera dokladnie 100 unikalnych polskich nazwisk', () => {
    expect(SURNAMES_IIRP).toHaveLength(100);
    const unique = new Set(SURNAMES_IIRP);
    expect(unique.size).toBe(100);
    SURNAMES_IIRP.forEach((surname) => {
      expect(typeof surname).toBe('string');
      expect(surname.trim().length).toBeGreaterThan(0);
    });
  });

  it('zawiera po 10 imion dla kazdej mniejszosci narodowej II RP', () => {
    expect(MINORITY_JEWISH_MALE).toHaveLength(10);
    expect(MINORITY_JEWISH_FEMALE).toHaveLength(10);
    expect(MINORITY_GERMAN_MALE).toHaveLength(10);
    expect(MINORITY_GERMAN_FEMALE).toHaveLength(10);
    expect(MINORITY_EASTERN_MALE).toHaveLength(10);
    expect(MINORITY_EASTERN_FEMALE).toHaveLength(10);
  });

  it('getRandomIIRPName losuje imie z glownej puli lub mniejszosci', () => {
    const maleName = getRandomIIRPName('male');
    expect(NAMES_IIRP_MALE).toContain(maleName);

    const femaleName = getRandomIIRPName('female');
    expect(NAMES_IIRP_FEMALE).toContain(femaleName);

    const jewishMale = getRandomIIRPName('male', 'jewish');
    expect(MINORITY_JEWISH_MALE).toContain(jewishMale);

    const germanFemale = getRandomIIRPName('female', 'german');
    expect(MINORITY_GERMAN_FEMALE).toContain(germanFemale);

    const easternMale = getRandomIIRPName('male', 'eastern');
    expect(MINORITY_EASTERN_MALE).toContain(easternMale);
  });

  it('getRandomIIRPSurname losuje nazwisko z tabeli 100 nazwisk', () => {
    const surname = getRandomIIRPSurname();
    expect(SURNAMES_IIRP).toContain(surname);
  });

  it('getRandomIIRPFullName laczy imie i nazwisko', () => {
    const fullName = getRandomIIRPFullName('male');
    const parts = fullName.split(' ');
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(NAMES_IIRP_MALE).toContain(parts[0]);
  });
});
