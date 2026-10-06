import fs from 'node:fs';
import path from 'node:path';
import {
  EQUIPMENT_CATALOG,
  applyCatalogTemplate,
} from '@/lib/equipment-catalog';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { STREFA_11_CHARACTERS } from '@/lib/immersion/strefa-11-characters';
import { OCCUPATION_EQUIPMENT } from '@/lib/equipment-data';

interface MissingManifestItem {
  source: string;
  characterName?: string;
  occupation?: string;
  itemName: string;
  era: string;
  category: string;
  templateId?: string | null;
  currentImageUrl?: string | null;
}

describe('Equipment Catalog Gap Audit for Issue #594', () => {
  it('generuje precyzyjny manifest brakujących grafik WebP dla ekwipunku startowego i Strefy 11', () => {
    const allPresets = [...PREDEFINED_CHARACTERS, ...STREFA_11_CHARACTERS];
    const missingItemsMap = new Map<string, MissingManifestItem>();

    // 1. Sprawdzamy gotowe postacie (Predefined + Strefa 11)
    allPresets.forEach((character) => {
      const era = character.era ?? '1920s';
      const items = character.equipment ?? [];

      items.forEach((rawItem) => {
        const applied = applyCatalogTemplate(rawItem, era);
        const imageUrl = applied.imageUrl;
        const isSvg = !imageUrl || imageUrl.endsWith('.svg') || imageUrl.includes('/predefined/');

        if (isSvg) {
          const key = `${applied.name}__${era}`;
          if (!missingItemsMap.has(key)) {
            missingItemsMap.set(key, {
              source: 'predefined_character',
              characterName: character.name,
              itemName: applied.name,
              era,
              category: applied.category,
              templateId: applied.templateId ?? null,
              currentImageUrl: imageUrl ?? null,
            });
          }
        }
      });
    });

    // 2. Sprawdzamy pospolite wyposażenie z podręcznika (OCCUPATION_EQUIPMENT)
    Object.entries(OCCUPATION_EQUIPMENT).forEach(([occupation, items]) => {
      items.forEach((itemString) => {
        const applied1920s = applyCatalogTemplate(
          { id: `test_${itemString}`, name: itemString, category: 'tool' },
          '1920s'
        );
        if (!applied1920s.imageUrl || applied1920s.imageUrl.endsWith('.svg') || applied1920s.imageUrl.includes('/predefined/')) {
          const key = `${applied1920s.name}__1920s`;
          if (!missingItemsMap.has(key)) {
            missingItemsMap.set(key, {
              source: 'occupation_equipment',
              occupation,
              itemName: applied1920s.name,
              era: '1920s',
              category: applied1920s.category,
              templateId: applied1920s.templateId ?? null,
              currentImageUrl: applied1920s.imageUrl ?? null,
            });
          }
        }
      });
    });

    // 3. Sprawdzamy szablony z pustymi assetPaths lub brakującymi wariantami
    EQUIPMENT_CATALOG.forEach((template) => {
      const available = template.availableIn ?? [];
      const assetKeys = Object.keys(template.assetPaths ?? {});
      if (assetKeys.length === 0) {
        const key = `${template.name}__empty`;
        if (!missingItemsMap.has(key)) {
          missingItemsMap.set(key, {
            source: 'empty_template',
            templateId: template.id,
            itemName: template.name,
            era: available[0] ?? '1920s',
            category: template.category,
            currentImageUrl: null,
          });
        }
      }
    });

    const manifestList = Array.from(missingItemsMap.values());
    console.log(`\n======================================================`);
    console.log(`📊 AUDYT BRAKUJĄCYCH GRAFIK ISSUE #594:`);
    console.log(`   Znaleziono brakujących unikalnych grafik: ${manifestList.length}`);
    console.log(`======================================================\n`);

    manifestList.forEach((item, idx) => {
      console.log(
        `[${idx + 1}/${manifestList.length}] ${item.itemName} (${item.era}) [${item.category}] - ${item.source}`
      );
    });

    const auditDir = path.resolve(process.cwd(), '../../../docs/audits/equipment');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }
    const outputPath = path.join(auditDir, 'catalog-manifest-issue-594.json');
    fs.writeFileSync(outputPath, JSON.stringify(manifestList, null, 2), 'utf8');
    console.log(`\n💾 Zapisano manifest do: ${outputPath}\n`);

    expect(manifestList.length).toBeGreaterThan(0);
  });
});
