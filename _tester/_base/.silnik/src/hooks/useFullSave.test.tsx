import { act, renderHook } from '@testing-library/react';
import { useFullSave } from './useFullSave';
import { FullGameSaveManager } from '@/lib/full-game-save-manager';
import { defaultAISettings } from '@/lib/ai-settings/defaults';
import { persistCharacters } from '@/lib/character-cloud-sync';
import type { Message, Character } from '@/lib/types';
import { resolveEraContext } from '@/lib/era';
import type { WorldSetupBundleV1 } from '@/lib/world-setup';
import { toast } from '@/components/ui/use-toast';

const restoredScope = { schemaVersion: 1, campaignDefinitionId: 'scenario:test',
  playthroughId: 'run-restored', adventureId: 'test', kind: 'scenario' };

jest.mock('@/lib/character-cloud-sync', () => ({
  persistCharacters: jest.fn(),
}));

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

describe('useFullSave - status urwanej narracji', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.alert = jest.fn();
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: jest.fn(() => 'restore-request') });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ scope: restoredScope }) });
  });

  it('odtwarza finishReason i continuationRequested podczas pełnego loadu', async () => {
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

    await act(async () => { await result.current.handleLoadFullSave(save); });

    expect(setMessages).toHaveBeenCalledTimes(1);
    const loaded = setMessages.mock.calls[0][0] as Message[];
    expect(loaded[0]).toMatchObject({
      id: 'assistant-partial',
      role: 'assistant',
      content: 'Urwany fragment',
      finishReason: 'MAX_TOKENS',
      continuationRequested: false,
    });
    expect(loaded[0].timestamp).toBeInstanceOf(Date);
    expect(persistCharacters).toHaveBeenCalledWith([]);
  });

  it('odtwarza worldSetup do kanonicznego magazynu klienta', async () => {
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

    await act(async () => { await result.current.handleLoadFullSave(save); });

    expect(JSON.parse(localStorage.getItem('world_setup_v1') || '{}')).toMatchObject({
      id: 'world-save',
      eraContext: { effectiveYear: 1973, countryCode: 'PL' },
    });
  });

  it('migrates characters to ensure valid investigatorDossier and triggers toast instead of alert', async () => {
    const setCharacters = jest.fn();
    const character: Partial<Character> = {
      id: 'char-legacy',
      name: 'Dr Harvey',
      journal: [
        {
          id: 'note-1',
          title: 'Notatka o rytuale',
          content: 'Zapiski w starym tomie',
          type: 'clue',
          tags: ['okultyzm'],
          isBookmarked: false,
          timestamp: new Date(),
        },
      ],
    };

    const save = FullGameSaveManager.createFullSave({
      name: 'Legacy Dossier Save',
      userId: 'local',
      messages: [],
      gameSettings: { aiSettings: defaultAISettings },
      characters: [character as Character],
      campaigns: [],
      npcs: [],
      locations: [],
    });

    const { result } = renderHook(() =>
      useFullSave({
        setMessages: jest.fn(),
        setCharacters,
        setActiveCharacter: jest.fn(),
        setCampaigns: jest.fn(),
        setPdfMemory: jest.fn(),
        setActiveGameState: jest.fn(),
        setAiSettings: jest.fn(),
        stopCurrentAudio: jest.fn(),
      })
    );

    await act(async () => { await result.current.handleLoadFullSave(save); });

    expect(setCharacters).toHaveBeenCalledTimes(1);
    const loadedChars = setCharacters.mock.calls[0][0] as Character[];
    expect(loadedChars[0].investigatorDossier).toBeDefined();
    expect(loadedChars[0].investigatorDossier?.clues).toHaveLength(1);
    expect(loadedChars[0].investigatorDossier?.clues[0].title).toBe('Notatka o rytuale');

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Wczytano: Legacy Dossier Save',
      })
    );
  });

  it('keeps existing state while restoring and after failure; retries with the same request', async () => {
    const options = { setMessages: jest.fn(), setCharacters: jest.fn(), setActiveCharacter: jest.fn(),
      setCampaigns: jest.fn(), setPdfMemory: jest.fn(), setActiveGameState: jest.fn(),
      setAiSettings: jest.fn(), stopCurrentAudio: jest.fn(), clearDeclarations: jest.fn() };
    const save = FullGameSaveManager.createFullSave({ name: 'Earlier', userId: 'local', messages: [],
      gameSettings: { aiSettings: defaultAISettings }, characters: [], campaigns: [], npcs: [], locations: [] });
    localStorage.setItem('gm_npcs', '["future"]');
    localStorage.setItem('gm_locations', '["future"]');
    let resolve!: (value: unknown) => void;
    (fetch as jest.Mock).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const { result } = renderHook(() => useFullSave(options));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.handleLoadFullSave(save); });
    expect(options.setMessages).not.toHaveBeenCalled();
    await act(async () => { resolve({ ok: false, json: async () => ({ error: 'Disk error' }) }); expect(await pending).toBe(false); });
    for (const setter of Object.values(options)) expect(setter).not.toHaveBeenCalled();
    expect(localStorage.getItem('gm_npcs')).toBe('["future"]');
    await act(async () => { expect(await result.current.handleLoadFullSave(save)).toBe(true); });
    const requests = (fetch as jest.Mock).mock.calls.map((call) => JSON.parse(call[1].body));
    expect(requests[0].requestId).toBe(requests[1].requestId);
    expect(options.setAiSettings).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 'run-restored' }));
    expect(localStorage.getItem('gm_npcs')).toBe('[]');
    expect(localStorage.getItem('gm_locations')).toBe('[]');
    expect(JSON.parse(localStorage.getItem('zew-campaign-memory-scope')!)).toEqual(restoredScope);
  });

  describe('locale auto-synchronization (Issue #490 / TASK-I18N-02)', () => {
    const baseOptions = {
      setMessages: jest.fn(),
      setCharacters: jest.fn(),
      setActiveCharacter: jest.fn(),
      setCampaigns: jest.fn(),
      setPdfMemory: jest.fn(),
      setActiveGameState: jest.fn(),
      setAiSettings: jest.fn(),
      stopCurrentAudio: jest.fn(),
    };

    it('synchronizes locale and calls router.replace when save.locale differs from currentLocale', async () => {
      const router = { replace: jest.fn() };
      const save = FullGameSaveManager.createFullSave({
        name: 'English Session',
        userId: 'local',
        locale: 'en',
        messages: [],
        gameSettings: { aiSettings: defaultAISettings },
        characters: [],
        campaigns: [],
        npcs: [],
        locations: [],
      });

      localStorage.setItem('language_selected', 'pl');

      const { result } = renderHook(() =>
        useFullSave({
          ...baseOptions,
          currentLocale: 'pl',
          router,
          pathname: '/adventures/strefa-11',
        })
      );

      await act(async () => {
        const success = await result.current.handleLoadFullSave(save);
        expect(success).toBe(true);
      });

      expect(localStorage.getItem('language_selected')).toBe('en');
      expect(router.replace).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/adventures/strefa-11', { locale: 'en' });
    });

    it('does not call router.replace when save.locale matches active currentLocale', async () => {
      const router = { replace: jest.fn() };
      const save = FullGameSaveManager.createFullSave({
        name: 'Matching Polish Session',
        userId: 'local',
        locale: 'pl',
        messages: [],
        gameSettings: { aiSettings: defaultAISettings },
        characters: [],
        campaigns: [],
        npcs: [],
        locations: [],
      });

      localStorage.setItem('language_selected', 'pl');

      const { result } = renderHook(() =>
        useFullSave({
          ...baseOptions,
          currentLocale: 'pl',
          router,
          pathname: '/',
        })
      );

      await act(async () => {
        const success = await result.current.handleLoadFullSave(save);
        expect(success).toBe(true);
      });

      expect(router.replace).not.toHaveBeenCalled();
      expect(localStorage.getItem('language_selected')).toBe('pl');
    });

    it('preserves current locale and does not call router.replace for legacy saves without locale', async () => {
      const router = { replace: jest.fn() };
      const save = FullGameSaveManager.createFullSave({
        name: 'Legacy Save',
        userId: 'local',
        messages: [],
        gameSettings: { aiSettings: defaultAISettings },
        characters: [],
        campaigns: [],
        npcs: [],
        locations: [],
      });
      delete save.locale;

      localStorage.setItem('language_selected', 'pl');

      const { result } = renderHook(() =>
        useFullSave({
          ...baseOptions,
          currentLocale: 'pl',
          router,
          pathname: '/play',
        })
      );

      await act(async () => {
        const success = await result.current.handleLoadFullSave(save);
        expect(success).toBe(true);
      });

      expect(router.replace).not.toHaveBeenCalled();
      expect(localStorage.getItem('language_selected')).toBe('pl');
    });

    it('updates localStorage safely when router is not provided in options', async () => {
      const save = FullGameSaveManager.createFullSave({
        name: 'Save without router',
        userId: 'local',
        locale: 'en',
        messages: [],
        gameSettings: { aiSettings: defaultAISettings },
        characters: [],
        campaigns: [],
        npcs: [],
        locations: [],
      });

      localStorage.setItem('language_selected', 'pl');

      const { result } = renderHook(() =>
        useFullSave({
          ...baseOptions,
          currentLocale: 'pl',
        })
      );

      await act(async () => {
        const success = await result.current.handleLoadFullSave(save);
        expect(success).toBe(true);
      });

      expect(localStorage.getItem('language_selected')).toBe('en');
    });

    it('falls back to localStorage language_selected when currentLocale option is omitted', async () => {
      const router = { replace: jest.fn() };
      const save = FullGameSaveManager.createFullSave({
        name: 'Fallback locale save',
        userId: 'local',
        locale: 'en',
        messages: [],
        gameSettings: { aiSettings: defaultAISettings },
        characters: [],
        campaigns: [],
        npcs: [],
        locations: [],
      });

      localStorage.setItem('language_selected', 'pl');

      const { result } = renderHook(() =>
        useFullSave({
          ...baseOptions,
          router,
        })
      );

      await act(async () => {
        const success = await result.current.handleLoadFullSave(save);
        expect(success).toBe(true);
      });

      expect(localStorage.getItem('language_selected')).toBe('en');
      expect(router.replace).toHaveBeenCalledWith('/', { locale: 'en' });
    });
  });
});
