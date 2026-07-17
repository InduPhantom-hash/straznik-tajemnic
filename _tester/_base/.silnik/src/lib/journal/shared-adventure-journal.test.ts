import type { Character, JournalEntry } from '@/lib/types';
import {
  mergeAdventureJournalEntries,
  scopeAdventureJournalEntries,
  synchronizeAdventureJournal,
} from './shared-adventure-journal';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

function entry(
  id: string,
  timestamp: string,
  overrides: Partial<JournalEntry> = {}
): JournalEntry {
  return {
    id,
    timestamp: new Date(timestamp),
    type: 'note',
    title: id,
    content: id,
    tags: [],
    isBookmarked: false,
    ...overrides,
  };
}

function character(index: number, journal: JournalEntry[]): Character {
  return { ...PREDEFINED_CHARACTERS[index], journal };
}

describe('shared adventure journal', () => {
  it('scala stare dzienniki bez duplikatów i od najnowszego wpisu', () => {
    const shared = entry('shared', '2026-07-17T18:00:00Z');
    const first = character(0, [entry('old', '2026-07-17T17:00:00Z'), shared]);
    const second = character(1, [shared, entry('new', '2026-07-17T19:00:00Z')]);

    expect(
      mergeAdventureJournalEntries([first, second]).map(({ id }) => id)
    ).toEqual(['new', 'shared', 'old']);
  });

  it('zapisuje wspólny dziennik tylko uczestnikom bieżącej przygody', () => {
    const first = character(0, []);
    const second = character(1, []);
    const outside = character(2, [entry('outside', '2026-07-17T16:00:00Z')]);
    const shared = [
      entry('same', '2026-07-17T18:00:00Z'),
      entry('same', '2026-07-17T18:00:00Z'),
    ];

    const result = synchronizeAdventureJournal(
      [first, second, outside],
      [first.id, second.id],
      shared
    );

    expect(result[0].journal?.map(({ id }) => id)).toEqual(['same']);
    expect(result[1].journal?.map(({ id }) => id)).toEqual(['same']);
    expect(result[2]).toBe(outside);
  });

  it('wybiera najnowszą wersję wpisu o tym samym id', () => {
    const older = character(0, [
      entry('shared', '2026-07-17T17:00:00Z', {
        title: 'Najnowsza edycja',
        updatedAt: new Date('2026-07-17T20:00:00Z'),
      }),
    ]);
    const newer = character(1, [
      entry('shared', '2026-07-17T19:00:00Z', { title: 'Starsza edycja' }),
    ]);

    expect(mergeAdventureJournalEntries([older, newer])[0].title).toBe(
      'Najnowsza edycja'
    );
  });

  it('przypisuje starsze wpisy do bieżącej przygody tylko uczestnikom', () => {
    const first = character(0, [entry('first', '2026-07-17T17:00:00Z')]);
    const second = character(1, [entry('second', '2026-07-17T18:00:00Z')]);
    const outside = character(2, [entry('outside', '2026-07-17T19:00:00Z')]);

    const result = scopeAdventureJournalEntries(
      [first, second, outside],
      [first.id, second.id],
      'adventure-current'
    );

    expect(result[0].journal?.[0].adventureJournalId).toBe('adventure-current');
    expect(result[1].journal?.[0].adventureJournalId).toBe('adventure-current');
    expect(result[2]).toBe(outside);
  });

  it('zastępuje tylko bieżący dziennik i zachowuje poprzednie przygody', () => {
    const previous = entry('previous', '2026-07-16T18:00:00Z', {
      adventureJournalId: 'adventure-previous',
    });
    const current = entry('current', '2026-07-17T18:00:00Z', {
      adventureJournalId: 'adventure-current',
    });
    const next = entry('next', '2026-07-17T19:00:00Z');
    const first = character(0, [previous, current]);
    const second = character(1, [current]);

    const result = synchronizeAdventureJournal(
      [first, second],
      [first.id, second.id],
      [next],
      'adventure-current'
    );

    expect(result[0].journal?.map(({ id }) => id)).toEqual([
      'previous',
      'next',
    ]);
    expect(result[1].journal?.map(({ id }) => id)).toEqual(['next']);
    expect(result[0].journal?.[1].adventureJournalId).toBe('adventure-current');
  });

  it('pokazuje tylko wpisy bieżącej przygody po migracji', () => {
    const first = character(0, [
      entry('previous', '2026-07-16T18:00:00Z', {
        adventureJournalId: 'adventure-previous',
      }),
      entry('current', '2026-07-17T18:00:00Z', {
        adventureJournalId: 'adventure-current',
      }),
    ]);

    expect(
      mergeAdventureJournalEntries([first], 'adventure-current').map(
        ({ id }) => id
      )
    ).toEqual(['current']);
  });
});
