import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  EQUIPMENT_CATALOG,
  applyCatalogTemplate,
  migrateEquipmentCatalog,
  findEquipmentTemplate,
  isCatalogEquipment,
  resolveCatalogAsset,
} from './equipment-catalog';
import { PREDEFINED_CHARACTERS } from './immersion/predefined-characters';
import { STREFA_11_CHARACTERS } from './immersion/strefa-11-characters';

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
    expect(templatesWithAssets.length).toBeGreaterThanOrEqual(47);

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
});
