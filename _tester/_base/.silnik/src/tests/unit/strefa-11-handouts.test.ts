import fs from 'fs';
import path from 'path';
import { STREFA_11_ADVENTURES } from '@/lib/adventures-data';

describe('Strefa 11 Adventures & Handouts Assets (Issues #258, #259, #260, #261)', () => {
  const publicDir = path.resolve(__dirname, '../../../public');

  it('każdy ze 4 scenariuszy Strefy 11 ma zdefiniowane co najmniej 3 predefiniowane handouty', () => {
    expect(STREFA_11_ADVENTURES).toHaveLength(4);
    for (const adv of STREFA_11_ADVENTURES) {
      expect(adv.isStrefa11).toBe(true);
      expect(adv.handouts).toBeDefined();
      expect(adv.handouts!.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('każdy handout w Strefie 11 posiada fizycznie istniejący plik obrazu WebP na dysku', () => {
    for (const adv of STREFA_11_ADVENTURES) {
      for (const handout of adv.handouts || []) {
        expect(handout.image).toMatch(/^\/handouts\/.*\.webp$/);
        const diskPath = path.join(publicDir, handout.image);
        expect(fs.existsSync(diskPath)).toBe(true);
        const stats = fs.statSync(diskPath);
        expect(stats.size).toBeGreaterThan(1000); // nie pusty plik
      }
    }
  });

  it('każdy handout audio w Strefie 11 posiada fizycznie istniejący plik MP3 na dysku', () => {
    let audioHandoutCount = 0;
    for (const adv of STREFA_11_ADVENTURES) {
      for (const handout of adv.handouts || []) {
        if (handout.audioUrl) {
          audioHandoutCount++;
          expect(handout.audioUrl).toMatch(/^\/audio\/handouts\/.*\.mp3$/);
          const diskPath = path.join(publicDir, handout.audioUrl);
          expect(fs.existsSync(diskPath)).toBe(true);
          const stats = fs.statSync(diskPath);
          expect(stats.size).toBeGreaterThan(5000); // realne nagranie audio
        }
      }
    }
    expect(audioHandoutCount).toBe(4);
  });

  it('handouts-manifest.json zawiera poprawne wpisy dla wszystkich 4 nagrań Strefy 11', () => {
    const manifestPath = path.join(publicDir, 'audio/handouts/handouts-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(Array.isArray(content)).toBe(true);

    const strefaIds = [
      'strefa11_prabuty_wiretap',
      'strefa11_kowary_crash',
      'strefa11_traszyn_interview',
      'strefa11_glogow_broadcast',
    ];

    for (const id of strefaIds) {
      const entry = content.find((item: { id: string }) => item.id === id);
      expect(entry).toBeDefined();
      expect(entry.text.length).toBeGreaterThan(50);
      expect(entry.outputFilename).toMatch(/\.mp3$/);
    }
  });
});
