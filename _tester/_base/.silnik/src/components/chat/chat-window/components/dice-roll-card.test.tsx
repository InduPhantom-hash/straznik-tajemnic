import { render, screen, fireEvent, act } from '@testing-library/react';
import { DiceRollCard } from './dice-roll-card';
import type { DiceRollEventData } from '@/lib/types';
import { traceForFormula } from '@/lib/dice-roll-trace';

jest.mock('@/components/dice/physical-dice-scene', () => ({
  PhysicalDiceScene: ({ dice }: { dice: Array<{ value: number }> }) => (
    <div data-testid="physical-dice-scene">{dice.map((d) => d.value).join(',')}</div>
  ),
}));

jest.mock('@/lib/dice-physics/dice-audio', () => ({
  playDiceClatter: jest.fn(),
}));

describe('DiceRollCard (CoC 7e RAW & 3D Physical Scene)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockEvent: DiceRollEventData = {
    id: 'dice_test_1',
    formula: '2d6 + 3d12',
    trace: traceForFormula('2d6 + 3d12', 'test'),
    characterName: 'Edward Carnby',
    timestamp: '2026-09-15T10:00:00.000Z',
  };

  it('renders card with physical scene, formula and total', () => {
    render(<DiceRollCard event={mockEvent} />);

    expect(screen.getByTestId('dice-roll-card')).toBeInTheDocument();
    expect(screen.getByText('2d6 + 3d12')).toBeInTheDocument();
    expect(screen.getByText('Edward Carnby')).toBeInTheDocument();
    expect(screen.getByTestId('physical-dice-scene')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1500);
    });
  });

  it('allows re-rolling dice on click', () => {
    render(<DiceRollCard event={mockEvent} />);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    const rerollBtn = screen.getByRole('button', { name: /przetocz|re-roll/i });
    expect(rerollBtn).toBeEnabled();

    fireEvent.click(rerollBtn);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByTestId('physical-dice-scene')).toBeInTheDocument();
  });

  it('renders card with diegetic label and pads tens die for d100 rolls', () => {
    const d100Event: DiceRollEventData = {
      id: 'dice_test_d100',
      formula: '1d100',
      label: 'Strzelba / Shotgun',
      trace: {
        dice: [
          { id: 'tens', type: 'd10', value: 0, role: 'tens', selected: true },
          { id: 'units', type: 'd10', value: 5, role: 'units', selected: true },
        ],
        total: 5,
        modifier: 0,
        source: 'test',
      },
      characterName: 'Harvey Walters',
    };

    render(<DiceRollCard event={d100Event} />);
    expect(screen.getByText(/Strzelba \/ Shotgun/)).toBeInTheDocument();
    expect(screen.getByText(/00 \+ 5/)).toBeInTheDocument();
  });
});
