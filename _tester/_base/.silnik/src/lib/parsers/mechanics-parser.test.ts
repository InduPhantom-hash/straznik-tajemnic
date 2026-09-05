import { extractSkillTests, extractHazardEvents } from './mechanics-parser';

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

describe('extractHazardEvents (CoC 7e RAW)', () => {
  it('poprawnie parsuje tag zagrożenia upadkiem z wysokości', () => {
    const [hazard] = extractHazardEvents(
      'Podłoga pęka pod ciężarem!\n[ZAGROŻENIE: typ=upadek | wys=6m | obrona=Skakanie | Załamanie stropu]'
    );

    expect(hazard).toBeDefined();
    expect(hazard.type).toBe('falling');
    expect(hazard.fallHeightMeters).toBe(6);
    expect(hazard.defensiveSkill).toBe('Skakanie');
    expect(hazard.description).toContain('Załamanie stropu');
  });

  it('poprawnie parsuje truciznę z nazwą i potęgą', () => {
    const [hazard] = extractHazardEvents(
      'W kielichu unosi się zapach gorzkich migdałów.\n[ZAGROŻENIE: typ=trucizna | nazwa=Cyjanek | potega=90 | opis=Zatrute wino]'
    );

    expect(hazard).toBeDefined();
    expect(hazard.type).toBe('poison');
    expect(hazard.poisonName).toBe('Cyjanek');
    expect(hazard.poisonPotency).toBe(90);
    expect(hazard.defensiveSkill).toBe('Kondycja');
  });

  it('poprawnie obsługuje adresata w duecie', () => {
    const [hazard] = extractHazardEvents(
      '[ZAGROŻENIE:@Arthur Pendelton: typ=ogien | intensywnosc=major | Płonące belki]'
    );

    expect(hazard).toBeDefined();
    expect(hazard.characterName).toBe('Arthur Pendelton');
    expect(hazard.type).toBe('fire');
    expect(hazard.fireIntensity).toBe('major');
  });
});
