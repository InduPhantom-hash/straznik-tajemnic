import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  CombatDexRibbon,
  extractCombatants,
  type Combatant,
} from '@/components/combat/CombatDexRibbon';
import type { Character, Message } from '@/lib/types';
import type { PendingMeleeAttack } from '@/lib/combat/combat-resolver';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const messages: Record<string, string> = {
      title: 'STARCIE (INICJATYWA DEX)',
      round: 'Runda',
      majorWound: 'Rana Ciężka',
      dying: 'Agonia (0 HP)',
      madness: 'Atak Szaleństwa',
      activeTurn: 'Aktywna akcja',
    };
    return messages[key] || key;
  },
}));

describe('CombatDexRibbon (CoC 7e RAW Initiative Tracker)', () => {
  const mockPlayer: Character = {
    id: 'char-1',
    name: 'Edward Carnby',
    dex: 65,
    str: 50,
    con: 60,
    app: 50,
    pow: 70,
    edu: 75,
    siz: 65,
    int: 80,
    luck: 55,
    hp: 12,
    maxHp: 12,
    san: 60,
    mp: 14,
    skills: {},
    occupation: 'Detektyw',
    age: 38,
    background: 'Brak',
    playerName: 'Jakub',
    isActive: true,
    lastUsed: new Date(),
    notes: '',
    experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 0 },
    developmentHistory: [],
  };

  const sampleCombatants: Combatant[] = [
    {
      id: 'enemy-1',
      name: 'Kultysta',
      dex: 40,
      hp: 9,
      maxHp: 9,
      isPlayer: false,
    },
    {
      id: 'player-1',
      name: 'Edward Carnby',
      dex: 65,
      hp: 12,
      maxHp: 12,
      isPlayer: true,
      isActiveTurn: true,
    },
    {
      id: 'enemy-2',
      name: 'Szybki Zabójca',
      dex: 80,
      hp: 11,
      maxHp: 11,
      isPlayer: false,
    },
  ];

  it('returns null when combat is not active', () => {
    const { container } = render(
      <CombatDexRibbon combatActive={false} combatants={sampleCombatants} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders ribbon and orders combatants descending by DEX', () => {
    render(<CombatDexRibbon combatActive={true} combatants={sampleCombatants} roundNumber={1} />);

    expect(screen.getByTestId('combat-dex-ribbon')).toBeInTheDocument();
    expect(screen.getByText(/STARCIE/i)).toBeInTheDocument();
    expect(screen.getByText(/Runda 1/i)).toBeInTheDocument();

    const combatantCards = screen.getAllByTestId(/^combatant-card-/);
    expect(combatantCards).toHaveLength(3);

    // Order should be: Szybki Zabójca (80) -> Edward Carnby (65) -> Kultysta (40)
    expect(combatantCards[0]).toHaveTextContent('Szybki Zabójca');
    expect(combatantCards[0]).toHaveTextContent('DEX 80');
    expect(combatantCards[0]).toHaveTextContent('#1');

    expect(combatantCards[1]).toHaveTextContent('Edward Carnby');
    expect(combatantCards[1]).toHaveTextContent('DEX 65');
    expect(combatantCards[1]).toHaveTextContent('#2');

    expect(combatantCards[2]).toHaveTextContent('Kultysta');
    expect(combatantCards[2]).toHaveTextContent('DEX 40');
    expect(combatantCards[2]).toHaveTextContent('#3');
  });

  it('renders condition badges: major wound, dying, and bout of madness', () => {
    const woundedCombatants: Combatant[] = [
      {
        id: 'player-wounded',
        name: 'Ranny Badacz',
        dex: 55,
        isPlayer: true,
        majorWound: true,
        isDying: true,
        isBoutOfMadness: true,
      },
    ];

    render(<CombatDexRibbon combatActive={true} combatants={woundedCombatants} />);

    expect(screen.getByTitle('Rana Ciężka')).toBeInTheDocument();
    expect(screen.getByTitle('Agonia (0 HP)')).toBeInTheDocument();
    expect(screen.getByTitle('Atak Szaleństwa')).toBeInTheDocument();
  });

  it('toggles collapse and expand when toggle button is clicked', () => {
    render(<CombatDexRibbon combatActive={true} combatants={sampleCombatants} />);

    const collapseBtn = screen.getByTitle('Zwiń pasek');
    expect(screen.getByText('Szybki Zabójca')).toBeInTheDocument();

    fireEvent.click(collapseBtn);
    expect(screen.queryByText('Szybki Zabójca')).not.toBeInTheDocument();

    const expandBtn = screen.getByTitle('Rozwiń pasek');
    fireEvent.click(expandBtn);
    expect(screen.getByText('Szybki Zabójca')).toBeInTheDocument();
  });

  describe('extractCombatants helper', () => {
    it('returns inactive combat when messages do not contain combat tags', () => {
      const msgs: Message[] = [
        { id: '1', role: 'assistant', content: 'Rozglądasz się po zakurzonej bibliotece.', timestamp: new Date() },
      ];
      const result = extractCombatants(msgs, mockPlayer, []);
      expect(result.isCombatActive).toBe(false);
      expect(result.combatants).toHaveLength(0);
    });

    it('activates combat on [WALKA: START] and parses opponents from [OBRONA_WALKA:] tags', () => {
      const msgs: Message[] = [
        { id: '1', role: 'assistant', content: '[WALKA: START]\nZ cienia wybiega napastnik! [OBRONA_WALKA: Ghul | 70 | Pazury]', timestamp: new Date() },
      ];
      const result = extractCombatants(msgs, mockPlayer, []);
      expect(result.isCombatActive).toBe(true);
      expect(result.combatants.length).toBe(2);

      // Ghul DEX 70 > Edward Carnby DEX 65
      expect(result.combatants[0].name).toBe('Ghul');
      expect(result.combatants[0].dex).toBe(70);
      expect(result.combatants[1].name).toBe('Edward Carnby');
      expect(result.combatants[1].dex).toBe(65);
    });

    it('deactivates combat when [WALKA: KONIEC] follows [WALKA: START]', () => {
      const msgs: Message[] = [
        { id: '1', role: 'assistant', content: '[WALKA: START] Zaczyna się walka!', timestamp: new Date() },
        { id: '2', role: 'assistant', content: '[WALKA: KONIEC] Napastnik ucieka w mrok.', timestamp: new Date() },
      ];
      const result = extractCombatants(msgs, mockPlayer, []);
      expect(result.isCombatActive).toBe(false);
    });

    it('activates combat when pendingCombatAttack is provided even without start tag', () => {
      const pendingAttack: PendingMeleeAttack = {
        schemaVersion: 1,
        eventId: 'ev-1',
        roundId: 'r-1',
        ordinal: 1,
        intent: 'Cios nożem',
        attacker: {
          id: 'att-1',
          name: 'Skrytobójca',
          build: 1,
          hp: 10,
          maxHp: 10,
          armor: 0,
          attackSkill: 75,
          damageBonus: '0',
        },
        target: { characterId: 'char-1', name: 'Edward Carnby' },
        weapon: {
          attackOptionId: 'w-1',
          name: 'Sztylet',
          damageFormula: '1d4+db',
          damageClass: 'impaling',
        },
      };

      const result = extractCombatants([], mockPlayer, [], pendingAttack);
      expect(result.isCombatActive).toBe(true);
      expect(result.combatants).toHaveLength(2);
      expect(result.combatants[0].name).toBe('Skrytobójca');
      expect(result.combatants[0].dex).toBe(75);
      expect(result.combatants[0].isActiveTurn).toBe(true);
    });
  });
});
