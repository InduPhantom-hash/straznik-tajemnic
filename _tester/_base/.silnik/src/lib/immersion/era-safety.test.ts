import { FALLBACK_BOOKS, fetchHistoricalBooks } from './books-service';
import { convertUSD } from './pricing-service';

describe('immersion era safety', () => {
  const originalOffline = process.env.IMMERSION_OFFLINE;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.IMMERSION_OFFLINE = '1';
    global.fetch = jest.fn().mockRejectedValue(new Error('offline test'));
  });

  afterAll(() => {
    process.env.IMMERSION_OFFLINE = originalOffline;
    global.fetch = originalFetch;
  });

  it('does not return fallback books published after the requested year', async () => {
    const result = await fetchHistoricalBooks('magic', 1890);

    expect(result.books.every((book) => book.publishYear <= 1890)).toBe(true);
    expect(result.books).not.toContainEqual(
      expect.objectContaining({ publishYear: 1920 })
    );
    expect(FALLBACK_BOOKS.some((book) => book.publishYear === 1920)).toBe(true);
  });

  it('rejects unsupported years instead of substituting 1920 or 2026', async () => {
    await expect(convertUSD(10, 2026, 1890)).rejects.toThrow(RangeError);
  });
});
