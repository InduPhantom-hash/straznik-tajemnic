import {
  getEquipmentItems,
  normalizeStoredCharacters,
} from './character-storage-normalizer';

describe('normalizeStoredCharacters', () => {
  it('replaces malformed equipment without discarding the character', () => {
    const [character] = normalizeStoredCharacters([
      { id: 'investigator-1', name: 'Ada', equipment: { legacy: true } },
    ]);

    expect(character).toMatchObject({ id: 'investigator-1', name: 'Ada' });
    expect(character.equipment).toEqual([]);
  });

  it('keeps a valid equipment array intact', () => {
    const equipment = [{ id: 'lamp', name: 'Lamp', category: 'tool' }];

    expect(normalizeStoredCharacters([{ id: 'investigator-1', equipment }])[0].equipment)
      .toEqual(equipment);
  });

  it('returns an empty list for a translation dictionary', () => {
    expect(getEquipmentItems({ eq_lamp: { name: 'Lamp' } })).toEqual([]);
  });
});
