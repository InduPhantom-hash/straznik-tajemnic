import { POST } from '../route';
import { dramatronEngine } from '@/lib/adventure-generator';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/lib/vector-db/local-vector-store', () => ({
  localVectorStore: {
    initialized: false,
  },
}));

function request(body: unknown): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

describe('POST /api/adventure/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generuje nową przygodę Dramatron i zwraca status 200', async () => {
    const res = await POST(
      request({
        theme: 'Tajemnica dworu w Providence',
        era: 'classic',
        exactYear: '1926',
        location: 'Providence',
        country: 'USA',
        forPlayer: false,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.adventure).toBeDefined();
    expect(data.dossier).toBeDefined();
    expect(data.dramatron).toBeDefined();

    // MG widzi prawdę i kotwicę prawdy
    expect(data.dossier.truthAnchor).toBeDefined();
  });

  it('generuje przygodę z maskowaniem gracza gdy forPlayer = true', async () => {
    const res = await POST(
      request({
        theme: 'Mroczne zaułki Warszawy',
        era: 'prl',
        exactYear: '1981',
        location: 'Warszawa',
        country: 'Polska',
        forPlayer: true,
      })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.dossier.truthAnchor).toBeUndefined();
    for (const npc of data.dossier.npcs) {
      expect(npc.secret).toBe('[SEKRET MG]');
    }

    // Bezpieczeństwo epistemiczne: dramatron payload i adventure context są zamaskowane
    expect(data.dramatron.clueWeb.truthAnchor.culprit).toBe('[UKRYTE]');
    expect(data.dramatron.scenes.length).toBe(0);
    expect(data.adventure.graph.npcs[0].secret).toBeUndefined();
    expect(data.adventure.graph.connections.length).toBe(0);
    expect(data.dossier.clues[0].linkedNodeIds).toEqual([]);
  });

  it('zwraca 500 w razie niespodziewanego błędu silnika', async () => {
    const spy = jest
      .spyOn(dramatronEngine, 'generateAI')
      .mockRejectedValueOnce(new Error('Krytyczny błąd generatora'));

    const res = await POST(
      request({
        theme: 'Błąd',
      })
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Krytyczny błąd generatora');

    spy.mockRestore();
  });

  it('zwraca 400 gdy ciało żądania nie jest obiektem', async () => {
    const res = await POST(request(null));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Nieprawidłowe ciało żądania (oczekiwano obiektu JSON).');
  });

  it('zwraca 400 gdy ciało żądania jest tablicą', async () => {
    const res = await POST(request([{ theme: 'infiltracja' }]));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Nieprawidłowe ciało żądania (oczekiwano obiektu JSON).');
  });

  it('sanitaryzuje nieznane wartości era i tone bez błędu', async () => {
    const res = await POST(
      request({
        era: 'nieznana_era',
        tone: 'nieznany_ton',
        theme: 'Test sanitacji',
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.dramatron).toBeDefined();
  });
});
