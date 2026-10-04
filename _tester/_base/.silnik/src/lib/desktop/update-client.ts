export interface UpdateManifestView {
  version: string;
  commitSha?: string;
  shortCommit?: string;
  publishedAt?: string;
  releaseNotes: string;
}

export interface UpdateCheckView {
  available: boolean;
  configured: boolean;
  currentVersion: string;
  currentCommitSha?: string;
  currentShortCommit?: string;
  commitsBehind?: number;
  canSelfUpdate?: boolean;
  manifest?: UpdateManifestView;
}

export interface UpdateStatusView {
  id: string;
  state: string;
  version?: string;
  commitSha?: string;
  message?: string;
  updatedAt: string;
}

export function formatVersionWithCommit(
  version?: string,
  commitSha?: string,
  shortCommit?: string
): string {
  const base = version ?? '';
  const short = (shortCommit || (commitSha ? commitSha.slice(0, 7) : '')).trim();
  if (!base) return short;
  return short ? `${base} (${short})` : base;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(body.message || `HTTP ${response.status}`);
  return body;
}

export async function checkDesktopUpdate(): Promise<UpdateCheckView> {
  return readJson(await fetch('/api/desktop/update/check', { cache: 'no-store' }));
}
export async function startDesktopUpdate(): Promise<void> {
  await readJson(await fetch('/api/desktop/update/start', { method: 'POST', headers: { 'Content-Type': 'application/json' } }));
}
export async function getDesktopUpdateStatus(): Promise<UpdateStatusView> {
  return readJson(await fetch('/api/desktop/update/status', { cache: 'no-store' }));
}
