import { extractJournalTags } from './journal-parser';
import { extractLatestTagLocation } from './event-parser';

describe('English game protocol', () => {
  it('persists English JOURNAL tags without translating player content', () => {
    expect(
      extractJournalTags(
        '[JOURNAL:clue:The sealed cellar]Cold air escapes through the wall.[/JOURNAL]'
      )
    ).toEqual([
      expect.objectContaining({
        type: 'clue',
        title: 'The sealed cellar',
        content: 'Cold air escapes through the wall.',
      }),
    ]);
  });

  it('accepts the English LOCATION tag', () => {
    expect(
      extractLatestTagLocation('[LOCATION: Corbitt House: Rain-darkened brick]')
    ).toEqual({ name: 'Corbitt House', description: 'Rain-darkened brick' });
  });
});
