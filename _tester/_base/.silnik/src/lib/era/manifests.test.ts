import { ERA_MANIFESTS_V1, findEraManifest } from './manifests';

describe('ERA_MANIFESTS_V1', () => {
  it('covers all seven release profiles without pretending they are approved', () => {
    expect(ERA_MANIFESTS_V1).toHaveLength(7);
    expect(ERA_MANIFESTS_V1.every((manifest) => manifest.approvalStatus === 'draft')).toBe(true);
    expect(findEraManifest(1895, 'GB', 'GB')?.id).toBe('gb-1890s');
    expect(findEraManifest(1924, 'US', 'US')?.id).toBe('us-1920s');
    expect(findEraManifest(1974, 'PL', 'PL')?.id).toBe('pl-1973-1974');
    expect(findEraManifest(1986, 'PL', 'PL')?.id).toBe('pl-1980s');
    expect(findEraManifest(1997, 'PL', 'PL')?.id).toBe('pl-1990s');
    expect(findEraManifest(2003, 'PL', 'PL')?.id).toBe('pl-2000-2005');
    expect(findEraManifest(2026, 'ZZ', 'GLOBAL')?.id).toBe('global-contemporary');
  });
});
