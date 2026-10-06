import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { DesktopUpdateModal } from './desktop-update-modal';
import { DesktopUpdateNotifier } from './desktop-update-notifier';
import * as updateClient from '@/lib/desktop/update-client';

jest.mock('@/lib/desktop/update-client');

describe('DesktopUpdateModal & DesktopUpdateNotifier Dark Art Deco', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockUpdate: updateClient.UpdateCheckView = {
    available: true,
    configured: true,
    currentVersion: '0.9.5',
    currentCommitSha: 'aaaaaaa',
    canSelfUpdate: true,
    commitsBehind: 4,
    manifest: {
      version: '0.9.6',
      commitSha: 'bbbbbbb',
      releaseNotes: 'https://github.com/releases/0.9.6',
    },
  };

  it('renderuje modal z Okiem Art Deco i przełącza fazę na pobieranie po kliknięciu Aktualizuj', async () => {
    (updateClient.startDesktopUpdate as jest.Mock).mockResolvedValueOnce(undefined);

    const onOpenChange = jest.fn();
    const onDismissLater = jest.fn();

    render(
      <DesktopUpdateModal
        open={true}
        onOpenChange={onOpenChange}
        update={mockUpdate}
        onDismissLater={onDismissLater}
      />
    );

    // Weryfikacja obecności Oka Art Deco i nagłówka
    expect(screen.getByRole('img', { name: /symbol oka strażnika tajemnic/i })).toBeInTheDocument();
    expect(screen.getByText(/Nowa Depesza i Ulepszenia/i)).toBeInTheDocument();

    // Kliknięcie Aktualizuj teraz
    const updateBtn = screen.getByRole('button', { name: /Aktualizuj teraz/i });
    fireEvent.click(updateBtn);

    // Sprawdzenie fazy przygotowania / pobierania
    await waitFor(() => {
      expect(screen.getByText(/Przygotowywanie aparatury…/i)).toBeInTheDocument();
    });
    expect(updateClient.startDesktopUpdate).toHaveBeenCalledTimes(1);
  });

  it('DesktopUpdateNotifier wyświetla dyskretny toast z okiem i pozwala otworzyć modal', async () => {
    (updateClient.checkDesktopUpdate as jest.Mock).mockResolvedValue(mockUpdate);
    (updateClient.getDesktopUpdateStatus as jest.Mock).mockResolvedValue({
      id: 'none',
      state: 'idle',
      updatedAt: new Date().toISOString(),
    });

    render(<DesktopUpdateNotifier />);

    // Przewijamy timer 4000ms
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('desktop-update-notification')).toBeInTheDocument();
    });

    // Powinien mieć małe Oko Art Deco i przycisk Szczegóły
    const detailsBtn = screen.getByRole('button', { name: /Szczegóły/i });
    expect(detailsBtn).toBeInTheDocument();

    fireEvent.click(detailsBtn);

    // Po kliknięciu pojawia się modal
    await waitFor(() => {
      expect(screen.getByTestId('desktop-update-modal')).toBeInTheDocument();
    });
  });
});
