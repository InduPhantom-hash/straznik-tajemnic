import {
  normalizeSkillName,
  buildRecommendedSkills,
} from './normalize-skill-name';
import {
  distributeRecommendedSkillPoints,
  fillRemainingSkillPoints,
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

