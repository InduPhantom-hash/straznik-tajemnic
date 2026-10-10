import { NextRequest } from 'next/server';
import { POST } from './route';
import { recordUserUsage } from '@/lib/user-usage';
import { logApiEvent } from '@/lib/telemetry';

jest.mock('@/lib/auth-user', () => ({ resolveUserId: jest.fn().mockResolvedValue('test') }));
jest.mock('@/lib/user-usage', () => ({ recordUserUsage: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/telemetry', () => ({ generateTraceId: () => 'test', startTimer: () => ({ elapsed: () => 1 }), logApiEvent: jest.fn().mockResolvedValue(undefined) }));
jest.mock('next/server', () => ({
  NextRequest: class {
    headers: Headers;
    bodyText: string;
    constructor(_url: string, init: { headers: Record<string, string>; body: string }) { this.headers = new Headers(init.headers); this.bodyText = init.body; }
    async json() { return JSON.parse(this.bodyText); }
    clone() { return this; }
  },
  NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ ok: (init?.status ?? 200) < 400, status: init?.status ?? 200, json: async () => body, clone() { return this; } }) },
}));
const image = { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'synthetic' } }] } }] };
function request(prompt: string, key = 'test-owner', era = '1920', seed?: string) {
  return new NextRequest('http://localhost/api/imagen', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Gemini-Api-Key': key }, body: JSON.stringify({ prompt, era, seed }) });
}
describe('image generation deduplication', () => {
  beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn().mockImplementation(async () => { await new Promise(r => setTimeout(r, 10)); return { ok: true, json: async () => image }; }); });
  it('generates once for concurrent identical requests', async () => {
    const results = await Promise.all([POST(request('concurrent-room')), POST(request('concurrent-room'))]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((await results[0].json()).success).toBe(true);
    expect(await results[1].json()).toMatchObject({ success: true, cost: 0, metadata: { source: 'in-flight' } });
  });
  it('isolates different owners and eras', async () => {
    await POST(request('isolated-room', 'owner-one'));
    await POST(request('isolated-room', 'owner-two'));
    await POST(request('isolated-room', 'owner-two', '1890'));
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
  it('reuses completed result but honours explicit regeneration', async () => {
    await POST(request('reusable-room'));
    await POST(request('reusable-room'));
    await POST(request('reusable-room', 'test-owner', '1920', 'new-seed'));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
  it('charges a text-only attempt followed by image success once per attempt', async () => {
    jest.mocked(global.fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ candidates: [], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, thoughtsTokenCount: 20 } }) } as Response);
    jest.mocked(global.fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ...image, usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 1120, candidatesTokensDetails: [{ modality: 'IMAGE', tokenCount: 1120 }] } }) } as Response);
    const result = await (await POST(request('paid-text-retry'))).json();
    expect(result.cost).toBeCloseTo(0.06739);
    expect(recordUserUsage).toHaveBeenCalledTimes(2);
    const loggedCost = jest.mocked(logApiEvent).mock.calls.reduce((sum, [event]) => sum + (event.costUsd ?? 0), 0);
    expect(loggedCost).toBeCloseTo(result.cost);
  });

});
