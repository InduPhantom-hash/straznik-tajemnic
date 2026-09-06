import { renderHook, act } from '@testing-library/react';
import { useSkillMarking } from './useSkillMarking';
import type { Character } from '@/lib/types';
import { isSkillMarked } from '@/lib/types';
import type { SkillTestResult } from '@/lib/parsers/types';

const createBaseCharacter = (id: string, name: string): Character => ({
  id,
  name,
  playerName: name,
  occupation: 'Dziennikarz',
  gender: 'male',
  age: 30,
  str: 50,
  dex: 50,
  con: 50,
  app: 50,
  pow: 50,
  edu: 70,
  siz: 50,
  int: 60,
  luck: 50,
  hp: 10,
  san: 50,
  mp: 10,
  skills: {
    Spostrzegawczość: { value: 55, markedForImprovement: false },
    Nasłuchiwanie: { value: 45, markedForImprovement: false },
    'Credit Rating': { value: 30, markedForImprovement: false },
  },
  background: 'Reporter',
  isActive: true,
  lastUsed: new Date(),
  notes: '',
  experience: {
    totalXP: 0,
    availableXP: 0,
    earnedThisSession: 0,
    maxEarnedThisSession: 10,
  },
} as unknown as Character);

describe('useSkillMarking - solo & duet (Hot Seat)', () => {
  it('oznacza umiejętność dla aktywnego gracza w trybie solo', () => {
    const char = createBaseCharacter('char_1', 'Margaret Sullivan');
    let updated = char;
    const onUpdate = jest.fn((c: Character) => {
      updated = c;
    });

    const { result } = renderHook(() => useSkillMarking(char, onUpdate));

    const testResults: SkillTestResult[] = [
      {
        skillName: 'Spostrzegawczość',
        result: 'regular',
        rollValue: 34,
        threshold: 55,
        usedLuck: false,
        shouldMark: true,
      },
    ];

    act(() => {
      result.current.processSkillResults(testResults);
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(isSkillMarked(updated.skills['Spostrzegawczość'])).toBe(true);
  });

  it('nie oznacza umiejętności jeśli użyto Luck', () => {
    const char = createBaseCharacter('char_1', 'Margaret Sullivan');
    const onUpdate = jest.fn();

    const { result } = renderHook(() => useSkillMarking(char, onUpdate));

    const testResults: SkillTestResult[] = [
      {
        skillName: 'Spostrzegawczość',
        result: 'regular',
        rollValue: 34,
        threshold: 55,
        usedLuck: true,
        shouldMark: false,
        reason: 'Sukces z użyciem Szczęścia',
      },
    ];

    act(() => {
      result.current.processSkillResults(testResults);
    });

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('w trybie Duet oznacza umiejętność właściwego badacza z prefiksu @Imię', () => {
    const char1 = createBaseCharacter('char_1', 'Margaret Sullivan');
    const char2 = createBaseCharacter('char_2', 'Tomasz Czarnecki');
    let party = [char1, char2];

    const onPartyUpdate = jest.fn((chars: Character[]) => {
      party = chars;
    });
    const onSingleUpdate = jest.fn();

    const { result } = renderHook(() =>
      useSkillMarking(char1, onSingleUpdate, party, onPartyUpdate)
    );

    const testResults: SkillTestResult[] = [
      {
        skillName: 'Nasłuchiwanie',
        characterName: 'Tomasz',
        result: 'regular',
        rollValue: 20,
        threshold: 45,
        usedLuck: false,
        shouldMark: true,
      },
      {
        skillName: 'Spostrzegawczość',
        characterName: 'Margaret',
        result: 'regular',
        rollValue: 30,
        threshold: 55,
        usedLuck: false,
        shouldMark: true,
      },
    ];

    act(() => {
      result.current.processSkillResults(testResults);
    });

    expect(onPartyUpdate).toHaveBeenCalledTimes(1);
    const updatedChar1 = party.find((c) => c.id === 'char_1');
    const updatedChar2 = party.find((c) => c.id === 'char_2');

    expect(isSkillMarked(updatedChar1?.skills['Spostrzegawczość'])).toBe(true);
    expect(isSkillMarked(updatedChar1?.skills['Nasłuchiwanie'])).toBe(false);

    expect(isSkillMarked(updatedChar2?.skills['Nasłuchiwanie'])).toBe(true);
    expect(isSkillMarked(updatedChar2?.skills['Spostrzegawczość'])).toBe(false);
  });
});
