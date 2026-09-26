import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompendiumModal } from './CompendiumModal';

// Mock fetch dla API mythos
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        entries: [
          {
            id: 'cthulhu',
            term: 'Cthulhu',
            category: 'great_old_ones',
            categoryTitle: 'Wielcy Przedwieczni',
            shortDefinition: "Wielki Przedwieczny w R'lyeh",
            fullContent: 'Cthulhu śpi i czeka.',
            license: 'CC-BY-SA 3.0',
          },
        ],
      }),
  })
) as jest.Mock;

describe('CompendiumModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('nie renderuje niczego gdy isOpen jest false', () => {
    const { container } = render(
      <CompendiumModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderuje nagłówek i domyślną zakładkę (Instrukcja Badacza & UI) gdy isOpen jest true', () => {
    render(<CompendiumModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Kompendium Badacza/i)).toBeInTheDocument();
    expect(screen.getByText(/Instrukcja Badacza & UI/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Karta Badacza/i).length).toBeGreaterThanOrEqual(1);
  });

  it('poprawnie przełącza zakładki główne', () => {
    render(<CompendiumModal isOpen={true} onClose={() => {}} />);

    // Przełączenie na Sztuka Odgrywania
    const roleplayTabBtn = screen.getByRole('button', { name: /Sztuka Odgrywania/i });
    fireEvent.click(roleplayTabBtn);
    expect(screen.getByText(/Filozofia Odgrywania/i)).toBeInTheDocument();
    expect(screen.getByText(/Styl Zwięzły/i)).toBeInTheDocument();
    expect(screen.getByText(/Styl Immersyjny/i)).toBeInTheDocument();

    // Przełączenie na Encyklopedia & Zasady
    const loreTabBtn = screen.getByRole('button', { name: /Encyklopedia & Zasady/i });
    fireEvent.click(loreTabBtn);
    expect(screen.getByText(/Świat i Mity/i)).toBeInTheDocument();
    expect(screen.getByText(/Kodeks Zasad/i)).toBeInTheDocument();
  });

  it('poprawnie przełącza podwidok w Encyklopedii na Kodeks Zasad (Mini-Obsidian)', () => {
    render(
      <CompendiumModal
        isOpen={true}
        onClose={() => {}}
        initialTab="LORE_ENCYCLOPEDIA"
      />
    );

    // Kliknij podwidok Kodeks Zasad
    const rulesSubTabBtn = screen.getByRole('button', { name: /Kodeks Zasad/i });
    fireEvent.click(rulesSubTabBtn);

    expect(screen.getByText(/d100 Weird Fiction \(Zasady Kanoniczne\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Poziomy Sukcesu \(k100\)/i).length).toBeGreaterThanOrEqual(1);
  });

  it('wywołuje onClose po kliknięciu przycisku zamknięcia', () => {
    const handleClose = jest.fn();
    render(<CompendiumModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByTitle(/Zamknij Kompendium/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('wywołuje onClose po naciśnięciu klawisza Escape', () => {
    const handleClose = jest.fn();
    render(<CompendiumModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
