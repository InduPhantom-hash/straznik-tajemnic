import fs from 'node:fs';
import path from 'node:path';
import {
  loadMythosRecords,
  getMythosIndex,
  getMythosRecord,
  searchMythos,
  resetMythosCacheForTests,
  getMythosDatasetPath,
} from '@/lib/mythos/server';
import { isMythosRecord, validateMythosAskQuery } from '@/lib/mythos/types';

describe('Mythos Library & Schema Validation (src/lib/mythos)', () => {
  beforeEach(() => {
    resetMythosCacheForTests();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    resetMythosCacheForTests();
    jest.restoreAllMocks();
  });

  describe('isMythosRecord (Schema Guard)', () => {
    it('zwraca true dla pełnego, poprawnego rekordu Mythos', () => {
      const validRecord = {
        id: 'cthulhu',
        term: 'Cthulhu',
        category: 'great_old_ones',
        categoryTitle: 'Great Old Ones',
        shortDefinition: 'High Priest of the Great Old Ones',
        fullContent: 'Cthulhu is a Great Old One created by H. P. Lovecraft...',
        tags: ['Great Old One', 'Rlyeh', 'Water'],
        sourceUrl: 'https://lovecraft.fandom.com/wiki/Cthulhu',
        sourceAttribution: 'The H.P. Lovecraft Wiki (Fandom)',
        license: 'CC-BY-SA 3.0 / 4.0',
        isPublicDomain: false,
        modified: true,
        datasetVersion: '2026-09-01',
      };

      expect(isMythosRecord(validRecord)).toBe(true);
    });

    it('zwraca false dla niepełnych lub uszkodzonych obiektów', () => {
      expect(isMythosRecord(null)).toBe(false);
      expect(isMythosRecord({})).toBe(false);
      expect(isMythosRecord('tekst')).toBe(false);
      expect(isMythosRecord({ id: 'c', term: 'Cthulhu' })).toBe(false);
      // Brak wymaganych tagów jako tablica
      expect(
        isMythosRecord({
          id: 'c',
          term: 'Cthulhu',
          category: 'cat',
          categoryTitle: 'Cat',
          shortDefinition: 'def',
          fullContent: 'content',
          tags: 'nie tablica',
          sourceUrl: 'url',
          sourceAttribution: 'attr',
          license: 'lic',
          isPublicDomain: true,
          modified: false,
          datasetVersion: 'v1',
        })
      ).toBe(false);
    });
  });

  describe('validateMythosAskQuery', () => {
    it('poprawnie waliduje właściwe zapytanie', () => {
      const res = validateMythosAskQuery({ query: 'Necronomicon', limit: 3 });
      expect(res.isValid).toBe(true);
      if (res.isValid) {
        expect(res.data.query).toBe('Necronomicon');
        expect(res.data.limit).toBe(3);
      }
    });

    it('ogranicza limit do bezpiecznych granic (1-20)', () => {
      const minRes = validateMythosAskQuery({ query: 'Azathoth', limit: -5 });
      expect(minRes.isValid).toBe(true);
      if (minRes.isValid) {
        expect(minRes.data.limit).toBe(1);
      }

      const maxRes = validateMythosAskQuery({ query: 'Azathoth', limit: 100 });
      expect(maxRes.isValid).toBe(true);
      if (maxRes.isValid) {
        expect(maxRes.data.limit).toBe(20);
      }
    });

    it('odrzuca puste zapytania lub błędny typ', () => {
      expect(validateMythosAskQuery(null).isValid).toBe(false);
      expect(validateMythosAskQuery({}).isValid).toBe(false);
      expect(validateMythosAskQuery({ query: '   ' }).isValid).toBe(false);
      expect(validateMythosAskQuery({ query: 123 }).isValid).toBe(false);
      expect(validateMythosAskQuery({ query: 'a'.repeat(600) }).isValid).toBe(false);
    });
  });

  describe('loadMythosRecords & graceful degradation', () => {
    it('zwraca pustą tablicę gdy plik datasetu nie istnieje', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const records = loadMythosRecords();
      expect(records).toEqual([]);
    });

    it('zwraca pustą tablicę gdy plik jest pusty lub uszkodzony JSON', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('');
      expect(loadMythosRecords()).toEqual([]);

      resetMythosCacheForTests();
      jest.spyOn(fs, 'readFileSync').mockReturnValue('{ broken json');
      expect(loadMythosRecords()).toEqual([]);
    });

    it('filtruje rekordy niespełniające schematu z datasetu', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockData = [
        {
          id: 'valid-1',
          term: 'Dagon',
          category: 'deity',
          categoryTitle: 'Deities',
          shortDefinition: 'Ancient fish deity',
          fullContent: 'Father Dagon is an entity...',
          tags: ['Deep One'],
          sourceUrl: 'https://wiki/dagon',
          sourceAttribution: 'Wiki',
          license: 'CC',
          isPublicDomain: false,
          modified: false,
          datasetVersion: '1.0',
        },
        { id: 'corrupt-entry-no-content' }, // uszkodzony rekord
      ];
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockData));

      const records = loadMythosRecords();
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('valid-1');
    });
  });

  describe('getMythosIndex, getMythosRecord, searchMythos', () => {
    const sampleRecords = [
      {
        id: 'necronomicon',
        term: 'Necronomicon',
        category: 'tomes',
        categoryTitle: 'Arcane Tomes',
        shortDefinition: 'Fabled grimoire by Abdul Alhazred',
        fullContent: 'Full text about the Kitab al-Azif...',
        tags: ['Alhazred', 'Magic', 'Ritual'],
        sourceUrl: 'https://wiki/necronomicon',
        sourceAttribution: 'Fandom',
        license: 'CC-BY-SA',
        isPublicDomain: true,
        modified: true,
        datasetVersion: '1.0',
      },
      {
        id: 'nyarlathotep',
        term: 'Nyarlathotep',
        category: 'outer_gods',
        categoryTitle: 'Outer Gods',
        shortDefinition: 'The Crawling Chaos and soul of the Outer Gods',
        fullContent: 'A messenger and soul of Azathoth...',
        tags: ['Crawling Chaos', 'Pharaoh', 'Avatar'],
        sourceUrl: 'https://wiki/nyarlathotep',
        sourceAttribution: 'Fandom',
        license: 'CC-BY-SA',
        isPublicDomain: true,
        modified: true,
        datasetVersion: '1.0',
      },
    ];

    beforeEach(() => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(sampleRecords));
    });

    it('getMythosIndex zwraca listę bez pola fullContent', () => {
      const index = getMythosIndex();
      expect(index).toHaveLength(2);
      expect(index[0].term).toBe('Necronomicon');
      expect(
        (index[0] as unknown as Record<string, unknown>).fullContent
      ).toBeUndefined();
    });

    it('getMythosRecord wyszukuje rekord po dokładnym ID', () => {
      const found = getMythosRecord('necronomicon');
      expect(found).not.toBeNull();
      expect(found?.term).toBe('Necronomicon');

      const notFound = getMythosRecord('non-existent-id');
      expect(notFound).toBeNull();
    });

    it('searchMythos wyszukuje po terminie, definicji i tagach', () => {
      const matches1 = searchMythos('Crawling Chaos');
      expect(matches1.length).toBeGreaterThan(0);
      expect(matches1[0].id).toBe('nyarlathotep');

      const matches2 = searchMythos('Alhazred');
      expect(matches2.length).toBeGreaterThan(0);
      expect(matches2[0].id).toBe('necronomicon');

      const noMatches = searchMythos('Cyberpunk 2077');
      expect(noMatches).toHaveLength(0);
    });
  });
});
