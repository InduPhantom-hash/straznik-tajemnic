export interface UpdateManifestView { version: string; releaseNotes: string }
export interface UpdateCheckView { available: boolean; configured: boolean; currentVersion: string; canSelfUpdate?: boolean; manifest?: UpdateManifestView }
export interface UpdateStatusView { id: string; state: string; version?: string; message?: string; updatedAt: string }

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
