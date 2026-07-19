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

describe('equipment catalog', () => {
  it('rozpoznaje polskie nazwy i dawne aliasy bez fallbacku po nazwie UI', () => {
    expect(findEquipmentTemplate('Flashlight')?.id).toBe('light.flashlight');
    expect(findEquipmentTemplate('Latarka elektryczna')?.id).toBe(
      'light.flashlight'
    );
    expect(findEquipmentTemplate('Mocna lina')?.id).toBe('tool.rope');
  });

  it('wybiera wariant epoki tylko tam, gdzie istnieje, a wspólny asset poza nią', () => {
    const flashlight = findEquipmentTemplate('Latarka')!;
    const rope = findEquipmentTemplate('Lina')!;
    expect(resolveCatalogAsset(flashlight, '1920s')).toBe(
      '/equipment/catalog/flashlight-1920s.webp'
    );
    expect(resolveCatalogAsset(flashlight, '1940s')).toBe(
      '/equipment/predefined/tool.svg'
    );
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

  it('ma lokalny render WebP dla każdego wzorca katalogu', () => {
    EQUIPMENT_CATALOG.forEach((template) => {
      expect(Object.values(template.assetPaths ?? {})).not.toHaveLength(0);
    });

    EQUIPMENT_CATALOG.flatMap((template) =>
      Object.values(template.assetPaths!)
    ).forEach((asset) => {
      expect(asset).toMatch(/^\/equipment\/catalog\/.+\.webp$/);
      expect(existsSync(join(process.cwd(), 'public', asset.slice(1)))).toBe(
        true
      );
    });
  });
});
