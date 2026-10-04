import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  PersistentTtsCache,
  stableStringify,
  generateTtsHash,
} from './tts-cache-service';

describe('tts-cache-service', () => {
  let tempDir: string;
  let cache: PersistentTtsCache;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-cache-test-'));
    cache = new PersistentTtsCache({ cacheDir: tempDir });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('stableStringify & generateTtsHash', () => {
    it('produkuje identyczny hash niezależnie od kolejności kluczy w obiekcie', () => {
      const obj1 = { text: 'Arka', voiceId: 'voice-1', settings: { rate: 1.0, pitch: 0 } };
      const obj2 = { settings: { pitch: 0, rate: 1.0 }, voiceId: 'voice-1', text: 'Arka' };

      expect(stableStringify(obj1)).toBe(stableStringify(obj2));
      expect(generateTtsHash(obj1)).toBe(generateTtsHash(obj2));
    });

    it('pomija klucze z wartością undefined dopasowując semantykę standardowego JSON', () => {
      const objWithUndefined = { text: 'Arka', voiceId: 'voice-1', settings: undefined };
      const objWithoutKey = { text: 'Arka', voiceId: 'voice-1' };

      expect(stableStringify(objWithUndefined)).toBe(stableStringify(objWithoutKey));
      expect(generateTtsHash(objWithUndefined)).toBe(generateTtsHash(objWithoutKey));
    });

    it('produkuje różne hashe dla różnych danych', () => {
      const hash1 = generateTtsHash({ text: 'Tekst A', voice: 'v1' });
      const hash2 = generateTtsHash({ text: 'Tekst B', voice: 'v1' });
      expect(hash1).not.toBe(hash2);
    });

    it('obsługuje null, undefined, prymitywy i tablice', () => {
      expect(stableStringify(null)).toBe('null');
      expect(stableStringify(undefined)).toBe('null');
      expect(stableStringify('hello')).toBe('"hello"');
      expect(stableStringify([3, 2, 1])).toBe('[3,2,1]');
      expect(stableStringify([1, undefined, 2])).toBe('[1,null,2]');
    });
  });

  describe('Podstawowy zapis i odczyt', () => {
    it('zapisuje i odczytuje obiekt z dysku', () => {
      const key = { text: 'Krótki opis sceny', voiceId: 'pl-PL-Wavenet-A' };
      const dummyData = {
        id: 'tts-123',
        audioUrl: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA',
        duration: 3,
        cost: 0.001,
      };

      const setSuccess = cache.set(key, dummyData);
      expect(setSuccess).toBe(true);

      const cached = cache.get<typeof dummyData>(key);
      expect(cached).toEqual(dummyData);
      expect(cache.has(key)).toBe(true);
    });

    it('tworzy fizyczny plik .mp3 obok .json gdy payload zawiera audioUrl base64', () => {
      const key = { text: 'Audio test' };
      const hash = generateTtsHash(key);
      const base64Audio = Buffer.from('TEST AUDIO CONTENT').toString('base64');
      const data = {
        audioUrl: `data:audio/mp3;base64,${base64Audio}`,
        duration: 2,
      };

      cache.set(key, data);

      const jsonFile = path.join(tempDir, `${hash}.json`);
      const mp3File = path.join(tempDir, `${hash}.mp3`);

      expect(fs.existsSync(jsonFile)).toBe(true);
      expect(fs.existsSync(mp3File)).toBe(true);

      const savedMp3Content = fs.readFileSync(mp3File, 'utf-8');
      expect(savedMp3Content).toBe('TEST AUDIO CONTENT');

      // Test helperów getAudioPath i getAudioBuffer
      expect(cache.getAudioPath(key)).toBe(mp3File);
      const buffer = cache.getAudioBuffer(key);
      expect(buffer).not.toBeNull();
      expect(buffer?.toString('utf-8')).toBe('TEST AUDIO CONTENT');
    });

    it('zwraca null dla nieistniejącego klucza', () => {
      expect(cache.get({ nonExistent: true })).toBeNull();
      expect(cache.has({ nonExistent: true })).toBe(false);
      expect(cache.getAudioPath({ nonExistent: true })).toBeNull();
      expect(cache.getAudioBuffer({ nonExistent: true })).toBeNull();
    });

    it('usuwa wpis i powiązany plik .mp3', () => {
      const key = { text: 'Do usunięcia' };
      const hash = generateTtsHash(key);
      const data = { audioUrl: 'data:audio/mp3;base64,AAA=' };

      cache.set(key, data);
      expect(cache.has(key)).toBe(true);

      const deleted = cache.delete(key);
      expect(deleted).toBe(true);
      expect(cache.has(key)).toBe(false);
      expect(fs.existsSync(path.join(tempDir, `${hash}.json`))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, `${hash}.mp3`))).toBe(false);
    });
  });

  describe('TTL i wygasanie wpisów', () => {
    it('zwraca null i usuwa plik gdy TTL upłynął', async () => {
      const key = { text: 'Krótki TTL' };
      const data = { audioUrl: 'data:audio/mp3;base64,AAA=' };

      // TTL: 10 ms
      cache.set(key, data, 10);
      expect(cache.has(key)).toBe(true);

      // Czekaj 25 ms
      await new Promise((resolve) => setTimeout(resolve, 25));

      const retrieved = cache.get(key);
      expect(retrieved).toBeNull();
      expect(cache.has(key)).toBe(false);
    });

    it('cleanExpired() czyści wygasłe wpisy oraz osierocone pliki audio', async () => {
      const keyExpired = { text: 'Wygasa' };
      const keyValid = { text: 'Pozostaje' };

      cache.set(keyExpired, { text: 'a' }, 10);
      cache.set(keyValid, { text: 'b' }, 100000);

      // Utwórz osierocony plik .mp3 bez metadanych .json
      const orphanMp3 = path.join(tempDir, 'orphan12345.mp3');
      fs.writeFileSync(orphanMp3, 'dummy audio');

      await new Promise((resolve) => setTimeout(resolve, 25));

      const cleaned = cache.cleanExpired();
      expect(cleaned).toBeGreaterThanOrEqual(2); // wygasły wpis + orphan

      expect(cache.has(keyExpired)).toBe(false);
      expect(cache.has(keyValid)).toBe(true);
      expect(fs.existsSync(orphanMp3)).toBe(false); // osierocony plik usunięty
    });
  });

  describe('Obsługa błędów i uszkodzonych plików', () => {
    it('bezpiecznie usuwa uszkodzony plik JSON oraz powiązany .mp3 bez rzucania błędu', () => {
      const key = { text: 'Uszkodzony plik' };
      const hash = generateTtsHash(key);
      const jsonPath = path.join(tempDir, `${hash}.json`);
      const mp3Path = path.join(tempDir, `${hash}.mp3`);

      // Zapisz niepoprawny JSON i powiązany plik audio
      fs.writeFileSync(jsonPath, '{ corrupted json ::::');
      fs.writeFileSync(mp3Path, 'orphan audio data');

      const result = cache.get(key);
      expect(result).toBeNull();
      expect(fs.existsSync(jsonPath)).toBe(false); // usunięty po wykryciu błędu
      expect(fs.existsSync(mp3Path)).toBe(false); // powiązany mp3 również usunięty
    });

    it('nie rzuca błędu przy próbie zapisu do niedostępnego katalogu', () => {
      const invalidPath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(invalidPath, 'i am a file');
      const brokenCache = new PersistentTtsCache({
        cacheDir: path.join(invalidPath, 'sub'),
      });

      const success = brokenCache.set({ test: 1 }, { val: 2 });
      expect(success).toBe(false);
      expect(brokenCache.get({ test: 1 })).toBeNull();
    });
  });

  describe('Pruning i limit rozmiaru dysku (LRU)', () => {
    it('prune() usuwa wpisy atomowo (zarówno .json jak i .mp3) gdy przekroczony jest limit rozmiaru', async () => {
      const key1 = { item: 1 };
      const key2 = { item: 2 };
      const key3 = { item: 3 };

      const base64Audio = Buffer.from('A'.repeat(500)).toString('base64');
      cache.set(key1, { audioUrl: `data:audio/mp3;base64,${base64Audio}` });
      await new Promise((resolve) => setTimeout(resolve, 15));
      cache.set(key2, { audioUrl: `data:audio/mp3;base64,${base64Audio}` });
      await new Promise((resolve) => setTimeout(resolve, 15));
      cache.set(key3, { audioUrl: `data:audio/mp3;base64,${base64Audio}` });

      const hash1 = generateTtsHash(key1);
      const hash3 = generateTtsHash(key3);

      const statsBefore = cache.getStats();
      expect(statsBefore.count).toBe(3);

      // Ustaw limit mieszczący tylko 2 ostatnie wpisy
      const pruneResult = cache.prune(statsBefore.totalSizeBytes - 300);
      expect(pruneResult.deletedCount).toBeGreaterThan(0);

      // Najstarszy (key1) powinien zostać usunięty w całości (.json oraz .mp3)
      expect(cache.has(key1)).toBe(false);
      expect(fs.existsSync(path.join(tempDir, `${hash1}.json`))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, `${hash1}.mp3`))).toBe(false);

      // Najnowszy (key3) pozostaje kompletny
      expect(cache.has(key3)).toBe(true);
      expect(fs.existsSync(path.join(tempDir, `${hash3}.json`))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, `${hash3}.mp3`))).toBe(true);
    });

    it('clear() usuwa wszystkie pliki i czyści katalog', () => {
      cache.set({ a: 1 }, { data: 'a' });
      cache.set({ b: 2 }, { data: 'b' });

      expect(cache.getStats().count).toBe(2);
      cache.clear();
      expect(cache.getStats().count).toBe(0);
    });
  });
});
