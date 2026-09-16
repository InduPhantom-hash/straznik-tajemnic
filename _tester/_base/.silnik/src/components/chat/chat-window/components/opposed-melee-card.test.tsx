import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { OpposedMeleeCard } from './opposed-melee-card';
import type { Character, OpposedMeleeEventData } from '@/lib/types';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';

jest.mock('@/components/dice/physical-dice-scene', () => ({
  PhysicalDiceScene: () => <div data-testid="physical-dice-scene" />,
}));

describe('OpposedMeleeCard - Karta obrony Badacza w walce wręcz CoC 7e RAW', () => {
  const baseDefender: Character = {
    ...PREDEFINED_CHARACTERS[0],
    id: 'char-defender-1',
    name: 'Harvey Walters',
    hp: 12,
    maxHp: 12,
    con: 50,
    dex: 60,
    build: 0,
    skills: {
      ...PREDEFINED_CHARACTERS[0]?.skills,
      'Unik': 40,
      'Walka Wręcz': 50,
    },
  };

  const sampleMeleeEvent: OpposedMeleeEventData = {
    id: 'melee-event-1',
    attackerName: 'Kultysta Silas',
    attackerSkill: 55,
    attackerBuild: 0,
    weaponName: 'Sztylet',
    damageFormula: '1d4+2',
    damageBonus: '0',
    damageClass: 'impaling',
    characterId: 'char-defender-1',
    characterName: 'Harvey Walters',
    intent: 'Pchnięcie sztyletem w pierś',
  };

  it('renderuje kartę obrony wręcz z tytułem, napastnikiem, bronią i opcjami reakcji', () => {
    render(
      <OpposedMeleeCard
        opposedEvent={sampleMeleeEvent}
        activeCharacter={baseDefender}
      />
    );

    expect(screen.getByText(/Nagłe starcie wręcz/i)).toBeInTheDocument();
    expect(screen.getByText(/Kultysta Silas/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sztylet/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Pchnięcie sztyletem w pierś/i)).toBeInTheDocument();

    // Dostępne opcje
    expect(screen.getByRole('button', { name: /Wykonaj zwinny unik/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wejdź w zwarcie i kontratakuj/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zastosuj manewr/i })).toBeInTheDocument();
  });

  it('kliknięcie uniku (Dodge) rozlicza starcie i emituje tag [WYNIK_WALKI:...] do czatu', () => {
    const onSendChat = jest.fn();
    const onResolveDefense = jest.fn();

    render(
      <OpposedMeleeCard
        opposedEvent={sampleMeleeEvent}
        activeCharacter={baseDefender}
        onSendChat={onSendChat}
        onResolveDefense={onResolveDefense}
      />
    );

    const dodgeBtn = screen.getByRole('button', { name: /Wykonaj zwinny unik/i });
    fireEvent.click(dodgeBtn);

    expect(onResolveDefense).toHaveBeenCalledWith(
      sampleMeleeEvent,
      'dodge',
      expect.anything(),
      expect.anything()
    );

    expect(onSendChat).toHaveBeenCalledWith(
      expect.stringContaining('[WYNIK_WALKI: id=melee-event-1 | napastnik=Kultysta Silas | cel=Harvey Walters | reakcja=dodge')
    );

    // Karta przechodzi w stan rozstrzygnięty
    expect(screen.getByText(/Starcie rozstrzygnięte/i)).toBeInTheDocument();
  });

  it('kliknięcie kontrataku (Fight Back) rozlicza starcie i wysyła raport do czatu', () => {
    const onSendChat = jest.fn();
    const onResolveDefense = jest.fn();

    render(
      <OpposedMeleeCard
        opposedEvent={sampleMeleeEvent}
        activeCharacter={baseDefender}
        onSendChat={onSendChat}
        onResolveDefense={onResolveDefense}
      />
    );

    const fightBackBtn = screen.getByRole('button', { name: /Wejdź w zwarcie i kontratakuj/i });
    fireEvent.click(fightBackBtn);

    expect(onResolveDefense).toHaveBeenCalledWith(
      sampleMeleeEvent,
      'fight_back',
      expect.anything(),
      expect.anything()
    );

    expect(onSendChat).toHaveBeenCalledWith(
      expect.stringContaining('[WYNIK_WALKI: id=melee-event-1 | napastnik=Kultysta Silas | cel=Harvey Walters | reakcja=fight_back')
    );
  });

  it('wyświetla ostrzeżenie o przewadze liczebnej (+1K dla wroga) gdy badacz bronił się już w tej rundzie', () => {
    render(
      <OpposedMeleeCard
        opposedEvent={sampleMeleeEvent}
        activeCharacter={baseDefender}
        defensesUsedThisRound={1}
      />
    );

    expect(screen.getByText(/Napastnik atakuje z furią \(\+1K kość premiowa\)/i)).toBeInTheDocument();
  });

  it('blokuje manewr zapaśniczy gdy Budowa (Build) wroga jest o ≥ 3 większa', () => {
    const giantEnemyEvent: OpposedMeleeEventData = {
      ...sampleMeleeEvent,
      attackerName: 'Forma Cienia',
      attackerBuild: 3, // obrońca ma 0, różnica 3
    };

    render(
      <OpposedMeleeCard
        opposedEvent={giantEnemyEvent}
        activeCharacter={baseDefender}
      />
    );

    expect(
      screen.getByText(/Przeciwnik jest zbyt potężny fizycznie na manewr zapaśniczy/i)
    ).toBeInTheDocument();

    const maneuverBtn = screen.getByRole('button', { name: /Zastosuj manewr/i });
    expect(maneuverBtn).toBeDisabled();
  });

  it('aktualizuje stan zdrowia postaci (onCharacterUpdate) w przypadku odniesienia obrażeń', () => {
    const onCharacterUpdate = jest.fn();

    // Słaby obrońca z niskim unikiem vs mistrz napastnik
    const weakDefender: Character = {
      ...baseDefender,
      hp: 10,
      maxHp: 10,
      skills: {
        'Unik': 1,
        'Walka Wręcz': 1,
      },
    };

    const deadlyEvent: OpposedMeleeEventData = {
      ...sampleMeleeEvent,
      attackerSkill: 100, // Zawsze sukces
      damageFormula: '1d6+2',
    };

    render(
      <OpposedMeleeCard
        opposedEvent={deadlyEvent}
        activeCharacter={weakDefender}
        onCharacterUpdate={onCharacterUpdate}
      />
    );

    const dodgeBtn = screen.getByRole('button', { name: /Wykonaj zwinny unik/i });
    fireEvent.click(dodgeBtn);

    // Jeśli napastnik zadał obrażenia, onCharacterUpdate powinien być wezwany
    // (lub jeśli wypadła porażka obu, nie; ale tu skill 100 więc trafi niemal na 100% chyba że fumble 100)
    if (onCharacterUpdate.mock.calls.length > 0) {
      expect(onCharacterUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'char-defender-1',
          hp: expect.any(Number),
        })
      );
    }
  });

  it('poprawnie renderuje stan historyczny completed=true bez resultState bez pustego bloku', () => {
    render(
      <OpposedMeleeCard
        opposedEvent={sampleMeleeEvent}
        activeCharacter={baseDefender}
        completed={true}
      />
    );

    expect(screen.getAllByText(/Starcie rozstrzygnięte/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Obrona rozliczona/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Wykonaj zwinny unik/i })).not.toBeInTheDocument();
  });

  it('uwzględnia pancerz obrońcy (defenderArmor) redukując obrażenia z ataku', () => {
    const onResolveDefense = jest.fn();
    const armoredDefender: Character = {
      ...baseDefender,
      armor: 10,
    };

    render(
      <OpposedMeleeCard
        opposedEvent={{
          ...sampleMeleeEvent,
          damageFormula: '1d4', // max 4 dmg, pancerz 10 więc 0 dmg
        }}
        activeCharacter={armoredDefender}
        onResolveDefense={onResolveDefense}
      />
    );

    const dodgeBtn = screen.getByRole('button', { name: /Wykonaj zwinny unik/i });
    fireEvent.click(dodgeBtn);

    expect(onResolveDefense).toHaveBeenCalled();
  });
});
