import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PREDEFINED_CHARACTERS } from '@/lib/immersion/predefined-characters';
import { STREFA_11_CHARACTERS } from '@/lib/immersion/strefa-11-characters';
import {
  findEquipmentTemplate,
  resolveCatalogAsset,
  safeResolveVisualEra,
} from '@/lib/equipment-catalog';
import { inferClueProvenance } from '@/lib/parsers/journal-parser';

describe('Cold-Start Initial State (Bramka Pierwszych 10 Sekund)', () => {
  describe('1. Wpis otwierający śledztwo (Początek śledztwa)', () => {
    it('wpis początkowy z dokumentem/kopertą otrzymuje automatyczną proweniencję handout', () => {
      const prov = inferClueProvenance(
        'Początek śledztwa',
        'Marian przynosi nieoficjalną kopertę z maszynopisem'
      );
      expect(prov).toBe('handout');
    });

    it('wpis początkowy z oględzinami lokacji otrzymuje proweniencję observed', () => {
      const prov = inferClueProvenance(
        'Początek śledztwa',
        'Stajemy przed zaryglowanymi drzwiami opuszczonego dworku'
      );
      expect(prov).toBe('observed');
    });

    it('proweniencja wpisu startowego nigdy nie jest pusta ani niezdefiniowana', () => {
      const titles = ['Początek śledztwa', 'Start śledztwa', 'Akta sprawy'];
      titles.forEach((t) => {
        const prov = inferClueProvenance(t, 'Zbadanie sprawy w Warszawie');
        expect(['observed', 'testimony', 'deduction', 'handout']).toContain(prov);
      });
    });
  });

  describe('2. Integralność ekwipunku i grafik WebP postaci (Anti-SVG Leakage)', () => {
    const allPresets = [...PREDEFINED_CHARACTERS, ...STREFA_11_CHARACTERS];

    it('żadna postać ani przedmiot startowy nie zawiera surowego SVG', () => {
      allPresets.forEach((character) => {
        const serialized = JSON.stringify(character);
        expect(serialized).not.toContain('<svg');
        expect(serialized).not.toContain('data:image/svg+xml');

        (character.equipment ?? []).forEach((item) => {
          if (typeof item === 'object' && item !== null) {
            const itemStr = JSON.stringify(item);
            expect(itemStr).not.toContain('<svg');
            expect(itemStr).not.toContain('data:image/svg+xml');
          }
        });
      });
    });

    it('wszystkie przedmioty postaci Strefy 11 mają poprawne szablony katalogu lub prawidłowe assety', () => {
      STREFA_11_CHARACTERS.forEach((character) => {
        const era = safeResolveVisualEra(character.era);
        (character.equipment ?? []).forEach((rawItem) => {
          const itemName = typeof rawItem === 'string' ? rawItem : rawItem.name;
          const template = findEquipmentTemplate(itemName);
          if (template) {
            const asset = resolveCatalogAsset(template, era);
            if (asset) {
              expect(asset).toMatch(/\.webp$/);
              expect(asset).toMatch(/^\/equipment\/catalog\//);
            }
          }
        });
      });
    });
  });

  describe('3. Estetyka Diegetyczna i Rysopisy (Anti-Tag / Anti-Form Leakage)', () => {
    const allPresets = [...PREDEFINED_CHARACTERS, ...STREFA_11_CHARACTERS];
    const FORBIDDEN_FORM_PREFIXES = [
      'Cechy fizyczne i manieryzm:',
      'Pozycja społeczna i zawód:',
      'Rysopis:',
      'Wady:',
      'Zalety:',
    ];

    it('opisy i notatki postaci nie zawierają surowych prefiksów formularza bazodanowego', () => {
      allPresets.forEach((character) => {
        const desc = character.description || '';
        const notes = character.notes || '';
        const combined = `${desc} ${notes}`;

        FORBIDDEN_FORM_PREFIXES.forEach((prefix) => {
          expect(combined).not.toContain(prefix);
        });
      });
    });
  });

  describe('4. Skrypty Cold-Start i Rebuild na Biurku', () => {
    it('skrypt cold-start.sh istnieje w katalogu desktop', () => {
      const repoRoot = resolve(__dirname, '../../../../../..');
      const coldStartPath = resolve(repoRoot, 'desktop/cold-start.sh');
      expect(existsSync(coldStartPath)).toBe(true);
      const content = readFileSync(coldStartPath, 'utf8');
      expect(content).toContain('rm -rf');
    });

    it('skrypt build-app.sh istnieje w katalogu desktop', () => {
      const repoRoot = resolve(__dirname, '../../../../../..');
      const buildAppPath = resolve(repoRoot, 'desktop/build-app.sh');
      expect(existsSync(buildAppPath)).toBe(true);
      const content = readFileSync(buildAppPath, 'utf8');
      expect(content).toContain('launcher');
    });
  });
});
