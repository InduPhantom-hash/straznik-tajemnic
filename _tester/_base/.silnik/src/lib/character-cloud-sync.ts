'use client';

/**
 * Zapis rosteru postaci - wersja domowa Zew Home (offline, tylko localStorage).
 *
 * Wcześniej (wariant online) ten moduł synchronizował postacie między
 * localStorage a GCS per-konto Clerk (IND-168 Faza 5). Warstwa chmurowa została
 * wycięta w Liście 2.A2 - w wersji domowej postacie żyją wyłącznie w
 * przeglądarce gracza. Nazwa pliku i eksport `persistCharacters` zachowane, by
 * nie ruszać 7 callerów rosteru.
 */

import type { Character } from '@/lib/types';
import {
  stripCharacterImages,
  offloadCharacterImages,
} from '@/lib/character-image-store';

const STORAGE_KEY = 'characters';

/**
 * Jeden punkt zapisu postaci do localStorage. Zastępuje rozproszone
 * `localStorage.setItem('characters', ...)`.
 *
 * IND-262: duże obrazy `data:` (portret + miniatury ekwipunku) są wycinane z
 * kopii do localStorage i równolegle zapisywane do IndexedDB. Bez tego data URL
 * ~2,2 MB/obraz przekraczał quota i CAŁY roster nie zapisywał się (utrata
 * danych). Obrazy wracają przy ładowaniu przez `hydrateCharacterImages`.
 */
export function persistCharacters(characters: Character[]): void {
  try {
    const light = stripCharacterImages(characters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(light));
    // Fire-and-forget: właściwe obrazy do IndexedDB (nie blokuje zapisu rosteru).
    void offloadCharacterImages(characters);
  } catch {
    // Fallback: spróbuj zapisać pełne (np. środowisko bez IndexedDB). Jeśli to
    // przekroczy quota - łykamy (jak dotąd), ale strip wyżej zwykle temu zapobiega.
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } catch {
      // SSR / brak localStorage / quota - ignoruj.
    }
  }
}
