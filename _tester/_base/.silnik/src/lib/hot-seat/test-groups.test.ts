import type { SkillTestData } from '@/lib/parsers/types';
import { collectTestGroupResult } from './test-groups';

const tests: SkillTestData[] = [
  {
    id: 'margaret-test',
    groupId: 'group-1',
    characterName: 'Margaret Sullivan',
    skillName: 'Spostrzegawczość',
    skillValue: 60,
    difficulty: 'zwykly',
    modifiers: [],
    justification: 'Margaret szuka tropu',
  },
  {
    id: 'dyer-test',
    groupId: 'group-1',
    characterName: 'Prof. William Dyer',
    skillName: 'Nasłuchiwanie',
    skillValue: 45,
    difficulty: 'zwykly',
    modifiers: [],
    justification: 'Dyer słucha',
  },
];

describe('collectTestGroupResult', () => {
  it('nie tworzy wiadomości po pierwszym wyniku', () => {
    const progress = collectTestGroupResult(tests, [], {
      testId: 'margaret-test',
      chatMessage: 'Margaret: 42',
      systemContext: '@Margaret Sullivan: wynik 42',
    });

    expect(progress.complete).toBe(false);
    expect(progress.combinedMessage).toBeUndefined();
  });

  it('tworzy jedną wiadomość po skompletowaniu grupy', () => {
    const first = collectTestGroupResult(tests, [], {
      testId: 'margaret-test',
      chatMessage: 'Margaret: 42',
      systemContext: '@Margaret Sullivan: wynik 42',
    });
    const complete = collectTestGroupResult(tests, first.results, {
      testId: 'dyer-test',
      chatMessage: 'Dyer: 21',
      systemContext: '@Prof. William Dyer: wynik 21',
    });

    expect(complete.complete).toBe(true);
    expect(complete.combinedMessage).toContain('@Margaret Sullivan: wynik 42');
    expect(complete.combinedMessage).toContain('@Prof. William Dyer: wynik 21');
  });
});
