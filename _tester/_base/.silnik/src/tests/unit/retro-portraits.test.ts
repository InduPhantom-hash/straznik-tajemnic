import fs from 'fs';
import path from 'path';
import {
  RETRO_PORTRAITS,
  getRetroPortraitForOccupation,
  isRetroPortraitUrl,
} from '@/lib/data/character/retro-portraits';
import { OCCUPATIONS } from '@/lib/data/character/occupations';

describe('Retro Portraits Suite (#442)', () => {
  it('contains exactly 12 distinct archetypes', () => {
    expect(RETRO_PORTRAITS).toHaveLength(12);
    const ids = new Set(RETRO_PORTRAITS.map((p) => p.id));
    expect(ids.size).toBe(12);
  });

  it('verifies that all 12 SVG files exist in the public directory', () => {
    const publicDir = path.resolve(__dirname, '../../../public');
    for (const arch of RETRO_PORTRAITS) {
      const fullPath = path.join(publicDir, arch.svgPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).toContain('<svg');
      expect(content).toContain('</svg>');
      expect(content).toContain(arch.id);
    }
  });

  it('maps key canonical occupations to their respective archetypes', () => {
    expect(getRetroPortraitForOccupation('private_investigator').id).toBe('detective');
    expect(getRetroPortraitForOccupation('police_officer').id).toBe('detective');
    expect(getRetroPortraitForOccupation('journalist').id).toBe('journalist');
    expect(getRetroPortraitForOccupation('doctor').id).toBe('doctor');
    expect(getRetroPortraitForOccupation('professor').id).toBe('scientist');
    expect(getRetroPortraitForOccupation('author').id).toBe('author');
    expect(getRetroPortraitForOccupation('artist').id).toBe('artist');
    expect(getRetroPortraitForOccupation('clergy').id).toBe('clergy');
    expect(getRetroPortraitForOccupation('drifter').id).toBe('drifter');
    expect(getRetroPortraitForOccupation('antiquarian').id).toBe('antiquarian');
    expect(getRetroPortraitForOccupation('soldier').id).toBe('soldier');
    expect(getRetroPortraitForOccupation('lawyer').id).toBe('lawyer');
    expect(getRetroPortraitForOccupation('occultist').id).toBe('occultist');
  });

  it('maps every single occupation from CoC 7e OCCUPATIONS list without falling into undefined', () => {
    for (const occ of OCCUPATIONS) {
      const portrait = getRetroPortraitForOccupation(occ.id);
      expect(portrait).toBeDefined();
      expect(portrait.id).toBeTruthy();
      expect(portrait.svgPath).toMatch(/^\/portraits\/retro-svg\/.+\.svg$/);
    }
  });

  it('correctly validates retro-svg URLs', () => {
    expect(isRetroPortraitUrl('/portraits/retro-svg/detective.svg')).toBe(true);
    expect(isRetroPortraitUrl('/portraits/predefined/archibald-blackwood.webp')).toBe(false);
    expect(isRetroPortraitUrl('https://example.com/portrait.jpg')).toBe(false);
    expect(isRetroPortraitUrl(null)).toBe(false);
    expect(isRetroPortraitUrl(undefined)).toBe(false);
  });
});
