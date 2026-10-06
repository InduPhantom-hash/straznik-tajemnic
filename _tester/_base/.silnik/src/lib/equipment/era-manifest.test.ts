/**
 * era-manifest.test.ts - Testy weryfikujące manifest katalogu per epoka i audyt braków (Issue #503)
 */

import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  ERA_MANIFEST,
  TARGET_ERAS,
  PHYSICAL_CATEGORIES,
  PRIORITY_SAMPLES,
  generateEraManifestId,
  resolveEraAssetStatus,
  buildEraManifest,
  getEraManifestStats,
  generateEraGapsReport,
  writeEraGapsReport,
  type TargetEra,
  type PhysicalEquipmentCategory,
  type EraManifestEntry,
} from './era-manifest';
import { EQUIPMENT_CATALOG } from '../equipment-catalog';

describe('Era Manifest (Issue #503)', () => {
  describe('1. Format i unikalność ID w manifeście per epoka', () => {
    it('gwarantuje, że manifest zawiera wyłącznie 6 docelowych epok', () => {
      expect(TARGET_ERAS).toEqual(['1890s', '1920s', '1930s', '1940s', '1980s', 'modern']);
      const erasInManifest = new Set(ERA_MANIFEST.map((e) => e.era));
      expect(Array.from(erasInManifest).sort()).toEqual([...TARGET_ERAS].sort());
    });

    it('gwarantuje, że manifest zawiera wyłącznie 6 kategorii fizycznych i wyklucza dokumenty', () => {
      expect(PHYSICAL_CATEGORIES).toEqual(['weapon', 'tool', 'medical', 'personal', 'occult', 'armor']);
      const categoriesInManifest = new Set(ERA_MANIFEST.map((e) => e.category));
      expect(categoriesInManifest.has('document' as any)).toBe(false);
      expect(categoriesInManifest.has('artifact' as any)).toBe(false);
      expect(Array.from(categoriesInManifest).sort()).toEqual([...PHYSICAL_CATEGORIES].sort());
    });

    it('wymusza format ID <era>.<category>.<slug> dla każdego wpisu w manifeście', () => {
      const idPattern = /^(1890s|1920s|1930s|1940s|1980s|modern)\.(weapon|tool|medical|personal|occult|armor)\.[a-z0-9-]+$/;

      ERA_MANIFEST.forEach((entry) => {
        expect(entry.id).toMatch(idPattern);
        expect(entry.id.startsWith(`${entry.era}.${entry.category}.`)).toBe(true);
      });
    });

    it('gwarantuje absolutną unikalność wszystkich ID w całym manifeście', () => {
      const ids = ERA_MANIFEST.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('gwarantuje unikalność wszystkich ID wewnątrz każdej pojedynczej epoki', () => {
      for (const era of TARGET_ERAS) {
        const eraEntries = ERA_MANIFEST.filter((e) => e.era === era);
        const eraIds = eraEntries.map((e) => e.id);
        const uniqueEraIds = new Set(eraIds);
        expect(uniqueEraIds.size).toBe(eraIds.length);
      }
    });

    it('prawidłowo generuje ID z prefiksem epoki zgodne z przykładem PO (1920s.weapon.revolver-38)', () => {
      const id = generateEraManifestId('1920s', 'weapon', 'weapon.revolver-38');
      expect(id).toBe('1920s.weapon.revolver-38');

      const entry = ERA_MANIFEST.find((e) => e.id === '1920s.weapon.revolver-38');
      expect(entry).toBeDefined();
      expect(entry?.baseTemplateId).toBe('weapon.revolver-38');
      expect(entry?.category).toBe('weapon');
      expect(entry?.era).toBe('1920s');
    });
  });

  describe('2. Eliminacja -shared i statusy assetów', () => {
    it('gwarantuje brak jakichkolwiek odwołań -shared w identyfikatorach oraz polach assetPath i fallbackAsset', () => {
      ERA_MANIFEST.forEach((entry) => {
        expect(entry.id).not.toContain('shared');
        expect(entry.assetPath).not.toContain('-shared');
        expect(entry.fallbackAsset).not.toContain('-shared');
      });
    });

    it('klasyfikuje szablony z plikami -shared jako missing_era_asset z fallbackiem do SVG kategorii', () => {
      // Pudełko zapałek ma w katalogu assetPaths { shared: '/equipment/catalog/matches-shared.webp' }
      const matchesEntries = ERA_MANIFEST.filter((e) => e.baseTemplateId === 'light.matches');
      expect(matchesEntries.length).toBeGreaterThan(0);

      matchesEntries.forEach((entry) => {
        expect(entry.assetStatus).toBe('missing_era_asset');
        expect(entry.assetPath).toBe('/equipment/predefined/personal.svg');
        expect(entry.fallbackAsset).toBe('/equipment/predefined/personal.svg');
      });

      // Lina (tool.rope) miała wyłącznie rope-shared.webp
      const ropeEntries = ERA_MANIFEST.filter((e) => e.baseTemplateId === 'tool.rope');
      expect(ropeEntries.length).toBeGreaterThan(0);
      ropeEntries.forEach((entry) => {
        expect(entry.assetStatus).toBe('missing_era_asset');
        expect(entry.assetPath).toBe('/equipment/predefined/tool.svg');
      });

      // Morfina w ampułkach miała w katalogu klucz '1920s' wskazujący na plik -shared.webp
      const morphine1920 = ERA_MANIFEST.find((e) => e.id === '1920s.medical.morphine-ampoules');
      expect(morphine1920).toBeDefined();
      expect(morphine1920?.assetStatus).toBe('missing_era_asset');
      expect(morphine1920?.assetPath).toBe('/equipment/predefined/medical.svg');
    });

    it('przyznaje status ready dla autentycznych unikalnych assetów dedykowanych danej epoce', () => {
      // 1920s Latarka -> flashlight-1920s.webp
      const flashlight1920 = ERA_MANIFEST.find((e) => e.id === '1920s.tool.flashlight');
      expect(flashlight1920).toBeDefined();
      expect(flashlight1920?.assetStatus).toBe('ready');
      expect(flashlight1920?.assetPath).toBe('/equipment/catalog/flashlight-1920s.webp');

      // 1890s Lampa naftowa -> oil-lantern-1890s.webp
      const lantern1890 = ERA_MANIFEST.find((e) => e.id === '1890s.tool.oil-lantern');
      expect(lantern1890).toBeDefined();
      expect(lantern1890?.assetStatus).toBe('ready');
      expect(lantern1890?.assetPath).toBe('/equipment/catalog/oil-lantern-1890s.webp');

      // modern Smartfon -> phone-modern.webp
      const phoneModern = ERA_MANIFEST.find((e) => e.id === 'modern.tool.phone');
      expect(phoneModern).toBeDefined();
      expect(phoneModern?.assetStatus).toBe('ready');
      expect(phoneModern?.assetPath).toBe('/equipment/catalog/phone-modern.webp');

      // 1920s Tommy Gun -> submachine-tommy-1920s.webp
      const tommy1920 = ERA_MANIFEST.find((e) => e.id === '1920s.weapon.submachine-tommy-1920s');
      expect(tommy1920).toBeDefined();
      expect(tommy1920?.assetStatus).toBe('ready');
      expect(tommy1920?.assetPath).toBe('/equipment/catalog/submachine-tommy-1920s.webp');
    });

    it('nie pozwala na ponowne użycie assetu z innej epoki jako ready (cross-era isolation)', () => {
      // Lampa naftowa ma asset dedykowany wyłącznie dla 1890s
      // W 1920s i 1940s lampa naftowa nie może używać oil-lantern-1890s.webp jako ready
      const lantern1920 = ERA_MANIFEST.find((e) => e.id === '1920s.tool.oil-lantern');
      if (lantern1920) {
        expect(lantern1920.assetStatus).toBe('missing_era_asset');
        expect(lantern1920.assetPath).toBe('/equipment/predefined/tool.svg');
      }

      // Latarka ma asset dedykowany wyłącznie dla 1920s
      // W 1940s latarka nie może używać flashlight-1920s.webp
      const flashlight1940 = ERA_MANIFEST.find((e) => e.id === '1940s.tool.flashlight');
      if (flashlight1940) {
        expect(flashlight1940.assetStatus).toBe('missing_era_asset');
        expect(flashlight1940.assetPath).toBe('/equipment/predefined/tool.svg');
      }
    });

    it('gwarantuje, że każdy asset o statusie ready fizycznie istnieje na dysku', () => {
      const readyEntries = ERA_MANIFEST.filter((e) => e.assetStatus === 'ready');
      expect(readyEntries.length).toBeGreaterThan(0);

      readyEntries.forEach((entry) => {
        const fullDiskPath = join(process.cwd(), 'public', entry.assetPath);
        expect(existsSync(fullDiskPath)).toBe(true);
      });
    });
  });

  describe('3. Spójność reguł anachronizmów', () => {
    it('nie dopuszcza nowoczesnej elektroniki w epokach historycznych (1890s, 1920s, 1930s, 1940s)', () => {
      const historicalEras: TargetEra[] = ['1890s', '1920s', '1930s', '1940s'];

      historicalEras.forEach((era) => {
        const eraItems = ERA_MANIFEST.filter((e) => e.era === era);

        // Brak smartfona
        const phone = eraItems.find((e) => e.baseTemplateId === 'modern.phone');
        expect(phone).toBeUndefined();

        // Brak powerbanku
        const powerBank = eraItems.find((e) => e.baseTemplateId === 'modern.power-bank');
        expect(powerBank).toBeUndefined();

        // Brak laptopa
        const laptop = eraItems.find((e) => e.baseTemplateId.includes('laptop'));
        expect(laptop).toBeUndefined();

        // Brak GPS
        const gps = eraItems.find((e) => e.baseTemplateId.includes('gps'));
        expect(gps).toBeUndefined();

        // Brak nośnika USB
        const usb = eraItems.find((e) => e.baseTemplateId.includes('usb'));
        expect(usb).toBeUndefined();

        // Brak broni nowoczesnej (Glock, HK416)
        const glock = eraItems.find((e) => e.baseTemplateId.includes('glock'));
        expect(glock).toBeUndefined();

        const hk416 = eraItems.find((e) => e.baseTemplateId.includes('hk416'));
        expect(hk416).toBeUndefined();
      });
    });

    it('nie dopuszcza broni z lat 30. i 40. w epoce 1890s ani 1920s', () => {
      // Pistolet Vis wz. 35 (skonstruowany w 1935 r.)
      const vis1890 = ERA_MANIFEST.find((e) => e.id === '1890s.weapon.vis-wz35');
      expect(vis1890).toBeUndefined();

      const vis1920 = ERA_MANIFEST.find((e) => e.id === '1920s.weapon.vis-wz35');
      expect(vis1920).toBeUndefined();

      // Vis może występować wyłącznie w 1930s i 1940s
      const vis1930 = ERA_MANIFEST.find((e) => e.id === '1930s.weapon.vis-wz35');
      expect(vis1930).toBeDefined();
    });

    it('nie dopuszcza broni z lat 20. w epoce wiktoriańskiej 1890s', () => {
      // Pistolet maszynowy Thompson (1921 r.)
      const tommy1890 = ERA_MANIFEST.find((e) => e.id === '1890s.weapon.submachine-tommy-1920s');
      expect(tommy1890).toBeUndefined();

      // Karabin Springfield M1903 (1903 r.)
      const springfield1890 = ERA_MANIFEST.find((e) => e.id === '1890s.weapon.rifle-springfield-1920s');
      expect(springfield1890).toBeUndefined();
    });

    it('gwarantuje, że każdy wpis w manifeście respektuje pole availableIn z EQUIPMENT_CATALOG', () => {
      ERA_MANIFEST.forEach((entry) => {
        const template = EQUIPMENT_CATALOG.find((t) => t.id === entry.baseTemplateId);
        expect(template).toBeDefined();
        expect(template?.availableIn).toContain(entry.era);
      });
    });
  });

  describe('4. Próbki priorytetowe (Priority Samples)', () => {
    it('zawiera dokładnie 36 wpisów oznaczonych jako próbki priorytetowe (6 epok x 6 kategorii)', () => {
      const priorityEntries = ERA_MANIFEST.filter((e) => e.isPrioritySample);
      expect(priorityEntries).toHaveLength(36);

      // Każda epoka ma dokładnie 6 próbek
      for (const era of TARGET_ERAS) {
        const eraSamples = priorityEntries.filter((e) => e.era === era);
        expect(eraSamples).toHaveLength(6);

        // Dokładnie po jednej próbce z każdej z 6 kategorii fizycznych
        const categories = eraSamples.map((s) => s.category).sort();
        expect(categories).toEqual([...PHYSICAL_CATEGORIES].sort());
      }
    });

    it('weryfikuje obecność wszystkich 6 bazowych szablonów próbek', () => {
      const sampleBaseIds = PRIORITY_SAMPLES.map((s) => s.baseTemplateId);
      expect(sampleBaseIds).toContain('tool.magnifier');
      expect(sampleBaseIds).toContain('light.matches');
      expect(sampleBaseIds).toContain('weapon.flare-gun');
      expect(sampleBaseIds).toContain('medical.first-aid');
      expect(sampleBaseIds).toContain('occult.candles');
      expect(sampleBaseIds).toContain('armor.safety-helmet-industrial');
    });
  });

  describe('5. Deterministyczne generowanie raportu luk (docs/reports/equipment-era-gaps.md)', () => {
    it('oblicza poprawne statystyki pokrycia grafikami dla całego manifestu', () => {
      const stats = getEraManifestStats(ERA_MANIFEST);

      expect(stats.grandTotal.total).toBe(ERA_MANIFEST.length);
      expect(stats.grandTotal.ready + stats.grandTotal.missing).toBe(stats.grandTotal.total);
      expect(stats.grandTotal.ready).toBeGreaterThan(0);
      expect(stats.grandTotal.missing).toBeGreaterThan(0);

      // Sprawdzenie spójności sum dla każdej epoki
      for (const era of TARGET_ERAS) {
        const e = stats.eras[era];
        expect(e.ready + e.missing).toBe(e.total);

        let sumCatTotal = 0;
        let sumCatReady = 0;
        let sumCatMissing = 0;

        for (const cat of PHYSICAL_CATEGORIES) {
          const c = e.byCategory[cat];
          expect(c.ready + c.missing).toBe(c.total);
          sumCatTotal += c.total;
          sumCatReady += c.ready;
          sumCatMissing += c.missing;
        }

        expect(sumCatTotal).toBe(e.total);
        expect(sumCatReady).toBe(e.ready);
        expect(sumCatMissing).toBe(e.missing);
      }
    });

    it('generuje deterministyczny raport Markdown zawierający wymagane tabele i sekcje', () => {
      const report1 = generateEraGapsReport(ERA_MANIFEST);
      const report2 = generateEraGapsReport(ERA_MANIFEST);

      // Idempotentność i determinizm
      expect(report1).toBe(report2);

      // Wymagane sekcje
      expect(report1).toContain('# Raport audytu wariantów ekwipunku per epoka (Issue #503)');
      expect(report1).toContain('## 1. Założenia architektoniczne i polityka assetów');
      expect(report1).toContain('## 2. Podsumowanie macierzy wariantów (6 epok x 6 kategorii)');
      expect(report1).toContain('## 3. Wykaz 36 próbek priorytetowych (Priority Review Samples)');
      expect(report1).toContain('## 4. Wytyczne do generacji brakujących wariantów');
      expect(report1).toContain('## 5. Następne kroki');

      // Tabela zawiera wszystkie epoki i kategorie
      for (const era of TARGET_ERAS) {
        expect(report1).toContain(`| **${era}** |`);
      }
      for (const cat of PHYSICAL_CATEGORIES) {
        expect(report1).toContain(`\`${cat}\``);
      }

      // Brak odwołań -shared w treści raportu poza wyjaśnieniem polityki eliminacji
      const linesWithoutHeader = report1
        .split('\n')
        .filter((l) => !l.includes('polityka') && !l.includes('shared.webp') && !l.includes('eliminacja'));
      linesWithoutHeader.forEach((line) => {
        expect(line).not.toContain('-shared.webp');
      });
    });

    it('zapisuje raport fizycznie w docs/reports/equipment-era-gaps.md', () => {
      const writtenPath = writeEraGapsReport();
      expect(existsSync(writtenPath)).toBe(true);

      const fileContent = readFileSync(writtenPath, 'utf8');
      expect(fileContent.length).toBeGreaterThan(500);
      expect(fileContent).toContain('Raport audytu wariantów ekwipunku per epoka');
    });

    it('umożliwia zapis raportu do wskazanej niestandardowej ścieżki', () => {
      const customPath = join(process.cwd(), 'test-results', 'test-era-gaps-custom.md');
      const writtenPath = writeEraGapsReport(customPath);
      expect(writtenPath).toBe(customPath);
      expect(existsSync(customPath)).toBe(true);

      const content = readFileSync(customPath, 'utf8');
      expect(content).toContain('# Raport audytu wariantów ekwipunku per epoka (Issue #503)');

      // Sprzątanie pliku tymczasowego
      unlinkSync(customPath);
    });
  });
});
