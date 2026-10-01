import { extractSkillTests } from '@/lib/parsers/mechanics-parser';
import {
  evaluateCombinedSkillCheck,
  formatCombinedRollForChat,
  formatCombinedRollForAI,
  generateCombinedResultTags,
} from '@/lib/combined-skill-rolls';

describe('Combined Skill Rolls CoC 7e RAW (s. 103, 105)', () => {
  describe('extractSkillTests - detekcja operatorów LUB / I oraz OR / AND', () => {
    it('parsuje test łączony z operatorem LUB', () => {
      const [test] = extractSkillTests(
        '[TEST: Spostrzegawczość LUB Ślusarstwo | zwykły | | Szukasz ukrytego mechanizmu zamka]'
      );

      expect(test).toBeDefined();
      expect(test.skillName).toBe('Spostrzegawczość LUB Ślusarstwo');
      expect(test.combined).toEqual({
        operator: 'OR',
        skills: [
          { skillName: 'Spostrzegawczość', skillValue: 0 },
          { skillName: 'Ślusarstwo', skillValue: 0 },
        ],
      });
      expect(test.difficulty).toBe('zwykly');
    });

    it('parsuje test łączony z operatorem I', () => {
      const [test] = extractSkillTests(
        '[TEST: Elektryka I Mechanika | trudny | Brak narzędzi:-1 | Naprawa turbiny]'
      );

      expect(test).toBeDefined();
      expect(test.skillName).toBe('Elektryka I Mechanika');
      expect(test.combined).toEqual({
        operator: 'AND',
        skills: [
          { skillName: 'Elektryka', skillValue: 0 },
          { skillName: 'Mechanika', skillValue: 0 },
        ],
      });
      expect(test.difficulty).toBe('trudny');
      expect(test.modifiers).toHaveLength(1);
    });

    it('parsuje test łączony w języku angielskim (OR / AND)', () => {
      const [testOr] = extractSkillTests(
        '[TEST: Spot Hidden OR Locksmith | regular | | Search the desk]'
      );
      expect(testOr.combined).toEqual({
        operator: 'OR',
        skills: [
          { skillName: 'Spot Hidden', skillValue: 0 },
          { skillName: 'Locksmith', skillValue: 0 },
        ],
      });

      const [testAnd] = extractSkillTests(
        '[TEST: Electrical Repair AND Mechanical Repair | hard | | Fix engine]'
      );
      expect(testAnd.combined).toEqual({
        operator: 'AND',
        skills: [
          { skillName: 'Electrical Repair', skillValue: 0 },
          { skillName: 'Mechanical Repair', skillValue: 0 },
        ],
      });
    });

    it('parsuje test łączony w trybie Duet z prefiksem @Imię', () => {
      const [test] = extractSkillTests(
        '[TEST: @Margaret Sullivan: Spostrzegawczość LUB Psychologia | zwykły | | Obserwacja świadka]'
      );

      expect(test.characterName).toBe('Margaret Sullivan');
      expect(test.combined).toEqual({
        operator: 'OR',
        skills: [
          { skillName: 'Spostrzegawczość', skillValue: 0 },
          { skillName: 'Psychologia', skillValue: 0 },
        ],
      });
    });
  });

  describe('evaluateCombinedSkillCheck - logika rozstrzygania rzutu', () => {
    const subtests = [
      { skillName: 'Spostrzegawczość', skillValue: 55 },
      { skillName: 'Ślusarstwo', skillValue: 40 },
    ];

    it('dla operatora OR: rzut 48 zdaje Spostrzegawczość, oblewa Ślusarstwo -> sukces ogólny', () => {
      const resolution = evaluateCombinedSkillCheck({
        roll: 48,
        subtests,
        operator: 'OR',
        difficulty: 'zwykly',
        bonusDice: 0,
      });

      expect(resolution.overallSuccess).toBe(true);
      expect(resolution.subtests[0].isSuccess).toBe(true);
      expect(resolution.subtests[0].shouldMark).toBe(true); // zaliczone -> oznaczyć
      expect(resolution.subtests[1].isSuccess).toBe(false);
      expect(resolution.subtests[1].shouldMark).toBe(false); // niezdane -> nie oznaczać
    });

    it('dla operatora OR: rzut 30 zdaje obie umiejętności -> obie oznaczone do rozwoju', () => {
      const resolution = evaluateCombinedSkillCheck({
        roll: 30,
        subtests,
        operator: 'OR',
        difficulty: 'zwykly',
        bonusDice: 0,
      });

      expect(resolution.overallSuccess).toBe(true);
      expect(resolution.subtests[0].isSuccess).toBe(true);
      expect(resolution.subtests[0].shouldMark).toBe(true);
      expect(resolution.subtests[1].isSuccess).toBe(true);
      expect(resolution.subtests[1].shouldMark).toBe(true);
    });

    it('dla operatora OR: rzut 75 oblewa obie -> porażka ogólna, brak oznaczeń', () => {
      const resolution = evaluateCombinedSkillCheck({
        roll: 75,
        subtests,
        operator: 'OR',
        difficulty: 'zwykly',
        bonusDice: 0,
      });

      expect(resolution.overallSuccess).toBe(false);
      expect(resolution.subtests[0].shouldMark).toBe(false);
      expect(resolution.subtests[1].shouldMark).toBe(false);
    });

    it('dla operatora AND: rzut 48 zdaje jedną ale oblewa drugą -> porażka ogólna, oznaczona tylko zdana', () => {
      const resolution = evaluateCombinedSkillCheck({
        roll: 48,
        subtests: [
          { skillName: 'Elektryka', skillValue: 50 },
          { skillName: 'Mechanika', skillValue: 40 },
        ],
        operator: 'AND',
        difficulty: 'zwykly',
        bonusDice: 0,
      });

      expect(resolution.overallSuccess).toBe(false); // wymagane OBA sukcesy
      expect(resolution.subtests[0].isSuccess).toBe(true);
      expect(resolution.subtests[0].shouldMark).toBe(true); // RAW s. 105: umiejętność z udanym rzutem jest oznaczana
      expect(resolution.subtests[1].isSuccess).toBe(false);
      expect(resolution.subtests[1].shouldMark).toBe(false);
    });

    it('dla operatora AND: rzut 35 zdaje obie -> sukces ogólny i obie oznaczone', () => {
      const resolution = evaluateCombinedSkillCheck({
        roll: 35,
        subtests: [
          { skillName: 'Elektryka', skillValue: 50 },
          { skillName: 'Mechanika', skillValue: 40 },
        ],
        operator: 'AND',
        difficulty: 'zwykly',
        bonusDice: 0,
      });

      expect(resolution.overallSuccess).toBe(true);
      expect(resolution.subtests[0].shouldMark).toBe(true);
      expect(resolution.subtests[1].shouldMark).toBe(true);
    });

    it('z kością premiową (bonusDice > 0): żadna umiejętność nie jest oznaczana do rozwoju (s. 105 RAW)', () => {
      const resolution = evaluateCombinedSkillCheck({
        roll: 20,
        subtests,
        operator: 'OR',
        difficulty: 'zwykly',
        bonusDice: 1,
      });

      expect(resolution.overallSuccess).toBe(true);
      expect(resolution.subtests[0].isSuccess).toBe(true);
      expect(resolution.subtests[0].shouldMark).toBe(false); // blokada kości premiowej
      expect(resolution.subtests[1].isSuccess).toBe(true);
      expect(resolution.subtests[1].shouldMark).toBe(false); // blokada kości premiowej
    });
  });

  describe('generateCombinedResultTags - tagi [WYNIK:] dla czatu i useSkillMarking', () => {
    it('generuje tagi [WYNIK:] dla obu umiejętności', () => {
      const resolution = evaluateCombinedSkillCheck({
        roll: 48,
        subtests: [
          { skillName: 'Spostrzegawczość', skillValue: 55 },
          { skillName: 'Ślusarstwo', skillValue: 40 },
        ],
        operator: 'OR',
        difficulty: 'zwykly',
        bonusDice: 0,
      });

      const tags = generateCombinedResultTags(resolution, 'Margaret Sullivan');
      expect(tags).toContain('[WYNIK:@Margaret Sullivan: Spostrzegawczość | 48 ≤ 55 | SUKCES]');
      expect(tags).toContain('[WYNIK:@Margaret Sullivan: Ślusarstwo | 48 ≤ 40 | PORAŻKA]');
    });
  });
});
