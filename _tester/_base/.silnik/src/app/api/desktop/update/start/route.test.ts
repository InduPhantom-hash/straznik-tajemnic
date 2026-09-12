import { POST } from './route';
import { isAiGenerationActive } from '@/lib/desktop/generation-state';
import { checkForDesktopUpdate, startDetachedUpdate } from '@/lib/desktop/update-service';

jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }) } }));
jest.mock('@/lib/desktop/generation-state', () => ({ isAiGenerationActive: jest.fn() }));
jest.mock('@/lib/desktop/update-service', () => ({ checkForDesktopUpdate: jest.fn(), startDetachedUpdate: jest.fn() }));

function request(origin = 'http://localhost:4050') {
  return { url: 'http://localhost:4050/api/desktop/update/start', headers: { get: (name: string) => name === 'origin' ? origin : null } } as Request;
}

describe('POST /api/desktop/update/start', () => {
  const previousDesktop = process.env.STRAZNIK_DESKTOP_UPDATE;
  const previousSelf = process.env.ZEW_DESKTOP_SELF_UPDATE;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRAZNIK_DESKTOP_UPDATE = '1';
    process.env.ZEW_DESKTOP_SELF_UPDATE = '1';
    jest.mocked(isAiGenerationActive).mockReturnValue(false);
  });
  afterAll(() => {
    if (previousDesktop === undefined) delete process.env.STRAZNIK_DESKTOP_UPDATE; else process.env.STRAZNIK_DESKTOP_UPDATE = previousDesktop;
    if (previousSelf === undefined) delete process.env.ZEW_DESKTOP_SELF_UPDATE; else process.env.ZEW_DESKTOP_SELF_UPDATE = previousSelf;
  });

  it('blocks installation during AI generation', async () => {
    jest.mocked(isAiGenerationActive).mockReturnValue(true);
    expect((await POST(request())).status).toBe(409);
    expect(startDetachedUpdate).not.toHaveBeenCalled();
  });

  it('never modifies a development checkout', async () => {
    process.env.ZEW_DESKTOP_SELF_UPDATE = '0';
    expect((await POST(request())).status).toBe(409);
    expect(startDetachedUpdate).not.toHaveBeenCalled();
  });

  it('starts the detached worker for a freshly verified stable manifest', async () => {
    const manifest = { version: '0.9.4' };
    jest.mocked(checkForDesktopUpdate).mockResolvedValue({ available: true, configured: true, currentVersion: '0.9.3', manifest, canSelfUpdate: true } as never);
    jest.mocked(startDetachedUpdate).mockResolvedValue(123);
    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(startDetachedUpdate).toHaveBeenCalledWith(manifest);
  });
});
