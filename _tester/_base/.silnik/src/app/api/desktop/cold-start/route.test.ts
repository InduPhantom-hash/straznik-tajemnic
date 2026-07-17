import { mkdir, writeFile } from 'node:fs/promises';
import { GET, POST } from './route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

const mockedMkdir = jest.mocked(mkdir);
const mockedWriteFile = jest.mocked(writeFile);
const ENDPOINT = 'http://localhost:4040/api/desktop/cold-start';

function request(origin = 'http://localhost:4040') {
  return {
    url: ENDPOINT,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'origin' ? origin : null),
    },
  } as Request;
}

describe('POST /api/desktop/cold-start', () => {
  const previousFlag = process.env.STRAZNIK_DESKTOP_COLD_START;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.STRAZNIK_DESKTOP_COLD_START;
  });

  afterAll(() => {
    if (previousFlag === undefined) {
      delete process.env.STRAZNIK_DESKTOP_COLD_START;
    } else {
      process.env.STRAZNIK_DESKTOP_COLD_START = previousFlag;
    }
  });

  it('odrzuca zwykły tryb deweloperski bez zapisu sygnału', async () => {
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('zgłasza launcherowi dostępność mostu', async () => {
    expect((await GET().json()) as unknown).toEqual({ available: false });

    process.env.STRAZNIK_DESKTOP_COLD_START = '1';

    expect((await GET().json()) as unknown).toEqual({ available: true });
  });

  it('odrzuca żądanie spoza aplikacji', async () => {
    process.env.STRAZNIK_DESKTOP_COLD_START = '1';

    const response = await POST(request('https://example.com'));

    expect(response.status).toBe(403);
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('zapisuje lokalny sygnał dla launchera desktopowego', async () => {
    process.env.STRAZNIK_DESKTOP_COLD_START = '1';
    mockedMkdir.mockResolvedValue(undefined);
    mockedWriteFile.mockResolvedValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(202);
    expect(mockedMkdir).toHaveBeenCalledWith(
      expect.stringContaining('.desktop'),
      { recursive: true }
    );
    expect(mockedWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('cold-start-requested'),
      expect.any(String),
      'utf8'
    );
  });
});
