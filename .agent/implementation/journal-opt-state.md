## Zakończenie optymalizacji dziennika

Wykonano następujące kroki naprawcze:
1. Przeniesiono `ExtendedJournalEntry` do `src/lib/types.ts`.
2. Zaktualizowano pętlę generacji kart w `convert-entries.ts` tak, by używała nowo udostępnionego, silnie stypizowanego interfejsu (usunięto `as unknown as`).
3. Zaimplementowano brakującą, obustronnie uzgodnioną blokadę na wpisy `journal` i `note`, przez co Tablica Badacza nie zaleje się zwykłymi wpisami.
4. Utworzono od podstaw suite testową `convert-entries.test.ts`, opartą na `jest`, która zabezpiecza zachowanie koordynatów (X, Y) po wczytaniu pliku `.json` Save.
