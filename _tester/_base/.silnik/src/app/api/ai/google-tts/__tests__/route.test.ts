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

import { POST } from '../route';
import { apiCacheService } from '@/lib/api-cache-service';

function createMockRequest(body: unknown, headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/ai/google-tts (Persistent Cache Integration)', () => {
  let tempDir: string;
  const originalFetch = global.fetch;
  const originalEnvTts = process.env.TTS_CACHE_DIR;
  const originalApiKey = process.env.GOOGLE_CLOUD_API_KEY;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'google-tts-route-test-'));
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

  it('zwraca 500 gdy brak klucza API', async () => {
    delete process.env.GOOGLE_CLOUD_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const req = createMockRequest({ type: 'voice', text: 'Test', voiceId: 'v1' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Google Cloud API key not configured');
  });

  it('zwraca 400 dla nieprawidłowego type', async () => {
    const req = createMockRequest({ type: 'invalid-type' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('zwraca status available dla type: "test"', async () => {
    const req = createMockRequest({ type: 'test' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('available');
  });

  it('zwraca dane z persystentnego cache (L2 disk) bez wywoływania Google API', async () => {
    const cacheKey = {
      type: 'voice',
      text: 'Powtarzalna kwestia',
      voiceId: 'pl-PL-Wavenet-A',
      settings: undefined,
    };

    const mockCachedAudio = {
      id: 'google-tts-cached',
      type: 'voice',
      audioUrl: 'data:audio/mpeg;base64,CACHED_BASE64_AUDIO',
      duration: 3,
      timestamp: '2026-10-04T12:00:00.000Z',
      cost: 0.001,
      metadata: {
        voiceId: 'pl-PL-Wavenet-A',
        quality: 'high',
        format: 'mp3',
      },
    };

    // Zapisz do cache (trafi do RAM oraz na dysk)
    apiCacheService.set('google-tts', cacheKey, mockCachedAudio);

    // Symuluj restart aplikacji - czyścimy RAM
    apiCacheService.clearMemory();

    // Mock fetch - jeśli endpoint go wywoła, test rzuci błąd
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error('Fetch should NOT be called on cache hit!');
    });

    const req = createMockRequest({
      type: 'voice',
      text: 'Powtarzalna kwestia',
      voiceId: 'pl-PL-Wavenet-A',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual(mockCachedAudio);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('generuje audio przez Google API i zapisuje do persystentnego cache', async () => {
    const fakeAudioBase64 = Buffer.from('FAKE_MP3_STREAM').toString('base64');

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        audioContent: fakeAudioBase64,
      }),
    });

    const req = createMockRequest({
      type: 'voice',
      text: 'Świeża kwestia do nagrania',
      voiceId: 'pl-PL-Wavenet-B',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.audioUrl).toBe(`data:audio/mpeg;base64,${fakeAudioBase64}`);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Sprawdź czy plik trafił na dysk do tempDir
    const files = fs.readdirSync(tempDir);
    expect(files.some((f) => f.endsWith('.json'))).toBe(true);
    expect(files.some((f) => f.endsWith('.mp3'))).toBe(true);
  });
});
