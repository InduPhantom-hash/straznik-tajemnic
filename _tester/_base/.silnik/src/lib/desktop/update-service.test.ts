import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkForDesktopUpdate,
  isNewerStableVersion,
  readUpdateStatus,
  validateManifest,
} from './update-service';

const sha = 'a'.repeat(64);
const manifest = {
  schemaVersion: 1,
  version: '0.9.5',
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
    expect(validateManifest(manifest)?.version).toBe('0.9.5');
    expect(validateManifest({ ...manifest, version: '0.9.5-beta.1' })).toBeNull();
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
    expect(result).toMatchObject({ available: true, currentVersion: '0.9.4', canSelfUpdate: false });
  });

  it('returns a durable idle status when no worker result exists', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'update-status-'));
    process.env.ZEW_DATA_DIR = directory;
    await expect(readUpdateStatus()).resolves.toMatchObject({ id: 'none', state: 'idle' });
    fs.rmSync(directory, { recursive: true, force: true });
  });
});
