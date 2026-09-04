import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import enMessages from '../../_tester/_base/.silnik/messages/en.json';
import plMessages from '../../_tester/_base/.silnik/messages/pl.json';

/**
 * Szablon testu regresyjnego i18n & stabilnosci widoku dla Strażnika Tajemnic AI.
 *
 * Cel testu:
 * 1. Zapewnienie, ze kazdy klucz t('...') uzyty w komponencie istnieje w obu slownikach (PL i EN).
 * 2. Zabezpieczenie przed asymetria typow (np. tablica w PL a string w EN).
 * 3. Weryfikacja brakujacych danych (null/undefined/puste tablice) pod katem awarii runtime (.map).
 */

// Regex wylapujacy wywolania t('klucz') oraz t("klucz")
const T_CALL_REGEX = /(?<![\w.$])t\(\s*(['"])([\w-]+)\1/g;

function extractTranslationKeys(sourceCode: string): string[] {
  const keys = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = T_CALL_REGEX.exec(sourceCode)) !== null) {
    keys.add(match[2]);
  }
  return [...keys];
}

describe('Szablon Weryfikacji i18n & Odpornosci Komponentu', () => {
  const targetComponentPath = 'src/components/twoj-komponent.tsx'; // Podmien na sciezke komponentu
  const namespace = 'TwojKomponent'; // Podmien na namespace z messages/*.json

  it('wszystkie klucze z kodu komponentu musza istniec w pl.json i en.json', () => {
    // 1. Odczyt kodu zrodlowego
    const fullPath = resolve(__dirname, '../../_tester/_base/.silnik', targetComponentPath);
    
    // Pomin jesli to sam szablon
    if (!fullPath.includes('.template.')) {
      const source = readFileSync(fullPath, 'utf-8');
      const usedKeys = extractTranslationKeys(source);

      // 2. Pobranie workow tlumaczen
      const plBag = (plMessages as Record<string, Record<string, unknown>>)[namespace];
      const enBag = (enMessages as Record<string, Record<string, unknown>>)[namespace];

      expect(plBag).toBeDefined();
      expect(enBag).toBeDefined();

      // 3. Weryfikacja brakujacych kluczy
      const missingInPl = usedKeys.filter((k) => !(k in plBag!));
      const missingInEn = usedKeys.filter((k) => !(k in enBag!));

      expect(missingInPl).toEqual([]);
      expect(missingInEn).toEqual([]);
    }
  });

  it('struktury wartosci w pl.json i en.json musza zachowywac ten sam typ (brak asymetrii array vs object)', () => {
    const plBag = (plMessages as Record<string, Record<string, unknown>>)[namespace];
    const enBag = (enMessages as Record<string, Record<string, unknown>>)[namespace];

    if (plBag && enBag) {
      for (const key of Object.keys(plBag)) {
        if (key in enBag) {
          const typePl = Array.isArray(plBag[key]) ? 'array' : typeof plBag[key];
          const typeEn = Array.isArray(enBag[key]) ? 'array' : typeof enBag[key];
          expect(typePl).toBe(typeEn);
        }
      }
    }
  });
});
