import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TTSHardLoadingScreen } from './tts-hard-loading-screen';

// Mock next-intl useTranslations i useLocale
jest.mock('next-intl', () => ({
  useLocale: () => 'pl',
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      preparingSession: 'Strażnik Tajemnic przygotowuje sesję...',
      generatingStory: 'Trwa spisywanie mrocznej kroniki i dostrajanie głosu...',
      hookHeader: 'Meldunek operacyjny / Telegram do Badaczy',
      settingTriviaHeader: 'Realia Epoki i Świata',
      settingTriviaSubtitle: 'Kontekst historyczny i zasady świata',
      periodKnowledgeBadge: 'Wiedza Badacza z epoki',
      investigationStatus: 'Aktywne Śledztwo',
      spoilerFree: 'BEZ SPOILERÓW',
      confidential: 'DLA BADACZA',
      bufferingNarrator: 'Wsłuchiwanie się w głos z zaświatów...',
      chronicleDossier: 'Akta Śledztwa',
      defaultChronicleIntro: 'W cieniu zapomnianych ulic i zakurzonych archiwów kryją się sekrety...',
      defaultChronicleHook: 'Zbieg tajemniczych okoliczności rzuca badaczy w samo serce śledztwa...',
      enterAdventure: 'Rozpocznij Przygodę',
      chronicleReady: 'Pieczęć złamana. Czas stawić czoła nieznanemu.',
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

describe('TTSHardLoadingScreen (Issue #177, #364 & #482)', () => {
  it('nie renderuje niczego, gdy wszystkie flagi są false', () => {
    const { container } = render(
      <TTSHardLoadingScreen isBuffering={false} isStarting={false} isReadyToEnter={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderuje lewy boks Dossier z bezspoilerowym opisem oraz prawy boks z Realiami Epoki i Świata', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={45}
        adventureTitle="Cień nad Prabutami"
        adventureContext={{
          title: 'Cień nad Prabutami',
          investigatorIntro: 'Naukowa weryfikacja fenomenów ojca Klimuszki uderza w tajne operacje SB.',
          description: 'Pełny opis ze spoilerem o czwartym wymiarze i anomalii czasowej.',
          settingTrivia: [
            'W PRL lat 70. każde nieoficjalne zgromadzenie podlegało inwigilacji SB.',
            'Obywatele musieli posiadać dowód tożsamości w przestrzeni publicznej.',
          ],
          themes: ['Jasnowidzenie', 'Służba Bezpieczeństwa', 'Trauma wojenna'],
        }}
        region="Warszawa - Elbląg - Prabuty"
      />
    );

    expect(screen.getByTestId('tts-hard-loading-screen')).toBeInTheDocument();
    expect(screen.getByText('Cień nad Prabutami')).toBeInTheDocument();
    expect(screen.getByText('Strażnik Tajemnic przygotowuje sesję...')).toBeInTheDocument();

    // Lewy boks: bezspoilerowy investigatorIntro
    expect(screen.getByText('Naukowa weryfikacja fenomenów ojca Klimuszki uderza w tajne operacje SB.')).toBeInTheDocument();
    expect(screen.queryByText('Pełny opis ze spoilerem o czwartym wymiarze i anomalii czasowej.')).not.toBeInTheDocument();

    // Zero tagów motywów w lewym boksie (Issue #482)
    expect(screen.queryByText('Motywy:')).not.toBeInTheDocument();
    expect(screen.queryByText('Jasnowidzenie')).not.toBeInTheDocument();
    expect(screen.queryByText('Trauma wojenna')).not.toBeInTheDocument();

    // Prawy boks: Realia Epoki i Świata
    expect(screen.getByText('Realia Epoki i Świata')).toBeInTheDocument();
    expect(screen.getByText('W PRL lat 70. każde nieoficjalne zgromadzenie podlegało inwigilacji SB.')).toBeInTheDocument();
    expect(screen.getByText('Obywatele musieli posiadać dowód tożsamości w przestrzeni publicznej.')).toBeInTheDocument();

    expect(screen.getByText('BEZ SPOILERÓW')).toBeInTheDocument();
    expect(screen.getByText('Wiedza Badacza z epoki')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
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
    expect(screen.getByText('Pieczęć złamana. Czas stawić czoła nieznanemu.')).toBeInTheDocument();

    fireEvent.click(ctaButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('dobiera automatyczne ciekawostki z epoki, gdy nie podano jawnego settingTrivia', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={50}
        adventureContext={{
          title: 'Klasyczna sprawa w Bostonie',
          activeSceneYear: 1925,
          country: 'USA',
          description: 'Badacze badają sprawę zaginionego profesora Uniwersytetu Miskatonic.',
        }}
      />
    );

    expect(screen.getByText('Realia Epoki i Świata')).toBeInTheDocument();
    expect(screen.getByText(/USA, lata 20\./)).toBeInTheDocument();
    expect(screen.getByText(/Prohibicja/i)).toBeInTheDocument();
  });

  it('obsługuje brak jakichkolwiek tekstów bezpiecznie cofając się do wartości domyślnych', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={20}
      />
    );

    expect(screen.getByText('W cieniu zapomnianych ulic i zakurzonych archiwów kryją się sekrety...')).toBeInTheDocument();
    expect(screen.getByText('Realia Epoki i Świata')).toBeInTheDocument();
    expect(screen.getByText('BEZ SPOILERÓW')).toBeInTheDocument();
  });

  it('w stanie błędu (startError) wyświetla dwupoziomowy komunikat, przyciski retry/cancel i obsługuje kliknięcia', () => {
    const handleRetry = jest.fn();
    const handleCancel = jest.fn();

    render(
      <TTSHardLoadingScreen
        isStarting={false}
        startError={{
          statusCode: 503,
          category: 'server_overloaded',
          title: 'Przeciążenie darmowych serwerów Gemini [Błąd 503]',
          userAdvice: 'Serwery Google Gemini przeżywają chwilowe przeciążenie na darmowym planie Free Tier.',
          technicalDetails: 'ApiError: 503 Service Unavailable - high demand',
        }}
        onRetry={handleRetry}
        onCancel={handleCancel}
      />
    );

    expect(screen.getByTestId('loading-screen-error-container')).toBeInTheDocument();
    expect(screen.getAllByText('Przeciążenie darmowych serwerów Gemini [Błąd 503]')).toHaveLength(2);
    expect(
      screen.getByText('Serwery Google Gemini przeżywają chwilowe przeciążenie na darmowym planie Free Tier.')
    ).toBeInTheDocument();
    expect(screen.getByText('ApiError: 503 Service Unavailable - high demand')).toBeInTheDocument();

    const retryBtn = screen.getByTestId('loading-screen-retry-btn');
    const cancelBtn = screen.getByTestId('loading-screen-cancel-btn');
    const apiSettingsBtn = screen.getByTestId('loading-screen-api-settings-btn');

    expect(retryBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();
    expect(apiSettingsBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});

