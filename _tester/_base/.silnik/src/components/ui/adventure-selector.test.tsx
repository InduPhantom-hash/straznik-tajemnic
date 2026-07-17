import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import type { CustomAdventure } from '@/lib/adventures-data';
import { AdventureSelector } from './adventure-selector';

const adventure: CustomAdventure = {
  id: 'custom-test-adventure',
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
  isCustom: true,
  pdfUrl: '/adventure.pdf',
  geminiFileUri: 'gemini://adventure',
  fileName: 'adventure.pdf',
  uploadedAt: '2026-07-17T00:00:00.000Z',
  isAnalyzed: true,
};

describe('AdventureSelector', () => {
  it('keeps the selection marker in the card header and hides player count', () => {
    render(
      <AdventureSelector
        open
        onClose={jest.fn()}
        onSelect={jest.fn()}
        customAdventures={[adventure]}
      />
    );

    expect(screen.queryByText(/4-6 graczy/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(adventure.title));

    const marker = screen.getByLabelText('Wybrana przygoda');
    expect(marker).toBeInTheDocument();
    expect(marker).not.toHaveClass('absolute');
  });
});
