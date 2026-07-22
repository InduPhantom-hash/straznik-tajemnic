# Brief: Persystencja Tablicy Badacza (Investigator Board)

**Co:** Utrwalenie relacji (czerwonych sznurków), pozycji kart oraz zaktualizowanych hipotez/faktów na Tablicy Badacza w sesji gry.
**Jak:** Rozszerzenie modeli `Character` i `FullGameSave` o obiekt `investigatorBoard?: InvestigatorBoardState`, zautomatyzowanie zapisu zmian z poziomu `SessionJournal.tsx` do pamięci postaci/save'a gry.
**Pliki:** `src/types/investigator-board.ts`, `src/lib/types.ts`, `_tester/_base/.silnik/src/lib/full-game-save-manager.ts`, `src/components/ui/session-journal.tsx`, `src/hooks/useFullSave.ts`, `src/app/page.tsx`.
**Test:** Uruchomienie `npx tsc --noEmit` oraz sprawdzenie zachowania stanu sznurków po otwarciu/zamknięciu modalu dziennika i przeładowaniu zoptymalizowanego save'a.
**Ryzyko:** Stare save'y bez tego pola – zabezpieczone przez opcjonalność typu i fallback do generowania z tekstów dziennika.
