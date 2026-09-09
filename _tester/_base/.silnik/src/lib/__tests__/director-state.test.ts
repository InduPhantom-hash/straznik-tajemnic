import {
  updateDirectorState,
  getDirectorState,
  getDirectorPromptSection,
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
});
