import { ERA_MANIFESTS_V1, findEraManifest } from './manifests';

describe('ERA_MANIFESTS_V1', () => {
  it('covers release profiles without pretending drafts are approved', () => {
    expect(ERA_MANIFESTS_V1).toHaveLength(8);
    const us1920s = findEraManifest(1924, 'US', 'US');
    expect(us1920s?.approvalStatus).toBe('approved');
    const pl1920s = findEraManifest(1925, 'PL', 'PL');
    expect(pl1920s?.approvalStatus).toBe('approved');
    const drafts = ERA_MANIFESTS_V1.filter(
      (manifest) => manifest.id !== 'us-1920s' && manifest.id !== 'pl-1920s'
    );
    expect(drafts).toHaveLength(6);
    expect(drafts.every((manifest) => manifest.approvalStatus === 'draft')).toBe(true);
    expect(findEraManifest(1895, 'GB', 'GB')?.id).toBe('gb-1890s');
    expect(us1920s?.id).toBe('us-1920s');
    expect(pl1920s?.id).toBe('pl-1920s');
    expect(findEraManifest(1974, 'PL', 'PL')?.id).toBe('pl-1973-1974');
    expect(findEraManifest(1986, 'PL', 'PL')?.id).toBe('pl-1980s');
    expect(findEraManifest(1997, 'PL', 'PL')?.id).toBe('pl-1990s');
    expect(findEraManifest(2003, 'PL', 'PL')?.id).toBe('pl-2000-2005');
    expect(findEraManifest(2026, 'ZZ', 'GLOBAL')?.id).toBe('global-contemporary');
  });

  it('returns approved pl-1920s manifest for 1925 in Poland with expected forbidden items', () => {
    const manifest = findEraManifest(1925, 'PL', 'PL');
    expect(manifest).not.toBeNull();
    expect(manifest?.id).toBe('pl-1920s');
    expect(manifest?.approvalStatus).toBe('approved');
    expect(manifest?.countryCodes).toContain('PL');
    expect(manifest?.regionProfiles).toContain('PL');
    expect(manifest?.validFrom).toBe(1920);
    expect(manifest?.validTo).toBe(1929);

    // Wymagane zakazy technologiczne i instytucjonalne
    expect(manifest?.forbidden).toContain('długopis kulkowy');
    expect(manifest?.forbidden).toContain('długopis Zenith');
    expect(manifest?.forbidden).toContain('długopis');
    expect(manifest?.forbidden).toContain('Dworzec Centralny');
    expect(manifest?.forbidden).toContain('numer 997');
    expect(manifest?.forbidden).toContain('numer 112');
    expect(manifest?.forbidden).toContain('dowód osobisty PRL');
    expect(manifest?.forbidden).toContain('milicja obywatelska');
    expect(manifest?.forbidden).toContain('smartfon');
    expect(manifest?.forbidden).toContain('komputer');
    expect(manifest?.forbidden).toContain('internet');

    // Realia komunikacji, transportu i waluty
    expect(manifest?.economicBackground.some((item) => item.includes('Grabskiego') && item.includes('złoty polski'))).toBe(true);
    expect(manifest?.transport.some((item) => item.includes('Dworzec Główny / Dworzec Wiedeński'))).toBe(true);
    expect(manifest?.transport.some((item) => item.includes('Dworzec Wileński'))).toBe(true);
    expect(manifest?.transport.some((item) => item.includes('Dworzec Wschodni'))).toBe(true);
    expect(manifest?.law.some((item) => item.includes('Policja Państwowa'))).toBe(true);
    expect(manifest?.communication.some((item) => item.includes('wieczne pióra') && item.includes('kałamarze'))).toBe(true);
  });
});
