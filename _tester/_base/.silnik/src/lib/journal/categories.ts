/**
 * Hardcoded słowniki dla kategorii dziennika i domyślnych tagów (Call of Cthulhu 7e).
 *
 * Wydzielone z `src/components/ui/journal.tsx:26-49` w IND-101 (sesja 97). Pełne 1:1 z oryginałem.
 * Eksportowane jako readonly tuple dla TS narrowing + runtime mutable arrays dla legacy callerów.
 */

export const JOURNAL_CATEGORIES = [
  'Wydarzenia',
  'Odkrycia',
  'Spotkania',
  'Walka',
  'Badania',
  'Sny',
  'Wizje',
  'Notatki',
  'Inne',
] as const;

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number];

export const DEFAULT_TAGS = [
  'Cthulhu',
  'Kult',
  'Koszmary',
  'Badania',
  'Walka',
  'Tajemnice',
  'NPC',
  'Lokalizacje',
  'Artefakty',
  'Zaklęcia',
] as const;

export type DefaultTag = (typeof DEFAULT_TAGS)[number];
