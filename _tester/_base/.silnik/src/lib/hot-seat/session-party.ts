import type { Character, HotSeatConfig } from '@/lib/types';

/** Zwraca roster widoczny w grze, zachowując kolejność graczy Hot Seat. */
export function getSessionCharacters(
  characters: Character[],
  config: HotSeatConfig,
  sessionStarted: boolean
): Character[] {
  if (!sessionStarted || !config.enabled) return characters;
  const byId = new Map(
    characters.map((character) => [character.id, character])
  );
  return config.players
    .map((player) => byId.get(player.characterId))
    .filter((character): character is Character => !!character);
}

export function findPlayerIndexForCharacter(
  config: HotSeatConfig,
  characterId: string
): number {
  return config.players.findIndex(
    (player) => player.characterId === characterId
  );
}
