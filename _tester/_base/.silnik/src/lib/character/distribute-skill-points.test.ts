import {
  normalizeSkillName,
  buildRecommendedSkills,
} from './normalize-skill-name';
import {
  distributeRecommendedSkillPoints,
  fillRemainingSkillPoints,
  calculateSkillPointsUsage,
} from './distribute-skill-points';
import {
  BASE_SKILLS,
  SKILL_CREATION_LIMIT,
  SKILL_LIMIT_EXCEPTIONS,
} from '../data/character/skills';

describe('normalizeSkillName', () => {
  it('zachowuje Broń Palna (Karabin) jako pełnoprawną umiejętność bazową', () => {
    expect(normalizeSkillName('Broń Palna (Karabin)')).toBe(
      'Broń Palna (Karabin)'
    );
  });

  it('obcina specjalizację w nawiasie dla umiejętności ogólnych', () => {
    expect(normalizeSkillName('Nauka (Biologia)')).toBe('Nauka');
    expect(normalizeSkillName('Język Obcy (łacina)')).toBe('Język Obcy');
    expect(normalizeSkillName('Język Obcy (2)')).toBe('Język Obcy');
  });

  it('rozpoznaje i mapuje angielskie nazwy umiejętności CoC 7e na kanoniczne klucze', () => {
    expect(normalizeSkillName('Spot Hidden')).toBe('Spostrzegawczość');
    expect(normalizeSkillName('Library Use')).toBe('Biblioteka');
    expect(normalizeSkillName('First Aid')).toBe('Pierwsza Pomoc');
    expect(normalizeSkillName('Fighting (Brawl)')).toBe('Walka Wręcz (Bijatyka)');
    expect(normalizeSkillName('Drive Auto')).toBe('Prowadzenie Samochodu');
    expect(normalizeSkillName('Locksmith')).toBe('Ślusarstwo');
  });

  it('działa case-insensitive dla angielskich i polskich nazw', () => {
    expect(normalizeSkillName('spot hidden')).toBe('Spostrzegawczość');
    expect(normalizeSkillName('first aid')).toBe('Pierwsza Pomoc');
    expect(normalizeSkillName('spostrzegawczość')).toBe('Spostrzegawczość');
  });

  it('odrzuca nieznane umiejętności i halucynacje (ochrona przed kluczami-widmami)', () => {
    expect(normalizeSkillName('Superpowers')).toBeNull();
    expect(normalizeSkillName('Laser Eyes')).toBeNull();
    expect(normalizeSkillName('RandomFakeSkill')).toBeNull();
    expect(normalizeSkillName('any')).toBeNull();
    expect(normalizeSkillName('Any')).toBeNull();
  });

  it('odrzuca Dowolna oraz puste wartości', () => {
    expect(normalizeSkillName('Dowolna')).toBeNull();
    expect(normalizeSkillName('dowolna')).toBeNull();
    expect(normalizeSkillName('')).toBeNull();
  });
});

describe('buildRecommendedSkills', () => {
  it('tworzy zbiór unikalnych umiejętności z archetypu i zawodu bez kluczy-widm', () => {
    const archetype = ['Biblioteka', 'Spostrzegawczość'];
    const occ = [
      'Walka Wręcz',
      'Broń Palna (Karabin)',
      'Dowolna',
      'Nauka (Fizyka)',
    ];
    const recommended = buildRecommendedSkills(archetype, occ);

    expect(recommended).toContain('Biblioteka');
    expect(recommended).toContain('Spostrzegawczość');
    expect(recommended).toContain('Walka Wręcz');
    expect(recommended).toContain('Broń Palna (Karabin)');
    expect(recommended).toContain('Nauka');
    expect(recommended).not.toContain('Dowolna');
    expect(recommended).not.toContain('Nauka (Fizyka)');
  });
});

describe('distributeRecommendedSkillPoints', () => {
  const resolveBase = (s: string) => BASE_SKILLS[s] || 1;
  const resolveMax = (s: string) =>
    SKILL_LIMIT_EXCEPTIONS.includes(s) ? 99 : SKILL_CREATION_LIMIT;

  it('poprawnie zużywa całą pulę punktów, gdy pula jest mniejsza niż suma limitów (np. Żołnierz 421 pkt)', () => {
    const recommended = [
      'Spostrzegawczość',
      'Biblioteka',
      'Psychologia',
      'Perswazja',
      'Walka Wręcz',
      'Broń Palna (Karabin)',
      'Unik',
      'Pierwsza Pomoc',
      'Skradanie',
      'Przetrwanie',
    ];

    const result = distributeRecommendedSkillPoints({
      recommendedSkills: recommended,
      currentSkills: {},
      totalPoints: 421,
      getBaseValue: resolveBase,
      getMaxValue: resolveMax,
    });

    expect(result.pointsUsed).toBe(421);
    expect(result.remainingPoints).toBe(0);
    for (const skill of recommended) {
      expect(result.skills[skill]).toBeGreaterThan(resolveBase(skill));
      expect(result.skills[skill]).toBeLessThanOrEqual(75);
    }
  });

  it('zwraca nadwyżkę punktów w remainingPoints, gdy wszystkie rekomendowane osiągną limit 75%', () => {
    const recommended = ['Biblioteka']; // baza 20, max 75 -> wymaga 55 pkt

    const result = distributeRecommendedSkillPoints({
      recommendedSkills: recommended,
      currentSkills: {},
      totalPoints: 100,
      getBaseValue: resolveBase,
      getMaxValue: resolveMax,
    });

    expect(result.skills['Biblioteka']).toBe(75);
    expect(result.pointsUsed).toBe(55);
    expect(result.remainingPoints).toBe(45);
  });

  it('zwraca 0 zużytych punktów przy zerowej puli', () => {
    const result = distributeRecommendedSkillPoints({
      recommendedSkills: ['Biblioteka'],
      currentSkills: {},
      totalPoints: 0,
      getBaseValue: resolveBase,
      getMaxValue: resolveMax,
    });

    expect(result.pointsUsed).toBe(0);
    expect(result.remainingPoints).toBe(0);
  });
});

describe('fillRemainingSkillPoints', () => {
  const resolveBase = (s: string) => BASE_SKILLS[s] || 1;
  const resolveMax = (s: string) =>
    SKILL_LIMIT_EXCEPTIONS.includes(s) ? 99 : SKILL_CREATION_LIMIT;

  it('deterministycznie dopełnia całą brakującą pulę punktów (np. 50 pkt)', () => {
    const initialSkills: Record<string, number> = {
      Spostrzegawczość: 50,
      Biblioteka: 40,
    };

    const result = fillRemainingSkillPoints({
      skills: initialSkills,
      remainingPoints: 50,
      prioritySkills: ['Spostrzegawczość', 'Biblioteka'],
      getBaseValue: resolveBase,
      getMaxValue: resolveMax,
    });

    expect(result.pointsUsed).toBe(50);
    expect(result.remainingPoints).toBe(0);
    // Priorytetowe umiejętności zostały podniesione
    expect(result.skills['Spostrzegawczość']).toBeGreaterThan(50);
    expect(result.skills['Biblioteka']).toBeGreaterThan(40);
    expect(result.skills['Spostrzegawczość']).toBeLessThanOrEqual(75);
    expect(result.skills['Biblioteka']).toBeLessThanOrEqual(75);
  });

  it('przechodzi do puli ogólnej, gdy priorytetowe osiągną limit 75%', () => {
    const initialSkills: Record<string, number> = {
      Spostrzegawczość: 75,
    };

    const result = fillRemainingSkillPoints({
      skills: initialSkills,
      remainingPoints: 30,
      prioritySkills: ['Spostrzegawczość'],
      getBaseValue: resolveBase,
      getMaxValue: resolveMax,
    });

    expect(result.pointsUsed).toBe(30);
    expect(result.remainingPoints).toBe(0);
    expect(result.skills['Spostrzegawczość']).toBe(75);
    // Punkty trafiły do innej umiejętności z BASE_SKILLS
    const increased = Object.entries(result.skills).filter(
      ([name, val]) => name !== 'Spostrzegawczość' && val > resolveBase(name)
    );
    expect(increased.length).toBeGreaterThan(0);
  });

  it('nigdy nie przydziela punktów do Majętności ani Mitów Cthulhu', () => {
    const result = fillRemainingSkillPoints({
      skills: {},
      remainingPoints: 100,
      prioritySkills: ['Majętność', 'Mity Cthulhu'],
      getBaseValue: resolveBase,
      getMaxValue: resolveMax,
    });

    expect(result.skills['Majętność']).toBeUndefined();
    expect(result.skills['Mity Cthulhu']).toBeUndefined();
  });

  it('zwraca 0 zużytych punktów przy zerowej puli', () => {
    const result = fillRemainingSkillPoints({
      skills: {},
      remainingPoints: 0,
      getBaseValue: resolveBase,
      getMaxValue: resolveMax,
    });

    expect(result.pointsUsed).toBe(0);
    expect(result.remainingPoints).toBe(0);
  });
});

describe('calculateSkillPointsUsage (Issue #411 CoC 7e RAW)', () => {
  const resolveBase = (name: string) => BASE_SKILLS[name] || 1;

  it('rozdziela punkty między pulę zawodową (z Majętnością) a pulę zainteresowań', () => {
    // Zawodowe: Biblioteka (baza 20), Spostrzegawczość (baza 25)
    // Hobby: Pływanie (baza 20)
    // Majętność: 30
    // Pula zawodowa: 240, zainteresowań: 140
    const usage = calculateSkillPointsUsage({
      skills: {
        Biblioteka: 60, // +40 pkt
        Spostrzegawczość: 65, // +40 pkt
        Pływanie: 50, // +30 pkt
      },
      recommendedSkills: ['Biblioteka', 'Spostrzegawczość'],
      creditRating: 30,
      occupationPoints: 240,
      interestPoints: 140,
      getBaseValue: resolveBase,
    });

    // Pula zawodowa netto na skille: 240 - 30 = 210
    // Wydano na skille zawodowe: 40 + 40 = 80 <= 210
    expect(usage.occupationSkillPointsUsed).toBe(80);
    expect(usage.occupationPointsUsed).toBe(110); // 80 + 30
    expect(usage.occupationPointsRemaining).toBe(130); // 240 - 110
    expect(usage.isOccupationOverLimit).toBe(false);

    // Hobby: 30 pkt
    expect(usage.interestPointsUsed).toBe(30);
    expect(usage.interestPointsRemaining).toBe(110); // 140 - 30
    expect(usage.isInterestOverLimit).toBe(false);

    expect(usage.totalPointsUsed).toBe(140);
    expect(usage.totalPointsAvailable).toBe(380);
    expect(usage.isTotalOverLimit).toBe(false);
  });

  it('przelewa nadmiar z umiejętności zawodowych na pulę zainteresowań (RAW)', () => {
    // Pula zawodowa: 100, Majętność: 20 -> pula netto = 80
    // Umiejętności zawodowe zjadają 120 pkt (80 z zawodowej + 40 nadmiaru z zainteresowań)
    // Umiejętności hobby: 30 pkt
    // Pula zainteresowań: 100
    const usage = calculateSkillPointsUsage({
      skills: {
        Biblioteka: 80, // baza 20 -> +60
        Spostrzegawczość: 85, // baza 25 -> +60 (razem 120 pkt)
        Pływanie: 50, // baza 20 -> +30 pkt hobby
      },
      recommendedSkills: ['Biblioteka', 'Spostrzegawczość'],
      creditRating: 20,
      occupationPoints: 100,
      interestPoints: 100,
      getBaseValue: resolveBase,
    });

    expect(usage.occupationSkillPointsUsed).toBe(80);
    expect(usage.occupationPointsUsed).toBe(100); // 80 + 20
    expect(usage.occupationPointsRemaining).toBe(0);
    expect(usage.isOccupationOverLimit).toBe(false);

    // Zainteresowania: 30 (hobby) + 40 (nadmiar zawodowy) = 70 pkt
    expect(usage.interestPointsUsed).toBe(70);
    expect(usage.interestPointsRemaining).toBe(30); // 100 - 70
    expect(usage.isInterestOverLimit).toBe(false);

    expect(usage.totalPointsUsed).toBe(170);
    expect(usage.totalPointsAvailable).toBe(200);
    expect(usage.isTotalOverLimit).toBe(false);
  });

  it('wykrywa przekroczenie limitu puli zainteresowań, gdy hobby i nadmiar przekraczają INT × 2', () => {
    // Pula zawodowa: 100, Majętność: 0 -> netto 100
    // Pula zainteresowań: 50
    // Zawodowe: 100 pkt (zużywa pełną pulę)
    // Hobby: 60 pkt (przekracza pulę zainteresowań 50)
    const usage = calculateSkillPointsUsage({
      skills: {
        Biblioteka: 120, // baza 20 -> +100
        Pływanie: 80, // baza 20 -> +60 hobby
      },
      recommendedSkills: ['Biblioteka'],
      creditRating: 0,
      occupationPoints: 100,
      interestPoints: 50,
      getBaseValue: resolveBase,
    });

    expect(usage.occupationPointsUsed).toBe(100);
    expect(usage.occupationPointsRemaining).toBe(0);
    expect(usage.isOccupationOverLimit).toBe(false);

    expect(usage.interestPointsUsed).toBe(60);
    expect(usage.interestPointsRemaining).toBe(-10);
    expect(usage.isInterestOverLimit).toBe(true);
    expect(usage.isTotalOverLimit).toBe(true);
  });

  it('wykrywa przekroczenie limitu puli zawodowej, gdy Majętność przekracza occupationPoints', () => {
    const usage = calculateSkillPointsUsage({
      skills: {},
      recommendedSkills: ['Biblioteka'],
      creditRating: 150,
      occupationPoints: 100,
      interestPoints: 50,
      getBaseValue: resolveBase,
    });

    expect(usage.occupationPointsUsed).toBe(150);
    expect(usage.occupationPointsRemaining).toBe(-50);
    expect(usage.isOccupationOverLimit).toBe(true);
  });

  it('ignoruje Mity Cthulhu oraz Majętność w mapie skills (obsługiwana przez dedykowany parametr)', () => {
    const usage = calculateSkillPointsUsage({
      skills: {
        'Mity Cthulhu': 20,
        Majętność: 50,
      },
      recommendedSkills: [],
      creditRating: 20,
      occupationPoints: 100,
      interestPoints: 50,
      getBaseValue: resolveBase,
    });

    expect(usage.occupationPointsUsed).toBe(20);
    expect(usage.interestPointsUsed).toBe(0);
  });
});

