import { resolveEraContext } from '@/lib/era';
import type { WorldSetupBundleV1 } from './types';
import {
  clearStoredWorldSetup,
  loadStoredWorldSetup,
  storeWorldSetup,
  WORLD_SETUP_STORAGE_KEY,
} from './client-store';

function createBundle(): WorldSetupBundleV1 {
  return {
    schemaVersion: 1,
    id: 'world-test',
    scenarioId: 'scenario-test',
    adventureTitle: 'Test',
    createdAt: '2026-09-01T10:00:00.000Z',
    canonRevision: 1,
    eraContext: resolveEraContext({
      userSelection: { year: 1973, country: 'Polska' },
    }),
    eraManifestId: 'pl-1973-1974',
    adventureGraph: {},
    factions: [],
    npcs: [],
    locations: [],
    items: [],
    events: [],
    openingScene: {},
    nearestBranches: [],
    adventureContent: 'Treść testowa',
    supplementalInformation: [],
    sources: [],
    knowledgeGaps: [],
    exceptions: [],
    phaseResults: [],
  };
}

describe('world setup client store', () => {
  beforeEach(() => localStorage.clear());

  it('stores and restores a valid bundle', () => {
    const bundle = createBundle();
    storeWorldSetup(bundle);
    expect(loadStoredWorldSetup()).toEqual(bundle);
  });

  it('ignores malformed data and clears the canonical key', () => {
    localStorage.setItem(WORLD_SETUP_STORAGE_KEY, '{broken');
    expect(loadStoredWorldSetup()).toBeUndefined();
    clearStoredWorldSetup();
    expect(localStorage.getItem(WORLD_SETUP_STORAGE_KEY)).toBeNull();
  });
});

