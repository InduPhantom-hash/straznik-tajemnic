import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TTSHardLoadingScreen } from './tts-hard-loading-screen';

// Mock next-intl useTranslations
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, any>) => {
    const messages: Record<string, string> = {
      preparingSession: 'Mistrz Gry przygotowuje sesję...',
      generatingStory: 'Trwa generowanie mrocznej opowieści i głosu narratora...',
      dispatchHeader: 'Wycinek z kroniki epoki',
      clip1Source: 'The Arkham Advertiser (1926)',
      clip1Headline: 'Tajemnicze zaginięcia w dolinie rzeki Miskatonic',
      clip1Text: 'Władze przeszukują podmiejskie lasy po tym, jak dwóch studentów uniwersytetu nie powróciło z ekspedycji.',
      clip2Source: 'The Boston Globe (1925)',
      clip2Headline: 'Nocny nalot policji na nabrzeżu North End',
      clip2Text: 'Skonfiskowano sześć skrzyń z podejrzanym ładunkiem ze Starego Świata.',
      clip3Source: 'The Providence Gazette (1924)',
      clip3Headline: 'Niezwykłe zjawiska na wodach zatoki Narragansett',
      clip3Text: 'Miejscowi rybacy donoszą o nienaturalnych poświatach widocznych w gęstej mgle.',
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

  it('renderuje stan buforowania/generowania z paskiem postępu i wycinkami kroniki', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={45}
        adventureTitle="Zew Innsmouth"
        adventureDescription="Mroczna mgła nad portem rybackim."
        region="Nowa Anglia"
      />
    );

    expect(screen.getByTestId('tts-hard-loading-screen')).toBeInTheDocument();
    expect(screen.getByText('„Zew Innsmouth”')).toBeInTheDocument();
    expect(screen.getByText('Mroczna mgła nad portem rybackim.')).toBeInTheDocument();
    expect(screen.getByText('Nowa Anglia')).toBeInTheDocument();
    expect(screen.getByText('Wycinek z kroniki epoki')).toBeInTheDocument();
    expect(screen.getByText('The Arkham Advertiser (1926)')).toBeInTheDocument();
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
