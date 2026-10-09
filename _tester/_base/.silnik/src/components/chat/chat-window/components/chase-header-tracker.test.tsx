import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChaseHeaderTracker } from './chase-header-tracker';
import { createInitialChaseFromTag } from '@/lib/chase/chase-engine';

describe('ChaseHeaderTracker', () => {
  it('nie renderuje niczego gdy chaseState jest null lub status !== ongoing', () => {
    const { container: c1 } = render(<ChaseHeaderTracker chaseState={null} />);
    expect(c1.firstChild).toBeNull();

    const state = createInitialChaseFromTag({ type: 'pieszy' });
    state.status = 'escaped';
    const { container: c2 } = render(<ChaseHeaderTracker chaseState={state} />);
    expect(c2.firstChild).toBeNull();
  });

  it('renderuje pasek Osi Pościgu z Badaczem i Ścigającym w trakcie trwania pościgu', () => {
    const state = createInitialChaseFromTag({
      type: 'pieszy',
      initialDistance: 2,
      opponentName: 'Kultysta z tasakiem',
    });

    render(<ChaseHeaderTracker chaseState={state} />);

    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByText('GONITWA')).toBeInTheDocument();
    expect(screen.getByText('Kultysta z tasakiem')).toBeInTheDocument();
    expect(screen.getByText(/Dystans: 2/)).toBeInTheDocument();
    expect(screen.getByText(/🕵️ Ty/)).toBeInTheDocument();
    expect(screen.getByText(/👹 Wróg/)).toBeInTheDocument();
  });

  it('wyróżnia stan bezpośredniego zagrożenia gdy dystans wynosi 1', () => {
    const state = createInitialChaseFromTag({
      type: 'pieszy',
      initialDistance: 1,
      opponentName: 'Ghul',
    });

    render(<ChaseHeaderTracker chaseState={state} />);

    expect(screen.getByText(/ZAGROŻENIE/)).toBeInTheDocument();
  });

  it('wyświetla nadchodzącą przeszkodę i sugerowaną umiejętność', () => {
    const state = createInitialChaseFromTag({
      type: 'pieszy',
      initialDistance: 0, // Badacz na segmencie 0, na segmencie 1 jest płot
    });
    // Ustaw gracza na segmencie 0
    state.participants[0].segmentIndex = 0;

    render(<ChaseHeaderTracker chaseState={state} />);

    expect(screen.getByText(/Przeszkoda na trasie:/)).toBeInTheDocument();
    expect(screen.getByText('Wysoki płot z desek')).toBeInTheDocument();
    expect(screen.getByText(/\[TEST: Skakanie\]/)).toBeInTheDocument();
  });
});
