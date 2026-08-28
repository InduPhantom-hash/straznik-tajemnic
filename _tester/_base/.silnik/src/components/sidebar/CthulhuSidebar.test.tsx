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
});
