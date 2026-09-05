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
    expect(screen.getByText(/Player\.pl \(TVN\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Official Player\.pl TVN/)).not.toBeInTheDocument();
    expect(screen.queryByText('Cień nad Prabutami: Widzenie Ojca Klimuszki')).not.toBeInTheDocument();
    expect(screen.queryByText(/Łatwy/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(title));
    expect(screen.getAllByText(/The investigators are recruited by Helena Krawczyk/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("People's Poland - 1970s").length).toBeGreaterThan(0);

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

  it('requires one exact year before confirming a custom scenario range', () => {
    const onSelect = jest.fn();
    const rangedAdventure: CustomAdventure = {
      ...adventure,
      id: 'custom-range',
      yearRange: '1973-1974',
      country: 'Polska',
    };
    render(
      <AdventureSelector
        open
        onClose={jest.fn()}
        onSelect={onSelect}
        customAdventures={[rangedAdventure]}
      />
    );

    fireEvent.click(screen.getByText(rangedAdventure.title));
    const closeButtons = screen.getAllByRole('button', { name: /close|zamknij/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);

    const confirm = screen.getByRole('button', { name: /wybierz i kontynuuj/i });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Dokładny rok'), {
      target: { value: '1974' },
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'custom-range',
        yearRange: '1974',
        country: 'Polska',
      })
    );
  });

  it('renders integrated details button on card and opens modal without external link duplicates', () => {
    render(
      <AdventureSelector
        open
        onClose={jest.fn()}
        onSelect={jest.fn()}
        customAdventures={[adventure]}
      />
    );

    // Linki zewnętrzne istnieją wyłącznie w banerze głównym Strefy 11 (dokładnie 1 wystąpienie, brak duplikatów na kartach)
    expect(screen.getAllByText('Wikipedia ↗')).toHaveLength(1);

    // Zintegrowany przycisk otwierania szczegółów wewnątrz kafelka
    const infoButtons = screen.getAllByRole('button', { name: /więcej szczegółów/i });
    expect(infoButtons.length).toBeGreaterThan(0);

    fireEvent.click(infoButtons[0]);

    // Otwarcie modala z tytułem i opisem
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Szczegóły scenariusza')).toBeInTheDocument();
  });
});
