import { POST } from './route';
import { DEFAULT_TRANSCRIBE_MODEL } from '@/lib/audio/transcription';
import { GoogleGenAI } from '@google/genai';
import type { NextRequest } from 'next/server';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

function mockFormDataRequest(
  formData: FormData | null,
  apiKeyHeader?: string,
  modelHeader?: string
): NextRequest {
  const headersMap = new Map<string, string>();
  if (apiKeyHeader) {
    headersMap.set('x-gemini-api-key', apiKeyHeader);
  }
  if (modelHeader) {
    headersMap.set('x-transcribe-model', modelHeader);
  }

  return {
    headers: {
      get: (name: string) => headersMap.get(name.toLowerCase()) || null,
    },
    formData: async () => {
      if (!formData) throw new Error('Invalid form data');
      return formData;
    },
  } as unknown as NextRequest;
}

describe('POST /api/transcribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  it('zwraca 401 przy braku klucza API Gemini', async () => {
    const fd = new FormData();
    fd.append('audio', new Blob(['fake audio'], { type: 'audio/webm' }));
    const req = mockFormDataRequest(fd);

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.code).toBe('BYOK_KEY_MISSING');
  });

  it('zwraca 400 przy braku pliku audio w żądaniu', async () => {
    const fd = new FormData();
    const req = mockFormDataRequest(fd, 'test-api-key');

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Brak pliku audio');
  });

  it('zwraca poprawną transkrypcję solo z domyślnym modelem gemini-3.5-transcribe', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        text: 'Podchodzę ostrożnie do biurka i szukam klucza do piwnicy.',
        segments: [
          {
            speaker: 'Speaker 1',
            text: 'Podchodzę ostrożnie do biurka i szukam klucza do piwnicy.',
          },
        ],
      }),
    });

    const fd = new FormData();
    fd.append('audio', new Blob(['fake audio content'], { type: 'audio/webm' }));
    fd.append('mode', 'solo');
    fd.append('investigators', JSON.stringify(['Thomas Malone']));

    const req = mockFormDataRequest(fd, 'valid-key');
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.text).toBe('Podchodzę ostrożnie do biurka i szukam klucza do piwnicy.');
    expect(data.segments).toHaveLength(1);
    expect(data.model).toBe(DEFAULT_TRANSCRIBE_MODEL);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-transcribe',
      })
    );
  });

  it('obsługuje tryb duetu i diarizację dla 2 badaczy', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        text: 'Ja osłaniam wejście z rewolwerem. A ja badam księgę na ołtarzu.',
        segments: [
          {
            speaker: 'Speaker 1',
            text: 'Ja osłaniam wejście z rewolwerem.',
          },
          {
            speaker: 'Speaker 2',
            text: 'A ja badam księgę na ołtarzu.',
          },
        ],
      }),
    });

    const fd = new FormData();
    fd.append('audio', new Blob(['duet audio'], { type: 'audio/webm' }));
    fd.append('mode', 'duet');
    fd.append('investigators', JSON.stringify(['Thomas Malone', 'Harvey Walters']));

    const req = mockFormDataRequest(fd, 'valid-key');
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.mode).toBe('duet');
    expect(data.segments).toHaveLength(2);
    expect(data.segments[0].speaker).toBe('Speaker 1');
    expect(data.segments[0].text).toBe('Ja osłaniam wejście z rewolwerem.');
    expect(data.segments[1].speaker).toBe('Speaker 2');
    expect(data.segments[1].text).toBe('A ja badam księgę na ołtarzu.');
  });

  it('wykonuje fallback do kolejnego modelu, gdy pierwszy rzuca błąd', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('Model not found: gemini-3.5-transcribe'))
      .mockResolvedValueOnce({
        text: JSON.stringify({
          text: 'Sprawdzam zamek w drzwiach.',
          segments: [{ speaker: 'Speaker 1', text: 'Sprawdzam zamek w drzwiach.' }],
        }),
      });

    const fd = new FormData();
    fd.append('audio', new Blob(['fallback test'], { type: 'audio/webm' }));
    const req = mockFormDataRequest(fd, 'valid-key');

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.text).toBe('Sprawdzam zamek w drzwiach.');
    expect(data.model).toBe('gemini-2.5-flash');
  });

  it('poprawnie parsuje JSON otoczony tekstem i blokiem markdown', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Oto wynik transkrypcji:\n```json\n{\n  "text": "Szukam śladów na piasku.",\n  "segments": [{"speaker": "Speaker 1", "text": "Szukam śladów na piasku."}]\n}\n```\nMam nadzieję, że pomogłem.',
    });

    const fd = new FormData();
    fd.append('audio', new Blob(['audio sample'], { type: 'audio/webm' }));
    const req = mockFormDataRequest(fd, 'valid-key');

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.text).toBe('Szukam śladów na piasku.');
    expect(data.segments[0].text).toBe('Szukam śladów na piasku.');
  });

  it('zwraca 400 gdy rozmiar pliku audio przekracza limit 25 MB', async () => {
    const hugeBlob = {
      size: 26 * 1024 * 1024,
      type: 'audio/webm',
    };
    Object.setPrototypeOf(hugeBlob, Blob.prototype);

    const fd = {
      get: (key: string) => (key === 'audio' ? hugeBlob : null),
    } as unknown as FormData;
    const req = mockFormDataRequest(fd, 'valid-key');

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('limit rozmiaru');
  });

  it('obsługuje response.text jako metodę funkcji (kompatybilność wsteczna SDK)', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: () => JSON.stringify({
        text: 'Zaglądam przez witrynę.',
        segments: [{ speaker: 'Speaker 1', text: 'Zaglądam przez witrynę.' }],
      }),
    });

    const fd = new FormData();
    fd.append('audio', new Blob(['audio sample'], { type: 'audio/webm' }));
    const req = mockFormDataRequest(fd, 'valid-key');

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toBe('Zaglądam przez witrynę.');
  });
});
