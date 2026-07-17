'use client';

/**
 * IND-262: przechowywanie obrazów postaci (portret + miniatury ekwipunku) w
 * IndexedDB zamiast inline w localStorage.
 *
 * Problem: portret i miniatury to data URL ~2,2 MB każdy. Postać z portretem +
 * kilkoma miniaturami ekwipunku łatwo przekraczała quota localStorage (~5 MB) -
 * `persistCharacters` po cichu padał na `QuotaExceededError`, przez co cały
 * roster NIE zapisywał się (utrata danych po reloadzie, "obrazy nie renderują").
 *
 * Rozwiązanie (bezpieczne, bez zmiany kontraktu `persistCharacters`):
 * - przy zapisie obrazy `data:` są wycinane z kopii do localStorage (→ undefined)
 *   i równolegle zapisywane do IndexedDB pod deterministycznym kluczem,
 * - przy ładowaniu rosteru obrazy są dociągane z IndexedDB (hydracja).
 *
 * Klucze są deterministyczne (z `Character.id` + `EquipmentItem.id`), więc strip
 * i hydracja zgadzają się bez dodatkowych znaczników. URL-e `http(s)` (małe) NIE
 * są ruszane - zostają inline.
 */

import type { Character, EquipmentItem } from '@/lib/types';
import { persistentMediaCache, STORES } from './persistent-media-cache';

const isDataUrl = (s: string | undefined): s is string =>
  typeof s === 'string' && s.startsWith('data:');

const portraitKey = (charId: string): string => `char:${charId}:portrait`;
const equipKey = (charId: string, itemId: string): string =>
  `char:${charId}:equip:${itemId}`;

/**
 * Kopia rosteru do localStorage z wyciętymi dużymi obrazami `data:` (→ undefined).
 * URL-e http(s) i pola bez obrazu zostają bez zmian. Czysta funkcja (nie mutuje
 * wejścia) - bezpieczna do użycia synchronicznie przed `setItem`.
 */
export function stripCharacterImages(characters: Character[]): Character[] {
  return characters.map((c) => {
    const next: Character = { ...c };
    if (isDataUrl(c.portraitUrl)) next.portraitUrl = undefined;
    if (c.equipment?.some((it) => isDataUrl(it.imageUrl))) {
      next.equipment = c.equipment.map((it) =>
        isDataUrl(it.imageUrl) ? { ...it, imageUrl: undefined } : it
      );
    }
    return next;
  });
}

/**
 * Zapisuje obrazy `data:` postaci do IndexedDB pod deterministycznymi kluczami.
 * Fire-and-forget (błąd pojedynczego zapisu nie przerywa reszty). Wywoływane
 * przez `persistCharacters` równolegle ze strip + setItem.
 */
export async function offloadCharacterImages(
  characters: Character[]
): Promise<void> {
  for (const c of characters) {
    if (!c.id) continue;
    try {
      if (isDataUrl(c.portraitUrl)) {
        await persistentMediaCache.set(
          STORES.CHARACTER_IMAGES,
          portraitKey(c.id),
          c.portraitUrl
        );
      }
      for (const it of c.equipment ?? []) {
        if (it.id && isDataUrl(it.imageUrl)) {
          await persistentMediaCache.set(
            STORES.CHARACTER_IMAGES,
            equipKey(c.id, it.id),
            it.imageUrl
          );
        }
      }
    } catch {
      // Błąd IndexedDB nie może wywrócić zapisu - obraz po prostu nie wejdzie do cache.
    }
  }
}

/**
 * Dociąga pojedynczy portret postaci z IndexedDB (data URL) po jej id. Zwraca
 * `null` gdy brak w cache. Używane jako fallback w UI (np. prawy sidebar), gdy
 * `Character.portraitUrl` jest puste z powodu wyścigu z asynchroniczną hydracją
 * rosteru - render może sam doczytać portret niezależnie od kolejności setState.
 */
export async function getCharacterPortrait(
  charId: string
): Promise<string | null> {
  if (!charId) return null;
  try {
    return await persistentMediaCache.get(
      STORES.CHARACTER_IMAGES,
      portraitKey(charId)
    );
  } catch {
    return null;
  }
}

/**
 * Dociąga obrazy postaci z IndexedDB do pól, które ich nie mają (portret /
 * miniatury wycięte przy zapisie). Zwraca NOWĄ tablicę z uzupełnionymi obrazami.
 * Pola z istniejącym URL-em (http lub niewycięty data:) zostają nietknięte.
 */
export async function hydrateCharacterImages(
  characters: Character[]
): Promise<Character[]> {
  const result: Character[] = [];
  for (const c of characters) {
    if (!c.id) {
      result.push(c);
      continue;
    }
    const next: Character = { ...c };

    if (!c.portraitUrl) {
      try {
        const url = await persistentMediaCache.get(
          STORES.CHARACTER_IMAGES,
          portraitKey(c.id)
        );
        if (url) next.portraitUrl = url;
      } catch {
        // brak cache - zostaje bez portretu (placeholder)
      }
    }

    if (c.equipment?.some((it) => !it.imageUrl && it.id)) {
      next.equipment = await Promise.all(
        c.equipment.map(async (it): Promise<EquipmentItem> => {
          if (it.imageUrl || !it.id) return it;
          try {
            const url = await persistentMediaCache.get(
              STORES.CHARACTER_IMAGES,
              equipKey(c.id, it.id)
            );
            return url ? { ...it, imageUrl: url } : it;
          } catch {
            return it;
          }
        })
      );
    }

    result.push(next);
  }
  return result;
}
