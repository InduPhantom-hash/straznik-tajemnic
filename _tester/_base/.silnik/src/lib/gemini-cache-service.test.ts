import {
  CACHE_TTL_SECONDS,
  DEFAULT_CACHE_TTL_SECONDS,
  getOrCreateGeminiCache,
  touchGeminiCache,
  pruneExpiredGeminiCache,
  clearGeminiCacheStore,
  getGeminiCacheStatus,
  startGeminiCacheCleanup,
  stopGeminiCacheCleanup,
} from './gemini-cache-service';

// Mock @google/genai
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      caches: {
        create: mockCreate,
        update: mockUpdate,
      },
    })),
  };
});

describe('gemini-cache-service (OPT-26 & OPT-C04)', () => {
  const apiKey = 'test-api-key-12345678';
  const modelName = 'gemini-2.5-flash'; // In CACHEABLE_MODELS
  // Ensure enough tokens (> 1024 tokens = > 4096 characters)
  const systemPrompt = 'System prompt for Call of Cthulhu Game Master '.repeat(100);
  const stableInstructions = 'Era rules 1920s and GM Protocol instructions '.repeat(100);

  beforeEach(() => {
    jest.clearAllMocks();
    clearGeminiCacheStore();
  });

  afterAll(() => {
    stopGeminiCacheCleanup();
  });

  it('OPT-C04: konfiguracja domyślnego TTL wynosi 2 godziny (7200 sekund)', () => {
    expect(CACHE_TTL_SECONDS).toBe(7200);
    expect(DEFAULT_CACHE_TTL_SECONDS).toBe(7200);
  });

  it('pomija cache gdy model nie wspiera kontekstowego cache (not in CACHEABLE_MODELS)', async () => {
    const result = await getOrCreateGeminiCache(
      apiKey,
      'unsupported-model-xyz',
      systemPrompt,
      stableInstructions
    );
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('pomija cache gdy łączna liczba tokenów jest mniejsza niż próg minimalny (MIN_CACHE_TOKENS)', async () => {
    const result = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      'Short system',
      'Short rules'
    );
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('tworzy nowy cache z domyślnym TTL 7200s (2h) i poprawnymi parametrami', async () => {
    const mockCachedContent = {
      name: 'cachedContents/zew-cache-001',
      model: modelName,
      displayName: 'zew-gm-cache',
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);

    const result = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    expect(result).toEqual(mockCachedContent);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: modelName,
        config: expect.objectContaining({
          systemInstruction: systemPrompt,
          ttl: '7200s',
          displayName: expect.stringContaining(`zew-gm-${modelName}-`),
          contents: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'model' }),
          ]),
        }),
      })
    );

    const status = getGeminiCacheStatus();
    expect(status.entries).toBe(1);
    expect(status.caches[0].name).toBe('cachedContents/zew-cache-001');
    expect(status.caches[0].ttlSeconds).toBe(7200);
    expect(status.caches[0].remainingSeconds).toBeGreaterThan(7100);
  });

  it('respektuje niestandardowy parametr ttlSeconds przy tworzeniu cache', async () => {
    const mockCachedContent = {
      name: 'cachedContents/custom-ttl-001',
      model: modelName,
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);

    const customTTL = 10800; // 3h
    const result = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions,
      customTTL
    );

    expect(result).toEqual(mockCachedContent);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          ttl: '10800s',
        }),
      })
    );
  });

  it('zwraca istniejący cache z pamięci procesu przy Cache Hit bez ponownego wywołania API', async () => {
    const mockCachedContent = {
      name: 'cachedContents/hit-001',
      model: modelName,
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);

    // Pierwsze wywołanie: utworzenie
    const first = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );
    expect(first).toEqual(mockCachedContent);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Drugie wywołanie natychmiast: Cache Hit (pozostało ~7200s > 3600s, brak potrzeby refresh)
    const second = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );
    expect(second).toEqual(mockCachedContent);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('OPT-C04: sliding window - automatycznie odnawia TTL przez ai.caches.update gdy remaining < half TTL', async () => {
    const mockCachedContent = {
      name: 'cachedContents/sliding-001',
      model: modelName,
    };
    const updatedContent = {
      name: 'cachedContents/sliding-001',
      model: modelName,
      expireTime: '2026-10-04T18:00:00Z',
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);
    mockUpdate.mockResolvedValueOnce(updatedContent);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    // Utwórz wpis
    await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Przesuń czas o 4000 sekund (pozostało 3200s z 7200s, czyli < 3600s = < half TTL)
    jest.spyOn(Date, 'now').mockReturnValue(now + 4000 * 1000);

    const hit = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    expect(hit).toEqual(updatedContent);
    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'cachedContents/sliding-001',
      config: { ttl: '7200s' },
    });
    // Nowy TTL został zresetowany w lokalnym rekordzie
    const status = getGeminiCacheStatus();
    expect(status.caches[0].remainingSeconds).toBe(7200);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('OPT-C04: sliding window - zachowuje istniejący cache (graceful fallback) gdy ai.caches.update rzuci błąd sieciowy', async () => {
    const mockCachedContent = {
      name: 'cachedContents/fallback-001',
      model: modelName,
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);
    mockUpdate.mockRejectedValueOnce(new Error('Network temporary timeout'));

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    // Przesuń czas tak, by odpalił sliding window (4000s)
    jest.spyOn(Date, 'now').mockReturnValue(now + 4000 * 1000);

    const hit = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    // Pomimo błędu update, zwraca istniejący obiekt cache, dopóki lokalnie jest wciąż ważny
    expect(hit).toEqual(mockCachedContent);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('OPT-C04: sliding window - usuwa martwy cache i tworzy nowy gdy ai.caches.update zwróci 404/NOT_FOUND', async () => {
    const mockCachedContent = {
      name: 'cachedContents/dead-001',
      model: modelName,
    };
    const freshCachedContent = {
      name: 'cachedContents/fresh-002',
      model: modelName,
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);
    mockUpdate.mockRejectedValueOnce(new Error('NOT_FOUND: Cached content expired'));
    mockCreate.mockResolvedValueOnce(freshCachedContent);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    // Przesuń czas o 4000s
    jest.spyOn(Date, 'now').mockReturnValue(now + 4000 * 1000);

    const result = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    // Został utworzony świeży cache po wyczyszczeniu wpisu 404
    expect(result).toEqual(freshCachedContent);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('usuwa wygasły wpis gdy pozostało mniej niż margines bezpieczeństwa 60s i tworzy nowy', async () => {
    const mockCachedContent1 = {
      name: 'cachedContents/expired-001',
      model: modelName,
    };
    const mockCachedContent2 = {
      name: 'cachedContents/recreated-002',
      model: modelName,
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent1);
    mockCreate.mockResolvedValueOnce(mockCachedContent2);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    // Przesuń czas o 7160 sekund (pozostało 40s < 60s safety margin)
    jest.spyOn(Date, 'now').mockReturnValue(now + 7160 * 1000);

    const result = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    expect(result).toEqual(mockCachedContent2);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('OPT-C04: pruneExpiredGeminiCache czyści wygasłe wpisy z mapy w pamięci procesu', async () => {
    const mockCachedContent = {
      name: 'cachedContents/prune-001',
      model: modelName,
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );
    expect(getGeminiCacheStatus().entries).toBe(1);

    // Gdy czas jest w normie, prune nic nie usuwa
    expect(pruneExpiredGeminiCache(now)).toBe(0);
    expect(getGeminiCacheStatus().entries).toBe(1);

    // Przesuń czas o 7150 sekund (pozostało 50s <= 60s)
    const pruned = pruneExpiredGeminiCache(now + 7150 * 1000);
    expect(pruned).toBe(1);
    expect(getGeminiCacheStatus().entries).toBe(0);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('OPT-C04: touchGeminiCache ręcznie odnawia TTL wskazanego cache', async () => {
    const mockCachedContent = {
      name: 'cachedContents/touch-001',
      model: modelName,
    };
    const touchedContent = {
      name: 'cachedContents/touch-001',
      model: modelName,
      expireTime: '2026-10-04T20:00:00Z',
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);
    mockUpdate.mockResolvedValueOnce(touchedContent);

    await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    const res = await touchGeminiCache(
      apiKey,
      'cachedContents/touch-001',
      7200
    );

    expect(res).toEqual(touchedContent);
    expect(mockUpdate).toHaveBeenCalledWith({
      name: 'cachedContents/touch-001',
      config: { ttl: '7200s' },
    });
  });

  it('OPT-C04: touchGeminiCache zwraca null i usuwa wpis przy 404', async () => {
    const mockCachedContent = {
      name: 'cachedContents/touch-404',
      model: modelName,
    };
    mockCreate.mockResolvedValueOnce(mockCachedContent);
    mockUpdate.mockRejectedValueOnce(new Error('NOT_FOUND'));

    await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );
    expect(getGeminiCacheStatus().entries).toBe(1);

    const res = await touchGeminiCache(apiKey, 'cachedContents/touch-404', 7200);
    expect(res).toBeNull();
    expect(getGeminiCacheStatus().entries).toBe(0);
  });

  it('graceful fallback gdy create rzuca wyjątek', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Quota exceeded'));

    const result = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    expect(result).toBeNull();
  });

  it('zwraca null i nie cachuje gdy create zwróci obiekt bez pola name', async () => {
    mockCreate.mockResolvedValueOnce({
      model: modelName,
      // name is missing/undefined
    });

    const result = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions
    );

    expect(result).toBeNull();
    expect(getGeminiCacheStatus().entries).toBe(0);
  });

  it('touchGeminiCache zwraca null gdy klucz nie istnieje w RAM i nie jest zasobem Google (cachedContents/)', async () => {
    const res = await touchGeminiCache(apiKey, 'unknown_local_key_123', 7200);
    expect(res).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('respektuje domyślny TTL gdy ttlSeconds jest niedodatnie lub zerowe', async () => {
    const mockCached = { name: 'cachedContents/zero-ttl', model: modelName };
    mockCreate.mockResolvedValueOnce(mockCached);

    const result = await getOrCreateGeminiCache(
      apiKey,
      modelName,
      systemPrompt,
      stableInstructions,
      -100
    );

    expect(result).toEqual(mockCached);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ ttl: '7200s' }),
      })
    );
  });

  it('deduplikuje współbieżne zapytania tworzenia cache (eliminuje race condition)', async () => {
    const mockCached = { name: 'cachedContents/concurrent-001', model: modelName };
    // Opóźnienie symulujące czas odpowiedzi API
    mockCreate.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockCached), 50))
    );

    const [res1, res2] = await Promise.all([
      getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions),
      getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions),
    ]);

    expect(res1).toEqual(mockCached);
    expect(res2).toEqual(mockCached);
    // Wywołanie API tylko raz pomimo 2 współbieżnych requestów
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('deduplikuje współbieżne odnawianie w sliding window', async () => {
    const initialCached = { name: 'cachedContents/refresh-race', model: modelName };
    const refreshedCached = { name: 'cachedContents/refresh-race', model: modelName, expireTime: 'ext' };
    mockCreate.mockResolvedValueOnce(initialCached);
    mockUpdate.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(refreshedCached), 50))
    );

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    // Przesuń czas o 4000s (> half TTL)
    jest.spyOn(Date, 'now').mockReturnValue(now + 4000 * 1000);

    const [res1, res2] = await Promise.all([
      getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions),
      getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions),
    ]);

    expect(res1).toEqual(expect.objectContaining({ name: 'cachedContents/refresh-race' }));
    expect(res2).toEqual(expect.objectContaining({ name: 'cachedContents/refresh-race' }));
    // Tylko 1 wywołanie update pomimo 2 równoległych żądań
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('nie ponawia natychmiast ai.caches.update w okresie 30s cooldown po błędzie', async () => {
    const mockCached = { name: 'cachedContents/cooldown-test', model: modelName };
    mockCreate.mockResolvedValueOnce(mockCached);
    mockUpdate.mockRejectedValueOnce(new Error('Rate limit 429'));

    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    await getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions);

    // Przesuń czas o 4000s
    jest.spyOn(Date, 'now').mockReturnValue(now + 4000 * 1000);

    // Pierwsze odświeżenie - rzuca błąd 429
    const res1 = await getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions);
    expect(res1).toEqual(mockCached);
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Drugie wywołanie 5 sekund później - cooldown 30s aktywny, mockUpdate NIE jest wołane ponownie
    jest.spyOn(Date, 'now').mockReturnValue(now + 4005 * 1000);
    const res2 = await getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions);
    expect(res2).toEqual(mockCached);
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    // Trzecie wywołanie 35 sekund później - cooldown minął, następuje kolejna próba
    mockUpdate.mockResolvedValueOnce({ name: 'cachedContents/cooldown-test', model: modelName });
    jest.spyOn(Date, 'now').mockReturnValue(now + 4035 * 1000);
    const res3 = await getOrCreateGeminiCache(apiKey, modelName, systemPrompt, stableInstructions);
    expect(res3).toEqual(expect.objectContaining({ name: 'cachedContents/cooldown-test' }));
    expect(mockUpdate).toHaveBeenCalledTimes(2);

    jest.spyOn(Date, 'now').mockRestore();
  });

  it('startGeminiCacheCleanup i stopGeminiCacheCleanup zarządzają interwałem', () => {
    startGeminiCacheCleanup(1000);
    // Kolejne wywołanie nie tworzy drugiego timera
    startGeminiCacheCleanup(1000);
    stopGeminiCacheCleanup();
  });
});
