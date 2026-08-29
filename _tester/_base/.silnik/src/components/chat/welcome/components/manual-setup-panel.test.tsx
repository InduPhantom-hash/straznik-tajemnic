import { fireEvent, render, screen } from '@testing-library/react';
import { ManualSetupPanel } from './manual-setup-panel';
import type { Character } from '@/lib/types';

describe('ManualSetupPanel', () => {
  const originalLocale = process.env.NEXT_INTL_TEST_LOCALE;

  afterEach(() => {
    process.env.NEXT_INTL_TEST_LOCALE = originalLocale;
  });

  const mockCharacter: Character = {
    id: 'char-1',
    name: 'Edward Carnby',
    occupation: 'Detektyw',
    age: 38,
    background: 'Doświadczony detektyw',
    playerName: 'Gracz 1',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    str: 60,
    dex: 50,
    con: 70,
    app: 45,
    pow: 65,
    edu: 75,
    siz: 65,
    int: 80,
    luck: 55,
    hp: 13,
    san: 65,
    mp: 13,
    skills: {},
    experience: {
      totalXP: 0,
      availableXP: 0,
      earnedThisSession: 0,
      maxEarnedThisSession: 10,
    },
    developmentHistory: [],
  };

  it('renderuje widok solo bez wybranej postaci i przygody', () => {
    const onBack = jest.fn();
    const onSelectAdventure = jest.fn();
    const onCreateCharacter = jest.fn();
    const onStartGame = jest.fn();

    render(
      <ManualSetupPanel
        onBack={onBack}
        onSelectAdventure={onSelectAdventure}
        onCreateCharacter={onCreateCharacter}
        onStartGame={onStartGame}
        hasAdventure={false}
        hasCharacter={false}
      />
    );

    expect(screen.getByText('Solo (1 Gracz)')).toBeInTheDocument();
    expect(screen.getByText('Nie wybrano przygody')).toBeInTheDocument();
    expect(screen.getByText(/Brak wybranego Badacza/i)).toBeInTheDocument();

    const startBtn = screen.getByRole('button', { name: /Rozpocznij Grę/i });
    expect(startBtn).toBeDisabled();
    expect(
      screen.getByText(/Wybierz przygodę i postać, aby rozpocząć grę/i)
    ).toBeInTheDocument();
  });

  it('pozwala wrócić do wyboru trybu', () => {
    const onBack = jest.fn();
    render(
      <ManualSetupPanel
        onBack={onBack}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={jest.fn()}
        onStartGame={jest.fn()}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Wróć do wyboru trybu/i })
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('obsługuje kliknięcie zmiany trybu gry i wyboru przygody', () => {
    const onChoosePlayMode = jest.fn();
    const onSelectAdventure = jest.fn();

    render(
      <ManualSetupPanel
        onBack={jest.fn()}
        onChoosePlayMode={onChoosePlayMode}
        onSelectAdventure={onSelectAdventure}
        onCreateCharacter={jest.fn()}
        onStartGame={jest.fn()}
        hasAdventure={true}
        adventureTitle="Cienie nad Innsmouth"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Zmień tryb/i }));
    expect(onChoosePlayMode).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Cienie nad Innsmouth')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zmień przygodę/i }));
    expect(onSelectAdventure).toHaveBeenCalledTimes(1);
  });

  it('wyświetla postać w trybie Solo i pozwala rozpocząć grę, gdy wszystko wybrane', () => {
    const onStartGame = jest.fn();
    const onPickPredefinedCharacter = jest.fn();
    const onCreateCharacter = jest.fn();
    const onPickCharacter = jest.fn();

    render(
      <ManualSetupPanel
        onBack={jest.fn()}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={onCreateCharacter}
        onPickPredefinedCharacter={onPickPredefinedCharacter}
        onPickCharacter={onPickCharacter}
        onStartGame={onStartGame}
        hasAdventure={true}
        adventureTitle="Zew Cthulhu"
        hasCharacter={true}
        activeCharacter={mockCharacter}
        hasSavedCharacters={true}
      />
    );

    expect(screen.getByText('Edward Carnby')).toBeInTheDocument();
    expect(screen.getByText(/Detektyw/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Zmień postać/i }));
    expect(onPickPredefinedCharacter).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Stwórz nową/i }));
    expect(onCreateCharacter).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Z katalogu/i }));
    expect(onPickCharacter).toHaveBeenCalledTimes(1);

    const startBtn = screen.getByRole('button', { name: /Rozpocznij Grę/i });
    expect(startBtn).not.toBeDisabled();
    fireEvent.click(startBtn);
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('renderuje sloty w trybie Duet i obsługuje akcje per gracz', () => {
    const onCreateCharacter = jest.fn();
    const onPickPredefinedCharacter = jest.fn();

    const duetSlots = [
      {
        playerId: 'p1',
        playerName: 'Kasia',
        character: {
          id: 'c1',
          name: 'Elena Vance',
          occupation: 'Dziennikarka',
        },
      },
      {
        playerId: 'p2',
        playerName: 'Tomek',
      },
    ];

    render(
      <ManualSetupPanel
        onBack={jest.fn()}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={onCreateCharacter}
        onPickPredefinedCharacter={onPickPredefinedCharacter}
        onStartGame={jest.fn()}
        isDuet={true}
        duetCharacterSlots={duetSlots}
      />
    );

    expect(screen.getByText('Duet (Hot Seat - 2 Graczy)')).toBeInTheDocument();
    expect(screen.getByText('Kasia')).toBeInTheDocument();
    expect(screen.getByText('Elena Vance')).toBeInTheDocument();
    expect(screen.getByText('Tomek')).toBeInTheDocument();
    expect(screen.getByText('Brak przypisanej postaci')).toBeInTheDocument();

    // Kliknij stwórz dla Tomka
    const createButtons = screen.getAllByRole('button', { name: /Stwórz nową/i });
    fireEvent.click(createButtons[1]);
    expect(onCreateCharacter).toHaveBeenCalledWith('Tomek');
  });

  it('lokalizuje kartę Session Zero po angielsku bez polskich wycieków', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'en';

    render(
      <ManualSetupPanel
        onBack={jest.fn()}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={jest.fn()}
        onStartGame={jest.fn()}
        onSessionZero={jest.fn()}
      />
    );

    expect(screen.getByText('Optional step - Session Zero')).toBeInTheDocument();
    expect(
      screen.getByText('Narrative introduction and agreement on conventions')
    ).toBeInTheDocument();
    expect(screen.queryByText('Krok opcjonalny - Sesja Zero')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Wprowadzenie fabularne i ustalenie konwencji')
    ).not.toBeInTheDocument();
  });

  it('pokazuje polski status ukończonej Session Zero', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'pl';

    render(
      <ManualSetupPanel
        onBack={jest.fn()}
        onSelectAdventure={jest.fn()}
        onCreateCharacter={jest.fn()}
        onStartGame={jest.fn()}
        onSessionZero={jest.fn()}
        hasSessionZero
      />
    );

    expect(screen.getByText('Krok opcjonalny - Sesja Zero')).toBeInTheDocument();
    expect(
      screen.getByText('Wprowadzenie i ustalenia sesji: gotowe')
    ).toBeInTheDocument();
  });
});
