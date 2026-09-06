import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdventureBuilderModal } from './AdventureBuilderModal';

describe('AdventureBuilderModal', () => {
  const originalLocale = process.env.NEXT_INTL_TEST_LOCALE;

  afterEach(() => {
    process.env.NEXT_INTL_TEST_LOCALE = originalLocale;
  });

  test('renders role selection cards on start and preserves anti-spoiler flow for player', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'pl';
    const onClose = jest.fn();
    const onAdventureCreated = jest.fn();

    render(
      <AdventureBuilderModal
        open={true}
        onClose={onClose}
        onAdventureCreated={onAdventureCreated}
      />
    );

    // Krok wyboru roli
    expect(screen.getByText(/Kreator Przygód & Pakiet MG/i)).toBeInTheDocument();
    expect(screen.getByText(/Chcę zagrać w tę przygodę/i)).toBeInTheDocument();
    expect(screen.getByText(/Przygotowuję sesję \(Mistrz Gry\)/i)).toBeInTheDocument();

    // Wybór roli Gracza
    fireEvent.click(screen.getByText(/Chcę zagrać w tę przygodę/i));

    // W trybie gracza: przycisk Zaskocz mnie i brak spoilerów śledztwa
    expect(screen.getByText(/Nie masz pomysłu\? Zaskocz mnie!/i)).toBeInTheDocument();
    expect(screen.getByText(/Losuj tajemnicę/i)).toBeInTheDocument();
    expect(screen.getByText(/Zajawka dla Badacza/i)).toBeInTheDocument();

    // Przejście dalej: bezpośrednio do podsumowania (bez wglądu w Clue Web!)
    fireEvent.click(screen.getByText(/Dalej: Podsumowanie/i));

    // Ekran gotowości
    expect(screen.getByText(/Tajemnica gotowa do rozegrania/i)).toBeInTheDocument();
    expect(screen.getByText(/Rozpocznij śledztwo/i)).toBeInTheDocument();
    expect(screen.getByText(/Pobierz Campaign Kit \(ZIP\)/i)).toBeInTheDocument();

    // Start gry w aplikacji
    fireEvent.click(screen.getByText(/Rozpocznij śledztwo/i));
    expect(onAdventureCreated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('allows keeper mode to inspect Dramatis Personae and Clue Web', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'en';

    render(
      <AdventureBuilderModal
        open={true}
        onClose={jest.fn()}
        onAdventureCreated={jest.fn()}
      />
    );

    // Wybór roli Mistrza Gry
    fireEvent.click(screen.getByText(/Preparing a session \(Keeper of Secrets\)/i));

    // Ekran wprowadzania danych
    expect(screen.getByText(/Next: Inspect Mystery/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Next: Inspect Mystery/i));

    // Ekran inspekcji CoC 7e
    expect(screen.getByText(/Investigation Architecture/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dramatis Personae/i).length).toBeGreaterThan(0);
  });
});
