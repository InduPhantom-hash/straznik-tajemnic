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

  it('strips deprecated empty starting Notes badawczy and Koperty na dowody while preserving readable or found documents', () => {
    const equipment = [
      { id: 'eq_notes', name: 'Notes badawczy', category: 'document', source: 'starting' },
      { id: 'eq_envelopes', name: 'Koperty na dowody', category: 'document' },
      { id: 'eq_notebook_legacy', name: 'Notatnik i ołówek', category: 'document', source: 'starting' },
      {
        id: 'eq_found_notes',
        name: 'Notes badawczy',
        category: 'document',
        source: 'found',
      },
      {
        id: 'eq_readable_notes',
        name: 'Notes badawczy',
        category: 'document',
        source: 'starting',
        readableContent: 'Tajne zapiski profesora z 1924 roku.',
      },
      { id: 'eq_press', name: 'Legitymacja prasowa', category: 'document', source: 'starting' },
    ];

    const normalized = getEquipmentItems(equipment);
    expect(normalized.map((item) => item.id)).toEqual([
      'eq_found_notes',
      'eq_readable_notes',
      'eq_press',
    ]);
  });
});
