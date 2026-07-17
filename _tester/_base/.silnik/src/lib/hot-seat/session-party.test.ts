import type { Character, HotSeatConfig } from '@/lib/types';
import {
  findPlayerIndexForCharacter,
  getSessionCharacters,
} from './session-party';

const characters = [
  { id: 'gerald', name: 'Gerald Grant' },
  { id: 'dyer', name: 'Prof. William Dyer' },
  { id: 'margaret', name: 'Margaret Sullivan' },
] as Character[];

const config: HotSeatConfig = {
  enabled: true,
  activePlayerIndex: 0,
  allowInterruptions: true,
  showPlayerIndicator: true,
  players: [
    {
      id: 'p1',
      name: 'Phantom',
      characterId: 'dyer',
      color: '#fff',
      isActive: true,
      turnCount: 0,
    },
    {
      id: 'p2',
      name: 'Aga',
      characterId: 'margaret',
      color: '#000',
      isActive: false,
      turnCount: 0,
    },
  ],
};

describe('session party', () => {
  it('pokazuje tylko dwie postacie przypisane do rozpoczętej sesji', () => {
    expect(getSessionCharacters(characters, config, true).map((c) => c.id)).toEqual([
      'dyer',
      'margaret',
    ]);
  });

  it('nie filtruje katalogu przed startem gry', () => {
    expect(getSessionCharacters(characters, config, false)).toHaveLength(3);
  });

  it('mapuje wybór postaci na właściwego gracza', () => {
    expect(findPlayerIndexForCharacter(config, 'margaret')).toBe(1);
  });
});
