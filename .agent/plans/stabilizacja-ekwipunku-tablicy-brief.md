## Brief: Stabilizacja Ekwipunku i Tablicy Badacza (Evidence Board)
**Co**: Weryfikacja powiązań grafu Evidence Board (zapisywanie sznurków i pozycji) oraz powiązanie przedmiotów ekwipunku (EquipmentItem) z Tablicą.
**Jak**: Implementacja w `session-journal.tsx` trwałego zapisu węzłów tablicy podczas Drag&Drop, upewnienie się że nowo dodane przedmioty trafiają na planszę (bądź mogą być przypięte ręcznie). Oczyszczenie błędów wyliczania gridu dla nowych wpisów.
**Pliki**: `src/components/ui/investigator-board.tsx`, `src/components/ui/session-journal.tsx`, `src/lib/journal/convert-entries.ts`.
**Test**: `npm test` dla modyfikacji oraz wyciągania manualnego z e2e w Hot Seat.
**Ryzyko**: Ryzyko utraty ułożenia istniejących zapisów podczas naprawy logiki zderzeń Drag&Drop.
