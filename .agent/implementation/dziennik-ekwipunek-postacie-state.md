# Stan implementacji: Przebudowa Dziennika, Ekwipunku i Biografii
Data rozpoczęcia: 2026-07-27

## Stan wyjściowy & Końcowy
- TypeScript: PASS
- Testy: 139/144 (5 pre-existing failures, zero regresji)

## Faza 1: Biografie - ZAKOŃCZONA
- `predefined-characters.ts` [ZAKOŃCZONE] - Rozbudowano biografie dla wszystkich 30 predefiniowanych badaczy z podziałem na 3 akapity A4 (Geneza, Przełomowy Incydent, Motywacja + Kluczowa Więź). Testy 8/8 PASS.

## Faza 2: Ekwipunek - ZAKOŃCZONA
- `equipment-image-placeholder.tsx` [NOWY] - klimatyczny placeholder SVG per kategoria.
- `equipment-detail-dialog.tsx` [PRZEBUDOWA] - layout 2-kolumnowy (45% lewa grafika/placeholder, prawa scroll), naprawa warunku `isDocument` i przycisku X.
- `equipment-modal.tsx` [MODYFIKACJA] - powiększenie kontenera 93vw/92vh.

## Faza 3a: Naprawa bugów Dziennika - ZAKOŃCZONA
- `corkboard-investigation-board.tsx` - obsługa `onPointerDown.stopPropagation()` na przyciskach akcji kart tablicy.
- `session-journal.tsx` - prop `equipmentItems`, domyślnie pusta tablica badacza na starcie.
- `journal-storage.ts` - usunięcie duplikatu `convertEntriesToBoardNodes`.

## Faza 3b: Stylizacja Dziennika - ZAKOŃCZONA
- `globals.css` - klasa `.journal-scroll` dla ciemnych scrollbarów Art-Deco.
- `session-journal.tsx` - nowy podział nawigacji na 4 zakładki.

## Faza 3c: Odkrycia - ZAKOŃCZONA
- `discoveries-view.tsx` [NOWY] - zunifikowany widok z podziałem na 4 kategorie i podglądem.
- `session-journal.tsx` - podpięcie DiscoveriesView i usunięcie ~345 linii osieroconego kodu.

## Faza 4: Weryfikacja końcowa - ZAKOŃCZONA
- Weryfikacja tsc i npm test powiodła się.
