import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Character } from '@/lib/types';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { EquipmentModal } from './equipment-modal';

jest.mock('@/lib/api-keys-service', () => ({
  fetchWithApiKeys: jest.fn(),
}));

describe('EquipmentModal catalog images', () => {
  it('does not expose AI regeneration for a catalog asset', () => {
    const character = {
      id: 'investigator-1',
      name: 'Janina Różycka',
      equipment: [
        {
          id: 'revolver-1',
          templateId: 'weapon.revolver-38',
          name: 'Rewolwer .38',
          category: 'weapon',
          visualSource: 'catalog',
          imageUrl: '/equipment/catalog/revolver-1940s.webp',
        },
      ],
    } as Character;

    render(
      <EquipmentModal
        open
        onOpenChange={jest.fn()}
        character={character}
        onCharacterUpdate={jest.fn()}
        era="1946"
      />
    );

    expect(screen.getByAltText('Rewolwer .38')).toBeInTheDocument();
    expect(
      screen.queryByTitle('Wygeneruj nową ilustrację AI przedmiotu')
    ).not.toBeInTheDocument();
    expect(fetchWithApiKeys).not.toHaveBeenCalled();
  });

  it('obsługuje błąd generowania AI banerem Art Déco bez window.alert i pozwala go zamknąć', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    (fetchWithApiKeys as jest.Mock).mockRejectedValueOnce(new Error('API failure'));

    const character = {
      id: 'investigator-2',
      name: 'Witold Modzelewski',
      equipment: [
        {
          id: 'custom-tool-1',
          name: 'Nietypowy miernik',
          category: 'tool',
          source: 'starting',
        },
      ],
    } as Character;

    render(
      <EquipmentModal
        open
        onOpenChange={jest.fn()}
        character={character}
        onCharacterUpdate={jest.fn()}
        era="1920s"
      />
    );

    // Przełącz na zakładkę wyposażenia
    const gearTab = screen.getByRole('button', { name: /Wyposażenie/i });
    fireEvent.click(gearTab);

    // Przycisk generowania miniatury
    const generateBtn = screen.getByTitle('Wygeneruj ilustrację AI przedmiotu');
    expect(generateBtn).toBeInTheDocument();

    fireEvent.click(generateBtn);

    // Sprawdzenie: brak window.alert, obecny baner błędu
    expect(alertSpy).not.toHaveBeenCalled();
    const errorBanner = await screen.findByTestId('equipment-generate-error');
    expect(errorBanner).toBeInTheDocument();

    // Zamknięcie banera
    const closeBtn = screen.getByTitle('Zamknij');
    fireEvent.click(closeBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('equipment-generate-error')).not.toBeInTheDocument();
    });

    alertSpy.mockRestore();
  });

  it('wyświetla nastrojowy opis lore na kafelkach wyposażenia i broni nawet bez podanego description', () => {
    const character = {
      id: 'investigator-3',
      name: 'Arthur Pendelton',
      equipment: [
        {
          id: 'revolver-bare',
          name: 'Rewolwer .38',
          category: 'weapon',
          modifiers: { damage: '1d10' },
        },
        {
          id: 'lantern-bare',
          name: 'Lampa naftowa',
          category: 'tool',
        },
      ],
    } as Character;

    render(
      <EquipmentModal
        open
        onOpenChange={jest.fn()}
        character={character}
        onCharacterUpdate={jest.fn()}
        era="1920s"
      />
    );

    // Karta broni (domyślnie aktywna zakładka broń)
    expect(screen.getByText('Rewolwer .38')).toBeInTheDocument();
    expect(
      screen.getByText(/Starannie utrzymana broń, regularnie czyszczona i oliwiona/i)
    ).toBeInTheDocument();

    // Przełącz na wyposażenie
    const gearTab = screen.getByRole('button', { name: /Wyposażenie/i });
    fireEvent.click(gearTab);

    expect(screen.getByText('Lampa naftowa')).toBeInTheDocument();
    expect(
      screen.getByText(/Niezawodne źródło światła w ciemnościach/i)
    ).toBeInTheDocument();
  });
});
