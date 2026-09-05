import { render, screen } from '@testing-library/react';
import {
  ArtDecoDice3D,
  type ArtDecoDiceBreakdown,
} from '@/components/dialogs/ArtDecoDice3D';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      diceTrayAria: 'Tacka na kości 3D Art Déco',
      rolling: 'Rzut kośćmi w toku...',
      tensDie: 'Kość dziesiątek',
      unitsDie: 'Kość jedności',
      bonusDieLabel: 'Kość premii',
      penaltyDieLabel: 'Kość kary',
      dieSelected: 'Wybrana',
      dieDiscarded: 'Odrzucona',
      diceSumRaw100: '00 + 0 = 100',
      bonusDicePlus: `+${params?.count} kość premii`,
      bonusDiceMinus: `${params?.count} kość kary`,
      luckSpentNote: `✦ wydano ${params?.amount} pkt Szczęścia`,
    };
    return translations[key] || key;
  },
}));

describe('ArtDecoDice3D (CoC 7e RAW)', () => {
  it('renders correctly in idle phase with default 00 and 0 values', () => {
    render(<ArtDecoDice3D phase="idle" animValue={0} />);

    const tray = screen.getByTestId('art-deco-dice-3d');
    expect(tray).toBeInTheDocument();
    expect(tray).toHaveAttribute('aria-busy', 'false');

    const tensDie = screen.getByTestId('tens-die');
    expect(tensDie).toHaveTextContent('00');

    const unitsDie = screen.getByTestId('units-die');
    expect(unitsDie).toHaveTextContent('0');

    const formula = screen.getByTestId('dice-formula');
    expect(formula).toHaveTextContent('k100');
  });

  it('marks tray as busy and renders rolling animation in rolling phase', () => {
    render(<ArtDecoDice3D phase="rolling" animValue={47} />);

    const tray = screen.getByTestId('art-deco-dice-3d');
    expect(tray).toHaveAttribute('aria-busy', 'true');

    expect(screen.getByText('Rzut kośćmi w toku...')).toBeInTheDocument();

    const tensDie = screen.getByTestId('tens-die');
    const unitsDie = screen.getByTestId('units-die');

    expect(tensDie.querySelector('.animate-dice-tumble-tens')).toBeInTheDocument();
    expect(unitsDie.querySelector('.animate-dice-tumble-units')).toBeInTheDocument();
  });

  it('renders extra tumbling die during rolling phase when bonus dice exist', () => {
    render(<ArtDecoDice3D phase="rolling" animValue={47} bonusDice={1} />);

    expect(screen.getByTestId('extra-tens-die')).toBeInTheDocument();
  });

  it('renders settled dice and correct formula in done phase', () => {
    const breakdown: ArtDecoDiceBreakdown = {
      tensResults: [40],
      unitsResult: 2,
      selectedTens: 40,
      total: 42,
    };

    render(
      <ArtDecoDice3D
        phase="done"
        animValue={42}
        total={42}
        breakdown={breakdown}
      />
    );

    const tensDie = screen.getByTestId('tens-die');
    expect(tensDie).toHaveTextContent('40');

    const unitsDie = screen.getByTestId('units-die');
    expect(unitsDie).toHaveTextContent('2');

    const formula = screen.getByTestId('dice-formula');
    expect(formula).toHaveTextContent('40');
    expect(formula).toHaveTextContent('2');
    expect(formula).toHaveTextContent('42');
  });

  it('handles RAW CoC 7e rule for 00 + 0 = 100', () => {
    const breakdown: ArtDecoDiceBreakdown = {
      tensResults: [0],
      unitsResult: 0,
      selectedTens: 0,
      total: 100,
    };

    render(
      <ArtDecoDice3D
        phase="done"
        animValue={100}
        total={100}
        breakdown={breakdown}
      />
    );

    const tensDie = screen.getByTestId('tens-die');
    expect(tensDie).toHaveTextContent('00');

    const unitsDie = screen.getByTestId('units-die');
    expect(unitsDie).toHaveTextContent('0');

    const formula = screen.getByTestId('dice-formula');
    expect(formula).toHaveTextContent('100');
    expect(formula).toHaveTextContent('CoC 7e RAW');
  });

  it('correctly displays multiple tens dice with bonus/penalty breakdown', () => {
    // 1 bonus die: rolled 20 and 70, selected lower (20)
    const breakdown: ArtDecoDiceBreakdown = {
      tensResults: [20, 70],
      unitsResult: 5,
      selectedTens: 20,
      total: 25,
    };

    render(
      <ArtDecoDice3D
        phase="done"
        animValue={25}
        total={25}
        breakdown={breakdown}
        bonusDice={1}
      />
    );

    const tensDie = screen.getByTestId('tens-die');
    expect(tensDie).toHaveTextContent('20');
    expect(tensDie).toHaveTextContent('Wybrana');

    const extraDie = screen.getByTestId('extra-tens-die');
    expect(extraDie).toHaveTextContent('70');
    expect(extraDie).toHaveTextContent('Odrzucona');

    expect(screen.getByText('+1 kość premii')).toBeInTheDocument();
  });

  it('displays note when luck was spent to modify result', () => {
    const breakdown: ArtDecoDiceBreakdown = {
      tensResults: [50],
      unitsResult: 8,
      selectedTens: 50,
      total: 58,
    };

    render(
      <ArtDecoDice3D
        phase="done"
        animValue={40}
        total={40}
        breakdown={breakdown}
        luckSpent={18}
      />
    );

    expect(screen.getByText('✦ wydano 18 pkt Szczęścia')).toBeInTheDocument();
  });
});
