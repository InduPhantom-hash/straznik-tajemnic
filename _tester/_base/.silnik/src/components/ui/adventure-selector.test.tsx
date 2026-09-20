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

  it('uses English copy throughout selection and confirmation', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'en';
    const onSelect = jest.fn();

    render(
      <AdventureSelector
        open
        onClose={jest.fn()}
        onSelect={onSelect}
        customAdventures={[adventure]}
        onUploadAdventure={jest.fn()}
      />
    );

    expect(screen.getByText(adventure.title)).toBeInTheDocument();
    expect(screen.getByText(/Upload adventure \(PDF\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(adventure.title));

    const confirm = screen.getByRole('button', { name: /choose and continue/i });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: adventure.id,
        title: adventure.title,
      })
    );
  });

  it('confirms a custom scenario directly without asking for exact year', () => {
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

    expect(screen.queryByLabelText('Dokładny rok')).not.toBeInTheDocument();

    const confirm = screen.getByRole('button', { name: /wybierz i kontynuuj/i });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'custom-range',
        yearRange: '1973-1974',
        country: 'Polska',
      })
    );
  });

  it('renders difficulty stars, sessions count, and selects card directly on click', () => {
    const advWithStars: CustomAdventure = {
      ...adventure,
      difficultyStars: 3,
      estimatedSessions: '2',
      investigatorRequirements: {
        summary: 'Wymagany wiek 10-15 lat',
        minAge: 10,
        maxAge: 15,
      },
    };

    render(
      <AdventureSelector
        open
        onClose={jest.fn()}
        onSelect={jest.fn()}
        customAdventures={[advWithStars]}
      />
    );

    // Karta wyświetla liczbę sesji, poziom trudności z legendy oraz wymogi badaczy
    expect(screen.getByText(/2 sesje/i)).toBeInTheDocument();
    expect(screen.getByText('Średni')).toBeInTheDocument();
    expect(screen.getByText(/Wymagany wiek 10-15 lat/i)).toBeInTheDocument();

    // Kliknięcie w kartę bezpośrednio ją zaznacza
    const selectButton = screen.getByRole('button', { name: /^wybierz$/i });
    expect(selectButton).toBeInTheDocument();
    fireEvent.click(selectButton);

    expect(screen.getAllByText('Wybrano').length).toBeGreaterThan(0);
  });

  it('localizes attached lorebooks count in PL and EN', () => {
    const lorebook: CustomAdventure = {
      ...adventure,
      id: 'lorebook-arkham',
      title: 'Przewodnik po Arkham',
      documentType: 'setting',
    };
    const scenarioWithAttached: CustomAdventure = {
      ...adventure,
      id: 'scenario-with-attached',
      attachedLorebookIds: ['lorebook-arkham'],
    };

    // PL
    process.env.NEXT_INTL_TEST_LOCALE = 'pl';
    const { unmount } = render(
      <AdventureSelector
        open
        onClose={jest.fn()}
        onSelect={jest.fn()}
        customAdventures={[scenarioWithAttached, lorebook]}
      />
    );
    fireEvent.click(screen.getByText(scenarioWithAttached.title));
    expect(screen.getByText('(1 podpięte)')).toBeInTheDocument();
    unmount();

    // EN
    process.env.NEXT_INTL_TEST_LOCALE = 'en';
    render(
      <AdventureSelector
        open
        onClose={jest.fn()}
        onSelect={jest.fn()}
        customAdventures={[scenarioWithAttached, lorebook]}
      />
    );
    fireEvent.click(screen.getByText(scenarioWithAttached.title));
    expect(screen.getByText('(1 attached)')).toBeInTheDocument();
  });

  it('renders upload error alert when uploadError is provided', () => {
    const onClear = jest.fn();
    render(
      <AdventureSelector
        open
        onClose={jest.fn()}
        onSelect={jest.fn()}
        uploadError="Nie udało się wygenerować struktury przygody z pliku PDF."
        onClearUploadError={onClear}
        onUploadAdventure={jest.fn()}
      />
    );

    expect(screen.getByText(/Błąd przetwarzania przygody/i)).toBeInTheDocument();
    expect(
      screen.getByText('Nie udało się wygenerować struktury przygody z pliku PDF.')
    ).toBeInTheDocument();

    const dismissButtons = screen.getAllByRole('button', { name: /Zamknij/i });
    fireEvent.click(dismissButtons[0]);
    expect(onClear).toHaveBeenCalled();
  });
});

