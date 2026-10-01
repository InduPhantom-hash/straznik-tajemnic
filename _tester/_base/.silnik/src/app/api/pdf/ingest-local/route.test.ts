import fs from 'fs';
import os from 'os';
import path from 'path';
import { NextRequest } from 'next/server';
import { embeddingService } from '@/lib/embedding-service';
import { pdfIndexingService } from '@/lib/vector-db/pdf-indexing-service';
import { POST, GET, DELETE } from './route';
import { localVectorStore } from '@/lib/vector-db/local-vector-store';

jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    headers: Headers;
    json = jest.fn();
    formData = jest.fn();
    constructor(url: string, init?: { headers?: Record<string, string> }) {
      this.url = url;
      this.headers = new Headers(init?.headers || {});
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
    deleteNamespace: jest.fn().mockResolvedValue(undefined),
  },
}));

const tmpDir = path.join(os.tmpdir(), `straznik-ingest-test-${Date.now()}`);

jest.mock('@/lib/paths', () => ({
  getWritableDataDir: () => tmpDir,
}));

describe('POST & DELETE /api/pdf/ingest-local document policy & library manager', () => {
  beforeAll(() => {
    process.env.RAG_DATA_DIR = path.join(tmpDir, 'rag');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('allows local adventure ingestion in clean room mode (zero citations to LLM)', async () => {
    const sampleAdventureText =
      'Cień nad Prabutami. Rok 1925, Arkham. Jackson Elias, lat 38, pisarz i badacz. Rekwizyt 1: Tajemniczy list z Kairu opisujący mroczny kult.';

    const request = new NextRequest('http://localhost/api/synthetic', {
      headers: { 'content-type': 'application/json' },
    });
    jest.spyOn(request, 'json').mockResolvedValueOnce({
      text: sampleAdventureText,
      type: 'adventure',
      fileName: 'przygoda.pdf',
    });

    const response = await POST(request);
    expect(response).toBeDefined();
    if (!response) return;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.adventure).toBeDefined();
    expect(body.adventure.title).toBeDefined();
    expect(body.adventure.graph).toBeDefined();
    expect(body.actualColumn).toBe('optional');
    expect(body.capabilities.installedOverlays).toHaveLength(1);
    expect(localVectorStore.replaceNamespace).toHaveBeenCalled();
    expect(embeddingService.initialize).not.toHaveBeenCalled();
    expect(pdfIndexingService.indexPdf).not.toHaveBeenCalled();
  });

  it('allows local rules ingestion in clean room mode (zero citations to LLM)', async () => {
    const sampleRulesText =
      'Call of Cthulhu 7th Edition Księga Strażnika. Poczytalność (Sanity), Walka (Combat), Pościgi (Chases), Wielki Grymuar i Magia, Umiejętności i rzuty kośćmi k100.';

    const request = new NextRequest('http://localhost/api/synthetic', {
      headers: { 'content-type': 'application/json' },
    });
    jest.spyOn(request, 'json').mockResolvedValueOnce({
      text: sampleRulesText,
      type: 'rules',
      fileName: 'core_rules.pdf',
    });

    const response = await POST(request);
    expect(response).toBeDefined();
    if (!response) return;

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.rulebookProfile).toBeDefined();
    expect(body.namespace).toBe('rules');
    expect(body.actualColumn).toBe('rules');
    expect(body.capabilities.flags.hasBaseRules).toBe(true);
    expect(localVectorStore.replaceNamespace).toHaveBeenCalled();
    expect(embeddingService.initialize).not.toHaveBeenCalled();
    expect(pdfIndexingService.indexPdf).not.toHaveBeenCalled();
  });

  it('auto-routes adventure dropped into rules column to optional column and extracts scenarios', async () => {
    const anthologyText =
      'Cienie Tatr. Antologia scenariuszy d100 osadzonych w polskich Tatrach. Spis treści: Scenariusz 1: Na Grani, Scenariusz 2: Morskie Oko w Mroku. Badacze i poszlaki.';

    const request = new NextRequest('http://localhost/api/pdf/ingest-local', {
      headers: { 'content-type': 'application/json' },
    });
    jest.spyOn(request, 'json').mockResolvedValueOnce({
      text: anthologyText,
      type: 'rules',
      targetColumn: 'rules',
      fileName: 'cienie_tatr.pdf',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.rulebookProfile.profile).toBe('scenario_anthology');
    expect(body.requestedColumn).toBe('rules');
    expect(body.actualColumn).toBe('optional');
    expect(body.autoRouted).toBe(true);
    expect(body.routingKind).toBe('moved_to_optional');
    expect(body.adventures.length).toBeGreaterThanOrEqual(1);
    expect(body.capabilities.flags.hasBaseRules).toBe(false);
  });

  it('extracts starter scenario when uploading starter-d100 and cascades deletion on DELETE', async () => {
    const starterText =
      'Zew Cthulhu Starter. Zasady skrócone Quick-Start d100. Tworzenie Badacza, test umiejętności k100. Scenariusz: Nawiedzony dom i posiadłość Corbitta w Bostonie.';

    const postReq = new NextRequest('http://localhost/api/pdf/ingest-local', {
      headers: { 'content-type': 'application/json' },
    });
    jest.spyOn(postReq, 'json').mockResolvedValueOnce({
      text: starterText,
      type: 'rules',
      targetColumn: 'rules',
      fileName: 'starter_coc.pdf',
    });

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.rulebookProfile.profile).toBe('starter-d100');
    expect(postBody.actualColumn).toBe('rules');
    expect(postBody.capabilities.flags.hasBaseRules).toBe(true);
    expect(postBody.adventures).toHaveLength(1);
    const starterAdvId = postBody.adventures[0].id;
    const overlayId = postBody.overlay.id;

    const advFilePath = path.join(tmpDir, 'adventures', `${starterAdvId}.json`);
    expect(fs.existsSync(advFilePath)).toBe(true);

    // Usuwamy Starter przez DELETE i sprawdzamy kaskadowe usunięcie przygody i flagi hasBaseRules
    const delReq = new NextRequest(
      `http://localhost/api/pdf/ingest-local?overlayId=${encodeURIComponent(overlayId)}`
    );
    const delRes = await DELETE(delReq);
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.success).toBe(true);
    expect(delBody.deletedAdventureIds).toContain(starterAdvId);
    expect(delBody.capabilities.installedOverlays).toHaveLength(0);
    expect(delBody.capabilities.flags.hasBaseRules).toBe(false);
    expect(fs.existsSync(advFilePath)).toBe(false);
  });
});

describe('GET /api/pdf/ingest-local', () => {
  const mockGetStats = jest.mocked(localVectorStore.getNamespaceCount);

  beforeEach(() => {
    jest.clearAllMocks();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
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
      recordCount: 0,
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
      hasBaseRules: true,
    });
  });
});

