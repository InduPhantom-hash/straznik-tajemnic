import { act, renderHook } from '@testing-library/react';
import { useFullSave } from './useFullSave';
import { FullGameSaveManager } from '@/lib/full-game-save-manager';
import { defaultAISettings } from '@/lib/ai-settings/defaults';
import { persistCharacters } from '@/lib/character-cloud-sync';
import type { Message } from '@/lib/types';
import { resolveEraContext } from '@/lib/era';
import type { WorldSetupBundleV1 } from '@/lib/world-setup';

jest.mock('@/lib/character-cloud-sync', () => ({
  persistCharacters: jest.fn(),
}));

describe('useFullSave - status urwanej narracji', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.alert = jest.fn();
  });

  it('odtwarza finishReason i continuationRequested podczas pełnego loadu', () => {
    const setMessages = jest.fn();
    const save = FullGameSaveManager.createFullSave({
      name: 'Partial',
      userId: 'local',
      messages: [
        {
          id: 'assistant-partial',
          role: 'assistant',
          content: 'Urwany fragment',
          timestamp: new Date('2026-08-23T12:00:00.000Z'),
          finishReason: 'MAX_TOKENS',
          continuationRequested: false,
        },
      ],
      gameSettings: { aiSettings: defaultAISettings },
      characters: [],
      campaigns: [],
      npcs: [],
      locations: [],
    });

    const { result } = renderHook(() =>
      useFullSave({
        setMessages,
        setCharacters: jest.fn(),
        setActiveCharacter: jest.fn(),
        setCampaigns: jest.fn(),
        setPdfMemory: jest.fn(),
        setActiveGameState: jest.fn(),
        setAiSettings: jest.fn(),
        stopCurrentAudio: jest.fn(),
      })
    );

    act(() => result.current.handleLoadFullSave(save));

    expect(setMessages).toHaveBeenCalledTimes(1);
    const loaded = setMessages.mock.calls[0][0] as Message[];
    expect(loaded[0]).toMatchObject({
      role: 'assistant',
      content: 'Urwany fragment',
      finishReason: 'MAX_TOKENS',
      continuationRequested: false,
    });
    expect(loaded[0].timestamp).toBeInstanceOf(Date);
    expect(persistCharacters).toHaveBeenCalledWith([]);
  });

  it('odtwarza worldSetup do kanonicznego magazynu klienta', () => {
    const worldSetup: WorldSetupBundleV1 = {
      schemaVersion: 1,
      id: 'world-save',
      scenarioId: 'scenario',
      adventureTitle: 'Przygoda',
      createdAt: '2026-09-01T10:00:00.000Z',
      canonRevision: 1,
      eraContext: resolveEraContext({
        userSelection: { year: 1973, country: 'Polska' },
      }),
      eraManifestId: 'pl-1973-1974',
      adventureGraph: {},
      factions: [],
      npcs: [],
      locations: [],
      items: [],
      events: [],
      openingScene: {},
      nearestBranches: [],
      adventureContent: 'Treść',
      supplementalInformation: [],
      sources: [],
      knowledgeGaps: [],
      exceptions: [],
      phaseResults: [],
    };
    const save = FullGameSaveManager.createFullSave({
      name: 'World',
      userId: 'local',
      messages: [],
      gameSettings: { aiSettings: defaultAISettings },
      worldSetup,
      characters: [],
      campaigns: [],
      npcs: [],
      locations: [],
    });
    const { result } = renderHook(() =>
      useFullSave({
        setMessages: jest.fn(),
        setCharacters: jest.fn(),
        setActiveCharacter: jest.fn(),
        setCampaigns: jest.fn(),
        setPdfMemory: jest.fn(),
        setActiveGameState: jest.fn(),
        setAiSettings: jest.fn(),
        stopCurrentAudio: jest.fn(),
      })
    );

    act(() => result.current.handleLoadFullSave(save));

    expect(JSON.parse(localStorage.getItem('world_setup_v1') || '{}')).toMatchObject({
      id: 'world-save',
      eraContext: { effectiveYear: 1973, countryCode: 'PL' },
    });
  });
});
