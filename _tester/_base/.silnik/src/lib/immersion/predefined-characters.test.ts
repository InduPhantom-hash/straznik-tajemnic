import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PREDEFINED_CHARACTERS } from './predefined-characters';
import {
  findEquipmentTemplate,
  resolveCatalogAsset,
} from '@/lib/equipment-catalog';
import type { EquipmentVisualEra } from '@/lib/types';

const VISUAL_ERAS: Record<string, EquipmentVisualEra> = {
  gaslight: '1890s',
  classic: '1920s',
  noir: '1940s',
  prl: 'prl-1970s',
  modern: 'modern',
};

describe('PREDEFINED_CHARACTERS', () => {
  it('zapewnia każdemu badaczowi pełną biografię i rozbudowany ekwipunek', () => {
    expect(PREDEFINED_CHARACTERS).toHaveLength(30);

    PREDEFINED_CHARACTERS.forEach((character) => {
      expect(character.background.trim().length).toBeGreaterThan(40);
      expect(character.equipment?.length).toBeGreaterThanOrEqual(6);

      const names = (character.equipment ?? []).map((item) =>
        item.name.toLocaleLowerCase('pl-PL')
      );
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it('zapewnia gotowych badaczy dla podstawowych epok (gaslight, classic, modern)', () => {
    expect(PREDEFINED_CHARACTERS.filter((c) => c.era === 'gaslight')).toHaveLength(10);
    expect(PREDEFINED_CHARACTERS.filter((c) => c.era === 'classic')).toHaveLength(10);
    expect(PREDEFINED_CHARACTERS.filter((c) => c.era === 'modern')).toHaveLength(10);
  });

  it('wskazuje indywidualne, istniejące portrety dla nowych epok', () => {
    PREDEFINED_CHARACTERS.filter(
      (character) => character.era === 'gaslight' || character.era === 'classic' || character.era === 'modern'
    ).forEach((character) => {
      expect(character.portraitUrl).toMatch(
        /^\/portraits\/predefined\/.+\.webp$/
      );
      if (
        !existsSync(
          join(process.cwd(), 'public', character.portraitUrl!.slice(1))
        )
      ) {
        throw new Error(
          `Missing portrait for ${character.name}: ${character.portraitUrl}`
        );
      }
    });
  });

  it('używa wyłącznie istniejących lokalnych miniatur ekwipunku dla przedmiotów katalogowych', () => {
    PREDEFINED_CHARACTERS.forEach((character) => {
      character.equipment?.forEach((item) => {
        if (!item.imageUrl) return; // Przedmioty do wygenerowania AI w tle na starcie gry
        expect(item.imageUrl).toMatch(
          /^\/equipment\/(?:catalog\/.+\.webp|predefined\/[a-z]+\.svg)$/
        );
        expect(
          existsSync(join(process.cwd(), 'public', item.imageUrl!.slice(1)))
        ).toBe(true);

        const template = findEquipmentTemplate(item.templateId);
        if (template) {
          expect(item.imageUrl).toBe(
            resolveCatalogAsset(template, VISUAL_ERAS[character.era])
          );
        }
      });
    });
  });
});
