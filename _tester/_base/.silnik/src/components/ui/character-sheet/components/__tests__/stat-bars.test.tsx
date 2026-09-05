import { render, screen } from '@testing-library/react';
import type { Character } from '@/lib/types';
import { StatBars } from '../stat-bars';

describe('StatBars (falsy bug fix & CoC 7e)', () => {
  const dummyInlineEdit = {
    editingField: null,
    editValue: 0,
    setEditValue: jest.fn(),
    startEditing: jest.fn(),
    saveEditing: jest.fn(),
    cancelEditing: jest.fn(),
  };

  it('poprawnie wyświetla wartość 0 dla HP, SAN, MP i Luck bez resetowania do maksimum', () => {
    const deadOrMadCharacter: Character = {
      id: 'char-zero',
      name: 'Umierający Obłąkany',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      age: 30,
      hp: 0,
      san: 0,
      mp: 0,
      luck: 0,
      occupation: 'Włóczęga',
      skills: {},
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    render(
      <StatBars
        character={deadOrMadCharacter}
        maxHp={10}
        maxSan={99}
        maxMp={10}
        inlineEdit={dummyInlineEdit}
      />
    );

    // Przed poprawką 0 || maxHp dawało 10/10 zamiast 0/10
    expect(screen.getAllByText('0 / 10')).toHaveLength(2); // HP i MP
    expect(screen.getAllByText('0 / 99')).toHaveLength(2); // SAN i Luck
  });

  it('poprawnie renderuje skróty i etykiety stanów w języku polskim', () => {
    const normalChar: Character = {
      id: 'char-normal',
      name: 'Zdrowy',
      str: 50,
      con: 50,
      siz: 50,
      dex: 50,
      app: 50,
      int: 50,
      pow: 50,
      edu: 50,
      age: 30,
      hp: 12,
      san: 65,
      mp: 10,
      luck: 50,
      occupation: 'Lekarz',
      skills: {},
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    render(
      <StatBars
        character={normalChar}
        maxHp={12}
        maxSan={99}
        maxMp={10}
        inlineEdit={dummyInlineEdit}
      />
    );

    expect(screen.getByText('PŻ')).toBeInTheDocument();
    expect(screen.getByText('PR')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();
    expect(screen.getByText('SZC')).toBeInTheDocument();
    expect(screen.getByText('12 / 12')).toBeInTheDocument();
    expect(screen.getByText('65 / 99')).toBeInTheDocument();
  });
});
