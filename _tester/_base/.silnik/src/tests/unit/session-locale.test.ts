import {
  resolveAdventureLocale,
  determineStartupLocale,
  syncLocaleStorageAndCookie,
} from '@/lib/i18n/session-locale';
import type { AdventureContext } from '@/lib/types';

describe('session-locale (Issue #733)', () => {
  describe('resolveAdventureLocale', () => {
    it('zwraca undefined dla braku przygody', () => {
      expect(resolveAdventureLocale(null)).toBeUndefined();
      expect(resolveAdventureLocale(undefined)).toBeUndefined();
    });

    it('zwraca en dla przygody American Mythos Cold Cases', () => {
      const adv = {
        title: "The Englewood Labyrinth: Holmes's Castle",
        isAmericanColdCase: true,
      } as AdventureContext;
      expect(resolveAdventureLocale(adv)).toBe('en');
    });

    it('zwraca pl dla przygody Strefa 11', () => {
      const adv = {
        title: 'Cień nad Prabutami',
        isStrefa11: true,
      } as AdventureContext;
      expect(resolveAdventureLocale(adv)).toBe('pl');
    });

    it('zwraca jawne pole locale nadrzędnie', () => {
      const adv = {
        title: 'Custom English Mystery',
        locale: 'en',
      } as AdventureContext;
      expect(resolveAdventureLocale(adv)).toBe('en');
    });

    it('zwraca undefined dla scenariusza neutralnego bez oznaczeń języka', () => {
      const adv = {
        title: 'Nawiedzony Dom',
      } as AdventureContext;
      expect(resolveAdventureLocale(adv)).toBeUndefined();
    });
  });

  describe('determineStartupLocale', () => {
    it('daje pierwszeństwo aktywnej przygodzie angielskiej przed polskim currentLocale', () => {
      const adv = {
        title: "The Englewood Labyrinth: Holmes's Castle",
        isAmericanColdCase: true,
      } as AdventureContext;
      const result = determineStartupLocale({
        currentLocale: 'pl',
        adventure: adv,
        savedLanguage: 'pl',
        latestSaveLocale: 'pl',
      });
      expect(result).toBe('en');
    });

    it('daje pierwszeństwo aktywnej przygodzie polskiej przed angielskim currentLocale', () => {
      const adv = {
        title: 'Cień nad Prabutami',
        isStrefa11: true,
      } as AdventureContext;
      const result = determineStartupLocale({
        currentLocale: 'en',
        adventure: adv,
        savedLanguage: 'en',
        latestSaveLocale: 'en',
      });
      expect(result).toBe('pl');
    });

    it('korzysta z najnowszego sejfu gdy przygoda nie określa języka', () => {
      const adv = { title: 'Neutralna sprawa' } as AdventureContext;
      const result = determineStartupLocale({
        currentLocale: 'pl',
        adventure: adv,
        savedLanguage: 'pl',
        latestSaveLocale: 'en',
      });
      expect(result).toBe('en');
    });

    it('korzysta z savedLanguage gdy brak przygody i sejfu', () => {
      const result = determineStartupLocale({
        currentLocale: 'pl',
        adventure: null,
        savedLanguage: 'en',
        latestSaveLocale: null,
      });
      expect(result).toBe('en');
    });

    it('zachowuje currentLocale jako fallback gdy brak wszelkich danych', () => {
      const result = determineStartupLocale({
        currentLocale: 'pl',
        adventure: null,
        savedLanguage: null,
        latestSaveLocale: null,
      });
      expect(result).toBe('pl');
    });
  });

  describe('syncLocaleStorageAndCookie', () => {
    beforeEach(() => {
      localStorage.clear();
      document.cookie = '';
    });

    it('zapisuje language_selected w localStorage i ustawia ciasteczko NEXT_LOCALE', () => {
      syncLocaleStorageAndCookie('en');
      expect(localStorage.getItem('language_selected')).toBe('en');
      expect(document.cookie).toContain('NEXT_LOCALE=en');
    });

    it('poprawnie przełącza na pl', () => {
      syncLocaleStorageAndCookie('pl');
      expect(localStorage.getItem('language_selected')).toBe('pl');
      expect(document.cookie).toContain('NEXT_LOCALE=pl');
    });
  });
});
