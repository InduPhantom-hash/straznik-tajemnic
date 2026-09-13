import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { POST } from './route';

jest.mock('@google/genai', () => ({ GoogleGenAI: jest.fn() }));
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

describe('POST /api/adventure/setup document policy', () => {
  beforeEach(() => jest.clearAllMocks());
  it('rejects unclassified sources before parsing or contacting a model', async () => {
    const request = new NextRequest('http://localhost/api/synthetic', {
      headers: { 'x-locale': 'en' },
    });
    const json = jest.spyOn(request, 'json');
    const response = await POST(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'DOCUMENT_MODEL_USE_BLOCKED' });
    expect(json).not.toHaveBeenCalled();
    expect(GoogleGenAI).not.toHaveBeenCalled();
  });
});
