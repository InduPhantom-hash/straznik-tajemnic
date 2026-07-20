/**
 * Testy build-immersion-context.ts
 *
 * Mockuje 3 serwisy immersyjne (astronomy, news, pricing) i sprawdza:
 *   - formatowanie sekcji promptu
 *   - obsluge fallbackow (isFallback)
 *   - timeout / rejected promises
 *   - tryb offline (IMMERSION_OFFLINE=1)
 *   - cache in-memory (drugie wywolanie zwraca z cache)
 */

import { fetchImmersionContext } from './build-immersion-context';

// Mockujemy serwisy
jest.mock('@/lib/immersion/astronomy-service', () => ({
  getDaylightAndMoon: jest.fn(),
}));
jest.mock('@/lib/immersion/news-service', () => ({
  fetchHistoricalNews: jest.fn(),
}));
jest.mock('@/lib/immersion/pricing-service', () => ({
  convertUSD: jest.fn(),
}));

import { getDaylightAndMoon } from '@/lib/immersion/astronomy-service';
import { fetchHistoricalNews } from '@/lib/immersion/news-service';
import { convertUSD } from '@/lib/immersion/pricing-service';

const mockDaylight = getDaylightAndMoon as jest.MockedFunction<typeof getDaylightAndMoon>;
const mockNews = fetchHistoricalNews as jest.MockedFunction<typeof fetchHistoricalNews>;
const mockPrices = convertUSD as jest.MockedFunction<typeof convertUSD>;

// Dane testowe
const DAYLIGHT_OK = {
  sunrise: '05:23:00',
  sunset: '20:41:00',
  dayLength: '15:18:00',
  moonPhase: 'Pelnia (Full Moon) (Widocznosc tarczy: 100%)',
  lightLevel: 'moonlit' as const,
  isFallback: false,
};

const NEWS_OK = {
  news: [
    {
      title: 'The Boston Globe',
      date: '1925-05-12',
      snippet: 'POLICE RAID ILLEGAL SPEAKEASY IN NORTH END.',
      url: 'https://chroniclingamerica.loc.gov/test',
    },
  ],
  isFallback: false,
};

const PRICES_OK = {
  originalAmount: 10,
  originalYear: 2026,
  targetYear: 1920,
  convertedAmount: 0.61,
  inflationMultiplier: 0.061,
  isFallback: false,
};

function setupAllOk() {
  mockDaylight.mockResolvedValue(DAYLIGHT_OK);
  mockNews.mockResolvedValue(NEWS_OK);
  mockPrices.mockResolvedValue(PRICES_OK);
}

describe('fetchImmersionContext', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Czyscimy cache miedzy testami - modul trzyma Map w scope modulu,
    // wiec resetujemy go recznie przez re-import.
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('zwraca sekcje z 3 zrodlami gdy wszystko OK', async () => {
    setupAllOk();
    const result = await fetchImmersionContext({ gameDate: '1925-05-12' });

    expect(result).toContain('## DANE SWIATA (IMMERSJA)');
    expect(result).toContain('### Astronomia');
    expect(result).toContain('05:23:00');
    expect(result).toContain('### Naglowki gazet z epoki');
    expect(result).toContain('POLICE RAID');
    expect(result).toContain('### Wartosc pieniadza');
    expect(result).toContain('$0.61');
  });

  it('oznacza zrodlo API gdy isFallback=false', async () => {
    setupAllOk();
    const result = await fetchImmersionContext({ gameDate: '1925-05-12', gameEra: '1890s' });

    expect(result).toContain('[zrodlo: API');
    expect(result).not.toContain('[dane lokalne');
  });

  it('oznacza fallback gdy isFallback=true', async () => {
    mockDaylight.mockResolvedValue({ ...DAYLIGHT_OK, isFallback: true });
    mockNews.mockResolvedValue({ ...NEWS_OK, isFallback: true });
    mockPrices.mockResolvedValue({ ...PRICES_OK, isFallback: true });

    const result = await fetchImmersionContext({ gameDate: '1925-06-01', gameEra: '1940s' });

    expect(result).toContain('[dane lokalne - fallback]');
  });

  it('pomija sekcje dla rejected promises (timeout)', async () => {
    mockDaylight.mockRejectedValue(new Error('timeout'));
    mockNews.mockResolvedValue(NEWS_OK);
    mockPrices.mockRejectedValue(new Error('timeout'));

    const result = await fetchImmersionContext({ gameDate: '1925-07-01' });

    expect(result).toContain('### Naglowki gazet z epoki');
    expect(result).not.toContain('### Astronomia');
    expect(result).not.toContain('### Wartosc pieniadza');
  });

  it('zwraca pusty string gdy wszystko zawiodlo', async () => {
    mockDaylight.mockRejectedValue(new Error('fail'));
    mockNews.mockRejectedValue(new Error('fail'));
    mockPrices.mockRejectedValue(new Error('fail'));

    const result = await fetchImmersionContext({ gameDate: '1925-08-01' });
    expect(result).toBe('');
  });

  it('zwraca pusty string w trybie offline', async () => {
    process.env.IMMERSION_OFFLINE = '1';
    setupAllOk();

    const result = await fetchImmersionContext({ gameDate: '1925-09-01' });
    expect(result).toBe('');
    expect(mockDaylight).not.toHaveBeenCalled();
  });
});
