import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  EQUIPMENT_CATALOG,
  applyCatalogTemplate,
  migrateEquipmentCatalog,
  findEquipmentTemplate,
  isCatalogEquipment,
  resolveCatalogAsset,
  safeResolveVisualEra,
} from './equipment-catalog';
import { PREDEFINED_CHARACTERS } from './immersion/predefined-characters';
import { STREFA_11_CHARACTERS } from './immersion/strefa-11-characters';
import { OCCUPATION_EQUIPMENT, splitTopLevel } from './equipment-data';

describe('equipment catalog', () => {
  it('rozpoznaje polskie nazwy i dawne aliasy bez fallbacku po nazwie UI', () => {
    expect(findEquipmentTemplate('Flashlight')?.id).toBe('light.flashlight');
    expect(findEquipmentTemplate('Latarka elektryczna')?.id).toBe(
      'light.flashlight'
    );
    expect(findEquipmentTemplate('Mocna lina')?.id).toBe('tool.rope');
    expect(findEquipmentTemplate('Stara latarka kieszonkowa')?.id).toBe('light.flashlight');
    expect(findEquipmentTemplate('Zardzewiałe wytrychy')?.id).toBe('tool.lockpicks');
  });

  it('wybiera wariant epoki tylko tam, gdzie istnieje, a wspólny asset poza nią', () => {
    const flashlight = findEquipmentTemplate('Latarka')!;
    const rope = findEquipmentTemplate('Lina')!;
    expect(resolveCatalogAsset(flashlight, '1920s')).toBe(
      '/equipment/catalog/flashlight-1920s.webp'
    );
    expect(resolveCatalogAsset(flashlight, '1940s')).toBeUndefined();
    expect(resolveCatalogAsset(rope, 'prl-1970s')).toBe(
      '/equipment/catalog/rope-shared.webp'
    );
  });

  it('migruje stary zapis po nazwie, zachowując stabilne ID egzemplarza', () => {
    const migrated = applyCatalogTemplate(
      {
        id: 'legacy-item-42',
        name: 'Flashlight',
        category: 'personal',
        source: 'starting',
      },
      '1920s'
    );

    expect(migrated).toMatchObject({
      id: 'legacy-item-42',
      templateId: 'light.flashlight',
      category: 'tool',
      visualSource: 'catalog',
      imageUrl: '/equipment/catalog/flashlight-1920s.webp',
    });
  });

  it('migruje całą listę starego zapisu bez zmiany jej kolejności', () => {
    const migrated = migrateEquipmentCatalog([
      {
        id: 'legacy-1',
        name: 'Flashlight',
        category: 'tool',
        source: 'starting',
      },
      {
        id: 'legacy-2',
        name: 'Rzecz własna',
        category: 'personal',
        source: 'starting',
      },
    ]);

    expect(migrated?.map((item) => item.id)).toEqual(['legacy-1', 'legacy-2']);
    expect(migrated?.[0].templateId).toBe('light.flashlight');
    expect(migrated?.[1].templateId).toBeUndefined();
  });

  it('zachowuje istniejący obraz i rozróżnia wygenerowany egzemplarz od katalogu', () => {
    const generated = {
      id: 'story-flashlight',
      templateId: 'light.flashlight',
      name: 'Latarka znaleziona w piwnicy',
      category: 'tool' as const,
      visualSource: 'generated' as const,
      imageUrl: 'data:image/webp;base64,story',
    };

    expect(applyCatalogTemplate(generated, 'modern')).toEqual(generated);
    expect(isCatalogEquipment(generated)).toBe(false);
    expect(
      isCatalogEquipment({
        id: 'legacy-flashlight',
        templateId: 'light.flashlight',
        name: 'Latarka',
        category: 'tool',
      })
    ).toBe(true);
    expect(
      applyCatalogTemplate(
        {
          id: 'legacy-with-image',
          name: 'Latarka',
          category: 'tool',
          imageUrl: 'data:image/webp;base64,existing',
        },
        'modern'
      ).imageUrl
    ).toBe('data:image/webp;base64,existing');
    expect(
      isCatalogEquipment({
        id: 'unknown',
        templateId: 'unknown.future-template',
        name: 'Nieznany przedmiot',
        category: 'personal',
      })
    ).toBe(false);
  });

  it('ma lokalny render WebP dla każdego wzorca katalogu ze zdefiniowaną ścieżką assetu', () => {
    const templatesWithAssets = EQUIPMENT_CATALOG.filter(
      (template) => Object.values(template.assetPaths ?? {}).length > 0
    );
    expect(templatesWithAssets.length).toBeGreaterThanOrEqual(110);

    templatesWithAssets
      .flatMap((template) => Object.values(template.assetPaths!))
      .forEach((asset) => {
        expect(asset).toMatch(/^\/equipment\/catalog\/.+\.webp$/);
        expect(existsSync(join(process.cwd(), 'public', asset.slice(1)))).toBe(
          true
        );
      });
  });

  it('rozpoznaje nowe wzorce broni i wyposażenia z Partii 1 (Colt .38, Webley .455, Thompson, Łom, Pilotka)', () => {
    const colt = findEquipmentTemplate('Rewolwer Colt .38');
    expect(colt?.id).toBe('weapon.revolver-colt38-1920s');
    expect(colt?.modifiers?.damage).toBe('1d10');
    expect(colt?.value).toBe(25);

    const webley = findEquipmentTemplate('Webley Mk IV');
    expect(webley?.id).toBe('weapon.revolver-webley-1920s');
    expect(webley?.modifiers?.damage).toBe('1d10+2');

    const tommy = findEquipmentTemplate('Pistolet maszynowy Thompson');
    expect(tommy?.id).toBe('weapon.submachine-tommy-1920s');
    expect(tommy?.modifiers?.malfunction).toBe(96);

    const crowbar = findEquipmentTemplate('Stalowy łom');
    expect(crowbar?.id).toBe('tool.crowbar-shared');
    expect(crowbar?.modifiers?.skill).toBe('Walka wręcz');

    const goggles = findEquipmentTemplate('Skórzana pilotka i gogle');
    expect(goggles?.id).toBe('personal.pilot-goggles-1920s');
  });

  it('wzbogaca przedmioty o statystyki CoC 7e RAW (modifiers, value) podczas aplikowania szablonu', () => {
    const colt = applyCatalogTemplate(
      {
        id: 'test-colt',
        name: 'Rewolwer Colt .38',
        category: 'weapon',
      },
      '1920s'
    );
    expect(colt.templateId).toBe('weapon.revolver-colt38-1920s');
    expect(colt.modifiers?.damage).toBe('1d10');
    expect(colt.modifiers?.range).toBe('15 yards');
    expect(colt.value).toBe(25);
    expect(colt.imageUrl).toBe('/equipment/catalog/revolver-colt38-1920s.webp');

    const lockpicks = applyCatalogTemplate(
      {
        id: 'test-lockpicks',
        name: 'Wytrychy',
        category: 'tool',
      },
      '1920s'
    );
    expect(lockpicks.modifiers?.skill).toBe('Ślusarstwo');
    expect(lockpicks.modifiers?.bonus).toBe(10);
    expect(lockpicks.value).toBe(10);
  });

  it('zapewnia deterministyczny szablon w katalogu dla każdego przedmiotu z 46 aktywnych presetów postaci', () => {
    const allPresets = [...PREDEFINED_CHARACTERS, ...STREFA_11_CHARACTERS];
    expect(allPresets).toHaveLength(46);

    const missing: string[] = [];
    allPresets.forEach((character) => {
      const items = character.equipment ?? [];
      items.forEach((item) => {
        const template = findEquipmentTemplate(item.templateId ?? item.name);
        if (!template) {
          missing.push(`${item.name} (${character.name})`);
        }
      });
    });
    expect(missing).toEqual([]);
  });

  it('zapewnia deterministyczny szablon w katalogu dla każdego przedmiotu ze wszystkich 30 zawodów RAW (OCCUPATION_EQUIPMENT)', () => {
    const missing: string[] = [];
    Object.entries(OCCUPATION_EQUIPMENT).forEach(([occ, eqList]) => {
      eqList.forEach((eqStr) => {
        const itemNames = splitTopLevel(eqStr).map((s) =>
          s.replace(/\s+/g, ' ').trim()
        );
        itemNames.forEach((name) => {
          const template = findEquipmentTemplate(name);
          if (!template) {
            missing.push(`${name} (${occ})`);
          }
        });
      });
    });
    expect(missing).toEqual([]);
  });

  it('prawidłowo kategoryzuje przedmioty Parapsychologa (Termometr, Detektor EMF, Aparat) jako tool w 1920s', () => {
    const thermo = findEquipmentTemplate('Termometr');
    expect(thermo?.category).toBe('tool');
    expect(thermo?.availableIn).toContain('1920s');

    const emf = findEquipmentTemplate('Detektor pola elektromagnetycznego');
    expect(emf?.category).toBe('tool');
    expect(emf?.availableIn).toContain('1920s');

    const camera = findEquipmentTemplate('Aparat fotograficzny');
    expect(camera?.category).toBe('tool');
    expect(resolveCatalogAsset(camera, '1920s')).toBe(
      '/equipment/catalog/camera-1920s.webp'
    );
  });

  it('zapewnia poprawne szablony i assety WebP dla przedmiotów epoki 2000s (laptop, komórka, powerbank, narzędzia)', () => {
    // 1. Laptop
    const laptopTemplate = findEquipmentTemplate('Ciężki laptop z wczesnym Wi-Fi');
    expect(laptopTemplate?.id).toBe('tool.heavy-laptop-wifi-1990s');
    expect(resolveCatalogAsset(laptopTemplate, '2000s')).toBe(
      '/equipment/catalog/heavy-laptop-wifi-1990s.webp'
    );
    const laptopEnriched = applyCatalogTemplate(
      {
        id: 'eq-laptop',
        name: 'Ciężki laptop z wczesnym Wi-Fi',
        category: 'tool',
        imageUrl: '/equipment/predefined/tool.svg',
      },
      '2000s'
    );
    expect(laptopEnriched.imageUrl).toBe('/equipment/catalog/heavy-laptop-wifi-1990s.webp');
    expect(laptopEnriched.visualSource).toBe('catalog');

    // 2. Telefon komórkowy
    const phoneTemplate = findEquipmentTemplate('Telefon komórkowy');
    expect(phoneTemplate?.id).toBe('modern.phone');
    expect(resolveCatalogAsset(phoneTemplate, '2000s')).toBe(
      '/equipment/catalog/phone-modern.webp'
    );
    const phoneEnriched = applyCatalogTemplate(
      {
        id: 'eq-phone',
        name: 'Telefon komórkowy z klawiaturą',
        category: 'tool',
        imageUrl: '/equipment/predefined/tool.svg',
      },
      '2000s'
    );
    expect(phoneEnriched.imageUrl).toBe('/equipment/catalog/phone-modern.webp');
    expect(phoneEnriched.visualSource).toBe('catalog');

    // 3. Powerbank / Zapasowa bateria
    const batteryTemplate = findEquipmentTemplate('Zapasowa bateria');
    expect(batteryTemplate?.id).toBe('modern.power-bank');
    expect(resolveCatalogAsset(batteryTemplate, '2000s')).toBe(
      '/equipment/catalog/power-bank-modern.webp'
    );
    const batteryEnriched = applyCatalogTemplate(
      {
        id: 'eq-battery',
        name: 'Zapasowa bateria',
        category: 'tool',
        imageUrl: '/equipment/predefined/tool.svg',
      },
      '2000s'
    );
    expect(batteryEnriched.imageUrl).toBe('/equipment/catalog/power-bank-modern.webp');
    expect(batteryEnriched.visualSource).toBe('catalog');

    // 4. Zestaw narzędzi do elektroniki
    const kitTemplate = findEquipmentTemplate('Zestaw narzędzi do elektroniki');
    expect(kitTemplate?.id).toBe('tool.electrical-kit');
    expect(resolveCatalogAsset(kitTemplate, '2000s')).toBe(
      '/equipment/catalog/electrical-kit-shared.webp'
    );
    const kitEnriched = applyCatalogTemplate(
      {
        id: 'eq-kit',
        name: 'Zestaw narzędzi do elektroniki',
        category: 'tool',
        imageUrl: '/equipment/predefined/tool.svg',
      },
      '2000s'
    );
    expect(kitEnriched.imageUrl).toBe('/equipment/catalog/electrical-kit-shared.webp');
    expect(kitEnriched.visualSource).toBe('catalog');
  });

  it('mapuje w 100% wszystkie 110 grafik WebP z katalogu i gwarantuje ich obecność na dysku', () => {
    const manifestPath = existsSync(join(process.cwd(), 'docs/audits/equipment/catalog-manifest-all.json'))
      ? join(process.cwd(), 'docs/audits/equipment/catalog-manifest-all.json')
      : join(process.cwd(), '../../../docs/audits/equipment/catalog-manifest-all.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest).toHaveLength(110);

    manifest.forEach((entry: { id: string; filename: string; era: string; name: string }) => {
      // Każdy plik musi fizycznie istnieć na dysku w public/equipment/catalog/
      const diskPath = join(process.cwd(), 'public', 'equipment', 'catalog', entry.filename);
      expect(existsSync(diskPath)).toBe(true);

      // Każdy element manifestu musi odpowiadać szablonowi w EQUIPMENT_CATALOG
      const template = findEquipmentTemplate(entry.id) || findEquipmentTemplate(entry.name);
      expect(template).toBeDefined();

      // Asset musi być powiązany ze zdefiniowanym szablonem
      const assets = Object.values(template?.assetPaths ?? {});
      expect(assets).toContain(`/equipment/catalog/${entry.filename}`);
    });
  });

  it('nie zawiera martwego odwołania laptop-modern.webp w żadnym szablonie', () => {
    EQUIPMENT_CATALOG.forEach((template) => {
      const assets = Object.values(template.assetPaths ?? {});
      assets.forEach((asset) => {
        expect(asset).not.toContain('laptop-modern.webp');
      });
    });
  });

  it('prawidłowo przypisuje i rozstrzyga assety WebP dla przedmiotów epokowych i uniwersalnych (Batch 2-4)', () => {
    // 1. Broń epoki 1890s (Lee-Metford)
    const leeMetford = findEquipmentTemplate('Karabin Lee-Metford .303');
    expect(leeMetford?.id).toBe('weapon.rifle-lee-metford-1890s');
    expect(resolveCatalogAsset(leeMetford, '1890s')).toBe(
      '/equipment/catalog/rifle-lee-metford-1890s.webp'
    );
    expect(resolveCatalogAsset(leeMetford, '1920s')).toBeUndefined();

    // 2. Broń epoki 1920s (Springfield M1903)
    const springfield = findEquipmentTemplate('Karabin Springfield M1903');
    expect(springfield?.id).toBe('weapon.rifle-springfield-1920s');
    expect(resolveCatalogAsset(springfield, '1920s')).toBe(
      '/equipment/catalog/rifle-springfield-1920s.webp'
    );

    // 3. Broń współczesna (H&K 416)
    const hk416 = findEquipmentTemplate('Karabinek H&K 416');
    expect(hk416?.id).toBe('weapon.rifle-hk416-modern');
    expect(resolveCatalogAsset(hk416, 'modern')).toBe(
      '/equipment/catalog/rifle-hk416-modern.webp'
    );

    // 4. Sprzęt PRL (Magnetofon kasetowy)
    const tapeRecorder = findEquipmentTemplate('Magnetofon kasetowy PRL');
    expect(tapeRecorder?.id).toBe('tool.tape-recorder-prl-1970s');
    expect(resolveCatalogAsset(tapeRecorder, 'prl-1970s')).toBe(
      '/equipment/catalog/tape-recorder-prl-1970s.webp'
    );

    // 5. Przedmiot okultystyczny (Talia kart Tarota)
    const tarot = findEquipmentTemplate('Talia kart Tarota');
    expect(tarot?.id).toBe('occult.tarot-deck-vintage');
    expect(resolveCatalogAsset(tarot, '1920s')).toBe(
      '/equipment/catalog/tarot-deck-vintage.webp'
    );

    // 6. Zasób medyczny (Ampułki z morfiną)
    const morphine = findEquipmentTemplate('Ampułki z morfiną');
    expect(morphine?.id).toBe('medical.morphine-ampoules-shared');
    expect(resolveCatalogAsset(morphine, '1920s')).toBe(
      '/equipment/catalog/morphine-ampoules-shared.webp'
    );
  });

  it('bezpiecznie normalizuje niestandardowe i złożone identyfikatory epok (safeResolveVisualEra)', () => {
    expect(safeResolveVisualEra('classic')).toBe('1920s');
    expect(safeResolveVisualEra('gaslight')).toBe('1890s');
    expect(safeResolveVisualEra('1920s-us')).toBe('1920s');
    expect(safeResolveVisualEra('1920s-pl')).toBe('1920s');
    expect(safeResolveVisualEra('noir')).toBe('1940s');
    expect(safeResolveVisualEra('pulp')).toBe('1930s');
    expect(safeResolveVisualEra('1946')).toBe('1940s');
    expect(safeResolveVisualEra('prl-1970s')).toBe('prl-1970s');
    expect(safeResolveVisualEra('modern')).toBe('modern');
    expect(safeResolveVisualEra(undefined)).toBe('1920s');
    expect(safeResolveVisualEra('unknown-era-xyz')).toBe('1920s');
  });

  it('gwarantuje deterministyczne przypisanie WebP dla 100% z 264 przedmiotów w 46 presetach (0 fallbacków SVG)', () => {
    const allPresets = [...PREDEFINED_CHARACTERS, ...STREFA_11_CHARACTERS];
    expect(allPresets).toHaveLength(46);

    let totalItems = 0;
    const nonWebpItems: string[] = [];

    allPresets.forEach((character) => {
      const items = character.equipment ?? [];
      items.forEach((item) => {
        totalItems++;
        const applied = applyCatalogTemplate(item, character.era);
        if (!applied.imageUrl || !applied.imageUrl.endsWith('.webp')) {
          nonWebpItems.push(`${item.name} (${character.name}, era: ${character.era}) -> ${applied.imageUrl}`);
        }
      });
    });

    expect(totalItems).toBe(264);
    expect(nonWebpItems).toEqual([]);
  });

  it('znajduje szablony po angielskich nazwach (nameEn) dla wszystkich 110 wpisów manifestu', () => {
    const manifestPath = existsSync(join(process.cwd(), 'docs/audits/equipment/catalog-manifest-all.json'))
      ? join(process.cwd(), 'docs/audits/equipment/catalog-manifest-all.json')
      : join(process.cwd(), '../../../docs/audits/equipment/catalog-manifest-all.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest).toHaveLength(110);

    const missingEn: string[] = [];
    manifest.forEach((entry: { id: string; nameEn?: string }) => {
      if (entry.nameEn) {
        const template = findEquipmentTemplate(entry.nameEn);
        if (!template) {
          missingEn.push(`${entry.nameEn} (id: ${entry.id})`);
        }
      }
    });

    expect(missingEn).toEqual([]);
  });

  it('rozstrzyga ikoniczne przedmioty (Rewolwer .38 i Lampa naftowa) do grafik WebP w 1920s', () => {
    const revolver = findEquipmentTemplate('weapon.revolver-38');
    expect(revolver).toBeDefined();
    expect(resolveCatalogAsset(revolver, '1920s')).toBe(
      '/equipment/catalog/revolver-colt38-1920s.webp'
    );
    expect(resolveCatalogAsset(revolver, '1940s')).toBe(
      '/equipment/catalog/revolver-1940s.webp'
    );

    const lantern = findEquipmentTemplate('light.oil-lantern');
    expect(lantern).toBeDefined();
    expect(resolveCatalogAsset(lantern, '1920s')).toBe(
      '/equipment/catalog/oil-lantern-1890s.webp'
    );
    expect(resolveCatalogAsset(lantern, '1890s')).toBe(
      '/equipment/catalog/oil-lantern-1890s.webp'
    );
  });
});
