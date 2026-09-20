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
      paidTierBadge: 'Plan płatny (Pełny: Obraz + Głos)',
      paidTierDesc: 'Klucz API posiada aktywny biling w Google AI Studio',
      freeTierBadge: 'Plan darmowy (Tryb Tekstowy: Czysta Proza)',
      freeTierDesc: 'Darmowe konto Google AI Studio',
      keyInvalid: 'Klucz nieprawidłowy lub limit przekroczony',
      authFailed: 'Google odrzuciło klucz (kod 401: nieprawidłowy, ucięty lub unieważniony)',
      permissionDenied: 'Brak uprawnień do Gemini API w projekcie Google Cloud (kod 403)',
      quotaExceeded: 'Przekroczono limit zapytań Gemini API (kod 429)',
      networkError: 'Błąd połączenia z serwerem testowym',
      validating: 'Sprawdzanie klucza…',
      howToTitle: 'Jak uzyskać klucz?',
      cancel: 'Anuluj',
      saved: 'Zapisano!',
      saveKeys: 'Sprawdź i zapisz klucz',
    };
    return messages[key] || key;
  },
}));

// Mock api-keys-service
jest.mock('@/lib/api-keys-service', () => ({
  saveApiKeys: jest.fn(),
  getApiKeys: jest.fn(() => ({})),
  getGeminiTier: jest.fn(() => 'free'),
}));

// Mock gemini-service
jest.mock('@/lib/gemini-service', () => ({
  geminiService: {
    validateApiKey: jest.fn(),
    checkAPIStatus: jest.fn(),
  },
}));

describe('ApiKeysModal - Twarda bramka walidacji i zintegrowany zapis w 1 kliknięcie', () => {
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

  it('wyświetla precyzyjny błąd i nie zapisuje klucza gdy walidacja nie powiodła się', async () => {
    (geminiService.validateApiKey as jest.Mock).mockResolvedValue({
      valid: false,
      code: 'AUTH_FAILED',
      error: 'Nieprawidłowy klucz',
      details: 'Błąd autoryzacji Google (kod 401: ACCESS_TOKEN_TYPE_UNSUPPORTED)',
    });

    const onOpenChangeMock = jest.fn();
    render(<ApiKeysModal open={true} onOpenChange={onOpenChangeMock} />);

    const input = screen.getByLabelText(/Google Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AQ.InvalidKey' } });

    const saveButton = screen.getByRole('button', { name: /Sprawdź i zapisz klucz/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(geminiService.validateApiKey).toHaveBeenCalledWith('AQ.InvalidKey', { checkTier: true });
      expect(
        screen.getByText('Google odrzuciło klucz (kod 401: nieprawidłowy, ucięty lub unieważniony)')
      ).toBeInTheDocument();
    });

    // Szczegóły techniczne są widoczne
    expect(
      screen.getByText(/Błąd autoryzacji Google \(kod 401: ACCESS_TOKEN_TYPE_UNSUPPORTED\)/)
    ).toBeInTheDocument();

    // Klucz NIE został zapisany
    expect(apiKeysService.saveApiKeys).not.toHaveBeenCalled();
    expect(onOpenChangeMock).not.toHaveBeenCalled();

    // Przycisk pozostaje odblokowany do ponownej próby (gdy gracz poprawi lub spróbuje ponownie)
    expect(saveButton).not.toBeDisabled();
  });

  it('zapisuje klucz i zamyka modal w 1 kliknięcie gdy klucz jest poprawny', async () => {
    jest.useFakeTimers();
    (geminiService.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      tier: 'free',
      details: 'Połączenie działa poprawnie',
    });

    const onOpenChangeMock = jest.fn();
    render(<ApiKeysModal open={true} onOpenChange={onOpenChangeMock} />);

    const input = screen.getByLabelText(/Google Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AQ.ValidKey123' } });

    const saveButton = screen.getByRole('button', { name: /Sprawdź i zapisz klucz/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(geminiService.validateApiKey).toHaveBeenCalledWith('AQ.ValidKey123', { checkTier: true });
      expect(apiKeysService.saveApiKeys).toHaveBeenCalledWith({
        GEMINI_API_KEY: 'AQ.ValidKey123',
        GEMINI_TIER: 'free',
      });
      expect(screen.getByText('Plan darmowy (Tryb Tekstowy: Czysta Proza)')).toBeInTheDocument();
    });

    // W etykiecie pojawia się zielony ptaszek
    const label = screen.getByText('Google Gemini API Key').closest('label');
    expect(label?.querySelector('.text-green-500')).not.toBeNull();

    // Po 1000ms modal się zamyka
    jest.advanceTimersByTime(1000);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);

    jest.useRealTimers();
  });

  it('wykrywa plan płatny (Pay-As-You-Go) i zapisuje GEMINI_TIER = paid', async () => {
    jest.useFakeTimers();
    (geminiService.validateApiKey as jest.Mock).mockResolvedValue({
      valid: true,
      tier: 'paid',
      details: 'Połączenie i generowanie obrazów działa poprawnie',
    });

    const onOpenChangeMock = jest.fn();
    render(<ApiKeysModal open={true} onOpenChange={onOpenChangeMock} />);

    const input = screen.getByLabelText(/Google Gemini API Key/i);
    fireEvent.change(input, { target: { value: 'AQ.PaidKey777' } });

    const saveButton = screen.getByRole('button', { name: /Sprawdź i zapisz klucz/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(geminiService.validateApiKey).toHaveBeenCalledWith('AQ.PaidKey777', { checkTier: true });
      expect(apiKeysService.saveApiKeys).toHaveBeenCalledWith({
        GEMINI_API_KEY: 'AQ.PaidKey777',
        GEMINI_TIER: 'paid',
      });
      expect(screen.getByText('Plan płatny (Pełny: Obraz + Głos)')).toBeInTheDocument();
    });

    jest.advanceTimersByTime(1000);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    jest.useRealTimers();
  });

  it('blokuje przycisk gdy pole klucza jest puste', () => {
    render(<ApiKeysModal open={true} onOpenChange={jest.fn()} />);

    const saveButton = screen.getByRole('button', { name: /Sprawdź i zapisz klucz/i });
    expect(saveButton).toBeDisabled();
  });
});
