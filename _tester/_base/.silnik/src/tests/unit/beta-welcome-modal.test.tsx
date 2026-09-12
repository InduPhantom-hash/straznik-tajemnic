import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BetaWelcomeModal, BETA_WELCOME_STORAGE_KEY } from '@/components/dialogs/BetaWelcomeModal';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      badge: 'Wersja Beta v0.9.3',
      title: 'Strażnik Tajemnic AI – Wersja Grywalna',
      subtitle: 'Raport gotowości',
      readySectionTitle: 'Moduły Gotowe do Gry (100% CoC 7e RAW)',
      readySectionDesc: 'W pełni przetestowane',
      inProgressSectionTitle: 'Moduły w Budowie (Faza Eksperymentalna)',
      inProgressSectionDesc: 'W trakcie rozbudowy',
      readyItem1Title: 'Karta Badacza CoC 7e RAW',
      readyItem1Desc: 'Pełna siatka cech',
      readyItem2Title: 'Mechanika Rzutów i Sukcesów',
      readyItem2Desc: 'Deterministyczne rzuty',
      readyItem3Title: 'Scenariusze i Handouty Strefy 11',
      readyItem3Desc: '4 autorskie scenariusze',
      readyItem4Title: 'Ekwipunek i Dziennik Badacza',
      readyItem4Desc: 'Zarządzanie przedmiotami',
      readyItem5Title: 'Czat Narracyjny i Audio TTS',
      readyItem5Desc: 'Mistrz Gry i SFX',
      inProgressItem1Title: 'Zaawansowana Walka Taktyczna',
      inProgressItem1Desc: 'Podstawowe starcia działają',
      inProgressItem2Title: 'Pościgi Wielopojazdowe',
      inProgressItem2Desc: 'Piesze aktywne',
      inProgressItem3Title: 'Zaawansowane Rytuały i Magia',
      inProgressItem3Desc: 'Księgi w ekwipunku',
      inProgressItem4Title: 'Import Własnych Scenariuszy z PDF',
      inProgressItem4Desc: 'Gotowe działają',
      dontShowAgain: 'Nie pokazuj tego okna ponownie przy uruchomieniu',
      enterGame: 'Rozumiem, przejdź do gry',
      openFeedback: 'Zgłoś uwagę lub błąd',
      betaFeedbackHint: 'Uwagi i błędy z testów przesyłaj w grze lub bezpośrednio na adres: issue@callofchtulhu.pl',
    };
    return messages[key] || key;
  },
}));

describe('BetaWelcomeModal', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('renderuje poprawnie sekcje gotowe i w budowie oraz wskazówkę e-mail', () => {
    render(<BetaWelcomeModal open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/Strażnik Tajemnic AI – Wersja Grywalna/i)).toBeInTheDocument();
    expect(screen.getByText(/Moduły Gotowe do Gry/i)).toBeInTheDocument();
    expect(screen.getByText(/Moduły w Budowie/i)).toBeInTheDocument();
    expect(screen.getByText(/Karta Badacza CoC 7e RAW/i)).toBeInTheDocument();
    expect(screen.getByText(/Scenariusze i Handouty Strefy 11/i)).toBeInTheDocument();
    expect(screen.getByText(/issue@callofchtulhu\.pl/i)).toBeInTheDocument();
  });

  it('zapisuje flagę w localStorage po zaznaczeniu dontShowAgain i kliknięciu enterGame', () => {
    const handleOpenChange = jest.fn();
    render(<BetaWelcomeModal open={true} onOpenChange={handleOpenChange} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const enterBtn = screen.getByRole('button', { name: /Rozumiem, przejdź do gry/i });
    fireEvent.click(enterBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(localStorage.getItem(BETA_WELCOME_STORAGE_KEY)).toBe('true');
  });

  it('wywołuje onOpenFeedback po kliknięciu przycisku zgłoszenia uwagi', () => {
    const handleFeedback = jest.fn();
    const handleOpenChange = jest.fn();
    render(
      <BetaWelcomeModal
        open={true}
        onOpenChange={handleOpenChange}
        onOpenFeedback={handleFeedback}
      />
    );

    const feedbackBtn = screen.getByRole('button', { name: /Zgłoś uwagę lub błąd/i });
    fireEvent.click(feedbackBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(handleFeedback).toHaveBeenCalledTimes(1);
  });
});
