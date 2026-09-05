import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StartModeCards } from './start-mode-cards';

describe('StartModeCards (Issue #121)', () => {
  it('renderuje oba kafelki wyboru trybu i otwiera QuickSetupModal po kliknięciu szybkiego startu', () => {
    const onQuickStart = jest.fn();
    const onManualStart = jest.fn();

    render(
      <StartModeCards
        onQuickStart={onQuickStart}
        onManualStart={onManualStart}
      />
    );

    const quickBtn = screen.getByTestId('btn-quick-setup');
    const manualBtn = screen.getByTestId('btn-manual-setup');

    expect(quickBtn).toBeInTheDocument();
    expect(manualBtn).toBeInTheDocument();

    fireEvent.click(quickBtn);

    expect(screen.getByTestId('quick-setup-modal')).toBeInTheDocument();
  });

  it('zamyka QuickSetupModal po kliknięciu startu w modalu', () => {
    const onQuickStart = jest.fn();
    render(
      <StartModeCards
        onQuickStart={onQuickStart}
        onManualStart={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('btn-quick-setup'));
    expect(screen.getByTestId('quick-setup-modal')).toBeInTheDocument();

    const charCard = screen.getAllByRole('button', { name: /Tomasz Nowicki/i })[0];
    fireEvent.click(charCard);

    const startBtn = screen.getByRole('button', { name: /Rozpocznij przygodę/i });
    fireEvent.click(startBtn);

    expect(onQuickStart).toHaveBeenCalled();
    expect(screen.queryByTestId('quick-setup-modal')).not.toBeInTheDocument();
  });

  it('blokuje kafelki gdy isStarting={true}', () => {
    const onQuickStart = jest.fn();
    const onManualStart = jest.fn();

    render(
      <StartModeCards
        onQuickStart={onQuickStart}
        onManualStart={onManualStart}
        isStarting={true}
        startProgress={30}
        startStatus="Inicjalizacja parametrów sesji..."
      />
    );

    const quickBtn = screen.getByTestId('btn-quick-setup');
    const manualBtn = screen.getByTestId('btn-manual-setup');

    expect(quickBtn).toBeDisabled();
    expect(manualBtn).toBeDisabled();

    fireEvent.click(quickBtn);
    expect(screen.queryByTestId('quick-setup-modal')).not.toBeInTheDocument();

    fireEvent.click(manualBtn);
    expect(onManualStart).not.toHaveBeenCalled();
  });

  it('wyświetla pasek postępu pod kafelkami gdy isStarting={true} i modal jest zamknięty', () => {
    render(
      <StartModeCards
        onQuickStart={jest.fn()}
        onManualStart={jest.fn()}
        isStarting={true}
        startProgress={55}
        startStatus="Ładowanie sceny początkowej..."
      />
    );

    expect(screen.getByTestId('start-cards-progress-container')).toBeInTheDocument();
    const progressBar = screen.getByTestId('start-cards-progress-bar');
    expect(progressBar).toHaveStyle({ width: '55%' });

    expect(screen.getByText('Ładowanie sceny początkowej...')).toBeInTheDocument();
    expect(screen.getByText('55%')).toBeInTheDocument();
  });
});
