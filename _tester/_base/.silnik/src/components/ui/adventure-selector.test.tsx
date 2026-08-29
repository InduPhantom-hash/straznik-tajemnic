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
  const originalLocale = process.env.NEXT_INTL_TEST_LOCALE;

  afterEach(() => {
    process.env.NEXT_INTL_TEST_LOCALE = originalLocale;
  });

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

  it('uses English Strefa 11 copy throughout selection and confirmation', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'en';
    const onSelect = jest.fn();

    render(<AdventureSelector open onClose={jest.fn()} onSelect={onSelect} />);

    const title = "Shadow over Prabuty: Father Klimuszko's Vision";
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(/People's Poland - 1970s/)).toBeInTheDocument();
    expect(screen.getByText(/Easy/)).toBeInTheDocument();
    expect(screen.getAllByText(/Official Player\.pl TVN/)).toHaveLength(4);
    expect(screen.queryByText('Cień nad Prabutami: Widzenie Ojca Klimuszki')).not.toBeInTheDocument();
    expect(screen.queryByText(/Łatwy/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(title));
    expect(screen.getByText('A dark investigation of intrigue, moral ambiguity and big-city secrets.')).toBeInTheDocument();
    expect(screen.getByText('People\'s Poland - 1970s')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose and continue/i }));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cien-nad-prabutami',
        title,
        hook: expect.stringContaining('Investigating Father Klimuszko'),
      })
    );
  });
});
