import type { NextRequest } from 'next/server';
import { embeddingService } from '@/lib/embedding-service';
import { pdfParserService } from '@/lib/pdf-parser-service';
import { pdfIndexingService } from '@/lib/vector-db/pdf-indexing-service';
import { POST } from './route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));
jest.mock('@/lib/embedding-service', () => ({
  embeddingService: { initialize: jest.fn() },
}));
jest.mock('@/lib/pdf-parser-service', () => ({
  pdfParserService: { parsePDFBuffer: jest.fn() },
}));
jest.mock('@/lib/vector-db/pdf-indexing-service', () => ({
  pdfIndexingService: {
    indexPdf: jest.fn(),
    getNamespaceStats: jest.fn(),
  },
}));

const mockedParser = jest.mocked(pdfParserService.parsePDFBuffer);
const mockedIndexer = jest.mocked(pdfIndexingService.indexPdf);

function pdfFile(size?: number): File {
  const file = new File(['%PDF-1.7 test'], 'rules.pdf', {
    type: 'application/pdf',
  });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => Buffer.from('%PDF-1.7 test'),
  });
  if (size !== undefined) Object.defineProperty(file, 'size', { value: size });
  return file;
}

function request(file: File, apiKey: string | null = 'key', type = 'rules') {
  return {
    headers: { get: () => apiKey },
    formData: async () => ({
      get: (name: string) =>
        name === 'file' ? file : name === 'type' ? type : null,
    }),
  } as unknown as NextRequest;
}

describe('POST /api/pdf/ingest-local', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
    mockedParser.mockResolvedValue({
      text: 'x'.repeat(500),
      pages: 1,
      metadata: {},
      size: 100,
    });
    mockedIndexer.mockResolvedValue({
      success: true,
      indexed: 1,
      failed: 0,
      totalChunks: 1,
      namespace: 'rules',
      durationMs: 10,
    });
  });

  it('wymaga klucza Gemini', async () => {
    const response = await POST(request(pdfFile(), null));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      indexed: 0,
      failed: 0,
      totalChunks: 0,
      namespace: '',
      durationMs: expect.any(Number),
      error: expect.any(String),
    });
  });

  it('odrzuca typ inny niż PDF', async () => {
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });
    expect((await POST(request(file))).status).toBe(400);
  });

  it('odrzuca plik powyżej 500 MB', async () => {
    expect((await POST(request(pdfFile(500 * 1024 * 1024 + 1)))).status).toBe(
      400
    );
  });

  it('odrzuca PDF bez dostatecznej warstwy tekstowej', async () => {
    mockedParser.mockResolvedValueOnce({
      text: 'krótki',
      pages: 1,
      metadata: {},
      size: 100,
    });
    expect((await POST(request(pdfFile()))).status).toBe(422);
    expect(mockedIndexer).not.toHaveBeenCalled();
  });

  it('indeksuje zasady lokalnie z clearBefore', async () => {
    const response = await POST(request(pdfFile()));

    expect(response.status).toBe(200);
    expect(embeddingService.initialize).toHaveBeenCalledWith('key');
    expect(mockedIndexer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rules', clearBefore: true })
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      namespace: 'rules',
    });
  });

  it('dodaje przygodę bez czyszczenia istniejącego namespace', async () => {
    await POST(request(pdfFile(), 'key', 'adventure'));
    expect(mockedIndexer).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'adventure', clearBefore: false })
    );
  });
});

import { GET } from './route';

describe('GET /api/pdf/ingest-local', () => {
  const mockGetStats = jest.mocked(pdfIndexingService.getNamespaceStats);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('zwraca błąd dla nieprawidłowego typu', async () => {
    const req = {
      url: 'http://localhost/api/pdf/ingest-local?type=wrong',
    } as unknown as NextRequest;

    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it('zwraca statystyki dla rules', async () => {
    mockGetStats.mockResolvedValueOnce({
      recordCount: 42,
      namespace: 'rules',
    });

    const req = {
      url: 'http://localhost/api/pdf/ingest-local?type=rules',
    } as unknown as NextRequest;

    const response = await GET(req);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      recordCount: 42,
      namespace: 'rules',
      initialized: true,
    });
  });
});
