import { render, screen } from '@testing-library/react';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { SessionJournal } from './session-journal';

describe('SessionJournal', () => {
  it('oznacza scalony dziennik jako wspólny Dziennik Przygody', () => {
    render(
      <SessionJournal
        character={PREDEFINED_CHARACTERS[0]}
        onUpdateCharacter={jest.fn()}
        onUpdateSharedJournal={jest.fn()}
        sharedJournal={[]}
        participantNames={['Aga', 'Jakub']}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('DZIENNIK PRZYGODY')).toBeTruthy();
    expect(screen.getByText('Wspólny dla: Aga i Jakub')).toBeTruthy();
  });
});
