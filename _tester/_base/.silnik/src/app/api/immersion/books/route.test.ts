import type { NextRequest } from 'next/server';
import { fetchHistoricalBooks } from '@/lib/immersion/books-service';
import { GET } from './route';

jest.mock('@/lib/immersion/books-service', () => ({
  fetchHistoricalBooks: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockFetchHistoricalBooks = jest.mocked(fetchHistoricalBooks);

function request(url: string): NextRequest {
  return { url } as NextRequest;
}

describe('immersion books route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a request without an explicit maxYear', async () => {
    const response = await GET(request('http://localhost/api/immersion/books'));

    expect(response.status).toBe(400);
    expect(mockFetchHistoricalBooks).not.toHaveBeenCalled();
  });

  it('passes an explicit maxYear to the service', async () => {
    mockFetchHistoricalBooks.mockResolvedValue({
      books: [],
      isFallback: false,
    });

    const response = await GET(
      request('http://localhost/api/immersion/books?q=radio&maxYear=2001')
    );

    expect(response.status).toBe(200);
    expect(mockFetchHistoricalBooks).toHaveBeenCalledWith('radio', 2001);
  });
});
