import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { AdventureContext } from '@/lib/adventures-data';
import { AdventureDetailsModal } from './adventure-details-modal';

const adventure: AdventureContext = {
  id: 'test-adventure',
  title: 'Tajemnica Czarnego Sarkofagu',
  era: 'classic',
  eraLabel: 'Klasyczne lata 20.',
  yearRange: '1919',
  location: 'Region Huancayo/Huancavelica',
  country: 'Peru',
  tone: 'pulp',
  themes: ['archeologia'],
  suggestedOccupations: ['badacz'],
  suggestedArchetypes: ['śledczy'],
  hook: 'Tajemniczy grobowiec czeka.',
  description: 'Bezspoilerowy opis przygody.',
  estimatedSessions: '2-3',
  playerCount: '4-6',
  difficulty: 'normal',
};

describe('AdventureDetailsModal', () => {
  it('does not present source-book player counts to solo and duet users', () => {
    render(
      <AdventureDetailsModal
        adventure={adventure}
        open
        onClose={jest.fn()}
        onChoose={jest.fn()}
      />
    );

    expect(screen.getByText(/przewidywane na 2-3 sesji/i)).toBeInTheDocument();
    expect(screen.queryByText(/4-6 graczy/i)).not.toBeInTheDocument();
  });
});
