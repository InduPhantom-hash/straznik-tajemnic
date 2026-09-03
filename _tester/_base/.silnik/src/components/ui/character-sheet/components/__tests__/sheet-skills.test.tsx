import { render, screen } from '@testing-library/react';
import type { Character } from '@/lib/types';
import { SheetSkills } from '../sheet-skills';

describe('SheetSkills (progi 1/2 i 1/5 oraz oznaczenia do rozwoju)', () => {
  it('renderuje umiejętności z progami (1/2 i 1/5) oraz wskaźnikami zawodowej i rozwoju', () => {
    const character: Character = {
      id: 'char-skills-test',
      name: 'Badacz',
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
      occupation: 'Detektyw',
      occupationalSkills: ['Spostrzegawczość'],
      skills: {
        'Spostrzegawczość': {
          value: 60,
          markedForImprovement: true,
        },
        'Nasłuchiwanie': 45,
        'Mity Cthulhu': 15,
      },
      playerName: 'Gracz',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      background: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
      developmentHistory: [],
    };

    render(<SheetSkills character={character} />);

    // Wartości bazowe
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();

    // Progi 1/2 i 1/5:
    // 60 -> (30/12)
    expect(screen.getByText('(30/12)')).toBeInTheDocument();
    // 45 -> (22/9)
    expect(screen.getByText('(22/9)')).toBeInTheDocument();
    // 15 -> (7/3)
    expect(screen.getByText('(7/3)')).toBeInTheDocument();

    // Umiejętność zawodowa (★)
    expect(screen.getByText('★')).toBeInTheDocument();

    // Oznaczona do rozwoju (✓)
    expect(screen.getByText('✓')).toBeInTheDocument();
  });
});
