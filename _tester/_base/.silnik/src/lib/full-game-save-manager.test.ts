import type { AISettings } from './ai-settings';
import type { HotSeatConfig } from './types';
import { FullGameSaveManager } from './full-game-save-manager';
import type { WorldSetupBundleV1 } from './world-setup';

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

  it('loads a v0.9.3-compatible save without worldSetup', () => {
    const save = FullGameSaveManager.createFullSave({
      name: 'Legacy compatible',
      userId: 'local',
      messages: [],
      gameSettings: { aiSettings: {} as AISettings },
      characters: [],
      campaigns: [],
      npcs: [],
      locations: [],
    });

    delete save.worldSetup;
    expect(FullGameSaveManager.decompressSave(JSON.stringify(save))?.worldSetup).toBeUndefined();
  });

  it('persists the versioned world setup canon', () => {
    const worldSetup = {
      schemaVersion: 1,
      id: 'world-1',
      scenarioId: 'scenario-1',
      adventureTitle: 'Test',
      createdAt: '2026-08-31T00:00:00.000Z',
      canonRevision: 1,
      eraContext: {
        schemaVersion: 1,
        sceneDate: null,
        effectiveYear: 2001,
        countryCode: 'PL',
        regionProfile: 'PL',
        source: 'user-selection',
        rulesVersion: '1.0.0',
      },
      eraManifestId: 'pl-2000-2005',
      adventureGraph: {},
      factions: [],
      npcs: [],
      locations: [],
      items: [],
      events: [],
      openingScene: {},
      nearestBranches: [],
      adventureContent: 'Treść testowa',
      supplementalInformation: [],
      sources: [],
      knowledgeGaps: [],
      exceptions: [],
      phaseResults: [],
    } satisfies WorldSetupBundleV1;
    const save = FullGameSaveManager.createFullSave({
      name: 'New canon',
      userId: 'local',
      messages: [],
      gameSettings: { aiSettings: {} as AISettings },
      characters: [],
      campaigns: [],
      npcs: [],
      locations: [],
      worldSetup,
    });

    const restored = FullGameSaveManager.decompressSave(JSON.stringify(save));
    expect(restored?.worldSetup).toEqual(worldSetup);
  });

  it('preserves investigatorBoard and initializes clean investigatorDossier in characters round-trip', () => {
    const boardState = {
      nodes: [
        {
          id: 'node-1',
          type: 'clue' as const,
          title: 'Tajemniczy medalion',
          description: 'Znaleziony w dokach',
          status: 'confirmed' as const,
          position: { x: 120, y: 300 },
          createdAt: '2026-09-06T00:00:00.000Z',
          tags: ['okultyzm'],
        },
      ],
      relations: [
        {
          id: 'conn-1',
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          label: 'powiązany z',
          color: '#c5a059',
        },
      ],
      viewport: { zoom: 1, panX: 0, panY: 0 },
      lastUpdated: '2026-09-06T00:00:00.000Z',
    };

    // Postać ze starym journalem i bez zainicjalizowanego dossier
    const character = {
      id: 'char-1',
      name: 'Thomas Malone',
      str: 50,
      dex: 60,
      con: 55,
      app: 45,
      pow: 70,
      edu: 75,
      siz: 65,
      int: 80,
      luck: 50,
      hp: 12,
      san: 70,
      mp: 14,
      skills: {},
      occupation: 'Detektyw',
      age: 38,
      background: 'Policja nowojorska',
      playerName: 'Kuba',
      isActive: true,
      lastUsed: new Date(),
      notes: '',
      experience: { totalXP: 0, availableXP: 0, earnedThisSession: 0, maxEarnedThisSession: 10 },
      developmentHistory: [],
      journal: [
        {
          id: 'clue-1',
          title: 'Krwawy ślad',
          content: 'Ślad krwi prowadzi ku piwnicy',
          type: 'clue' as const,
          category: 'forensic',
          timestamp: new Date(),
          tags: ['poszlaka', 'ślad'],
        },
      ],
    };

    const save = FullGameSaveManager.createFullSave({
      name: 'Dossier Roundtrip',
      userId: 'local',
      messages: [],
      gameSettings: { aiSettings: {} as AISettings },
      characters: [character as any],
      investigatorBoard: boardState,
      campaigns: [],
      npcs: [],
      locations: [],
    });

    const serialized = FullGameSaveManager.compressSave(save);
    const loaded = FullGameSaveManager.decompressSave(serialized);

    expect(loaded?.investigatorBoard).toEqual(boardState);
    expect(loaded?.characters[0].investigatorDossier).toBeDefined();
    expect(loaded?.characters[0].investigatorDossier?.clues).toHaveLength(1);
    expect(loaded?.characters[0].investigatorDossier?.clues[0].title).toBe('Krwawy ślad');
  });
});
