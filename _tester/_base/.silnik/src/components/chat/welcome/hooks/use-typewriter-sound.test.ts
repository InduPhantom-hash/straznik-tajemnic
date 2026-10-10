import { renderHook, act } from '@testing-library/react';
import { useTypewriterSound } from './use-typewriter-sound';

describe('useTypewriterSound (Pętla Czerwona / Issue #669)', () => {
  let playMock: jest.Mock;
  let pauseMock: jest.Mock;
  let cloneNodeMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    playMock = jest.fn().mockResolvedValue(undefined);
    pauseMock = jest.fn();
    cloneNodeMock = jest.fn().mockImplementation(() => ({
      volume: 0.25,
      currentTime: 0,
      play: playMock,
      pause: pauseMock,
    }));

    // Mock HTMLAudioElement
    window.Audio = jest.fn().mockImplementation(() => ({
      volume: 0.3,
      preload: 'auto',
      readyState: 4,
      addEventListener: jest.fn((event, cb) => {
        if (event === 'canplaythrough') {
          cb();
        }
      }),
      removeEventListener: jest.fn(),
      cloneNode: cloneNodeMock,
    })) as unknown as typeof Audio;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('nie odtwarza dźwięku ani tekstu, gdy enabled jest false', () => {
    const { result } = renderHook(() =>
      useTypewriterSound('Nie jest martwe to, co może wiecznie drzemać...', false)
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.displayedText).toBe('');
    expect(result.current.isTyping).toBe(false);
    expect(playMock).not.toHaveBeenCalled();
  });

  it('uruchamia dźwięk i animację tekstu dopiero po przełączeniu enabled na true', () => {
    let isEnabled = false;
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useTypewriterSound('Nie jest martwe to, co może wiecznie drzemać...', enabled),
      { initialProps: { enabled: isEnabled } }
    );

    expect(result.current.displayedText).toBe('');
    expect(playMock).not.toHaveBeenCalled();

    // Aktywujemy widok (np. po zamknięciu modala językowego na WelcomeScreen)
    isEnabled = true;
    rerender({ enabled: true });

    // Audio powinno wystartować po aktywacji
    expect(playMock).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.displayedText.length).toBeGreaterThan(0);
  });

  it('wznawia odtwarzanie po odrzuceniu autoplay przez przeglądarkę przy pierwszej interakcji użytkownika', async () => {
    // Symulacja blokady autoplay
    playMock.mockRejectedValueOnce(new Error('Autoplay policy'));

    renderHook(() =>
      useTypewriterSound('Nie jest martwe to, co może wiecznie drzemać...', true)
    );

    // Pierwsze wywołanie play zostało odrzucone
    expect(playMock).toHaveBeenCalledTimes(1);

    // Czekaj na microtask (rejestrację catch na playPromise)
    await Promise.resolve();

    // Następuje gest użytkownika (np. kliknięcie)
    await act(async () => {
      window.dispatchEvent(new Event('pointerdown'));
    });

    // Powinno ponowić próbę odtworzenia po interakcji
    expect(playMock).toHaveBeenCalledTimes(2);
  });
});
