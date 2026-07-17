import { extractSkillTests } from './mechanics-parser';

describe('extractSkillTests - duet', () => {
  it('zachowuje zgodność ze starym tagiem solo', () => {
    const [test] = extractSkillTests(
      '[TEST: Spostrzegawczość | zwykły | | Rozglądasz się po pokoju]'
    );

    expect(test).toMatchObject({
      skillName: 'Spostrzegawczość',
      characterName: undefined,
    });
    expect(test.groupId).toBeUndefined();
  });

  it('odczytuje adresata i grupuje testy z jednej odpowiedzi', () => {
    const tests = extractSkillTests(
      '[TEST:@Margaret Sullivan: Spostrzegawczość | zwykły | | Szuka śladu]\n' +
        '[TEST:@Prof. William Dyer: Nasłuchiwanie | trudny | Ciemność:-1 | Słucha odgłosów]'
    );

    expect(tests).toHaveLength(2);
    expect(tests[0]).toMatchObject({
      characterName: 'Margaret Sullivan',
      skillName: 'Spostrzegawczość',
    });
    expect(tests[1]).toMatchObject({
      characterName: 'Prof. William Dyer',
      skillName: 'Nasłuchiwanie',
    });
    expect(tests[0].groupId).toBeTruthy();
    expect(tests[1].groupId).toBe(tests[0].groupId);
  });
});
