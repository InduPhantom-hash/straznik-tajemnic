import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BetaFeedbackModal } from '@/components/dialogs/BetaFeedbackModal';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      title: 'Zgłoś Uwagę lub Błąd',
      subtitle: 'Pomóż nam dopracować Strażnika Tajemnic AI.',
      categoryLabel: 'Kategoria zgłoszenia',
      categoryMechanics: 'Błąd mechaniki CoC 7e',
      categoryAudio: 'Dźwięk i audio',
      categoryGraphics: 'Interfejs i grafika',
      categoryNarrative: 'Mistrz Gry',
      categoryGeneral: 'Ogólna sugestia',
      descriptionLabel: 'Opis problemu',
      descriptionPlaceholder: 'Opisz krótko co się wydarzyło...',
      diagnosticsTitle: 'Dane diagnostyczne sesji (automatyczne)',
      appVersion: 'Wersja aplikacji',
      currentScenario: 'Aktualny scenariusz',
      currentEra: 'Epoka',
      character: 'Aktywny Badacz',
      messagesCount: 'Wiadomości w sesji',
      audioStatus: 'Stan audio',
      emailNotice: 'Wysyłka zgłoszeń na adres',
      copyEmail: 'Kopiuj adres',
      copiedEmail: 'Skopiowano adres!',
      sendEmailButton: 'Wyślij e-mail (issue@callofchtulhu.pl)',
      sendEmailSuccess: 'Otwarto klienta poczty e-mail!',
      sendEmailSuccessDesc: 'Wiadomość zaadresowana do {email}.',
      copySuccess: 'Raport skopiowany do schowka!',
      copyButton: 'Kopiuj raport do schowka',
      downloadButton: 'Pobierz diagnostykę (.json)',
      close: 'Zamknij',
    };
    return messages[key] || key;
  },
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  toast: (args: unknown) => mockToast(args),
}));

describe('BetaFeedbackModal', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as jest.Mock;
  });

  afterEach(() => {
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  it('renderuje formularz zgłoszenia, kategorie oraz informację o adresie e-mail issue@callofchtulhu.pl', () => {
    render(
      <BetaFeedbackModal
        open={true}
        onOpenChange={() => {}}
        scenarioTitle="Cień nad Prabutami"
        characterName="Piotr Wójcicki"
        eraLabel="PRL (1970s)"
        messageCount={14}
      />
    );

    expect(screen.getByText(/Zgłoś Uwagę lub Błąd/i)).toBeInTheDocument();
    expect(screen.getByText(/Błąd mechaniki CoC 7e/i)).toBeInTheDocument();
    expect(screen.getByText(/Dźwięk i audio/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Opisz krótko co się wydarzyło/i)).toBeInTheDocument();
    expect(screen.getAllByText(/issue@callofchtulhu\.pl/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /Wyślij e-mail \(issue@callofchtulhu\.pl\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kopiuj raport do schowka/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pobierz diagnostykę \(\.json\)/i })).toBeInTheDocument();
  });

  it('pozwala zmienić kategorię i wprowadzić opis problemu', () => {
    render(<BetaFeedbackModal open={true} onOpenChange={() => {}} />);

    const audioBtn = screen.getByRole('button', { name: /Dźwięk i audio/i });
    fireEvent.click(audioBtn);

    const textarea = screen.getByPlaceholderText(/Opisz krótko co się wydarzyło/i);
    fireEvent.change(textarea, { target: { value: 'Szum taśmy jest zbyt głośny w scenie 2' } });

    expect(textarea).toHaveValue('Szum taśmy jest zbyt głośny w scenie 2');
  });

  it('kopiuje dedykowany adres e-mail do schowka', async () => {
    render(<BetaFeedbackModal open={true} onOpenChange={() => {}} />);

    const copyEmailBtn = screen.getByRole('button', { name: /Kopiuj adres/i });
    fireEvent.click(copyEmailBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('issue@callofchtulhu.pl');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Skopiowano adres!',
        description: 'issue@callofchtulhu.pl',
      })
    );
  });

  it('obsługuje kliknięcie Wyślij e-mail: przygotowuje mailto, kopiuje raport do schowka i wywołuje toast', async () => {
    let clickedHref = '';
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clickedHref = this.href;
      });

    render(
      <BetaFeedbackModal
        open={true}
        onOpenChange={() => {}}
        scenarioTitle="Cień nad Prabutami"
        characterName="Piotr Wójcicki"
        eraLabel="PRL"
        messageCount={5}
      />
    );

    const textarea = screen.getByPlaceholderText(/Opisz krótko co się wydarzyło/i);
    fireEvent.change(textarea, { target: { value: 'Problem z rzutem na Bójkę' } });

    const sendEmailBtn = screen.getByRole('button', { name: /Wyślij e-mail \(issue@callofchtulhu\.pl\)/i });
    fireEvent.click(sendEmailBtn);

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
    });

    expect(clickedHref).toContain('mailto:issue@callofchtulhu.pl');
    expect(clickedHref).toContain('Cie%C5%84%20nad%20Prabutami');
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const copiedText = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
    expect(copiedText).toContain('Problem z rzutem na Bójkę');
    expect(copiedText).toContain('Piotr Wójcicki');

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Otwarto klienta poczty e-mail!',
      })
    );

    clickSpy.mockRestore();
  });

  it('kopiuje sformatowany raport do schowka i wywołuje toast po kliknięciu Kopiuj raport', async () => {
    render(
      <BetaFeedbackModal
        open={true}
        onOpenChange={() => {}}
        scenarioTitle="Cień nad Prabutami"
        characterName="Piotr Wójcicki"
        eraLabel="PRL"
        messageCount={5}
      />
    );

    const textarea = screen.getByPlaceholderText(/Opisz krótko co się wydarzyło/i);
    fireEvent.change(textarea, { target: { value: 'Błędny wynik testu Spostrzegawczości' } });

    const copyBtn = screen.getByRole('button', { name: /Kopiuj raport do schowka/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });

    const callArg = (navigator.clipboard.writeText as jest.Mock).mock.calls[0][0];
    expect(callArg).toContain('Błędny wynik testu Spostrzegawczości');
    expect(callArg).toContain('Cień nad Prabutami');
    expect(callArg).toContain('Piotr Wójcicki');
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Raport skopiowany do schowka!',
      })
    );
  });
});
