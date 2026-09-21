import type { Character, HotSeatPlayer } from '@/lib/types';
import type { SkillTestData } from '@/lib/parsers/types';
import {
  composeTurnFromDeclarations,
  isTurnReady,
  resolveSkillTestValues,
  swapDeclarations,
} from './useChat';

const players: HotSeatPlayer[] = [
  {
    id: 'p1',
    name: 'Aga',
    characterId: 'margaret',
    color: '#fff',
    isActive: true,
    turnCount: 0,
  },
  {
    id: 'p2',
    name: 'Phantom',
    characterId: 'dyer',
    color: '#000',
    isActive: false,
    turnCount: 0,
  },
];

const makeCharacter = (
  id: string,
  name: string,
  skillValue: number
): Character =>
  ({
    id,
    name,
    skills: { Spostrzegawczość: skillValue },
  }) as unknown as Character;

describe('duet turn helpers', () => {
  const declarations = [
    {
      playerId: 'p1',
      playerName: 'Aga',
      characterName: 'Margaret Sullivan',
      text: 'Nasłuchuję',
    },
    {
      playerId: 'p2',
      playerName: 'Phantom',
      characterName: 'Prof. William Dyer',
      text: 'Rozglądam się',
    },
  ];

  it('nie pozwala wysłać niepełnej tury', () => {
    expect(isTurnReady(declarations.slice(0, 1), players)).toBe(false);
    expect(isTurnReady(declarations, players)).toBe(true);
  });

  it('składa obie podpisane deklaracje w jedną wiadomość', () => {
    expect(composeTurnFromDeclarations(declarations)).toContain(
      'Aga (@Margaret Sullivan): Nasłuchuję'
    );
    expect(composeTurnFromDeclarations(declarations)).toContain(
      'Phantom (@Prof. William Dyer): Rozglądam się'
    );
  });

  it('odwraca role i przypisanie kwestii między badaczami ("Odwróć role")', () => {
    const characters = [
      makeCharacter('margaret', 'Margaret Sullivan', 60),
      makeCharacter('dyer', 'Prof. William Dyer', 45),
    ];
    const swapped = swapDeclarations(declarations, players, characters);
    expect(swapped).toHaveLength(2);
    // Badacz 1 (Aga) ma teraz tekst Badacza 2 (Rozglądam się)
    const p1Declaration = swapped.find((d) => d.playerId === 'p1');
    expect(p1Declaration?.text).toBe('Rozglądam się');
    expect(p1Declaration?.characterName).toBe('Margaret Sullivan');

    // Badacz 2 (Phantom) ma teraz tekst Badacza 1 (Nasłuchuję)
    const p2Declaration = swapped.find((d) => d.playerId === 'p2');
    expect(p2Declaration?.text).toBe('Nasłuchuję');
    expect(p2Declaration?.characterName).toBe('Prof. William Dyer');
  });

  it('zachowuje tożsamość postaci badaczy gdy tablica characters jest pusta lub pominięta', () => {
    const swapped = swapDeclarations(declarations, players, []);
    expect(swapped).toHaveLength(2);
    const p1Declaration = swapped.find((d) => d.playerId === 'p1');
    const p2Declaration = swapped.find((d) => d.playerId === 'p2');

    // Aga (p1) zachowuje postać Margaret Sullivan, dostaje tekst Rozglądam się
    expect(p1Declaration?.playerName).toBe('Aga');
    expect(p1Declaration?.characterName).toBe('Margaret Sullivan');
    expect(p1Declaration?.text).toBe('Rozglądam się');

    // Phantom (p2) zachowuje postać Prof. William Dyer, dostaje tekst Nasłuchuję
    expect(p2Declaration?.playerName).toBe('Phantom');
    expect(p2Declaration?.characterName).toBe('Prof. William Dyer');
    expect(p2Declaration?.text).toBe('Nasłuchuję');
  });

  it('dwukrotne odwrócenie ról przywraca stan pierwotny', () => {
    const round1 = swapDeclarations(declarations, players);
    const round2 = swapDeclarations(round1, players);

    expect(round2.find((d) => d.playerId === 'p1')?.text).toBe('Nasłuchuję');
    expect(round2.find((d) => d.playerId === 'p1')?.characterName).toBe('Margaret Sullivan');
    expect(round2.find((d) => d.playerId === 'p2')?.text).toBe('Rozglądam się');
    expect(round2.find((d) => d.playerId === 'p2')?.characterName).toBe('Prof. William Dyer');
  });
});

describe('resolveSkillTestValues - duet', () => {
  it('pobiera wartość umiejętności z karty adresata', () => {
    const margaret = makeCharacter('margaret', 'Margaret Sullivan', 60);
    const dyer = makeCharacter('dyer', 'Prof. William Dyer', 45);
    const tests: SkillTestData[] = [
      {
        id: 't1',
        skillName: 'Spostrzegawczość',
        skillValue: 0,
        difficulty: 'zwykly',
        modifiers: [],
        justification: 'Test Margaret',
        characterName: 'Margaret Sullivan',
      },
      {
        id: 't2',
        skillName: 'Spostrzegawczość',
        skillValue: 0,
        difficulty: 'zwykly',
        modifiers: [],
        justification: 'Test Dyera',
        characterName: 'Prof. William Dyer',
      },
    ];

    const resolved = resolveSkillTestValues(tests, margaret, [margaret, dyer]);

    expect(resolved[0]).toMatchObject({
      characterId: 'margaret',
      skillValue: 60,
    });
    expect(resolved[1]).toMatchObject({
      characterId: 'dyer',
      skillValue: 45,
    });
  });
});
