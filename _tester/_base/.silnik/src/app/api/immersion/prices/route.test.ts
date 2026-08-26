import type { NextRequest } from 'next/server';
import { convertUSD } from '@/lib/immersion/pricing-service';
import { GET } from './route';

jest.mock('@/lib/immersion/pricing-service', () => ({
  convertUSD: jest.fn(),
}));

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

const mockConvertUSD = jest.mocked(convertUSD);

function request(url: string): NextRequest {
  return { url } as NextRequest;
}

describe('immersion prices route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a request without explicit source and target years', async () => {
    const response = await GET(
      request('http://localhost/api/immersion/prices')
    );

    expect(response.status).toBe(400);
    expect(mockConvertUSD).not.toHaveBeenCalled();
  });

  it('passes explicit years to the conversion service', async () => {
    mockConvertUSD.mockResolvedValue({
      originalAmount: 10,
      originalYear: 2026,
      targetYear: 2001,
      convertedAmount: 5,
      inflationMultiplier: 0.5,
      isFallback: false,
    });

    const response = await GET(
      request(
        'http://localhost/api/immersion/prices?amount=10&originalYear=2026&targetYear=2001'
      )
    );

    expect(response.status).toBe(200);
    expect(mockConvertUSD).toHaveBeenCalledWith(10, 2026, 2001);
  });
});
