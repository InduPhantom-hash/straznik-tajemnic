import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TTSHardLoadingScreen } from './tts-hard-loading-screen';

// Mock next-intl useTranslations
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      preparingSession: 'Strażnik Tajemnic przygotowuje sesję...',
      generatingStory: 'Trwa spisywanie mrocznej kroniki i dostrajanie głosu...',
      hookHeader: 'Meldunek operacyjny / Telegram do Badaczy',
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

describe('TTSHardLoadingScreen (Issue #177 & Issue #364)', () => {
  it('nie renderuje niczego, gdy wszystkie flagi są false', () => {
    const { container } = render(
      <TTSHardLoadingScreen isBuffering={false} isStarting={false} isReadyToEnter={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderuje rozdzielone treści: opis w Dossier i haczyk w Meldunku operacyjnym bez duplikacji', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={45}
        adventureTitle="Cień nad Prabutami"
        adventureContext={{
          title: 'Cień nad Prabutami',
          description: 'Naukowa weryfikacja fenomenów o. Klimuszki uderza w tajne operacje SB i anomalię w Prabutach.',
          hook: 'Weryfikacja fenomenów o. Klimuszki prowadzi do tajnych teczek i anomalii wymiarowej.',
        }}
        region="Warszawa - Elbląg - Prabuty"
      />
    );

    expect(screen.getByTestId('tts-hard-loading-screen')).toBeInTheDocument();
    expect(screen.getByText('Cień nad Prabutami')).toBeInTheDocument();
    expect(screen.getByText('Strażnik Tajemnic przygotowuje sesję...')).toBeInTheDocument();
    expect(screen.getByText('Naukowa weryfikacja fenomenów o. Klimuszki uderza w tajne operacje SB i anomalię w Prabutach.')).toBeInTheDocument();
    expect(screen.getByText('Weryfikacja fenomenów o. Klimuszki prowadzi do tajnych teczek i anomalii wymiarowej.')).toBeInTheDocument();
    expect(screen.getByText('Warszawa - Elbląg - Prabuty')).toBeInTheDocument();
    expect(screen.getByText('Meldunek operacyjny / Telegram do Badaczy')).toBeInTheDocument();
    expect(screen.getByText('BEZ SPOILERÓW')).toBeInTheDocument();
    expect(screen.queryByText(/192[0-9]/)).not.toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.queryByText('Wsłuchiwanie się w głos z zaświatów...')).not.toBeInTheDocument();
    expect(screen.getByText('Trwa spisywanie mrocznej kroniki i dostrajanie głosu...')).toBeInTheDocument();
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

  it('obsługuje scenariusz gdy podano wyłącznie hook (Dossier otrzymuje domyślne intro, brak duplikacji)', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={50}
        adventureContext={{
          title: 'Tajemniczy Dziennik',
          hook: 'Pojedynczy telegram z prośbą o pomoc.',
        }}
      />
    );

    expect(screen.getByText('W cieniu zapomnianych ulic i zakurzonych archiwów kryją się sekrety...')).toBeInTheDocument();
    expect(screen.getByText('Pojedynczy telegram z prośbą o pomoc.')).toBeInTheDocument();
    expect(screen.queryAllByText('Pojedynczy telegram z prośbą o pomoc.')).toHaveLength(1);
  });

  it('obsługuje scenariusz gdy podano wyłącznie description (Meldunek otrzymuje domyślny hook, brak duplikacji)', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={50}
        adventureContext={{
          title: 'Mroczne Archiwum',
          description: 'Pełny opis sprawy z wieloma szczegółami.',
        }}
      />
    );

    expect(screen.getByText('Pełny opis sprawy z wieloma szczegółami.')).toBeInTheDocument();
    expect(screen.getByText('Zbieg tajemniczych okoliczności rzuca badaczy w samo serce śledztwa...')).toBeInTheDocument();
    expect(screen.queryAllByText('Pełny opis sprawy z wieloma szczegółami.')).toHaveLength(1);
  });

  it('zapobiega duplikacji gdy hook i description mają identyczny tekst', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={50}
        adventureContext={{
          title: 'Identyczny Tekst',
          description: 'Identyczny tekst w obu polach',
          hook: 'Identyczny tekst w obu polach',
        }}
      />
    );

    // Left gets the description, right avoids repeating it and uses defaultChronicleHook
    expect(screen.getAllByText('Identyczny tekst w obu polach')).toHaveLength(1);
    expect(screen.getByText('Zbieg tajemniczych okoliczności rzuca badaczy w samo serce śledztwa...')).toBeInTheDocument();
  });

  it('zapobiega duplikacji gdy hook i description różnią się jedynie wielkością liter lub białymi znakami', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={50}
        adventureContext={{
          title: 'Białe Znaki',
          description: 'Sprawa Zaginionego Rękopisu',
          hook: '  sprawa zaginionego rękopisu  ',
        }}
      />
    );

    expect(screen.getAllByText('Sprawa Zaginionego Rękopisu')).toHaveLength(1);
    expect(screen.getByText('Zbieg tajemniczych okoliczności rzuca badaczy w samo serce śledztwa...')).toBeInTheDocument();
  });

  it('obsługuje teksty złożone wyłącznie z białych znaków, bezpiecznie cofając się do domyślnych wartości', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={35}
        adventureContext={{
          title: 'Tylko Spacje',
          description: '   ',
          hook: '     ',
        }}
      />
    );

    expect(screen.getByText('W cieniu zapomnianych ulic i zakurzonych archiwów kryją się sekrety...')).toBeInTheDocument();
    expect(screen.getByText('Zbieg tajemniczych okoliczności rzuca badaczy w samo serce śledztwa...')).toBeInTheDocument();
  });

  it('zapobiega duplikacji gdy adventureDescription podano bezpośrednio w propie a hook jest identyczny', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={50}
        adventureDescription="Opis przekazany bezpośrednio w propie"
        adventureContext={{
          title: 'Test Propu',
          hook: 'Opis przekazany bezpośrednio w propie',
        }}
      />
    );

    expect(screen.getAllByText('Opis przekazany bezpośrednio w propie')).toHaveLength(1);
    expect(screen.getByText('Zbieg tajemniczych okoliczności rzuca badaczy w samo serce śledztwa...')).toBeInTheDocument();
  });

  it('obsługuje brak jakichkolwiek tekstów (oba pola używają nastrojowych domyślnych wartości bez kolizji)', () => {
    render(
      <TTSHardLoadingScreen
        isStarting={true}
        startProgress={20}
      />
    );

    expect(screen.getByText('W cieniu zapomnianych ulic i zakurzonych archiwów kryją się sekrety...')).toBeInTheDocument();
    expect(screen.getByText('Zbieg tajemniczych okoliczności rzuca badaczy w samo serce śledztwa...')).toBeInTheDocument();
  });
});
