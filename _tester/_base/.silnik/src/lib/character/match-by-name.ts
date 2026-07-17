/**
 * Dopasowanie postaci po imieniu z prefiksu `@Imię` w tagach MG (duet / Hot Seat).
 *
 * MG w duecie zwraca się do postaci po imieniu (`@Eleanor: ...`) i tym samym
 * prefiksem oznacza właściciela zmiany w tagach `[SANITY:@Imię: -1]` /
 * `[HP:@Imię: -1d6]` / `[DZIENNIK:@Imię:typ:tytuł]`. Bez prefiksu (single-player
 * lub gdy MG nie wskazał) zmiana idzie do postaci aktywnej (fallback).
 *
 * `@Eleanor` ma trafić w postać „Eleanor Vance", więc dopasowanie próbuje po kolei:
 * pełne imię → pierwszy człon imienia postaci → prefiks. Wszystko bez rozróżniania
 * wielkości liter.
 */

import type { Character } from '@/lib/types';

/**
 * Zwraca postać wskazaną przez `@rawName` (z narracji MG) albo `fallback`, gdy
 * imienia brak lub nie pasuje do żadnej postaci. Nigdy nie zwraca null.
 */
export function resolveCharacterByName(
  characters: Character[],
  rawName: string | undefined | null,
  fallback: Character
): Character {
  if (!rawName) return fallback;
  const name = rawName.trim().toLowerCase();
  if (!name) return fallback;

  // 1. Pełne imię (Eleanor Vance === Eleanor Vance).
  const exact = characters.find((c) => c.name?.toLowerCase() === name);
  if (exact) return exact;

  // 2. Pierwszy człon imienia postaci (@Eleanor → "Eleanor Vance").
  const byFirst = characters.find(
    (c) => c.name?.toLowerCase().split(/\s+/)[0] === name
  );
  if (byFirst) return byFirst;

  // 3. Imię postaci zaczyna się od podanego prefiksu (luźniejsze, ostatnia szansa).
  const byPrefix = characters.find((c) =>
    c.name?.toLowerCase().startsWith(name)
  );
  return byPrefix ?? fallback;
}
