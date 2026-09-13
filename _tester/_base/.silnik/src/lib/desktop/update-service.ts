import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getWritableDataDir } from '@/lib/paths';

export const UPDATE_BUNDLE_ID = 'com.aios.straznik-tajemnic-ai';
export const UPDATE_STATUS_FILE = 'status.json';

export interface DesktopUpdateManifest {
  schemaVersion: 1;
  version: string;
  channel: 'stable';
  bundleId: string;
  minimumMacOSVersion: string;
  package: { name: string; url: string; size: number; sha256: string };
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

export function isNewerStableVersion(current: string, candidate: string): boolean {
  const a = parseVersion(current);
  const b = parseVersion(candidate);
  if (!a || !b) return false;
  for (let index = 0; index < 3; index += 1) {
    if (b[index] !== a[index]) return b[index] > a[index];
  }
  return false;
}

export function validateManifest(value: unknown): DesktopUpdateManifest | null {
  if (!value || typeof value !== 'object') return null;
  const manifest = value as Partial<DesktopUpdateManifest>;
  const pkg = manifest.package;
  if (
    manifest.schemaVersion !== 1 || manifest.channel !== 'stable' ||
    manifest.bundleId !== UPDATE_BUNDLE_ID || !parseVersion(manifest.version ?? '') ||
    typeof manifest.minimumMacOSVersion !== 'string' || !isMacOSVersion(manifest.minimumMacOSVersion) ||
    typeof manifest.releaseNotes !== 'string' ||
    (manifest.releaseNotes !== '' && !manifest.releaseNotes.startsWith('https://')) ||
    !pkg || typeof pkg.name !== 'string' || typeof pkg.url !== 'string' ||
    !pkg.url.startsWith('https://') || !Number.isSafeInteger(pkg.size) || pkg.size <= 0 ||
    typeof pkg.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(pkg.sha256)
  ) return null;
  return manifest as DesktopUpdateManifest;
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
  return {
    available: isNewerStableVersion(currentVersion, manifest.version),
    configured: true,
    currentVersion,
    manifest,
    canSelfUpdate: process.env.ZEW_DESKTOP_SELF_UPDATE === '1',
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

export async function startDetachedUpdate(manifest: DesktopUpdateManifest): Promise<number> {
  const appBundle = process.env.ZEW_APP_BUNDLE;
  if (process.env.ZEW_DESKTOP_SELF_UPDATE !== '1' || !appBundle?.endsWith('.app')) {
    throw new Error('Self-update is unavailable outside an application bundle');
  }
  const updateDir = updatesDirectory();
  await mkdir(updateDir, { recursive: true });
  const sourceWorker = path.join(process.cwd(), 'desktop', 'update-worker.sh');
  const detachedWorker = path.join(updateDir, 'update-worker.sh');
  await copyFile(sourceWorker, detachedWorker);
  const child = spawn('/bin/bash', [
    detachedWorker, '--bundle', appBundle, '--url', manifest.package.url,
    '--sha256', manifest.package.sha256, '--version', manifest.version,
    '--bundle-id', manifest.bundleId, '--size', String(manifest.package.size),
    '--minimum-macos', manifest.minimumMacOSVersion,
    '--data-dir', getWritableDataDir(), '--port', process.env.ZEW_APP_PORT || '4050',
  ], { detached: true, stdio: 'ignore' });
  child.unref();
  return child.pid ?? 0;
}
