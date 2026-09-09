import { render, screen, fireEvent } from '@testing-library/react';
import type { Character } from '@/lib/types';
import { SheetMagic } from '../sheet-magic';

describe('SheetMagic (Wiedza Tajemna, Tomy i Zaklęcia w Karcie Postaci)', () => {
  const baseCharacter: Character = {
    id: 'char-magic-test',
    name: 'Harvey Walters',
    str: 50,
    con: 50,
    siz: 50,
    dex: 50,
    app: 50,
    int: 75,
    pow: 60,
    edu: 80,
    age: 42,
    hp: 10,
    san: 50,
    mp: 12,
    luck: 50,
    occupation: 'Profesor',
    occupationalSkills: ['Historia'],
    skills: {
      'Mity Cthulhu': 15,
      'Łacina': 60,
    },
    playerName: 'Gracz',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    background: '',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 100 },
    developmentHistory: [],
    magic: {
      schemaVersion: 1,
      belief: 'skeptic',
      deferredSanLoss: 8,
      knownSpells: {
        'wither-limb': {
          spellId: 'wither-limb',
          learnedAt: new Date().toISOString(),
          source: 'tome',
          sourceId: 'necronomicon-latin',
          isFirstCastDone: true,
          deeperUnlocked: true,
          knownAlias: 'Pieśń Bólu',
          definitionVersion: 1,
        },
      },
      tomeStudies: {
        'necronomicon-latin': {
          tomeId: 'necronomicon-latin',
          initialReadingDone: true,
          fullStudyDone: false,
          studyCount: 0,
          completedWeeks: 0,
          cmiAwarded: 5,
          cmfAwarded: 0,
          sanLossPaid: 0,
          definitionVersion: 1,
        },
      },
    },
  };

  it('renderuje sekcję magii z tomami, zaklęciami i statusem sceptyka', () => {
    render(<SheetMagic character={baseCharacter} />);

    // Nagłówek sekcji
    expect(screen.getByText(/Wiedza Tajemna i Tomy Mitów/i)).toBeInTheDocument();

    // Status sceptyka i odłożony dług SAN
    expect(screen.getByText(/Sceptyk/i)).toBeInTheDocument();
    expect(screen.getByText(/-8 SAN/i)).toBeInTheDocument();

    // Przestudiowany tom
    expect(screen.getByText(/Necronomicon/i)).toBeInTheDocument();
    expect(screen.getByText(/✓ Przegląd/i)).toBeInTheDocument();

    // Znane zaklęcie
    expect(screen.getByText(/Pieśń Bólu/i)).toBeInTheDocument();
    expect(screen.getByText(/Uwiąd Kończyny/i)).toBeInTheDocument();
    expect(screen.getByText(/Opanowane/i)).toBeInTheDocument();
    expect(screen.getByText(/Głębsza Magia odblokowana/i)).toBeInTheDocument();
  });

  it('pozwala sceptykowi dobrowolnie przełamać sceptycyzm i uderza odłożonym długiem SAN', () => {
    const onCharacterUpdate = jest.fn();

    render(
      <SheetMagic character={baseCharacter} onCharacterUpdate={onCharacterUpdate} />
    );

    const convertBtn = screen.getByRole('button', { name: /Przełam sceptycyzm/i });
    fireEvent.click(convertBtn);

    expect(onCharacterUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        san: 35, // 50 - max(8 deferred, 15 mythos) = 50 - 15 = 35!
        magic: expect.objectContaining({
          belief: 'believer',
          deferredSanLoss: 0,
        }),
      })
    );
  });
});
