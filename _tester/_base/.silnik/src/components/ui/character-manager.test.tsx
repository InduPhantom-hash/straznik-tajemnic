import { render, screen, act } from '@testing-library/react';
import { CharacterManager } from './character-manager';
import type { Character } from '@/lib/types';

describe('CharacterManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('filtruje i ukrywa postacie z sourcePresetId, wyświetlając tylko autorskie postacie', async () => {
    const customChar: Character = {
      id: 'custom-1',
      name: 'Eustachy Kowalski',
      occupation: 'Antykwariusz',
      age: 40,
      background: 'Doświadczony badacz',
      playerName: 'Gracz 1',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      str: 50,
      dex: 50,
      con: 50,
      app: 50,
      pow: 50,
      edu: 50,
      siz: 50,
      int: 50,
      luck: 50,
      hp: 10,
      san: 50,
      mp: 10,
      skills: {},
      experience: {
        totalXP: 0,
        availableXP: 0,
        earnedThisSession: 0,
        maxEarnedThisSession: 10,
      },
      developmentHistory: [],
    };

    const presetChar: Character = {
      ...customChar,
      id: 'preset-char-1',
      name: 'Ryszard "Klucznik" Kaczmarek',
      occupation: 'Oficer SB',
      sourcePresetId: 'strefa11_klucznik',
    };

    localStorage.setItem(
      'characters',
      JSON.stringify([customChar, presetChar])
    );

    await act(async () => {
      render(
        <CharacterManager
          onClose={jest.fn()}
          onSelectCharacter={jest.fn()}
        />
      );
    });

    expect(screen.getByText('Eustachy Kowalski')).toBeInTheDocument();
    expect(screen.queryByText('Ryszard "Klucznik" Kaczmarek')).not.toBeInTheDocument();
  });
});
