import { ensureMythosBm25Index, resetMythosBm25IndexForTests } from '@/lib/mythos/bm25';
import * as mythosServer from '@/lib/mythos/server';
import { bm25Index } from '@/lib/vector-db/bm25-index';
import { LOCAL_RAG_NAMESPACES } from '@/lib/vector-db/vector-types';

describe('Mythos BM25 Lexical Index (src/lib/mythos/bm25)', () => {
  beforeEach(() => {
    resetMythosBm25IndexForTests();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    resetMythosBm25IndexForTests();
    jest.restoreAllMocks();
  });

  it('indeksuje rekordy Mythos w BM25 dla przestrzeni MYTHOS', () => {
    jest.spyOn(mythosServer, 'loadMythosRecords').mockReturnValue([
      {
        id: 'azathoth',
        term: 'Azathoth',
        category: 'deities',
        categoryTitle: 'Outer Gods',
        shortDefinition: 'The Blind Idiot God at the center of infinity',
        fullContent: 'Azathoth is a deity in the Cthulhu Mythos...',
        tags: ['Blind Idiot God', 'Daemon Sultan'],
        sourceUrl: 'https://wiki/azathoth',
        sourceAttribution: 'Wiki',
        license: 'CC',
        isPublicDomain: true,
        modified: false,
        datasetVersion: '1.0',
      },
    ]);

    expect(bm25Index.hasNamespace(LOCAL_RAG_NAMESPACES.MYTHOS)).toBe(false);

    ensureMythosBm25Index();
    expect(bm25Index.hasNamespace(LOCAL_RAG_NAMESPACES.MYTHOS)).toBe(true);

    const searchHits = bm25Index.search('Daemon Sultan', {
      namespaces: [LOCAL_RAG_NAMESPACES.MYTHOS],
      topK: 5,
    });
    expect(searchHits.length).toBeGreaterThan(0);
    expect(searchHits[0].id).toBe('azathoth');
  });

  it('nie rzuca błędem i nie indeksuje gdy zbiór rekordów jest pusty', () => {
    jest.spyOn(mythosServer, 'loadMythosRecords').mockReturnValue([]);

    ensureMythosBm25Index();
    expect(bm25Index.hasNamespace(LOCAL_RAG_NAMESPACES.MYTHOS)).toBe(false);
  });
});
