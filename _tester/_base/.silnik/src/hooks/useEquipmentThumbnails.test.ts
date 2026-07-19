import { act, renderHook } from '@testing-library/react';
import type { Character, EquipmentItem } from '@/lib/types';
import { fetchWithApiKeys } from '@/lib/api-keys-service';
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
  it('nie wywołuje API obrazu dla lokalnego assetu katalogowego', async () => {
    const setActiveCharacter = jest.fn();
    const setCharacters = jest.fn();
    const { result } = renderHook(() =>
      useEquipmentThumbnails({
        activeCharacter: character,
        adventureContext: null,
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
});
