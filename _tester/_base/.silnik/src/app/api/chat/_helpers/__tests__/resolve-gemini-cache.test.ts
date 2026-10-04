import {
  resolveGeminiCache,
  DEFAULT_GEMINI_CACHE_TTL_MS,
} from '../resolve-gemini-cache';
import { getOrCreateGeminiCache } from '@/lib/gemini-cache-service';

jest.mock('@/lib/gemini-cache-service', () => ({
  DEFAULT_CACHE_TTL_SECONDS: 7200,
  getOrCreateGeminiCache: jest.fn(),
}));

describe('resolveGeminiCache (OPT-26 & OPT-C04)', () => {
  const baseOpts = {
    apiKey: 'test-api-key',
    modelId: 'gemini-3.8-flash',
    systemPrompt: 'System Prompt Content',
    eraRules: 'Era 1920s Rules',
    gmProtocol: 'GM Protocol Rules',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('OPT-C04: stała DEFAULT_GEMINI_CACHE_TTL_MS wynosi 7 200 000 ms (2h)', () => {
    expect(DEFAULT_GEMINI_CACHE_TTL_MS).toBe(7200000);
  });

  it('zwraca null gdy enableCache jest false', async () => {
    const result = await resolveGeminiCache({
      ...baseOpts,
      enableCache: false,
    });

    expect(result).toBeNull();
    expect(getOrCreateGeminiCache).not.toHaveBeenCalled();
  });

  it('zwraca null gdy enableCache nie jest przekazane', async () => {
    const result = await resolveGeminiCache({
      ...baseOpts,
    });

    expect(result).toBeNull();
    expect(getOrCreateGeminiCache).not.toHaveBeenCalled();
  });

  it('domyślnie używa 2h (7200s) gdy cacheTTL nie jest zdefiniowane', async () => {
    const mockCache = { name: 'cachedContents/test-cache' } as any;
    (getOrCreateGeminiCache as jest.Mock).mockResolvedValueOnce(mockCache);

    const result = await resolveGeminiCache({
      ...baseOpts,
      enableCache: true,
    });

    expect(result).toBe(mockCache);
    expect(getOrCreateGeminiCache).toHaveBeenCalledWith(
      baseOpts.apiKey,
      baseOpts.modelId,
      baseOpts.systemPrompt,
      'Era 1920s Rules\n\nGM Protocol Rules',
      7200 // 7200000 ms -> 7200 s
    );
  });

  it('poprawnie konwertuje niestandardowe cacheTTL z ms na sekundy', async () => {
    const mockCache = { name: 'cachedContents/custom-cache' } as any;
    (getOrCreateGeminiCache as jest.Mock).mockResolvedValueOnce(mockCache);

    const result = await resolveGeminiCache({
      ...baseOpts,
      enableCache: true,
      cacheTTL: 3600000, // 1h
    });

    expect(result).toBe(mockCache);
    expect(getOrCreateGeminiCache).toHaveBeenCalledWith(
      baseOpts.apiKey,
      baseOpts.modelId,
      baseOpts.systemPrompt,
      'Era 1920s Rules\n\nGM Protocol Rules',
      3600
    );
  });

  it('zwraca null gdy getOrCreateGeminiCache zwraca null (graceful fallback)', async () => {
    (getOrCreateGeminiCache as jest.Mock).mockResolvedValueOnce(null);

    const result = await resolveGeminiCache({
      ...baseOpts,
      enableCache: true,
    });

    expect(result).toBeNull();
  });

  it('używa domyślnego TTL (7200s) gdy cacheTTL jest niedodatnie lub niepoprawne', async () => {
    const mockCache = { name: 'cachedContents/test-cache' } as any;
    (getOrCreateGeminiCache as jest.Mock).mockResolvedValueOnce(mockCache);

    const result = await resolveGeminiCache({
      ...baseOpts,
      enableCache: true,
      cacheTTL: 0,
    });

    expect(result).toBe(mockCache);
    expect(getOrCreateGeminiCache).toHaveBeenCalledWith(
      baseOpts.apiKey,
      baseOpts.modelId,
      baseOpts.systemPrompt,
      'Era 1920s Rules\n\nGM Protocol Rules',
      7200
    );
  });
});
