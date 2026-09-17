import {
  updateDirectorState,
  getDirectorState,
  getDirectorPromptSection,
  buildDynamicScenePacingInjection,
} from '../director-state';

describe('director-state (Arcanum Benchmark 2026: Fact Supersession)', () => {
  const sessionId = 'test-session-arcanum';

  it('zapisuje i aktualizuje stan reżysera oraz fakty poszlak', () => {
    updateDirectorState(
      sessionId,
      {
        thoughts: 'MG planuje konfrontację w piwnicy',
        mood: 'klaustrofobiczny',
        narrativeGoal: 'Odkrycie tajnego przejścia',
      },
      [
        {
          type: 'clue',
          title: 'Fałszywe alibi lokaja',
          content: 'Lokaj twierdzi, że był w kuchni.',
        },
      ]
    );

    const state = getDirectorState(sessionId);
    expect(state).toBeDefined();
    expect(state?.clueFacts).toHaveLength(1);
    expect(state?.clueFacts[0].title).toBe('Fałszywe alibi lokaja');
    expect(state?.clueFacts[0].status).toBe('active');

    const promptSection = getDirectorPromptSection(sessionId);
    expect(promptSection).toContain('## PAMIĘĆ REŻYSERA');
    expect(promptSection).toContain('MG planuje konfrontację w piwnicy');
    expect(promptSection).toContain('Odkrycie tajnego przejścia');
  });

  it('unieważnia stary fakt, gdy nowy wpis dziennika deklaruje zastąpienie', () => {
    updateDirectorState(
      sessionId,
      {},
      [
        {
          type: 'clue',
          title: 'Zdemaskowanie lokaja',
          content: 'Lokaj przyznał się do sabotażu. | zastępuje: Fałszywe alibi lokaja',
        },
      ]
    );

    const state = getDirectorState(sessionId);
    const oldFact = state?.clueFacts.find((f) => f.title === 'Fałszywe alibi lokaja');
    const newFact = state?.clueFacts.find((f) => f.title === 'Zdemaskowanie lokaja');

    expect(oldFact?.status).toBe('superseded');
    expect(oldFact?.supersededBy).toBe('Zdemaskowanie lokaja');
    expect(newFact?.status).toBe('active');
  });

  describe('buildDynamicScenePacingInjection (SillyTavern Adaptation - Issue #349)', () => {
    it('generuje poprawny blok wstrzyknięcia dla walki (Bieg 3) w języku polskim', () => {
      const injection = buildDynamicScenePacingInjection({
        gameContext: {
          mode: 'combat',
          hasNPCs: true,
          recentSANLoss: false,
          findingDocument: false,
          inDarkness: false,
          nightTime: false,
        },
        locale: 'pl',
      });

      expect(injection).toContain('[PRZYPOMNIENIE DLA MG: DYNAMICZNA SCENA I PACING]');
      expect(injection).toContain('[/PRZYPOMNIENIE DLA MG]');
      expect(injection).toContain('Atmosfera sceny:');
      expect(injection).toContain('zagrożenie życia');
      expect(injection).toContain('BIEG 3 (PRZEŁAMANIE): 30-70 słów');
      expect(injection).toContain('Rygor CoC 7e RAW: Wymuś grozę, zasadę fail-forward');
    });

    it('generuje poprawny blok wstrzyknięcia po utracie SAN (Bieg 4 - Pustka / Szok)', () => {
      const injection = buildDynamicScenePacingInjection({
        gameContext: {
          mode: 'investigation',
          hasNPCs: false,
          recentSANLoss: true,
          findingDocument: false,
          inDarkness: false,
          nightTime: false,
        },
        locale: 'pl',
      });

      expect(injection).toContain('BIEG 4 (PUSTKA): 40-90 słów');
      expect(injection).toContain('paranoja');
    });

    it('generuje poprawny blok wstrzyknięcia w języku angielskim z uwzględnieniem konwencji Noir', () => {
      const injection = buildDynamicScenePacingInjection({
        gameContext: {
          mode: 'chase',
          hasNPCs: true,
          recentSANLoss: false,
          findingDocument: false,
          inDarkness: false,
          nightTime: false,
        },
        tone: 'noir',
        locale: 'en',
      });

      expect(injection).toContain('[GM DIRECTIVE: DYNAMIC SCENE & PACING INJECTION]');
      expect(injection).toContain('[/GM DIRECTIVE]');
      expect(injection).toContain('Atmosphere: imminent chase');
      expect(injection).toContain('GEAR 3 (CHASE): 30-70 words');
      expect(injection).toContain('Noir Convention: slow-burn pacing');
      expect(injection).toContain('CoC 7e RAW: Enforce horror, fail-forward');
    });

    it('integruje nastrój i cel z pamięci reżysera (sessionId)', () => {
      const customSession = 'director-session-injection-test';
      updateDirectorState(customSession, {
        thoughts: 'MG szykuje zasadzkę ghuli',
        narrativeGoal: 'Ucieczka przez kanały Arkham',
        mood: 'duszny i wilgotny',
      });

      const injection = buildDynamicScenePacingInjection({
        sessionId: customSession,
        locale: 'pl',
      });

      expect(injection).toContain('Atmosfera sceny: duszny i wilgotny');
      expect(injection).toContain('Cel narracyjny: Ucieczka przez kanały Arkham');
    });

    it('wstrzykuje dyrektywę impasu / martwego punktu gdy isStuck jest true (War-Room stall)', () => {
      const injectionPl = buildDynamicScenePacingInjection({
        gameContext: {
          mode: 'investigation',
          hasNPCs: true,
          recentSANLoss: false,
          findingDocument: false,
          inDarkness: false,
          nightTime: false,
          isStuck: true,
        },
        locale: 'pl',
      });

      expect(injectionPl).toContain('MARTWY PUNKT');
      expect(injectionPl).toContain('Wprowadź natychmiastowy bodziec zewnętrzny');

      const injectionEn = buildDynamicScenePacingInjection({
        gameContext: {
          mode: 'investigation',
          hasNPCs: true,
          recentSANLoss: false,
          findingDocument: false,
          inDarkness: false,
          nightTime: false,
          isStuck: true,
        },
        locale: 'en',
      });

      expect(injectionEn).toContain('DEAD-END');
      expect(injectionEn).toContain('Inject an immediate external catalyst');
    });
  });
});
