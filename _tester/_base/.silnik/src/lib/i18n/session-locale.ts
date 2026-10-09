import type { AdventureContext } from '@/lib/types';

/**
 * Rozpoznaje docelowy język przygody (locale).
 * - Jeśli przygoda ma jawne pole `locale`: zwraca to pole.
 * - Jeśli jest oznaczona jako amerykański cold case (`isAmericanColdCase`): zwraca 'en'.
 * - Jeśli jest oznaczona jako seria Strefa 11 (`isStrefa11`) i nie ma flagi angielskiej: zwraca 'pl'.
 * - W pozostałych przypadkach (scenariusz uniwersalny / custom bez metadanych): zwraca undefined.
 */
export function resolveAdventureLocale(
  adventure?: AdventureContext | null
): 'pl' | 'en' | undefined {
  if (!adventure) return undefined;
  if (adventure.locale === 'en' || adventure.locale === 'pl') {
    return adventure.locale;
  }
  if (adventure.isAmericanColdCase) {
    return 'en';
  }
  if (adventure.isStrefa11) {
    return 'pl';
  }
  return undefined;
}

export interface DetermineStartupLocaleOptions {
  currentLocale: 'pl' | 'en';
  adventure?: AdventureContext | null;
  savedLanguage?: string | null;
  latestSaveLocale?: 'pl' | 'en' | null;
}

/**
 * Ustala oczekiwany język interfejsu przy starcie lub przywracaniu aplikacji (Context-Driven).
 * Hierarchia:
 * 1. Aktywna przygoda (np. The Englewood Labyrinth -> 'en', Cień nad Prabutami -> 'pl').
 * 2. Najnowszy zapis gry (jeśli wczytano z pliku / listy save'ów z jawnym locale).
 * 3. Poprzednio zapisana preferencja użytkownika (localStorage `language_selected`).
 * 4. Bieżące locale z routingu jako fallback.
 */
export function determineStartupLocale({
  currentLocale,
  adventure,
  savedLanguage,
  latestSaveLocale,
}: DetermineStartupLocaleOptions): 'pl' | 'en' {
  const advLocale = resolveAdventureLocale(adventure);
  if (advLocale) {
    return advLocale;
  }

  if (latestSaveLocale === 'en' || latestSaveLocale === 'pl') {
    return latestSaveLocale;
  }

  if (savedLanguage === 'en' || savedLanguage === 'pl') {
    return savedLanguage;
  }

  return currentLocale;
}

/**
 * Bezpiecznie synchronizuje ciasteczko NEXT_LOCALE oraz localStorage language_selected.
 */
export function syncLocaleStorageAndCookie(targetLocale: 'pl' | 'en'): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('language_selected', targetLocale);
    } catch {}
  }
  if (typeof document !== 'undefined') {
    try {
      document.cookie = `NEXT_LOCALE=${targetLocale};path=/;max-age=31536000;SameSite=Lax`;
    } catch {}
  }
}
