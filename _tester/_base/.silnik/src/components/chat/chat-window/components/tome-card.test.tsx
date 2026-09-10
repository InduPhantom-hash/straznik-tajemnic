import { fireEvent, render, screen } from '@testing-library/react';
import { TomeCard } from './tome-card';
import type { Character, TomeStudyEventData } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

describe('TomeCard - badanie i lektura tomów Mitów Fiction First CoC 7e RAW', () => {
  const baseReader: Character = {
    ...PREDEFINED_CHARACTERS[0],
    id: 'char-reader-1',
    name: 'Harvey Walters',
    pow: 65,
    san: 55,
    skills: {
      'Mity Cthulhu': 10,
      Łacina: 60,
      Angielski: 70,
    },
    magic: {
      schemaVersion: 1,
      belief: 'believer',
      deferredSanLoss: 0,
      knownSpells: {},
      tomeStudies: {},
    },
  };

  const tomeEventNecro: TomeStudyEventData = {
    id: 'tome-event-1',
    tomeId: 'necronomicon-latin',
    characterId: 'char-reader-1',
    characterName: 'Harvey Walters',
  };

  it('renderuje kartę tomu z 3 panelami badawczymi: przegląd, wyszukanie w śledztwie i pełne studium', () => {
    render(<TomeCard tomeEvent={tomeEventNecro} activeCharacter={baseReader} />);

    // Tytuł i język
    expect(screen.getByText(/Necronomicon/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Łacina/i).length).toBeGreaterThanOrEqual(1);

    // 3 panele akcji
    expect(screen.getByText(/Pobieżny przegląd/i)).toBeInTheDocument();
    expect(screen.getByText(/Wyszukanie w księdze/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Pełne studium/i).length).toBeGreaterThanOrEqual(1);

    // Parametry paneli
    expect(screen.getByText(/Test języka: Łacina \(60%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/0 SAN \(bezpieczne\)/i)).toBeInTheDocument();
  });

  it('rozwija mini-przewodnik zasad lektury ksiąg CoC 7e', () => {
    render(<TomeCard tomeEvent={tomeEventNecro} activeCharacter={baseReader} />);

    const guideToggle = screen.getByText(/Zasady badania ksiąg/i);
    fireEvent.click(guideToggle);

    expect(screen.getByText(/Zasady Badania Ksiąg Mitów CoC 7e RAW/i)).toBeInTheDocument();
    expect(screen.getByText(/CMI \(Cthulhu Mythos Initial\)/i)).toBeInTheDocument();
    expect(screen.getByText(/MR \(Mythos Rating\)/i)).toBeInTheDocument();
  });

  it('wykonuje wstępny przegląd tomu, wyświetla kości K100 i aktualizuje Mity oraz SAN', () => {
    const onCharacterUpdate = jest.fn();
    const onSendChat = jest.fn();

    render(
      <TomeCard
        tomeEvent={tomeEventNecro}
        activeCharacter={baseReader}
        onCharacterUpdate={onCharacterUpdate}
        onSendChat={onSendChat}
      />
    );

    const initialBtn = screen.getByRole('button', { name: /Wstępny przegląd/i });
    fireEvent.click(initialBtn);

    // Wyświetla kości rzutu na język
    expect(screen.getByText(/K100:/i)).toBeInTheDocument();

    // Aktualizacja postaci
    expect(onCharacterUpdate).toHaveBeenCalled();

    // Wysłanie raportu do czatu
    expect(onSendChat).toHaveBeenCalledWith(
      expect.stringContaining('[WYNIK_TOMU: id=tome-event-1 | tome=necronomicon-latin | akcja=skimming')
    );
  });

  it('wykonuje wyszukiwanie referencyjne w trakcie śledztwa (test d100 vs MR tomu bez utraty SAN)', () => {
    const onSendChat = jest.fn();

    render(
      <TomeCard
        tomeEvent={tomeEventNecro}
        activeCharacter={baseReader}
        onSendChat={onSendChat}
      />
    );

    const refBtn = screen.getByRole('button', { name: /Sprawdź referencje/i });
    fireEvent.click(refBtn);

    expect(screen.getByText(/K100:/i)).toBeInTheDocument();
    expect(onSendChat).toHaveBeenCalledWith(
      expect.stringContaining('[WYNIK_TOMU: id=tome-event-1 | tome=necronomicon-latin | akcja=reference')
    );
  });
});
