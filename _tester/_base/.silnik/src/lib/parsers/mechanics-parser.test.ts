import {
  extractSkillTests,
  extractHazardEvents,
  extractSkillResults,
  extractMeleeAttackReferences,
  stripMeleeAttackTags,
} from './mechanics-parser';

describe('ATAK_WRĘCZ', () => {
  it('parsuje ścisły tag referencyjny i nie przyjmuje pól mechanicznych', () => {
    expect(extractMeleeAttackReferences(
      '[ATAK_WRĘCZ: napastnik=npc-1 | cel=@Anna Kowalska | atak=knife | zamiar=twardy cios]'
    )).toEqual([{
      attackerNpcId: 'npc-1',
      targetCharacterName: 'Anna Kowalska',
      attackOptionId: 'knife',
      intent: 'twardy cios',
    }]);
    expect(extractMeleeAttackReferences(
      '[ATAK_WRĘCZ: napastnik=npc-1 | cel=@Anna | atak=knife | zamiar=cios | obrażenia=99]'
    )).toEqual([]);
  });

  it('ukrywa pełny i częściowo streamowany tag przed graczem', () => {
    expect(stripMeleeAttackTags('Kultysta rusza.\n[ATAK_WRĘCZ: napastnik=npc-1')).toBe('Kultysta rusza.');
    expect(stripMeleeAttackTags('Kultysta rusza.\n[ATAK_WRĘCZ: napastnik=npc-1 | cel=@Anna | atak=fist | zamiar=cios]')).toBe('Kultysta rusza.');
  });
});

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

describe('extractSkillResults (WYNIK) - duet & solo', () => {
  it('parsuje wyniki testów solo bez adresata', () => {
    const [res] = extractSkillResults(
      '[WYNIK: Spostrzegawczość | 34 ≤ 55 | SUKCES]'
    );
    expect(res).toBeDefined();
    expect(res.skillName).toBe('Spostrzegawczość');
    expect(res.characterName).toBeUndefined();
    expect(res.shouldMark).toBe(true);
    expect(res.result).toBe('regular');
  });

  it('parsuje wyniki testów duet z prefiksem @Imię', () => {
    const results = extractSkillResults(
      '[WYNIK:@Margaret Sullivan: Spostrzegawczość | 34 ≤ 55 | SUKCES]\n' +
        '[WYNIK:@Tomasz: Nasłuchiwanie | 67 ≤ 45 | SUKCES | LUCK]'
    );
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      characterName: 'Margaret Sullivan',
      skillName: 'Spostrzegawczość',
      shouldMark: true,
      usedLuck: false,
    });
    expect(results[1]).toMatchObject({
      characterName: 'Tomasz',
      skillName: 'Nasłuchiwanie',
      shouldMark: false,
      usedLuck: true,
    });
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

  it('usuwa surowy klucz description i parsuje parametry RAW', () => {
    const [hazard] = extractHazardEvents(
      '[HAZARD: type=fall | height=4m | surface=hard | description=Broken fire escape]'
    );
    expect(hazard).toMatchObject({
      type: 'falling',
      fallHeightMeters: 4,
      surface: 'hard',
      description: 'Broken fire escape',
    });
    expect(hazard.description).not.toContain('description=');
  });

  it('parsuje kwas, tonięcie i kategorię trucizny', () => {
    expect(extractHazardEvents('[HAZARD: type=acid | potency=strong | desc=Vitriol]')[0])
      .toMatchObject({ type: 'acid', acidPotency: 'immersion' });
    expect(extractHazardEvents('[HAZARD: type=drowning | desc=Flooded tunnel]')[0])
      .toMatchObject({ type: 'drowning', airlessKind: 'water' });
    expect(extractHazardEvents('[HAZARD: type=poison | severity=lethal | desc=Cyanide]')[0])
      .toMatchObject({ type: 'poison', poisonSeverity: 'lethal' });
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
