import { render, screen } from '@testing-library/react';
import type { Character } from '@/lib/types';
import { SheetEquipment } from '../sheet-equipment';

describe('SheetEquipment lore and descriptions', () => {
  it('renders atmospheric lore for both weapons and general gear when description is missing', () => {
    const character: Character = {
      id: 'char-eq-test',
      name: 'Arthur Pendelton',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      age: 30,
      hp: 10,
      san: 50,
      mp: 10,
      luck: 50,
      occupation: 'Dziennikarz',
      skills: {
        'Broń Palna': 50,
      },
      equipment: [
        {
          id: 'w-1',
          name: 'Rewolwer .38',
          category: 'weapon',
          modifiers: { damage: '1d10', range: '15 yards' },
        },
        {
          id: 'g-1',
          name: 'Lampa naftowa',
          category: 'tool',
        },
      ],
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    render(<SheetEquipment character={character} />);

    // Broń
    expect(screen.getByText('Rewolwer .38')).toBeInTheDocument();
    expect(
      screen.getByText(/Starannie utrzymana broń, regularnie czyszczona i oliwiona/i)
    ).toBeInTheDocument();

    // Wyposażenie ogólne
    expect(screen.getByText('Lampa naftowa')).toBeInTheDocument();
    expect(
      screen.getByText(/Niezawodne źródło światła w ciemnościach/i)
    ).toBeInTheDocument();
  });
});
