import { render, screen, fireEvent } from '@testing-library/react';
import { SessionZeroModal } from './session-zero-modal';

jest.mock('@/lib/ai-settings', () => ({
  loadAISettings: jest.fn(() => ({
    sessionZero: null,
  })),
  saveAISettings: jest.fn(),
}));

describe('SessionZeroModal', () => {
  const onClose = jest.fn();
  const onComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step 1 and transitions to step 2 and step 3', () => {
    render(
      <SessionZeroModal
        open={true}
        onClose={onClose}
        onComplete={onComplete}
      />
    );

    // Krok 1: Tryb i trudność
    expect(screen.getByText('Tryb narracji')).toBeInTheDocument();
    expect(screen.getByText('Poziom trudności')).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 3')).toBeInTheDocument();

    const nextBtn = screen.getByText('Dalej ›');
    fireEvent.click(nextBtn);

    // Krok 2: Linie i zasłony
    expect(screen.getByText(/Linie \(tematy zakazane\)/)).toBeInTheDocument();
    expect(screen.getByText(/Zasłony \(fade to black\)/)).toBeInTheDocument();
    expect(screen.getByText('Krok 2 z 3')).toBeInTheDocument();

    // Sugerowane tagi
    expect(
      screen.getByText('Sugerowane tematy zakazane (kliknij, aby dodać):')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sugerowane tematy do fade to black (kliknij, aby dodać):')
    ).toBeInTheDocument();

    // Dodanie sugerowanego tagu dla Linii (pierwszy przycisk z Klaustrofobią)
    const klaustrofobiaChip = screen.getAllByTitle('Dodaj: Klaustrofobia')[0];
    fireEvent.click(klaustrofobiaChip);
    expect(screen.getByTitle('Usuń: Klaustrofobia')).toBeInTheDocument();

    // Przejście do Kroku 3
    fireEvent.click(screen.getByText('Dalej ›'));

    // Krok 3: Podsumowanie
    expect(screen.getByText('Sesja Zero ukończona')).toBeInTheDocument();
    expect(screen.getByText('Krok 3 z 3')).toBeInTheDocument();
    expect(screen.getByText('Zakończ i zapisz ›')).toBeInTheDocument();

    // Kliknięcie Zakończ i zapisz
    fireEvent.click(screen.getByText('Zakończ i zapisz ›'));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        narrativeMode: 'full_rpg',
        difficulty: 'normal',
        lines: expect.arrayContaining(['Klaustrofobia']),
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('allows jumping between steps via stepper buttons', () => {
    render(
      <SessionZeroModal
        open={true}
        onClose={onClose}
        onComplete={onComplete}
      />
    );

    // Skok do kroku 3
    fireEvent.click(screen.getByRole('button', { name: /Podsumowanie/i }));
    expect(screen.getByText('Krok 3 z 3')).toBeInTheDocument();
    expect(screen.getByText('Sesja Zero ukończona')).toBeInTheDocument();

    // Skok do kroku 2
    fireEvent.click(screen.getByRole('button', { name: /Linie i zasłony/i }));
    expect(screen.getByText('Krok 2 z 3')).toBeInTheDocument();

    // Skok do kroku 1
    fireEvent.click(screen.getByRole('button', { name: /Tryb i trudność/i }));
    expect(screen.getByText('Krok 1 z 3')).toBeInTheDocument();
  });
});
