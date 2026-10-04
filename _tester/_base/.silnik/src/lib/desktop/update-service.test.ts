import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  canPerformSelfUpdate,
  checkForDesktopUpdate,
  getUpdatePackageForPlatform,
  isNewerStableVersion,
  readUpdateStatus,
  resolveAppTarget,
  validateManifest,
} from './update-service';

const sha = 'a'.repeat(64);
const manifest = {
  schemaVersion: 1,
  version: '0.9.6',
  channel: 'stable',
  bundleId: 'com.aios.straznik-tajemnic-ai',
  minimumMacOSVersion: '11.0',
  package: { name: 'app.zip', url: 'https://example.com/app.zip', size: 123, sha256: sha },
  releaseNotes: 'https://example.com/notes',
} as const;

describe('desktop update service', () => {
  const previousManifestUrl = process.env.ZEW_UPDATE_MANIFEST_URL;
  const previousSelfUpdate = process.env.ZEW_DESKTOP_SELF_UPDATE;
  const previousDataDir = process.env.ZEW_DATA_DIR;

  afterEach(() => {
    if (previousManifestUrl === undefined) delete process.env.ZEW_UPDATE_MANIFEST_URL; else process.env.ZEW_UPDATE_MANIFEST_URL = previousManifestUrl;
    if (previousSelfUpdate === undefined) delete process.env.ZEW_DESKTOP_SELF_UPDATE; else process.env.ZEW_DESKTOP_SELF_UPDATE = previousSelfUpdate;
    if (previousDataDir === undefined) delete process.env.ZEW_DATA_DIR; else process.env.ZEW_DATA_DIR = previousDataDir;
  });

  it('accepts only stable V1 manifests with HTTPS and the expected bundle ID', () => {
    expect(validateManifest(manifest)?.version).toBe('0.9.6');
    expect(validateManifest({ ...manifest, version: '0.9.6-beta.1' })).toBeNull();
    expect(validateManifest({ ...manifest, bundleId: 'evil.bundle' })).toBeNull();
    expect(validateManifest({ ...manifest, minimumMacOSVersion: 'latest' })).toBeNull();
    expect(validateManifest({ ...manifest, package: { ...manifest.package, url: 'http://example.com/app.zip' } })).toBeNull();
  });

  it('compares semantic stable versions without accepting prereleases', () => {
    expect(isNewerStableVersion('0.9.3', '0.10.0')).toBe(true);
    expect(isNewerStableVersion('0.9.3', '0.9.3')).toBe(false);
    expect(isNewerStableVersion('0.9.3', '0.9.4-beta.1')).toBe(false);
  });

  it('reports an update but disables installation outside an app bundle', async () => {
    process.env.ZEW_UPDATE_MANIFEST_URL = 'https://example.com/manifest.json';
    process.env.ZEW_DESKTOP_SELF_UPDATE = '0';
    const fetcher = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => manifest,
    })) as unknown as typeof fetch;
    const result = await checkForDesktopUpdate(fetcher);
    expect(result).toMatchObject({ available: true, currentVersion: '0.9.5', canSelfUpdate: false });
  });

  it('returns a durable idle status when no worker result exists', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'update-status-'));
    process.env.ZEW_DATA_DIR = directory;
    await expect(readUpdateStatus()).resolves.toMatchObject({ id: 'none', state: 'idle' });
    fs.rmSync(directory, { recursive: true, force: true });
  });

  describe('getUpdatePackageForPlatform', () => {
    const macPkg = { name: 'straznik-macos.zip', url: 'https://example.com/mac.zip', size: 100, sha256: sha };
    const winPkg = { name: 'straznik-windows.zip', url: 'https://example.com/win.zip', size: 200, sha256: sha };

    it('returns the platform-specific package when available in packages/platforms', () => {
      const unifiedManifest = {
        ...manifest,
        packages: { darwin: macPkg, win32: winPkg },
        platforms: { macos: macPkg, windows: winPkg },
      };
      expect(getUpdatePackageForPlatform(unifiedManifest as never, 'darwin')).toEqual(macPkg);
      expect(getUpdatePackageForPlatform(unifiedManifest as never, 'win32')).toEqual(winPkg);
    });

    it('rejects macOS fallback package on Windows and Windows fallback package on macOS', () => {
      const macOnlyManifest = {
        ...manifest,
        package: macPkg,
        packages: { darwin: macPkg },
      };
      expect(getUpdatePackageForPlatform(macOnlyManifest as never, 'win32')).toBeNull();
      expect(getUpdatePackageForPlatform(macOnlyManifest as never, 'darwin')).toEqual(macPkg);

      const winOnlyManifest = {
        ...manifest,
        package: winPkg,
        packages: { win32: winPkg },
      };
      expect(getUpdatePackageForPlatform(winOnlyManifest as never, 'darwin')).toBeNull();
      expect(getUpdatePackageForPlatform(winOnlyManifest as never, 'win32')).toEqual(winPkg);
    });

    it('falls back to manifest.package on non-windows non-darwin platforms (e.g. linux CI)', () => {
      const genericManifest = {
        ...manifest,
        package: macPkg,
      };
      expect(getUpdatePackageForPlatform(genericManifest as never, 'linux')).toEqual(macPkg);
    });
  });

  describe('canPerformSelfUpdate and resolveAppTarget', () => {
    const origPlatform = process.platform;
    const origAppBundle = process.env.ZEW_APP_BUNDLE;
    const origColdStart = process.env.STRAZNIK_DESKTOP_COLD_START;

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: origPlatform });
      if (origAppBundle === undefined) delete process.env.ZEW_APP_BUNDLE; else process.env.ZEW_APP_BUNDLE = origAppBundle;
      if (origColdStart === undefined) delete process.env.STRAZNIK_DESKTOP_COLD_START; else process.env.STRAZNIK_DESKTOP_COLD_START = origColdStart;
    });

    it('rejects self-update on Windows when only ZEW_DATA_DIR is set', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.ZEW_DATA_DIR = 'C:\\Some\\Data\\Dir';
      delete process.env.STRAZNIK_DESKTOP_COLD_START;
      delete process.env.ZEW_APP_DIR;
      delete process.env.ZEW_APP_BUNDLE;
      delete process.env.ZEW_DESKTOP_SELF_UPDATE;

      expect(canPerformSelfUpdate()).toBe(false);
      expect(() => resolveAppTarget()).toThrow('Self-update is unavailable outside a packaged desktop installation');
    });

    it('allows self-update on Windows when cold-start flag is active', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.STRAZNIK_DESKTOP_COLD_START = '1';
      delete process.env.ZEW_DESKTOP_SELF_UPDATE;

      expect(canPerformSelfUpdate()).toBe(true);
    });
  });
});
