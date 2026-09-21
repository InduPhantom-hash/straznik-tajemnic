import { BASE_SKILLS } from '@/lib/data/character/skills';
import { OCCUPATIONS } from '@/lib/data/character/occupations';

describe('Skills Filter Logic (#414)', () => {
  const CREDIT_RATING_SKILL = 'Majętność';

  it('correctly filters all standard skills excluding Credit Rating', () => {
    const mockSkills: Record<string, number> = {
      ...BASE_SKILLS,
      [CREDIT_RATING_SKILL]: 50,
    };

    const allSkillsList = Object.entries(mockSkills).filter(
      ([name]) => name !== CREDIT_RATING_SKILL
    );

    expect(allSkillsList.some(([name]) => name === CREDIT_RATING_SKILL)).toBe(false);
    // BASE_SKILLS zawiera 'Majętność', więc lista bez Majętności ma długość o 1 mniejszą
    expect(allSkillsList.length).toBe(Object.keys(BASE_SKILLS).length - 1);
  });

  it('correctly filters occupational skills based on recommended set', () => {
    const detective = OCCUPATIONS.find((o) => o.id === 'private_investigator')!;
    expect(detective).toBeDefined();

    const recommendedSkills = new Set(detective.skills);
    const mockSkills: Record<string, number> = { ...BASE_SKILLS };

    const allSkillsList = Object.entries(mockSkills).filter(
      ([name]) => name !== CREDIT_RATING_SKILL
    );

    const occupationalSkills = allSkillsList.filter(([name]) =>
      recommendedSkills.has(name)
    );

    expect(occupationalSkills.length).toBeGreaterThan(0);
    for (const [name] of occupationalSkills) {
      expect(recommendedSkills.has(name)).toBe(true);
    }
  });

  it('correctly filters invested skills (value > baseValue)', () => {
    const mockSkills: Record<string, number> = { ...BASE_SKILLS };

    // Początkowo żadna umiejętność nie jest rozwinięta
    const allSkillsListInitial = Object.entries(mockSkills).filter(
      ([name]) => name !== CREDIT_RATING_SKILL
    );
    const investedInitial = allSkillsListInitial.filter(
      ([name, val]) => val > (BASE_SKILLS[name] || 0)
    );
    expect(investedInitial).toHaveLength(0);

    // Dodajemy punkty do dwóch umiejętności
    mockSkills['Broń Krótka'] = (BASE_SKILLS['Broń Krótka'] || 20) + 30;
    mockSkills['Spostrzegawczość'] = (BASE_SKILLS['Spostrzegawczość'] || 25) + 20;

    const allSkillsListUpdated = Object.entries(mockSkills).filter(
      ([name]) => name !== CREDIT_RATING_SKILL
    );
    const investedUpdated = allSkillsListUpdated.filter(
      ([name, val]) => val > (BASE_SKILLS[name] || 0)
    );

    expect(investedUpdated).toHaveLength(2);
    const investedNames = investedUpdated.map(([name]) => name);
    expect(investedNames).toContain('Broń Krótka');
    expect(investedNames).toContain('Spostrzegawczość');
  });

  it('correctly calculates counts for all 3 categories', () => {
    const mockSkills: Record<string, number> = { ...BASE_SKILLS };
    mockSkills['Archeologia'] = (BASE_SKILLS['Archeologia'] || 1) + 40;

    const doctor = OCCUPATIONS.find((o) => o.id === 'doctor')!;
    const recommendedSkills = new Set(doctor.skills);

    const allSkillsList = Object.entries(mockSkills).filter(
      ([name]) => name !== CREDIT_RATING_SKILL
    );

    const totalCount = allSkillsList.length;
    const occupationalCount = allSkillsList.filter(([name]) =>
      recommendedSkills.has(name)
    ).length;
    const investedCount = allSkillsList.filter(
      ([name, val]) => val > (BASE_SKILLS[name] || 0)
    ).length;

    expect(totalCount).toBeGreaterThanOrEqual(40);
    expect(occupationalCount).toBeGreaterThan(0);
    expect(occupationalCount).toBeLessThanOrEqual(recommendedSkills.size);
    expect(investedCount).toBe(1);
  });
});
