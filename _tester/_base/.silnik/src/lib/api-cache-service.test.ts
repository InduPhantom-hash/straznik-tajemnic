import fs from 'fs';
import path from 'path';
import os from 'os';
import { ApiCacheService } from './api-cache-service';

describe('api-cache-service (Dual Layer RAM + Disk Cache)', () => {
  let tempDir: string;
  let service: ApiCacheService;
  const originalEnvTts = process.env.TTS_CACHE_DIR;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-cache-service-test-'));
    process.env.TTS_CACHE_DIR = tempDir;
    service = new ApiCacheService();
  });

  afterEach(() => {
    process.env.TTS_CACHE_DIR = originalEnvTts;
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('RAM Cache dla zwykłych namespace (np. "http")', () => {
    it('zapisuje i pobiera dane z pamięci', () => {
      service.set('http', { url: '/api/test' }, { status: 200 }, 5000);
      const cached = service.get<{ status: number }>('http', { url: '/api/test' });
      expect(cached).toEqual({ status: 200 });
    });

    it('zwraca null po upływie TTL', async () => {
      service.set('http', 'key1', 'value1', 10);
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(service.get('http', 'key1')).toBeNull();
    });

    it('nie tworzy plików na dysku dla namespace "http"', () => {
      service.set('http', 'key-http', { ok: true }, 5000);
      const files = fs.readdirSync(tempDir);
      expect(files.length).toBe(0);
    });
  });

  describe('Dwuwarstwowy cache (RAM + Disk) dla namespace "google-tts"', () => {
    it('zapisuje wpis zarówno do pamięci jak i na dysk', () => {
      const cacheKey = { text: 'Witaj w Arkham', voiceId: 'pl-PL-Wavenet-A' };
      const payload = { audioUrl: 'data:audio/mp3;base64,AAA=', duration: 5 };

      service.set('google-tts', cacheKey, payload);

      // Hit z pamięci RAM (L1)
      expect(service.get('google-tts', cacheKey)).toEqual(payload);

      // Plik na dysku istnieje (L2)
      const files = fs.readdirSync(tempDir);
      expect(files.some((f) => f.endsWith('.json'))).toBe(true);
    });

    it('zapewnia determinizm kluczy w L1 RAM niezależnie od kolejności właściwości', () => {
      const keyA = { text: 'Tekst', voice: 'v1' };
      const keyB = { voice: 'v1', text: 'Tekst' };
      const payload = { audioUrl: 'data:audio/mp3;base64,XYZ=' };

      service.set('google-tts', keyA, payload);

      // Odczyt z odwrotną kolejnością kluczy powinien trafić bezpośrednio w RAM (L1)
      expect(service.get('google-tts', keyB)).toEqual(payload);
    });

    it('odzyskuje dane z dysku L2 po restarcie procesu (wyczyszczeniu RAM)', () => {
      const cacheKey = { text: 'Intro gry', voiceId: 'voice-intro' };
      const payload = { audioUrl: 'data:audio/mp3;base64,BBB=', duration: 10 };

      service.set('google-tts', cacheKey, payload);

      // Symulacja restartu aplikacji: wyczyszczenie ulotnej pamięci RAM
      service.clearMemory();
      expect(service.size()).toBe(0);

      // Odczyt po restarcie powinien pobrać dane z dysku i dogrzać pamięć RAM
      const restored = service.get<typeof payload>('google-tts', cacheKey);
      expect(restored).toEqual(payload);

      // RAM został ponownie zasilony (L1 cache warming)
      expect(service.size()).toBe(1);
    });

    it('usuwa wpis zarówno z pamięci RAM jak i z dysku, uniemożliwiając zmartwychwstanie z L2', () => {
      const cacheKey = { text: 'Jednorazowa narracja', voiceId: 'v-del' };
      const payload = { audioUrl: 'data:audio/mp3;base64,DEL=' };

      service.set('google-tts', cacheKey, payload);
      expect(service.get('google-tts', cacheKey)).toEqual(payload);

      // Usuń za pomocą delete(namespace, key)
      service.delete('google-tts', cacheKey);

      // Kolejny odczyt musi zwrócić null (nie może zmartwychwstać z dysku L2)
      expect(service.get('google-tts', cacheKey)).toBeNull();
      const files = fs.readdirSync(tempDir);
      expect(files.length).toBe(0);
    });

    it('obsługuje namespace "google-tts-v2"', () => {
      const cacheKey = { text: 'Nowa wersja v2' };
      const payload = { audioUrl: 'data:audio/mp3;base64,CCC=' };

      service.set('google-tts-v2', cacheKey, payload);
      service.clearMemory();

      expect(service.get('google-tts-v2', cacheKey)).toEqual(payload);
    });

    it('clear() czyści zarówno pamięć RAM jak i pliki dyskowe', () => {
      service.set('google-tts', 'tts-key', { val: 1 });
      expect(fs.readdirSync(tempDir).length).toBeGreaterThan(0);

      service.clear();

      expect(service.size()).toBe(0);
      expect(fs.readdirSync(tempDir).length).toBe(0);
    });
  });
});
