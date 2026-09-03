import {
  normalizeSkillName,
  buildRecommendedSkills,
} from './normalize-skill-name';
import { distributeRecommendedSkillPoints } from './distribute-skill-points';
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
