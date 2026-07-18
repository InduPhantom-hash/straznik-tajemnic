import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PREDEFINED_CHARACTERS } from './predefined-characters';

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

  it('używa wyłącznie istniejących lokalnych miniatur ekwipunku', () => {
    PREDEFINED_CHARACTERS.forEach((character) => {
      character.equipment?.forEach((item) => {
        expect(item.imageUrl).toMatch(/^\/equipment\/predefined\/[a-z]+\.svg$/);
        expect(
          existsSync(join(process.cwd(), 'public', item.imageUrl!.slice(1)))
        ).toBe(true);
      });
    });
  });
});
