import { render, screen, fireEvent, act } from '@testing-library/react';
import { YouTubePlayer } from '../youtube-player';

// Test repro dla suwaka głośności:
// 1. Zapisywanie do localStorage (VOLUME_STORAGE_KEY = 'youtube_volume')
// 2. Wywołanie player.unMute() i player.setVolume(newVolume)
// 3. Proporcjonalny ducking podczas TTS (isTTSPlaying) zamiast sztywnego 10

describe('YouTubePlayer volume controls', () => {
  let mockPlayer: any;

  beforeEach(() => {
    localStorage.clear();
    mockPlayer = {
      destroy: jest.fn(),
      setVolume: jest.fn(),
      unMute: jest.fn(),
      isMuted: jest.fn().mockReturnValue(false),
      playVideo: jest.fn(),
      pauseVideo: jest.fn(),
      setShuffle: jest.fn(),
      getVideoData: jest.fn().mockReturnValue({ title: 'Test Video' }),
    };

    window.YT = {
      Player: jest.fn().mockImplementation((_container, options) => {
        setTimeout(() => {
          options.events?.onReady?.({ target: mockPlayer, data: 0 });
        }, 0);
        return mockPlayer;
      }),
      PlayerState: { PLAYING: 1 },
    } as any;
  });

  afterEach(() => {
    delete (window as any).YT;
  });

  it('odczytuje zapisaną głośność z localStorage lub przyjmuje domyślną', () => {
    localStorage.setItem('youtube_volume', '42');
    render(<YouTubePlayer />);
    
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('42');
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('zmienia głośność w odtwarzaczu YT, wykonuje unMute i zapisuje do localStorage', async () => {
    render(<YouTubePlayer />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const slider = screen.getByRole('slider');
    act(() => {
      fireEvent.change(slider, { target: { value: '65' } });
    });

    expect(mockPlayer.unMute).toHaveBeenCalled();
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(65);
    expect(localStorage.getItem('youtube_volume')).toBe('65');
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('proporcjonalnie obniża głośność podczas mówienia lektora TTS (ducking)', async () => {
    localStorage.setItem('youtube_volume', '80');
    const { rerender } = render(<YouTubePlayer isTTSPlaying={false} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(mockPlayer.setVolume).toHaveBeenCalledWith(80);

    // Włączenie lektora TTS: ducking do ~30% wartości użytkownika (80 * 0.3 = 24)
    rerender(<YouTubePlayer isTTSPlaying={true} />);

    expect(mockPlayer.setVolume).toHaveBeenCalledWith(24);

    // Wyłączenie lektora TTS: powrót do głośności użytkownika (80)
    rerender(<YouTubePlayer isTTSPlaying={false} />);

    expect(mockPlayer.setVolume).toHaveBeenLastCalledWith(80);
  });
});
