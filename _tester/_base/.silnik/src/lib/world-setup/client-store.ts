import type { WorldSetupBundleV1 } from './types';
import { isWorldSetupBundle } from './validation';

export const WORLD_SETUP_STORAGE_KEY = 'world_setup_v1';

function getDefaultStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage;
}

export function storeWorldSetup(
  bundle: WorldSetupBundleV1,
  storage: Storage | null = getDefaultStorage()
): void {
  if (!isWorldSetupBundle(bundle)) {
    throw new Error('Nie można zapisać niepoprawnego WorldSetupBundleV1.');
  }
  storage?.setItem(WORLD_SETUP_STORAGE_KEY, JSON.stringify(bundle));
}

export function loadStoredWorldSetup(
  storage: Storage | null = getDefaultStorage()
): WorldSetupBundleV1 | undefined {
  const serialized = storage?.getItem(WORLD_SETUP_STORAGE_KEY);
  if (!serialized) return undefined;

  try {
    const candidate: unknown = JSON.parse(serialized);
    return isWorldSetupBundle(candidate) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

export function clearStoredWorldSetup(
  storage: Storage | null = getDefaultStorage()
): void {
  storage?.removeItem(WORLD_SETUP_STORAGE_KEY);
}

