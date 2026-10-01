import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    const eyebrow = screen.getByText('MISKATONIC ARCHIVES • 1920s');
    expect(eyebrow).toBeInTheDocument();
    expect(eyebrow).toHaveClass('text-primary', 'font-special-elite');

    const appGuideTabBtn = screen.getByRole('button', { name: /Instrukcja Badacza & UI/i });
    expect(appGuideTabBtn).toBeInTheDocument();
    expect(appGuideTabBtn).toHaveClass('border-primary', 'text-primary', 'bg-primary/10');
    expect(screen.getAllByText(/Karta Badacza/i).length).toBeGreaterThanOrEqual(1);
  });

  it('poprawnie przełącza zakładki główne i nadaje aktywnej zakładce szmaragdowy akcent', async () => {
    render(<CompendiumModal isOpen={true} onClose={() => {}} />);

    // Przełączenie na Sztuka Odgrywania
    const roleplayTabBtn = screen.getByRole('button', { name: /Sztuka Odgrywania/i });
    fireEvent.click(roleplayTabBtn);
    expect(roleplayTabBtn).toHaveClass('border-primary', 'text-primary', 'bg-primary/10');
    expect(screen.getByText(/Filozofia Odgrywania/i)).toBeInTheDocument();
    expect(screen.getByText(/Styl Zwięzły/i)).toBeInTheDocument();
    expect(screen.getByText(/Styl Immersyjny/i)).toBeInTheDocument();

    // Przełączenie na Encyklopedia & Zasady
    const loreTabBtn = screen.getByRole('button', { name: /Encyklopedia & Zasady/i });
    fireEvent.click(loreTabBtn);
    expect(loreTabBtn).toHaveClass('border-primary', 'text-primary', 'bg-primary/10');
    expect(screen.getByText(/Świat i Mity/i)).toBeInTheDocument();
    expect(screen.getByText(/Kodeks Zasad/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText('Cthulhu').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('podświetla aktywny moduł w AppGuideTab oraz przełącza scenariusze w RoleplayGuideTab ze szmaragdowym akcentem', () => {
    render(<CompendiumModal isOpen={true} onClose={() => {}} />);

    // Domyślnie wybrany moduł Karta Badacza w AppGuideTab
    const equipmentModBtn = screen.getByRole('button', { name: /Ekwipunek/i });
    fireEvent.click(equipmentModBtn);
    expect(equipmentModBtn).toHaveClass('border-primary', 'bg-[#0f1715]');

    // Przejdź do Sztuka Odgrywania i przełącz scenariusz kontrastu
    const roleplayTabBtn = screen.getByRole('button', { name: /Sztuka Odgrywania/i });
    fireEvent.click(roleplayTabBtn);

    const searchScenarioBtn = screen.getByRole('button', { name: /Gabinet Profesora/i });
    fireEvent.click(searchScenarioBtn);
    expect(searchScenarioBtn).toHaveClass('bg-primary/20', 'text-primary', 'border-primary/50');
  });

  it('poprawnie przełącza podwidok w Encyklopedii na Kodeks Zasad (Mini-Obsidian) i wyróżnia aktywną regułę oraz przycisk RAG', async () => {
    render(
      <CompendiumModal
        isOpen={true}
        onClose={() => {}}
        initialTab="LORE_ENCYCLOPEDIA"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Cthulhu').length).toBeGreaterThanOrEqual(1);
    });

    // Kliknij podwidok Kodeks Zasad
    const rulesSubTabBtn = screen.getByRole('button', { name: /Kodeks Zasad/i });
    fireEvent.click(rulesSubTabBtn);

    expect(rulesSubTabBtn).toHaveClass('text-primary');
    expect(screen.getByText(/d100 Weird Fiction \(Zasady Kanoniczne\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Poziomy Sukcesu \(k100\)/i).length).toBeGreaterThanOrEqual(1);

    // Przycisk Zapytaj Kodeks (RAG) w kanonicznym szmaragdzie
    const ragSearchBtn = screen.getByRole('button', { name: /Zapytaj Kodeks/i });
    expect(ragSearchBtn).toHaveClass('bg-primary', 'text-primary-foreground', 'border-primary');

    // Przełączenie tematu reguł w lewym menu
    const pushedRollBtn = screen.getByRole('button', { name: /Forsowanie Rzutu/i });
    fireEvent.click(pushedRollBtn);
    expect(pushedRollBtn).toHaveClass('bg-[#0f1715]', 'text-primary', 'border-primary/50');
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
