import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiClient } from './gemini-client-pool';
import { uploadNativePDFToGemini, uploadPDFTextToGemini, uploadTextFileToGemini } from './gemini-file-service';
import { extractAdventureEntities } from './pdf/adventure-extractor';
import { buildPdfStrategy } from '@/app/api/chat/_helpers/build-pdf-strategy';
import { DOCUMENT_MODEL_USE_BLOCKED } from './document-model-policy';
import { POST as upload } from '@/app/api/upload-pdf/route';
import { POST as parse } from '@/app/api/pdf/parse/route';
import { POST as parseLocal } from '@/app/api/pdf/parse-local/route';
import { POST as ingest } from '@/app/api/pdf/ingest-local/route';
import { POST as extract } from '@/app/api/pdf/extract-text/route';
import { POST as analyze } from '@/app/api/adventure/analyze/route';
import { POST as setup } from '@/app/api/adventure/setup/route';
import { POST as instructions } from '@/app/api/upload-gm-instructions/route';

// Keep the real policy and route entrypoints. No SDK can reach the network.
jest.mock('next/server', () => ({
  NextRequest: class {
    headers: Headers;
    json = jest.fn();
    formData = jest.fn();
    constructor(_url: string, init: { headers: Record<string, string> }) {
      this.headers = new Headers(init.headers);
    }
  },
  NextResponse: { json: (body: unknown, init?: { status?: number }) => ({
    status: init?.status ?? 200, json: async () => body,
  }) },
}));
jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn(), createPartFromUri: jest.fn() }));
jest.mock('@google/generative-ai', () => ({ GoogleGenerativeAI: jest.fn(), SchemaType: {} }));
jest.mock('./gemini-client-pool', () => ({ getGeminiClient: jest.fn() }));
jest.mock('./google-cloud-storage-service-fixed', () => ({ googleCloudStorageService: {} }));
jest.mock('./pdf-parser-service', () => ({ pdfParserService: {} }));
jest.mock('./vector-db/pdf-indexing-service', () => ({ pdfIndexingService: {} }));
jest.mock('./embedding-service', () => ({ embeddingService: {} }));
jest.mock('./mythos/server', () => ({ searchMythos: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

describe.each([
  ['upload', upload], ['parse', parse], ['parse-local', parseLocal],
  ['ingest-local', ingest], ['extract-text', extract], ['analyze', analyze], ['setup', setup],
  ['instructions', instructions],
] as const)('%s document boundary', (_name, post) => {
  it.each(['pl', 'en'])('rejects before reading request contents (%s)', async (locale) => {
    const request = new NextRequest('http://localhost/api/synthetic', {
      method: 'POST', body: 'SYNTHETIC_DOCUMENT_MARKER',
      headers: { 'x-locale': locale, 'x-gemini-api-key': 'synthetic-key' },
    });
    const json = jest.spyOn(request, 'json');
    const form = jest.spyOn(request, 'formData');
    const response = await post(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toMatchObject({ success: false, code: DOCUMENT_MODEL_USE_BLOCKED });
    expect(body.error).toContain(locale === 'en' ? 'Documents are not sent' : 'Dokumenty nie są wysyłane');
    expect(json).not.toHaveBeenCalled();
    expect(form).not.toHaveBeenCalled();
    expect(GoogleGenAI).not.toHaveBeenCalled();
    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
    expect(getGeminiClient).not.toHaveBeenCalled();
  });
});

it('blocks binary, parsed and generic text uploads and entity extraction', async () => {
  await expect(uploadNativePDFToGemini(Buffer.from('synthetic'), 'unknown.pdf', 'key')).rejects.toThrow(DOCUMENT_MODEL_USE_BLOCKED);
  await expect(uploadPDFTextToGemini('synthetic', 'renamed.txt', 'key')).rejects.toThrow(DOCUMENT_MODEL_USE_BLOCKED);
  await expect(uploadTextFileToGemini('synthetic', 'unknown', 'text/plain', 'key')).rejects.toThrow(DOCUMENT_MODEL_USE_BLOCKED);
  await expect(extractAdventureEntities('synthetic', 'unknown', 'key')).rejects.toThrow(DOCUMENT_MODEL_USE_BLOCKED);
  expect(getGeminiClient).not.toHaveBeenCalled();
  expect(GoogleGenerativeAI).not.toHaveBeenCalled();
});

it.each([
  [true, 0, 'start'], [false, 2, 'test zasad'], [false, 20, 'combat rules'], [false, 30, 'look around'],
] as const)('drops old file URIs (start=%s, messages=%s, query=%s)', (isGameStart, length, message) => {
  expect(buildPdfStrategy({
    isGameStart, messages: Array.from({ length }, () => ({})), message,
    pdfMemory: { rulesGeminiFileUri: 'old-rules-uri', adventureGeminiFileUri: 'old-adventure-uri' },
  })).toEqual({ pdfStrategy: 'rag', fileAttachments: [] });
});
