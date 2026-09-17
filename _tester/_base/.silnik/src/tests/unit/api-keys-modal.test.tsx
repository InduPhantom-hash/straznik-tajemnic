import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApiKeysModal } from '@/components/dialogs/ApiKeysModal';
import * as apiKeysService from '@/lib/api-keys-service';
import { geminiService } from '@/lib/gemini-service';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const messages: Record<string, string> = {
      title: 'Konfiguracja kluczy API',
      description: 'Wklej swój klucz Google Gemini',
      securityLabel: 'Bezpieczeństwo:',
      securityDescription: 'Klucze są w localStorage',
      requiredBadge: 'Wymagany',
      inputPlaceholder: `Wprowadź ${params?.label || ''}...`,
      geminiHint: 'Twój klucz z Google AI Studio',
      checking: 'Sprawdzam…',
      checkKey: 'Sprawdź klucz',
      keyWorks: 'Klucz działa',
      keyInvalid: 'Klucz nieprawidłowy lub limit przekroczony',
      authFailed: 'Google odrzuciło klucz (kod 401: nieprawidłowy, ucięty lub unieważniony)',
      permissionDenied: 'Brak uprawnień do Gemini API w projekcie Google Cloud (kod 403)',
      quotaExceeded: 'Przekroczono limit zapytań Gemini API (kod 429)',
      networkError: 'Błąd połączenia z serwerem testowym',
      validating: 'Sprawdzanie klucza…',
      howToTitle: 'Jak uzyskać klucz?',
      cancel: 'Anuluj',
      saved: 'Zapisano!',
      saveKeys: 'Zapisz klucze',
    };
    return messages[key] || key;
  },
}));

// Mock api-keys-service
jest.mock('@/lib/api-keys-service', () => ({
  saveApiKeys: jest.fn(),
  getApiKeys: jest.fn(() => ({})),
}));

// Mock gemini-service
jest.mock('@/lib/gemini-service', () => ({
  geminiService: {
    validateApiKey: jest.fn(),
    checkAPIStatus: jest.fn(),
  },
}));

describe('ApiKeysModal - Twarda bramka walidacji i blokada zapisu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiKeysService.getApiKeys as jest.Mock).mockReturnValue({});
  });

  it('nie wyświetla zielonego ptaszka sukcesu po samym wpisaniu tekstu przed sprawdzeniem', () => {
    render(<ApiKeysModal open={true} onOpenChange={jest.fn()} />);

    const input = screen.getByLabelText(/Google Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AQ.TestKey123' } });

    // W etykiecie nie ma zielonego ptaszka ani ikony błędu w stanie idle
    const label = screen.getByText('Google Gemini API Key').closest('label');
    expect(label?.querySelector('.text-green-500')).toBeNull();
  });

  it('blokuje przycisk zapisu i wyświetla precyzyjny błąd gdy walidacja klucza nie powiodła się (invalid)', async () => {
    (geminiService.validateApiKey as jest.Mock).mockResolvedValue({
      valid: false,
      code: 'AUTH_FAILED',
      error: 'Nieprawidłowy klucz',
      details: 'Błąd autoryzacji Google (kod 401: ACCESS_TOKEN_TYPE_UNSUPPORTED)',
    });

    render(<ApiKeysModal open={true} onOpenChange={jest.fn()} />);

    const input = screen.getByLabelText(/Google Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AQ.InvalidKey' } });

    const checkButton = screen.getByText('Sprawdź klucz');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(
        screen.getByText('Google odrzuciło klucz (kod 401: nieprawidłowy, ucięty lub unieważniony)')
      ).toBeInTheDocument();
    });

    // Szczegóły techniczne są widoczne
    expect(
      screen.getByText(/Błąd autoryzacji Google \(kod 401: ACCESS_TOKEN_TYPE_UNSUPPORTED\)/)
    ).toBeInTheDocument();

    // Przycisk "Zapisz klucze" jest zablokowany
    const saveButton = screen.getByRole('button', { name: /Zapisz klucze/i });
    expect(saveButton).toBeDisabled();
  });

  it('odblokowuje przycisk zapisu i wyświetla zielony ptaszek po udanej walidacji (valid)', async () => {
    (geminiService.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      details: 'Połączenie działa poprawnie',
    });

    render(<ApiKeysModal open={true} onOpenChange={jest.fn()} />);

    const input = screen.getByLabelText(/Google Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AQ.ValidKey123' } });

    const checkButton = screen.getByText('Sprawdź klucz');
    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(screen.getByText('Klucz działa')).toBeInTheDocument();
    });

    // W etykiecie pojawia się zielony ptaszek
    const label = screen.getByText('Google Gemini API Key').closest('label');
    expect(label?.querySelector('.text-green-500')).not.toBeNull();

    // Przycisk zapisu jest aktywny
    const saveButton = screen.getByRole('button', { name: /Zapisz klucze/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('automatycznie uruchamia test klucza przy próbie zapisu w stanie idle i blokuje zapis przy błędzie', async () => {
    (geminiService.validateApiKey as jest.Mock).mockResolvedValue({
      valid: false,
      code: 'AUTH_FAILED',
      error: 'Nieprawidłowy klucz',
      details: 'Klucz odrzucony',
    });

    const onOpenChangeMock = jest.fn();
    render(<ApiKeysModal open={true} onOpenChange={onOpenChangeMock} />);

    const input = screen.getByLabelText(/Google Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AQ.UncheckedKey' } });

    const saveButton = screen.getByRole('button', { name: /Zapisz klucze/i });
    fireEvent.click(saveButton);

    // Następuje automatyczna walidacja
    await waitFor(() => {
      expect(geminiService.validateApiKey).toHaveBeenCalledWith('AQ.UncheckedKey');
    });

    // Zapis nie został wywołany do apiKeysService
    expect(apiKeysService.saveApiKeys).not.toHaveBeenCalled();
    expect(onOpenChangeMock).not.toHaveBeenCalled();

    // Wyświetlony błąd i zablokowany przycisk
    await waitFor(() => {
      expect(
        screen.getByText('Google odrzuciło klucz (kod 401: nieprawidłowy, ucięty lub unieważniony)')
      ).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  it('zapisuje klucz i zamyka modal gdy automatyczna walidacja przy zapisie zakończy się sukcesem', async () => {
    jest.useFakeTimers();
    (geminiService.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      details: 'OK',
    });

    const onOpenChangeMock = jest.fn();
    render(<ApiKeysModal open={true} onOpenChange={onOpenChangeMock} />);

    const input = screen.getByLabelText(/Google Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AQ.GoodKey' } });

    const saveButton = screen.getByRole('button', { name: /Zapisz klucze/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(geminiService.validateApiKey).toHaveBeenCalledWith('AQ.GoodKey');
      expect(apiKeysService.saveApiKeys).toHaveBeenCalledWith({ GEMINI_API_KEY: 'AQ.GoodKey' });
    });

    // Po 1000ms modal się zamyka
    jest.advanceTimersByTime(1000);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);

    jest.useRealTimers();
  });
});
