import { act, renderHook } from '@testing-library/react';
import type { Character, EquipmentItem } from '@/lib/types';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
import { persistCharacters } from '@/lib/character-cloud-sync';
import { useEquipmentThumbnails } from './useEquipmentThumbnails';

jest.mock('@/lib/api-keys-service', () => ({
  fetchWithApiKeys: jest.fn(),
}));

jest.mock('@/lib/character-cloud-sync', () => ({
  persistCharacters: jest.fn(),
}));

const catalogFlashlight: EquipmentItem = {
  id: 'catalog-flashlight',
  name: 'Latarka',
  category: 'tool',
  source: 'starting',
  templateId: 'light.flashlight',
  visualSource: 'catalog',
  imageUrl: '/equipment/catalog/flashlight-1920s.webp',
};

const character = {
  id: 'investigator-1',
  name: 'Janina Różycka',
  equipment: [catalogFlashlight],
} as Character;

describe('useEquipmentThumbnails', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('nie wywołuje API obrazu dla lokalnego assetu katalogowego', async () => {
    const setActiveCharacter = jest.fn();
    const setCharacters = jest.fn();
    const { result } = renderHook(() =>
      useEquipmentThumbnails({
        activeCharacter: character,
        adventureContext: null,
        imageGenerationEnabled: true,
        setActiveCharacter,
        setCharacters,
      })
    );

    await act(async () => {
      await result.current.generateThumbnailsInBackground();
    });

    expect(fetchWithApiKeys).not.toHaveBeenCalled();
    expect(setActiveCharacter).not.toHaveBeenCalled();
    expect(setCharacters).not.toHaveBeenCalled();
  });

  it('nie wywołuje API, gdy generowanie obrazów jest wyłączone', async () => {
    const storyItemCharacter = {
      ...character,
      equipment: [
        {
          id: 'found-key',
          name: 'Klucz z piwnicy',
          category: 'personal',
          source: 'found',
        },
      ],
    } as Character;
    const setActiveCharacter = jest.fn();
    const setCharacters = jest.fn();
    const { result } = renderHook(() =>
      useEquipmentThumbnails({
        activeCharacter: storyItemCharacter,
        adventureContext: null,
        imageGenerationEnabled: false,
        setActiveCharacter,
        setCharacters,
      })
    );

    await act(async () => {
      await result.current.generateThumbnailsInBackground();
    });

    expect(fetchWithApiKeys).not.toHaveBeenCalled();
    expect(setActiveCharacter).not.toHaveBeenCalled();
    expect(setCharacters).not.toHaveBeenCalled();
  });

  it('zapisuje obraz, prompt i źródło wygenerowane w obu stanach postaci', async () => {
    const storyCharacter = {
      ...character,
      equipment: [
        {
          id: 'found-key',
          name: 'Klucz z piwnicy',
          category: 'personal',
          source: 'found',
        },
      ],
    } as Character;
    let characters = [storyCharacter];
    let activeCharacter: Character | null = storyCharacter;
    const setCharacters = jest.fn((update) => {
      characters = update(characters);
    });
    const setActiveCharacter = jest.fn((update) => {
      activeCharacter = update(activeCharacter);
    });
    jest.mocked(fetchWithApiKeys).mockResolvedValue({
      ok: true,
      json: async () => ({ imageUrl: 'data:image/webp;base64,abc' }),
    } as Response);

    const { result } = renderHook(() =>
      useEquipmentThumbnails({
        activeCharacter: storyCharacter,
        adventureContext: null,
        imageGenerationEnabled: true,
        setActiveCharacter,
        setCharacters,
      })
    );

    await act(async () => {
      await result.current.generateThumbnailsInBackground();
    });

    expect(fetchWithApiKeys).toHaveBeenCalledTimes(1);
    expect(characters[0].equipment?.[0]).toMatchObject({
      imageUrl: 'data:image/webp;base64,abc',
      imagePrompt: expect.any(String),
      visualSource: 'generated',
    });
    expect(activeCharacter?.equipment?.[0]).toMatchObject({
      imageUrl: 'data:image/webp;base64,abc',
      imagePrompt: expect.any(String),
      visualSource: 'generated',
    });
    expect(persistCharacters).toHaveBeenCalledTimes(1);
  });

  it('nie uruchamia drugiej kolejki dla tej samej postaci', async () => {
    const storyCharacter = {
      ...character,
      equipment: [
        {
          id: 'found-key',
          name: 'Klucz z piwnicy',
          category: 'personal',
          source: 'found',
        },
      ],
    } as Character;
    let resolveFetch!: (response: Response) => void;
    jest.mocked(fetchWithApiKeys).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );
    const { result } = renderHook(() =>
      useEquipmentThumbnails({
        activeCharacter: storyCharacter,
        adventureContext: null,
        imageGenerationEnabled: true,
        setActiveCharacter: jest.fn(),
        setCharacters: jest.fn(),
      })
    );

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = result.current.generateThumbnailsInBackground();
      secondRun = result.current.generateThumbnailsInBackground();
    });

    expect(fetchWithApiKeys).toHaveBeenCalledTimes(1);
    resolveFetch({ ok: false } as Response);
    await act(async () => {
      await Promise.all([firstRun, secondRun]);
    });
    expect(fetchWithApiKeys).toHaveBeenCalledTimes(1);
  });

  it('zatrzymuje kolejne żądania po wyłączeniu obrazów w trakcie kolejki', async () => {
    const storyCharacter = {
      ...character,
      equipment: [
        { id: 'item-1', name: 'Klucz', category: 'personal', source: 'found' },
        { id: 'item-2', name: 'Sygnet', category: 'personal', source: 'found' },
      ],
    } as Character;
    let resolveFetch!: (response: Response) => void;
    jest.mocked(fetchWithApiKeys).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );
    const setActiveCharacter = jest.fn();
    const setCharacters = jest.fn();
    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useEquipmentThumbnails({
          activeCharacter: storyCharacter,
          adventureContext: null,
          imageGenerationEnabled: enabled,
          setActiveCharacter,
          setCharacters,
        }),
      { initialProps: { enabled: true } }
    );

    let run!: Promise<void>;
    act(() => {
      run = result.current.generateThumbnailsInBackground();
    });
    expect(fetchWithApiKeys).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    resolveFetch({ ok: false } as Response);
    await act(async () => {
      await run;
    });

    expect(fetchWithApiKeys).toHaveBeenCalledTimes(1);
  });
});
