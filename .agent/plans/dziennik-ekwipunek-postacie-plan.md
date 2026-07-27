## Plan: Przebudowa Dziennika Sesji, Ekwipunku i Biografii Postaci
Data: 27 lipca 2026  
Złożoność: Duża  

### Problem
Modal przedmiotu ma zły rozmiar i niesłusznie wyświetla "Przeczytaj dokument", przycisk X zamykania nie działa, biografie badaczy są zbyt krótkie, a Dziennik Sesji nie wykorzystuje ekranu, sypie się na łączeniu sznurkami/usuwaniu notatek oraz wymaga przebudowy na system Odkryć i Szuflady Poszlak.

### Rozwiązanie
Przebudowujemy modal detali przedmiotu na responsywną 2-kolumnową kartę z kategorycznymi placeholderami SVG i poprawką logiki zamykania/czytania. Rozbudowujemy biografie 30 postaci w `predefined-characters.ts` do pełnego wymiaru A4. Przebudowujemy Dziennik Sesji na format 95vw/92vh ze znieczulonymi scrollbarami, dodajemy widok Odkryć z podziałem na 4 kategorie i przyciskiem "Dodaj do szuflady poszlak", czyścimy tablicę badacza i eliminujemy zacięcia przycisków na kartach.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/ui/equipment-detail-dialog.tsx` | 2-kolumnowy layout, naprawa `isDocument`, naprawa `X`, placeholdery | Średnie |
| `src/components/ui/equipment-image-placeholder.tsx` | [NOWY] Wygładzone Kategoryczne SVG dla braku miniatury | Niskie |
| `src/lib/immersion/predefined-characters.ts` | Pełna rozbudowa biografii wszystkich 30 postaci do formatu A4 | Niskie |
| `src/components/ui/journal/discoveries-view.tsx` | [NOWY] Komponent zakładek Miejsca, Postacie, Przedmioty, Dokumenty | Średnie |
| `src/components/ui/journal/corkboard-investigation-board.tsx` | Pusta tablica domyślnie, poprawka Pointer Events, szuflada poszlak | Wysokie |
| `src/components/ui/session-journal.tsx` | Układ 95vw/92vh, stylizacja scrollbarów, integracja Odkryć | Średnie |

### Fazy implementacji

**Faza 1: Ekwipunek & Biografie Postaci**
- [ ] Stworzenie `EquipmentImagePlaceholder` dla kategorii broni, dokumentu, artefaktu, narzędzia, okultyzmu.
- [ ] Przebudowa `EquipmentDetailDialog.tsx` (2 kolumny, czysty przycisk X, weryfikacja czytelności).
- [ ] Rozbudowa `predefined-characters.ts` dla 30 badaczy.
- Weryfikacja: `npm test -- equipment-detail-dialog.test.tsx` oraz podgląd postaci.

**Faza 2: Silnik Odkryć & Szuflada Poszlak**
- [ ] Stworzenie `discoveries-view.tsx` z kategoriami (Miejsca, Postacie, Przedmioty, Dokumenty) i akcją "Dodaj do szuflady poszlak".
- [ ] Naprawa Pointer Events w `corkboard-investigation-board.tsx` (bezpieczne klikanie kosza, łączenia sznurkiem).
- [ ] Ustawienie pustej Tablicy Badacza jako domyślny stan nowej gry.
- Weryfikacja: `npm test -- investigator-board.test.tsx`

**Faza 3: Integracja Dziennika i Weryfikacja UI**
- [ ] Przebudowa `session-journal.tsx` na 95vw / 92vh, stylizacja scrollbarów Art-Deco.
- [ ] Spięcie zakładek: Tablica Badacza, Odkrycia, Kronika.
- Weryfikacja: `npx tsc --noEmit` i manualna weryfikacja w przeglądarce.

### Weryfikacja końcowa
- `cd _tester/_base/.silnik && npm test`
- `cd _tester/_base/.silnik && npx tsc --noEmit`

### Co może się zepsuć
- Nakładanie z-index w modalach przy przeciąganiu kart na tablicy (niska szansa, rozwiązane przez portal).
