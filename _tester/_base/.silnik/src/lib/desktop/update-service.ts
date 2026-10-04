import { copyFile, mkdir, readFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getWritableDataDir } from '@/lib/paths';

export const UPDATE_BUNDLE_ID = 'com.aios.straznik-tajemnic-ai';
export const UPDATE_STATUS_FILE = 'status.json';

export interface PackageInfo {
  name: string;
  url: string;
  size: number;
  sha256: string;
}

export interface DesktopUpdateManifest {
  schemaVersion: 1;
  version: string;
  channel: 'stable';
  bundleId: string;
  minimumMacOSVersion?: string;
  package?: PackageInfo;
  packages?: {
    darwin?: PackageInfo;
    win32?: PackageInfo;
    macos?: PackageInfo;
    windows?: PackageInfo;
    [key: string]: PackageInfo | undefined;
  };
  platforms?: {
    darwin?: PackageInfo;
    win32?: PackageInfo;
    macos?: PackageInfo;
    windows?: PackageInfo;
    [key: string]: PackageInfo | undefined;
  };
  releaseNotes: string;
}

export interface DesktopUpdateStatus {
  id: string;
  state: 'idle' | 'downloading' | 'verifying' | 'installing' | 'restarting' | 'succeeded' | 'rolled_back' | 'failed';
  version?: string;
  message?: string;
  updatedAt: string;
}

function parseVersion(value: string): [number, number, number] | null {
  const match = value.match(/^(\d+)\.(\d+)\.(\d+)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function isMacOSVersion(value: string): boolean {
  return /^\d+\.\d+(?:\.\d+)?$/.test(value);
}

function isValidPackageInfo(pkg: unknown): pkg is PackageInfo {
  if (!pkg || typeof pkg !== 'object') return false;
  const p = pkg as Partial<PackageInfo>;
  return (
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    typeof p.url === 'string' &&
    p.url.startsWith('https://') &&
    Number.isSafeInteger(p.size) &&
    (p.size ?? 0) > 0 &&
    typeof p.sha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(p.sha256)
  );
}

export function isNewerStableVersion(current: string, candidate: string): boolean {
  const a = parseVersion(current);
  const b = parseVersion(candidate);
  if (!a || !b) return false;
  for (let index = 0; index < 3; index += 1) {
    if (b[index] !== a[index]) return b[index] > a[index];
  }
  return false;
}

export function getUpdatePackageForPlatform(
  manifest: DesktopUpdateManifest,
  platform: NodeJS.Platform = process.platform
): PackageInfo | null {
  if (platform === 'win32') {
    return (
      manifest.packages?.win32 ??
      manifest.platforms?.windows ??
      manifest.packages?.windows ??
      (manifest.package && manifest.package.name.toLowerCase().includes('win') ? manifest.package : null) ??
      manifest.package ??
      null
    );
  }
  if (platform === 'darwin') {
    return (
      manifest.packages?.darwin ??
      manifest.platforms?.macos ??
      manifest.packages?.macos ??
      manifest.package ??
      null
    );
  }
  return manifest.packages?.[platform] ?? manifest.package ?? null;
}

export function validateManifest(value: unknown): DesktopUpdateManifest | null {
  if (!value || typeof value !== 'object') return null;
  const manifest = value as Partial<DesktopUpdateManifest>;

  if (
    manifest.schemaVersion !== 1 ||
    manifest.channel !== 'stable' ||
    manifest.bundleId !== UPDATE_BUNDLE_ID ||
    !parseVersion(manifest.version ?? '')
  ) {
    return null;
  }

  if (manifest.minimumMacOSVersion !== undefined) {
    if (typeof manifest.minimumMacOSVersion !== 'string' || !isMacOSVersion(manifest.minimumMacOSVersion)) {
      return null;
    }
  }

  if (typeof manifest.releaseNotes !== 'string') return null;
  if (manifest.releaseNotes !== '' && !manifest.releaseNotes.startsWith('https://')) return null;

  // Validate packages
  let hasValidPackage = false;

  if (manifest.package !== undefined) {
    if (!isValidPackageInfo(manifest.package)) return null;
    hasValidPackage = true;
  }

  if (manifest.packages !== undefined) {
    if (typeof manifest.packages !== 'object') return null;
    for (const val of Object.values(manifest.packages)) {
      if (val !== undefined) {
        if (!isValidPackageInfo(val)) return null;
        hasValidPackage = true;
      }
    }
  }

  if (manifest.platforms !== undefined) {
    if (typeof manifest.platforms !== 'object') return null;
    for (const val of Object.values(manifest.platforms)) {
      if (val !== undefined) {
        if (!isValidPackageInfo(val)) return null;
        hasValidPackage = true;
      }
    }
  }

  if (!hasValidPackage) return null;

  return manifest as DesktopUpdateManifest;
}

export function canPerformSelfUpdate(): boolean {
  if (process.env.ZEW_DESKTOP_SELF_UPDATE === '0') return false;
  if (process.env.ZEW_DESKTOP_SELF_UPDATE === '1') return true;

  if (process.platform === 'darwin') {
    const appBundle = process.env.ZEW_APP_BUNDLE;
    return !!(appBundle && appBundle.endsWith('.app'));
  }

  if (process.platform === 'win32') {
    return !!(
      process.env.STRAZNIK_DESKTOP_COLD_START === '1' ||
      process.env.ZEW_APP_DIR ||
      process.env.ZEW_DATA_DIR
    );
  }

  return false;
}

export async function getCurrentVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), 'utf8')) as { version?: string };
  return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
}

export async function checkForDesktopUpdate(fetcher: typeof fetch = fetch) {
  const currentVersion = await getCurrentVersion();
  const manifestUrl = process.env.ZEW_UPDATE_MANIFEST_URL?.trim();
  if (!manifestUrl) return { available: false, configured: false, currentVersion };
  if (!manifestUrl.startsWith('https://')) throw new Error('Update manifest URL must use HTTPS');
  const response = await fetcher(manifestUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Manifest download failed: ${response.status}`);
  const manifest = validateManifest(await response.json());
  if (!manifest) throw new Error('Invalid update manifest');

  const targetPackage = getUpdatePackageForPlatform(manifest);
  const isAvailable = isNewerStableVersion(currentVersion, manifest.version) && targetPackage !== null;
  const selfUpdateAvailable = canPerformSelfUpdate();

  // If running in desktop mode on Windows where self-update is available, ensure env is synced for API routes
  if (process.platform === 'win32' && selfUpdateAvailable && process.env.ZEW_DESKTOP_SELF_UPDATE === undefined) {
    process.env.ZEW_DESKTOP_SELF_UPDATE = '1';
  }

  return {
    available: isAvailable,
    configured: true,
    currentVersion,
    manifest,
    canSelfUpdate: selfUpdateAvailable,
  };
}

export function updatesDirectory(): string {
  return path.join(getWritableDataDir(), 'updates');
}

export async function readUpdateStatus(): Promise<DesktopUpdateStatus> {
  try {
    return JSON.parse(await readFile(path.join(updatesDirectory(), UPDATE_STATUS_FILE), 'utf8')) as DesktopUpdateStatus;
  } catch {
    return { id: 'none', state: 'idle', updatedAt: new Date(0).toISOString() };
  }
}

function resolveAppTarget(): string {
  const platform = process.platform;
  if (platform === 'darwin') {
    const appBundle = process.env.ZEW_APP_BUNDLE;
    if (appBundle && appBundle.endsWith('.app')) return appBundle;
    throw new Error('Self-update is unavailable outside an application bundle');
  }

  if (platform === 'win32') {
    const explicit = process.env.ZEW_APP_DIR || process.env.ZEW_APP_BUNDLE;
    if (explicit && fs.existsSync(explicit)) return explicit;

    const cwd = process.cwd();
    const parent = path.resolve(cwd, '..');
    if (fs.existsSync(path.join(parent, 'Graj - Strażnik Tajemnic.cmd')) || fs.existsSync(path.join(parent, 'runtime'))) {
      return parent;
    }
    if (fs.existsSync(path.join(cwd, 'Graj - Strażnik Tajemnic.cmd')) || fs.existsSync(path.join(cwd, 'runtime'))) {
      return cwd;
    }
    return cwd;
  }

  return process.env.ZEW_APP_DIR || process.cwd();
}

export async function startDetachedUpdate(manifest: DesktopUpdateManifest): Promise<number> {
  if (!canPerformSelfUpdate()) {
    throw new Error('Self-update is unavailable outside an application bundle');
  }

  const platform = process.platform;
  const targetPackage = getUpdatePackageForPlatform(manifest, platform) || manifest.package;
  if (!targetPackage) {
    throw new Error(`No compatible package found for platform: ${platform}`);
  }

  const targetPath = resolveAppTarget();
  const updateDir = updatesDirectory();
  await mkdir(updateDir, { recursive: true });

  const candidateWorkerPaths = [
    path.join(process.cwd(), 'desktop', 'update-worker.mjs'),
    path.join(process.cwd(), 'runtime', 'desktop', 'update-worker.mjs'),
    path.resolve(process.cwd(), '..', 'desktop', 'update-worker.mjs'),
    path.resolve(process.cwd(), '..', 'runtime', 'desktop', 'update-worker.mjs'),
    path.resolve(__dirname, '../../../../desktop/update-worker.mjs'),
    path.resolve(__dirname, '../../../../../desktop/update-worker.mjs'),
  ];

  const sourceWorker = candidateWorkerPaths.find((p) => fs.existsSync(p)) || path.join(process.cwd(), 'desktop', 'update-worker.mjs');
  const detachedWorker = path.join(updateDir, 'update-worker.mjs');
  await copyFile(sourceWorker, detachedWorker);

  const args = [
    detachedWorker,
    '--target', targetPath,
    '--url', targetPackage.url,
    '--sha256', targetPackage.sha256,
    '--version', manifest.version,
    '--bundle-id', manifest.bundleId,
    '--size', String(targetPackage.size),
    '--data-dir', getWritableDataDir(),
    '--port', process.env.ZEW_APP_PORT || '4050',
    '--platform', platform,
  ];

  if (manifest.minimumMacOSVersion) {
    args.push('--minimum-macos', manifest.minimumMacOSVersion);
  }

  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  return child.pid ?? 0;
}
