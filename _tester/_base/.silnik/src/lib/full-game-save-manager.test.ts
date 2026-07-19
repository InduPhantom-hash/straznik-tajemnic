import type { AISettings } from './ai-settings';
import type { HotSeatConfig } from './types';
import { FullGameSaveManager } from './full-game-save-manager';

describe('FullGameSaveManager duet persistence', () => {
  it('keeps explicit player-to-character assignments in the save payload', () => {
    const hotSeatConfig: HotSeatConfig = {
      enabled: true,
      activePlayerIndex: 0,
      allowInterruptions: true,
      showPlayerIndicator: true,
      players: [
        {
          id: 'player-1',
          name: 'Aga',
          color: '#4ade80',
          characterId: 'character-1',
          isActive: true,
          turnCount: 0,
        },
        {
          id: 'player-2',
          name: 'Bartek',
          color: '#f472b6',
          characterId: 'character-2',
          isActive: false,
          turnCount: 0,
        },
      ],
    };

    const save = FullGameSaveManager.createFullSave({
      name: 'Duet',
      userId: 'local',
      messages: [],
      gameSettings: { aiSettings: {} as AISettings },
      characters: [],
      hotSeatConfig,
      campaigns: [],
      npcs: [],
      locations: [],
    });

    expect(save.hotSeatConfig).toEqual(hotSeatConfig);
  });

  it('keeps the equipment visual era required for catalog migration', () => {
    const save = FullGameSaveManager.createFullSave({
      name: 'PRL',
      userId: 'local',
      messages: [],
      gameSettings: { aiSettings: {} as AISettings },
      equipmentVisualEra: 'prl-1970s',
      characters: [],
      campaigns: [],
      npcs: [],
      locations: [],
    });

    const restored = FullGameSaveManager.decompressSave(
      FullGameSaveManager.compressSave(save)
    );

    expect(restored?.equipmentVisualEra).toBe('prl-1970s');
  });
});
