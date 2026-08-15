# Specyfikacja: Usunięcie długu technicznego legacy journal (Zadanie 1)

## 1. Cel
Usunięcie przestarzałego kodu legacy journal (`/app/journal`, `/api/journal`, `components/ui/journal.tsx`, `lib/journal/types.ts`) oraz ujednolicenie architektury na `character.journal` i `sharedJournal` z `src/lib/types.ts` oraz `src/components/ui/session-journal.tsx`.

## 2. Zakres zmian

### 2.1. Pliki do usunięcia (Legacy Dead Code)
- `_tester/_base/.silnik/src/app/journal/page.tsx` (oraz pusty katalog `_tester/_base/.silnik/src/app/journal`)
- `_tester/_base/.silnik/src/app/api/journal/route.ts` (oraz pusty katalog `_tester/_base/.silnik/src/app/api/journal`)
- `_tester/_base/.silnik/src/components/ui/journal.tsx`
- `_tester/_base/.silnik/src/lib/journal/types.ts`
- `_tester/_base/.silnik/src/lib/journal/categories.ts` (pomocniczy plik ze starego journal.tsx)
- `_tester/_base/.silnik/src/lib/journal/markdown-export.ts` (pomocniczy plik ze starego journal.tsx)
- `_tester/_base/.silnik/src/lib/journal/pdf-template.ts` (pomocniczy plik ze starego journal.tsx)
- `_tester/_base/.silnik/src/lib/journal/index.ts` (lub re-eksport aktualnych helperów)

### 2.2. Pliki do modyfikacji
- `_tester/_base/.silnik/src/hooks/useFullReset.ts`:
  - Usunięcie wpisu `{ url: '/api/journal', name: 'Journal' }` z tablicy `apiEndpoints`.
  - Aktualizacja komentarza nagłówkowego.
- `_tester/_base/.silnik/src/lib/journal/apply-journal-tags.ts`:
  - Aktualizacja komentarza dotyczącego SSOT typów `JournalEntry`.
- `_tester/_base/.silnik/tests/e2e/feature-16-settings.spec.ts` & `tests/e2e/feature-16-settings.spec.ts`:
  - Usunięcie asercji na `/api/journal` w teście pełnego resetu.
- `_tester/_base/.silnik/tests/e2e/feature-4-image-gallery.spec.ts` & `tests/e2e/feature-4-image-gallery.spec.ts`:
  - Usunięcie snapshotu `/api/journal`.
- `scripts/build-tester-pack.sh`:
  - Aktualizacja walidacji obecności `session-journal.tsx` zamiast `journal.tsx`.
- `state.md`:
  - Odnotowanie usunięcia długu legacy journal w sekcji DONE.

## 3. Weryfikacja jakościowa (Bramki CI/Checkera)
- `npm test` w `_tester/_base/.silnik` -> wszystkie testy przechodzą (47+ test suites).
- `npm run build` w `_tester/_base/.silnik` -> pomyślna kompilacja Next.js & TypeScript bez błędów.
