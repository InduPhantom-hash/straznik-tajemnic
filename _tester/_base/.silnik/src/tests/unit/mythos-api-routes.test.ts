import type { NextRequest } from 'next/server';
import { GET as getIndex } from '@/app/api/mythos/index/route';
import { GET as getById } from '@/app/api/mythos/[id]/route';
import { POST as postAsk } from '@/app/api/mythos/ask/route';
import * as mythosServer from '@/lib/mythos/server';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

function mockPostRequest(body: unknown, isInvalidJson = false): NextRequest {
  return {
    json: isInvalidJson
      ? () => Promise.reject(new Error('Invalid JSON'))
      : () => Promise.resolve(body),
  } as unknown as NextRequest;
}

function mockGetRequest(): NextRequest {
  return {} as NextRequest;
}

describe('Mythos API Routes (app/api/mythos/*)', () => {
  beforeEach(() => {
    mythosServer.resetMythosCacheForTests();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    mythosServer.resetMythosCacheForTests();
    jest.restoreAllMocks();
  });

  describe('GET /api/mythos/index', () => {
    it('zwraca listę wpisów, status i licznik total', async () => {
      jest.spyOn(mythosServer, 'getMythosIndex').mockReturnValue([
        {
          id: 'shoggoth',
          term: 'Shoggoth',
          category: 'creatures',
          categoryTitle: 'Creatures',
          shortDefinition: 'Amorphous protoplasmic entity',
          tags: ['Elder Thing', 'Antarctica'],
          sourceUrl: 'https://wiki/shoggoth',
          sourceAttribution: 'Wiki',
          license: 'CC',
          isPublicDomain: true,
          modified: false,
          datasetVersion: '1.0',
        },
      ]);

      const response = await getIndex();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('ready');
      expect(data.total).toBe(1);
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].id).toBe('shoggoth');
    });

    it('zwraca status empty gdy brak rekordów', async () => {
      jest.spyOn(mythosServer, 'getMythosIndex').mockReturnValue([]);

      const response = await getIndex();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('empty');
      expect(data.total).toBe(0);
      expect(data.entries).toEqual([]);
    });
  });

  describe('GET /api/mythos/[id]', () => {
    it('zwraca 200 i rekord gdy wpis istnieje', async () => {
      jest.spyOn(mythosServer, 'getMythosRecord').mockReturnValue({
        id: 'rlyeh',
        term: "R'lyeh",
        category: 'locations',
        categoryTitle: 'Locations',
        shortDefinition: 'Sunken city of Cthulhu',
        fullContent: 'Phnglui mglwnafh Cthulhu Rlyeh wgahnagl fhtagn...',
        tags: ['Pacific', 'City'],
        sourceUrl: 'https://wiki/rlyeh',
        sourceAttribution: 'Wiki',
        license: 'CC',
        isPublicDomain: true,
        modified: false,
        datasetVersion: '1.0',
      });

      const response = await getById(mockGetRequest(), {
        params: Promise.resolve({ id: 'rlyeh' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.entry.id).toBe('rlyeh');
      expect(data.entry.term).toBe("R'lyeh");
    });

    it('zwraca 404 gdy rekord nie istnieje', async () => {
      jest.spyOn(mythosServer, 'getMythosRecord').mockReturnValue(null);

      const response = await getById(mockGetRequest(), {
        params: Promise.resolve({ id: 'unknown' }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Mythos entry not found');
    });

    it('zwraca 400 gdy ID jest puste', async () => {
      const response = await getById(mockGetRequest(), {
        params: Promise.resolve({ id: '   ' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Entry ID is required');
    });
  });

  describe('POST /api/mythos/ask', () => {
    it('zwraca 200 i trafione źródła dla poprawnego zapytania', async () => {
      jest.spyOn(mythosServer, 'searchMythos').mockReturnValue([
        {
          id: 'innsmouth',
          term: 'Innsmouth',
          categoryTitle: 'Locations',
          shortDefinition: 'Decrepit fishing town in Massachusetts',
          tags: ['Town', 'Deep One'],
          sourceUrl: 'https://wiki/innsmouth',
          sourceAttribution: 'Wiki',
          license: 'CC',
          score: 2,
        },
      ]);

      const req = mockPostRequest({ query: 'Innsmouth', limit: 3 });
      const response = await postAsk(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.totalMatches).toBe(1);
      expect(data.sources).toHaveLength(1);
      expect(data.sources[0].term).toBe('Innsmouth');
      expect(data.answer).toContain('Innsmouth: Decrepit fishing town in Massachusetts');
    });

    it('zwraca 400 przy niepoprawnym JSON w żądaniu', async () => {
      const req = mockPostRequest(null, true);
      const response = await postAsk(req);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('zwraca 400 przy pustym lub zbyt długim query', async () => {
      const reqEmpty = mockPostRequest({ query: '   ' });
      const resEmpty = await postAsk(reqEmpty);
      expect(resEmpty.status).toBe(400);
      const dataEmpty = await resEmpty.json();
      expect(dataEmpty.error).toBe('Query cannot be empty');

      const reqTooLong = mockPostRequest({ query: 'x'.repeat(501) });
      const resTooLong = await postAsk(reqTooLong);
      expect(resTooLong.status).toBe(400);
      const dataTooLong = await resTooLong.json();
      expect(dataTooLong.error).toBe('Query exceeds maximum length of 500 characters');
    });
  });
});
