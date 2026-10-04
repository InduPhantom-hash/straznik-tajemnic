import fs from 'fs';
import path from 'path';
import os from 'os';
import type { NextRequest } from 'next/server';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

import { POST, GET } from '../route';
import { apiCacheService } from '@/lib/api-cache-service';

function createMockRequest(
  body: unknown,
  headers: Record<string, string> = {},
  url = 'http://localhost:3000/api/tts/google'
) {
  return {
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
    json: async () => body,
    url,
  } as unknown as NextRequest;
}

describe('POST /api/tts/google (Unified persistent caching)', () => {
  let tempDir: string;
  const originalFetch = global.fetch;
  const originalEnvTts = process.env.TTS_CACHE_DIR;
  const originalApiKey = process.env.GOOGLE_CLOUD_API_KEY;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-google-test-'));
    process.env.TTS_CACHE_DIR = tempDir;
    process.env.GOOGLE_CLOUD_API_KEY = 'mock-google-cloud-key';
    apiCacheService.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.TTS_CACHE_DIR = originalEnvTts;
    process.env.GOOGLE_CLOUD_API_KEY = originalApiKey;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('zwraca 400 gdy brak tekstu', async () => {
    const req = createMockRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Brak tekstu do przetworzenia');
  });

  it('zwraca 500 gdy brak klucza API', async () => {
    delete process.env.GOOGLE_CLOUD_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const req = createMockRequest({ text: 'Opis sceny', settings: {} });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('używa persystentnego cache dyskowego bez wywoływania API', async () => {
    const fakeAudioBase64 = Buffer.from('VOICE_STREAM').toString('base64');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audioContent: fakeAudioBase64,
      }),
    });

    const req1 = createMockRequest({
      text: 'Witaj w Arkham, badaczu.',
      settings: {
        voiceName: 'pl-PL-Wavenet-A',
        languageCode: 'pl-PL',
      },
    });

    // Pierwsze wywołanie - generuje przez fetch
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Symulacja restartu aplikacji - czyszczenie RAM
    apiCacheService.clearMemory();

    // Mock fetch na rzucanie błędu - upewnienie się że nie jest wołany
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error('Should not hit external API on cache hit');
    });

    // Drugie wywołanie z identycznym tekstem i ustawieniami
    const req2 = createMockRequest({
      text: 'Witaj w Arkham, badaczu.',
      settings: {
        voiceName: 'pl-PL-Wavenet-A',
        languageCode: 'pl-PL',
      },
    });

    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.audioUrl).toBe(`data:audio/mp3;base64,${fakeAudioBase64}`);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('obsługuje żądanie gdy parametr settings nie został przekazany', async () => {
    const fakeAudioBase64 = Buffer.from('NO_SETTINGS_AUDIO').toString('base64');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audioContent: fakeAudioBase64,
      }),
    });

    const req = createMockRequest({ text: 'Narracja bez jawnych settings' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.audioUrl).toBe(`data:audio/mp3;base64,${fakeAudioBase64}`);
  });

  it('GET zwraca listę głosów', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [
          { name: 'pl-PL-Wavenet-A', ssmlGender: 'FEMALE' },
          { name: 'pl-PL-Chirp3-HD-Achird', ssmlGender: 'MALE' },
        ],
      }),
    });

    const req = createMockRequest(null, {}, 'http://localhost:3000/api/tts/google?languageCode=pl-PL');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.voices.length).toBe(2);
  });
});
