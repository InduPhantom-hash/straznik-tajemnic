import type { Message } from '@/lib/types';
import { getAuthorInitials, getAuthorName } from './message-helpers';

const gameMasterMessage = { role: 'assistant' } as Message;

describe('chat author localization', () => {
  it('renders the Game Master label and initials in English', () => {
    expect(getAuthorName(gameMasterMessage, null, 'en')).toBe('Game Master');
    expect(getAuthorInitials(gameMasterMessage, null, 'en')).toBe('GM');
  });

  it('keeps the Polish Game Master label and initials in Polish', () => {
    expect(getAuthorName(gameMasterMessage, null, 'pl')).toBe('Mistrz Gry');
    expect(getAuthorInitials(gameMasterMessage, null, 'pl')).toBe('MG');
  });
});
