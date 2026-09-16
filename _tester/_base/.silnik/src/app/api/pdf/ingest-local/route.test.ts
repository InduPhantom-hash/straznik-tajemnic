import { NextRequest } from 'next/server';
import { embeddingService } from '@/lib/embedding-service';
import { pdfParserService } from '@/lib/pdf-parser-service';
import { pdfIndexingService } from '@/lib/vector-db/pdf-indexing-service';
import { POST } from './route';

jest.mock('next/server', () => ({
  NextRequest: class {
    headers: Headers;
    json = jest.fn();
    formData = jest.fn();
    constructor(_url: string, init: { headers: Record<string, string> }) {
      this.headers = new Headers(init.headers);
    }
  },
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
  },
}));
jest.mock('@/lib/vector-db/local-vector-store', () => ({
  localVectorStore: {
    getNamespaceCount: jest.fn(),
    replaceNamespace: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('POST /api/pdf/ingest-local document policy', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['pl', 'en'])('blocks adventure documents (%s)', async (locale) => {
    const request = new NextRequest('http://localhost/api/synthetic', {
      headers: { 'x-locale': locale, 'content-type': 'application/json' },
    });
    jest.spyOn(request, 'json').mockResolvedValueOnce({
      text: 'Synthetic adventure text that definitely meets the minimum length requirement of 100 characters for document indexing in this endpoint...',
      type: 'adventure',
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'DOCUMENT_MODEL_USE_BLOCKED' });
    expect(embeddingService.initialize).not.toHaveBeenCalled();
    expect(pdfIndexingService.indexPdf).not.toHaveBeenCalled();
  });

  it('allows local rules ingestion in clean room mode (zero citations to LLM)', async () => {
    const sampleRulesText =
      'Call of Cthulhu 7th Edition Księga Strażnika. Poczytalność (Sanity), Walka (Combat), Umiejętności i rzuty kośćmi k100.';

    const request = new NextRequest('http://localhost/api/synthetic', {
      headers: { 'content-type': 'application/json' },
    });
    jest.spyOn(request, 'json').mockResolvedValueOnce({
      text: sampleRulesText,
      type: 'rules',
      fileName: 'core_rules.pdf',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.rulebookProfile).toBeDefined();
    expect(body.namespace).toBe('rules');
    expect(localVectorStore.replaceNamespace).toHaveBeenCalled();
    // Zero cytowań do LLM: embedding service i zdalne indeksowanie nie są wywoływane
    expect(embeddingService.initialize).not.toHaveBeenCalled();
    expect(pdfIndexingService.indexPdf).not.toHaveBeenCalled();
  });
});

import { GET } from './route';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';

describe('GET /api/pdf/ingest-local', () => {
  const mockGetStats = jest.mocked(localVectorStore.getNamespaceCount);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('zwraca błąd dla nieprawidłowego typu', async () => {
    const req = {
      url: 'http://localhost/api/pdf/ingest-local?type=wrong',
    } as unknown as NextRequest;
    
    mockGetStats.mockReturnValueOnce(0);

    const response = await GET(req);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      type: 'wrong',
      recordCount: 0
    });
  });

  it('zwraca statystyki dla rules', async () => {
    mockGetStats.mockReturnValueOnce(42);

    const req = {
      url: 'http://localhost/api/pdf/ingest-local?type=rules',
    } as unknown as NextRequest;

    const response = await GET(req);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      recordCount: 42,
      type: 'rules',
    });
  });
});
