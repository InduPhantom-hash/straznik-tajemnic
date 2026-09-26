import type { Character, HotSeatConfig } from '@/lib/types';
import { findPlayerIndexForCharacter } from './session-party';

describe('Hot Seat character switch orchestration', () => {
  const charDyer: Character = { id: 'dyer', name: 'Prof. William Dyer' } as Character;
  const charMargaret: Character = { id: 'margaret', name: 'Margaret Sullivan' } as Character;
  const characters = [charDyer, charMargaret];

  let config: HotSeatConfig;
  let activeCharacter: Character;

  beforeEach(() => {
    config = {
      enabled: true,
      activePlayerIndex: 0,
      allowInterruptions: true,
      showPlayerIndicator: true,
      players: [
        {
          id: 'p1',
          name: 'Gracz 1',
          characterId: 'dyer',
          color: '#fff',
          isActive: true,
          turnCount: 0,
        },
        {
          id: 'p2',
          name: 'Gracz 2',
          characterId: 'margaret',
          color: '#000',
          isActive: false,
          turnCount: 0,
        },
      ],
    };
    activeCharacter = charDyer;
  });

  it('przełącza aktywnego gracza oraz postać po wybraniu badacza drugiego gracza', () => {
    const switchPlayer = jest.fn((index: number) => {
      config = {
        ...config,
        activePlayerIndex: index,
        players: config.players.map((p, i) => ({
          ...p,
          isActive: i === index,
        })),
      };
    });

    const setActiveCharacter = jest.fn((char: Character) => {
      activeCharacter = char;
    });

    const handleSwitchPlayer = (index: number) => {
      switchPlayer(index);
      const player = config.players[index];
      if (player) {
        const char = characters.find((c) => c.id === player.characterId);
        if (char) setActiveCharacter(char);
      }
    };

    const handleCharacterSwitch = (character: Character) => {
      if (config.enabled) {
        const playerIndex = findPlayerIndexForCharacter(config, character.id);
        if (playerIndex !== -1) {
          handleSwitchPlayer(playerIndex);
          return;
        }
      }
      setActiveCharacter(character);
    };

    // Gracz wybiera Margaret (postać Gracza 2)
    handleCharacterSwitch(charMargaret);

    expect(switchPlayer).toHaveBeenCalledWith(1);
    expect(setActiveCharacter).toHaveBeenCalledWith(charMargaret);
    expect(config.activePlayerIndex).toBe(1);
    expect(activeCharacter.id).toBe('margaret');

    // Weryfikacja HotSeat sync effect: nie powinno być niezgodności cofającej postać
    const activeHsPlayer = config.players[config.activePlayerIndex];
    expect(activeHsPlayer.characterId).toBe(activeCharacter.id);
  });

  it('w trybie Solo bez HotSeat nie próbuje przełączać gracza', () => {
    config.enabled = false;
    const handleSwitchPlayer = jest.fn();
    const setActiveCharacter = jest.fn((char: Character) => {
      activeCharacter = char;
    });

    const handleCharacterSwitch = (character: Character) => {
      if (config.enabled) {
        const playerIndex = findPlayerIndexForCharacter(config, character.id);
        if (playerIndex !== -1) {
          handleSwitchPlayer(playerIndex);
          return;
        }
      }
      setActiveCharacter(character);
    };

    handleCharacterSwitch(charMargaret);

    expect(handleSwitchPlayer).not.toHaveBeenCalled();
    expect(setActiveCharacter).toHaveBeenCalledWith(charMargaret);
  });
});
