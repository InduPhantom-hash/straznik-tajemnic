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
  themes: ['archeologia', 'starożytne klątwy'],
  suggestedOccupations: ['badacz', 'archeolog'],
  suggestedArchetypes: ['śledczy'],
  hook: 'Tajemniczy grobowiec czeka.',
  description: 'Bezspoilerowy opis przygody pełen intrygi i pradawnych tajemnic.',
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

  it('unifies title typography to font-display and replaces dictionary block with tooltips and plot', () => {
    render(
      <AdventureDetailsModal
        adventure={adventure}
        open
        onClose={jest.fn()}
        onChoose={jest.fn()}
      />
    );

    const heading = screen.getByRole('heading', { name: adventure.title });
    expect(heading).toHaveClass('font-display');
    expect(heading).not.toHaveClass('font-display-decorative');

    // Usunięty blok słownikowy
    expect(screen.queryByText(/co oznaczają oznaczenia/i)).not.toBeInTheDocument();

    // Wskaźniki pomocy (HelpIcon) przy badge'ach
    const helpIcons = screen.getAllByText('?');
    expect(helpIcons.length).toBe(3); // ton, era, trudność

    // Wyeksponowana fabuła i archetypy
    expect(screen.getByText(adventure.description)).toBeInTheDocument();
    expect(screen.getByText('archeologia')).toBeInTheDocument();
    expect(screen.getByText('starożytne klątwy')).toBeInTheDocument();
    expect(screen.getByText(/badacz, archeolog/i)).toBeInTheDocument();
    expect(screen.getByText(/śledczy/i)).toBeInTheDocument();
  });
});
