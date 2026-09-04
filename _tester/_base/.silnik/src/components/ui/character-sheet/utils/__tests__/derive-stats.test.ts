import type { Character } from '@/lib/types';
import { deriveStats } from '../derive-stats';

describe('deriveStats (CoC 7e RAW)', () => {
  it('oblicza cechy bojowe i pochodne zgodnie z regułami CoC 7e RAW, gdy brak override', () => {
    const char: Character = {
      id: 'char-1',
      name: 'Badacz Testowy',
      str: 70,
      siz: 60,
      dex: 65,
      con: 55,
      app: 50,
      int: 80,
      pow: 60,
      edu: 75,
      age: 35,
      hp: 11,
      san: 60,
      mp: 12,
      luck: 55,
      occupation: 'Profesor',
      skills: {},
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    const derived = deriveStats(char);

    // STR(70) + SIZ(60) = 130 -> Tabela CoC: 125-164: DB = +1K4, Build = 1
    expect(derived.damageBonus).toBe('+1K4');
    expect(derived.build).toBe(1);

    // STR(70) > SIZ(60) oraz DEX(65) > SIZ(60) -> Ruch bazowy 9. Wiek 35 (< 40) -> brak kary = 9
    expect(derived.move).toBe(9);

    // maxHp: floor((55 + 60) / 10) = 11
    expect(derived.maxHp).toBe(11);

    // maxMp: floor(60 / 5) = 12
    expect(derived.maxMp).toBe(12);

    // maxSan: 99 - Mity Cthulhu (0) = 99
    expect(derived.maxSan).toBe(99);
  });

  it('uwzględnia Mity Cthulhu przy wyliczaniu maxSan', () => {
    const char: Character = {
      id: 'char-mythos',
      name: 'Okultysta',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      age: 30,
      hp: 10,
      san: 35,
      mp: 10,
      luck: 50,
      occupation: 'Badacz',
      skills: {
        'Mity Cthulhu': 14,
      },
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    const derived = deriveStats(char);
    // 99 - 14 = 85
    expect(derived.maxSan).toBe(85);
  });

  it('respektuje jawne override jeśli zostały ustawione w postaci', () => {
    const char: Character = {
      id: 'char-override',
      name: 'Modyfikowany',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      age: 30,
      hp: 8,
      san: 30,
      mp: 5,
      luck: 40,
      occupation: 'Żołnierz',
      skills: {},
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
      maxHp: 15,
      maxSan: 90,
      maxMp: 20,
      move: 10,
      damageBonus: '+1K6',
      build: 2,
    };

    const derived = deriveStats(char);
    expect(derived.maxHp).toBe(15);
    expect(derived.maxSan).toBe(90);
    expect(derived.maxMp).toBe(20);
    expect(derived.move).toBe(10);
    expect(derived.damageBonus).toBe('+1K6');
    expect(derived.build).toBe(2);
  });
});
