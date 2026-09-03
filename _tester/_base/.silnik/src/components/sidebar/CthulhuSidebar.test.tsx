import { render, screen } from '@testing-library/react';
import { CthulhuSidebar } from './CthulhuSidebar';

jest.mock('../ui/youtube-player', () => ({
  YouTubePlayer: ({ isTTSPlaying }: { isTTSPlaying?: boolean }) => (
    <div data-testid="youtube-player">YouTube player {isTTSPlaying ? 'ducked' : 'normal'}</div>
  ),
}));

jest.mock('../ui/character-sheet', () => ({
  CharacterSheet: () => null,
}));

describe('CthulhuSidebar player tools', () => {
  afterEach(() => {
    delete process.env.NEXT_INTL_TEST_LOCALE;
  });

  it('renders the existing YouTube player in Investigator Tools without GM Tools', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'en';

    render(<CthulhuSidebar isTTSPlaying />);

    expect(screen.getByText('Investigator Tools')).toBeInTheDocument();
    expect(screen.getByTestId('youtube-player')).toHaveTextContent('ducked');
    expect(screen.queryByText(/GM Tools/i)).not.toBeInTheDocument();
  });

  it('blokuje przycisk Fazy Rozwoju w trakcie aktywnej gry (CoC 7e puryzm)', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'pl';
    const mockOpenDev = jest.fn();
    const mockChar = {
      id: 'char_1',
      name: 'Harvey',
      skills: {},
    } as never;

    render(
      <CthulhuSidebar
        activeCharacter={mockChar}
        onOpenDevelopmentPhase={mockOpenDev}
        isSessionEnded={false}
        sessionEndStatus="idle"
      />
    );

    const lockedBtn = screen.getByTitle(/Faza Rozwoju według zasad CoC 7e jest dostępna dopiero po zakończeniu sesji/i);
    expect(lockedBtn).toBeInTheDocument();
    expect(lockedBtn).toBeDisabled();
  });

  it('odblokowuje przycisk Fazy Rozwoju po zakończeniu sesji', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'pl';
    const mockOpenDev = jest.fn();
    const mockChar = {
      id: 'char_1',
      name: 'Harvey',
      skills: {},
    } as never;

    render(
      <CthulhuSidebar
        activeCharacter={mockChar}
        onOpenDevelopmentPhase={mockOpenDev}
        isSessionEnded={true}
        sessionEndStatus="ended"
      />
    );

    const readyBtn = screen.getByTitle(/Sesja zakończona! Otwórz Fazę Rozwoju/i);
    expect(readyBtn).toBeInTheDocument();
    expect(readyBtn).not.toBeDisabled();
    readyBtn.click();
    expect(mockOpenDev).toHaveBeenCalledTimes(1);
  });

  it('poprawnie renderuje stan oczekiwania na słowo gracza bez rozbijania ramki', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'pl';
    const mockChar = {
      id: 'char_1',
      name: 'Harvey',
      skills: {},
    } as never;

    render(
      <CthulhuSidebar
        activeCharacter={mockChar}
        isSessionEnded={false}
        sessionEndStatus="awaiting_player_closure"
      />
    );

    const awaitingBtn = screen.getByTitle(/Trwa domykanie sesji/i);
    expect(awaitingBtn).toBeInTheDocument();
    expect(awaitingBtn).toBeDisabled();
    expect(awaitingBtn).toHaveTextContent(/Oczekiwanie na słowo gracza.../i);
  });

  it('renderuje stan bezpiecznie zamkniętej sesji z właściwą etykietą i tytułem', () => {
    process.env.NEXT_INTL_TEST_LOCALE = 'pl';
    const mockChar = {
      id: 'char_1',
      name: 'Harvey',
      skills: {},
    } as never;

    render(
      <CthulhuSidebar
        activeCharacter={mockChar}
        isSessionEnded={true}
        sessionEndStatus="ended"
      />
    );

    const closedBtn = screen.getByTitle(/Sesja została bezpiecznie zamknięta/i);
    expect(closedBtn).toBeInTheDocument();
    expect(closedBtn).toBeDisabled();
    expect(closedBtn).toHaveTextContent(/Sesja Zamknięta/i);
  });
});
