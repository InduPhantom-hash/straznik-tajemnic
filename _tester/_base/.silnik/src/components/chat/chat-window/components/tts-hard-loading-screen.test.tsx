import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TTSHardLoadingScreen } from './tts-hard-loading-screen';

// Mock next-intl useTranslations
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      preparingSession: 'Mistrz Gry przygotowuje sesję...',
      generatingStory: 'Trwa generowanie mrocznej opowieści i głosu narratora...',
      hookHeader: 'Bezspoilerowa zajawka sprawy',
      spoilerFree: 'BEZ SPOILERÓW',
      confidential: 'DLA BADACZA',
      bufferingNarrator: 'Buforowanie głosu lektora (3-4 zdania)...',
      chronicleDossier: 'Akta Śledztwa',
      defaultChronicleIntro: 'W cieniu zapomnianych ulic i zakurzonych archiwów kryją się sekrety...',
      enterAdventure: 'Rozpocznij Przygodę',
      chronicleReady: 'Kronika spisana. Gotowy do wejścia.',
      awaitingAccept: 'Kliknij, aby rozpocząć śledztwo',
      themesLabel: 'Motywy:',
      eraLabel: 'Epoka:',
      locationLabel: 'Lokalizacja:',
    };
    if (params) {
      let msg = messages[key] || key;
      Object.entries(params).forEach(([k, v]) => {
        msg = msg.replace(`{${k}}`, String(v));
      });
      return msg;
    }
    return messages[key] || key;
  },
}));

describe('TTSHardLoadingScreen (Issue #177)', () => {
  it('nie renderuje niczego, gdy wszystkie flagi są false', () => {
    const { container } = render(
      <TTSHardLoadingScreen isBuffering={false} isStarting={false} isReadyToEnter={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderuje stan buforowania z hookiem wybranej przygody bez stałej epoki', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={45}
        adventureTitle="Zew Innsmouth"
        adventureContext={{ title: 'Zew Innsmouth', hook: 'List od zaginionego brata prowadzi cię ku portowym mgłom.' }}
        region="Nowa Anglia"
      />
    );

    expect(screen.getByTestId('tts-hard-loading-screen')).toBeInTheDocument();
    expect(screen.getByText('„Zew Innsmouth”')).toBeInTheDocument();
    expect(screen.getAllByText('List od zaginionego brata prowadzi cię ku portowym mgłom.')).toHaveLength(2);
    expect(screen.getByText('Nowa Anglia')).toBeInTheDocument();
    expect(screen.getByText('Bezspoilerowa zajawka sprawy')).toBeInTheDocument();
    expect(screen.getByText('BEZ SPOILERÓW')).toBeInTheDocument();
    expect(screen.queryByText(/192[0-9]/)).not.toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Buforowanie głosu lektora (3-4 zdania)...')).toBeInTheDocument();
  });

  it('wyświetla hero CTA po osiągnięciu 100% i obsługuje kliknięcie potwierdzenia', () => {
    const handleConfirm = jest.fn();
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        isReadyToEnter={true}
        startProgress={100}
        adventureTitle="Cień nad Innsmouth"
        onConfirmEnterGame={handleConfirm}
      />
    );

    const ctaButton = screen.getByTestId('loading-screen-enter-cta');
    expect(ctaButton).toBeInTheDocument();
    expect(screen.getByText('Rozpocznij Przygodę')).toBeInTheDocument();
    expect(screen.getByText('Kronika spisana. Gotowy do wejścia.')).toBeInTheDocument();

    fireEvent.click(ctaButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
