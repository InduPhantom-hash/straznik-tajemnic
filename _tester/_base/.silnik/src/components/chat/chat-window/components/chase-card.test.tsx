import { fireEvent, render, screen } from '@testing-library/react';
import { ChaseCard } from './chase-card';
import type { ChaseState } from '@/lib/chase/chase-engine';
import type { Character } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

describe('ChaseCard - tor pościgu w czacie', () => {
  const alice: Character = {
    ...PREDEFINED_CHARACTERS[0],
    id: 'char-alice',
    name: 'Alice',
    dex: 65,
    skills: {
      Skakanie: 55,
      Nawigacja: 60,
      Ukrywanie: 50,
    },
  };

  const baseChaseState: ChaseState = {
    id: 'chase-test',
    status: 'ongoing',
    round: 2,
    maxRounds: 6,
    turnOrder: ['char-alice', 'mob-1'],
    activeActorId: 'char-alice',
    participants: [
      {
        id: 'char-alice',
        name: 'Alice',
        isPlayer: true,
        isFleeing: true,
        mov: 8,
        actionsTotal: 2,
        actionsRemaining: 2,
        segmentIndex: 2,
      },
      {
        id: 'mob-1',
        name: 'Kultysta',
        isPlayer: false,
        isFleeing: false,
        mov: 7,
        actionsTotal: 1,
        actionsRemaining: 1,
        segmentIndex: 0,
      },
    ],
    segments: [
      { index: 0, name: 'Targ' },
      { index: 1, name: 'Zaułek' },
      { index: 2, name: 'Brama' },
      { index: 3, name: 'Dachy' },
      { index: 4, name: 'Przystań' },
    ],
    logs: [{ round: 1, actorName: 'Alice', actionName: 'Sprint', details: 'Bieg naprzód.', segmentBefore: 1, segmentAfter: 2 }],
  };

  it('renderuje stan pościgu, wskaźniki rundy i akcji oraz przyciski manewrów', () => {
    const onManeuverSelect = jest.fn();
    render(
      <ChaseCard
        chaseState={baseChaseState}
        activeCharacter={alice}
        canAct={true}
        completed={false}
        onManeuverSelect={onManeuverSelect}
      />
    );

    expect(screen.getByText('Pościg CoC 7e RAW')).toBeInTheDocument();
    expect(screen.getByText('Runda 2/6')).toBeInTheDocument();
    expect(screen.getByText(/@Alice/)).toBeInTheDocument();
    expect(screen.getByText(/Pozostałe akcje: 2/)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Sprint naprzód/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Brawurowy skrót/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zastaw przeszkodę z tyłu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zniknij w cieniu/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sprint naprzód/i }));
    expect(onManeuverSelect).toHaveBeenCalledWith(
      'sprint',
      expect.objectContaining({ status: 'ongoing' }),
      expect.stringContaining('Alice: Sprint naprzód')
    );
  });

  it('oferuje forsuj przeszkodę, gdy kolejny segment zawiera hazard', () => {
    const onManeuverSelect = jest.fn();
    const stateWithHazard: ChaseState = {
      ...baseChaseState,
      segments: [
        { index: 0, name: 'Targ' },
        { index: 1, name: 'Zaułek' },
        { index: 2, name: 'Brama' },
        {
          index: 3,
          name: 'Dachy',
          hazard: {
            id: 'hazard_stairs',
            name: 'Strome, zniszczone schody',
            description: 'Strome stopnie',
            requiredSkill: 'Skakanie',
            difficulty: 'zwykly',
            hazardType: 'hazard',
          },
        },
      ],
    };

    render(
      <ChaseCard
        chaseState={stateWithHazard}
        activeCharacter={alice}
        canAct={true}
        completed={false}
        onManeuverSelect={onManeuverSelect}
      />
    );

    const clearBtn = screen.getByRole('button', { name: /Forsuj przeszkodę: Strome, zniszczone schody/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onManeuverSelect).toHaveBeenCalledWith(
      'clear_hazard',
      expect.anything(),
      expect.stringContaining('Forsuj przeszkodę')
    );
  });

  it('wykonuje manewr skrótu i ukrycia', () => {
    const onManeuverSelect = jest.fn();
    const { rerender } = render(
      <ChaseCard
        chaseState={baseChaseState}
        activeCharacter={alice}
        canAct={true}
        completed={false}
        onManeuverSelect={onManeuverSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Brawurowy skrót/i }));
    expect(onManeuverSelect).toHaveBeenCalledWith(
      'shortcut',
      expect.anything(),
      expect.stringContaining('Brawurowy skrót')
    );

    rerender(
      <ChaseCard
        chaseState={baseChaseState}
        activeCharacter={alice}
        canAct={true}
        completed={false}
        onManeuverSelect={onManeuverSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Zniknij w cieniu/i }));
    expect(onManeuverSelect).toHaveBeenCalledWith(
      'hide',
      expect.anything(),
      expect.stringContaining('Zniknij w cieniu')
    );
  });

  it('renderuje komunikat o udanej ucieczce, gdy status to escaped', () => {
    const escapedState: ChaseState = {
      ...baseChaseState,
      status: 'escaped',
    };

    render(<ChaseCard chaseState={escapedState} activeCharacter={alice} />);

    expect(screen.getByText(/Zgubiłeś ścigających w labiryncie ulic/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sprint naprzód/i })).not.toBeInTheDocument();
  });

  it('renderuje kontakt/starcie, gdy uciekający został dogoniony', () => {
    const caughtState: ChaseState = {
      ...baseChaseState,
      status: 'engaged',
    };

    render(<ChaseCard chaseState={caughtState} activeCharacter={alice} />);

    expect(screen.getByText(/Ścigający są w tej samej lokacji/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sprint naprzód/i })).not.toBeInTheDocument();
  });
});
