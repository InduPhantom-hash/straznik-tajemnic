import type { Character, HotSeatConfig } from '@/lib/types';

/** Zwraca listę postaci biorących czynny udział w sesji gry. */
export function getSessionCharacters(
  characters: Character[],
  config: HotSeatConfig,
  sessionStarted: boolean,
  activeCharacter?: Character | null
): Character[] {
  if (!sessionStarted) return characters;

  if (config.enabled) {
    const byId = new Map(
      characters.map((character) => [character.id, character])
    );
    return config.players
      .map((player) => byId.get(player.characterId))
      .filter((character): character is Character => !!character);
  }

  // W trybie Solo po starcie sesji bierze udział WYŁĄCZNIE aktywna postać gracza
  if (activeCharacter) {
    return [activeCharacter];
  }
  return characters.length > 0 ? [characters[0]] : [];
}

export function findPlayerIndexForCharacter(
  config: HotSeatConfig,
  characterId: string
): number {
  return config.players.findIndex(
    (player) => player.characterId === characterId
  );
}
