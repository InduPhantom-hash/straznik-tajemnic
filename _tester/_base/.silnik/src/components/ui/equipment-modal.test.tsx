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

  it('renderuje kalkulację umiejętności bojowej z karty postaci oraz statystyki broni CoC 7e RAW (w tym DB dla broni białej)', () => {
    const character = {
      id: 'investigator-combat',
      name: 'Thomas Malone',
      damageBonus: '+1d4',
      skills: {
        'Broń Palna': 65,
        'Walka Wręcz': 50,
      },
      equipment: [
        {
          id: 'colt-1911',
          name: 'Colt M1911 .45',
          category: 'weapon',
          modifiers: {
            damage: '1d10+2',
            range: '15 yards',
            attacks: '1 (3)',
            capacity: 7,
            malfunction: 100,
          },
        },
        {
          id: 'hunting-knife',
          name: 'Nóż myśliwski',
          category: 'weapon',
          modifiers: {
            damage: '1d4+2',
          },
        },
      ],
    } as unknown as Character;

    render(
      <EquipmentModal
        open
        onOpenChange={jest.fn()}
        character={character}
        onCharacterUpdate={jest.fn()}
        era="1920s"
      />
    );

    // Broń palna: wyliczona wartość umiejętności z karty postaci
    expect(screen.getByText('Colt M1911 .45')).toBeInTheDocument();
    expect(screen.getByText('Broń Palna 65%')).toBeInTheDocument();
    expect(screen.getByText('1d10+2')).toBeInTheDocument();
    expect(screen.getByText('15 yards')).toBeInTheDocument();
    expect(screen.getByText('1 (3)')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();

    // Broń biała: Walka Wręcz 50% oraz doliczony Damage Bonus (+1d4)
    expect(screen.getByText('Nóż myśliwski')).toBeInTheDocument();
    expect(screen.getByText('Walka Wręcz 50%')).toBeInTheDocument();
    expect(screen.getByText('1d4+2 +1d4')).toBeInTheDocument();
  });

  it('wyświetla odznakę dokumentu oraz licznik wielokrotności dla wyposażenia', () => {
    const character = {
      id: 'investigator-gear',
      name: 'Harvey Walters',
      equipment: [
        {
          id: 'bandages',
          name: 'Bandaże sterylne',
          category: 'medical',
          quantity: 4,
        },
        {
          id: 'journal-leaf',
          name: 'Strona z pamiętnika cultysty',
          category: 'document',
          isReadable: true,
        },
      ],
    } as unknown as Character;

    render(
      <EquipmentModal
        open
        onOpenChange={jest.fn()}
        character={character}
        onCharacterUpdate={jest.fn()}
        era="1920s"
      />
    );

    // Przełącz na wyposażenie
    const gearTab = screen.getByRole('button', { name: /Wyposażenie/i });
    fireEvent.click(gearTab);

    expect(screen.getByText('Bandaże sterylne')).toBeInTheDocument();
    expect(screen.getByText('x4')).toBeInTheDocument();

    expect(screen.getByText('Strona z pamiętnika cultysty')).toBeInTheDocument();
    expect(screen.getByText('Dokument')).toBeInTheDocument();
  });

  it('prezentuje rejestr majątkowy Arkham First National Bank w zakładce Finanse', () => {
    const character = {
      id: 'investigator-finances',
      name: 'Francis Morgan',
      creditRating: 45,
      skills: {
        'Zamożność': 45,
      },
      equipment: [],
    } as unknown as Character;

    render(
      <EquipmentModal
        open
        onOpenChange={jest.fn()}
        character={character}
        onCharacterUpdate={jest.fn()}
        era="1920s"
      />
    );

    // Przełącz na finanse
    const financesTab = screen.getByRole('button', { name: /Finanse/i });
    fireEvent.click(financesTab);

    expect(
      screen.getByText(/Arkham First National Bank · Rejestr Majątkowy/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Bilans Finansowy: Francis Morgan/i)
    ).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText(/Wydatki do tej kwoty nie wymagają odnotowywania/i)).toBeInTheDocument();
  });

  it('nie zawiera etykiety ani sekcji "Wygląd:" w całym oknie ekwipunku', () => {
    const character = {
      id: 'investigator-no-appearance',
      name: 'Randolph Carter',
      equipment: [
        {
          id: 'gun-1',
          name: 'Pistolet kieszonkowy',
          category: 'weapon',
        },
        {
          id: 'key-1',
          name: 'Srebrny klucz',
          category: 'personal',
        },
      ],
    } as unknown as Character;

    const { container } = render(
      <EquipmentModal
        open
        onOpenChange={jest.fn()}
        character={character}
        onCharacterUpdate={jest.fn()}
        era="1920s"
      />
    );

    expect(container.textContent).not.toMatch(/wygląd:/i);
    expect(container.textContent).not.toMatch(/appearance/i);
  });
});
