## Brief: Przebudowa Dziennika, Ekwipunku i Biografii Postaci
**Co**: Naprawa modalu przedmiotu (rozmiar, zamykanie X, placeholdery SVG, czytelność), rozbudowa biografii 30 postaci do formatu A4 oraz przebudowa Dziennika Sesji na format 95vw z zakłądkami Tablica, Odkrycia i Kronika.
**Jak**: Przebudowujemy `EquipmentDetailDialog`, rozszerzamy wpisy w `predefined-characters.ts`, wdrażamy komponent `discoveries-view.tsx` oraz naprawiamy usuwanie i łączenie sznurkami w `corkboard-investigation-board.tsx`.
**Pliki**: `EquipmentDetailDialog.tsx`, `EquipmentImagePlaceholder.tsx`, `predefined-characters.ts`, `discoveries-view.tsx`, `corkboard-investigation-board.tsx`, `session-journal.tsx`.
**Test**: `npm test` oraz `npx tsc --noEmit` w `_tester/_base/.silnik/`.
**Ryzyko**: Średnie (wymaga rzetelnej weryfikacji przechwytywania Pointer Events na płótnie korkowym).
