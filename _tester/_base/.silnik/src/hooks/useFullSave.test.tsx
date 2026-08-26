import { act, renderHook } from '@testing-library/react';
import { useFullSave } from './useFullSave';
import { FullGameSaveManager } from '@/lib/full-game-save-manager';
import { defaultAISettings } from '@/lib/ai-settings/defaults';
import { persistCharacters } from '@/lib/character-cloud-sync';
import type { Message } from '@/lib/types';

jest.mock('@/lib/character-cloud-sync', () => ({
  persistCharacters: jest.fn(),
}));

describe('useFullSave - status urwanej narracji', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
