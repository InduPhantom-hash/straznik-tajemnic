## Plan: SafeImage i Dokumenty Diegetyczne
Data: 2026-07-29
Złożoność: Średnia

### Problem
Aplikacja cierpi na niestabilność UI spowodowaną pętlami `onError` przy ładowaniu wygenerowanych grafik oraz luki w interakcji z dokumentami diegetycznymi (brakujące typy `ticket`, błędne renderowanie notatników, martwa gałąź parsera w `src/`).

### Rozwiązanie
Zbudujemy globalny komponent `SafeImage` chroniący front-end, przeniesiemy poprawną logikę parsera dokumentów ze środowiska `_tester` do głównej aplikacji oraz zaprojektujemy brakujące immersyjne układy dla `journal_page` i biletów.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/ui/safe-image.tsx` | [NEW] Stworzenie komponentu fallback z ikoną sepia. | Niskie |
| `src/components/ui/equipment-modal.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/equipment-detail-dialog.tsx` | [MODIFY] Wymiana `img`, naprawa warunku `isReadable`. | Średnie |
| `src/components/ui/investigator-board.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/session-journal.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/predefined-characters-selector.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/components/ui/diegetic-document-viewer.tsx` | [MODIFY] Dodanie layoutów dla `ticket` i `journal_page`, usunięcie `img`. | Wysokie |
| `src/components/sidebar/CthulhuSidebar.tsx` | [MODIFY] Wymiana `img` na `SafeImage`. | Niskie |
| `src/lib/types.ts` | [MODIFY] Dodanie `ticket` do `DocumentSubType`. | Niskie |
| `src/lib/acquired-equipment.ts` | [MODIFY] Przeniesienie logiki przypisywania `documentType` z obszaru `_tester` do `src/`. | Średnie |

### Fazy implementacji

**Faza 1: Globalny SafeImage**
- [ ] Stworzenie `safe-image.tsx` (dyskretny fallback `FileImage` w sepii/szarości).
- [ ] Zastąpienie wszystkich niestabilnych `<img />` i `<Image />` nowym komponentem.
- Weryfikacja: Manualne sprawdzenie braku błędów w konsoli UI po zasymulowaniu uszkodzonego URL-a.

**Faza 2: Silnik Dokumentów i Typy**
- [ ] Dodanie `ticket` do słownika typów `DocumentSubType`.
- [ ] Skopiowanie logiki wyliczającej `documentType` do pliku `src/lib/acquired-equipment.ts`.
- [ ] Naprawa `inferDocumentType` o wykrywanie biletów (ticket).
- [ ] Usprawnienie warunku `canRequestRead` w modalach przedmiotu, by blokować niewłaściwe artefakty.
- Weryfikacja: Podniesienie przedmiotu na czacie i podgląd utworzonego wpisu (flaga `documentType`).

**Faza 3: Immersyjne Widoki**
- [ ] Layout `journal_page`: brak znaczka, tło retro-notatnika w linie z ręcznym pismem.
- [ ] Layout `ticket`: wygląd perforowanego biletu ze wstawkami Art Déco.
- Weryfikacja: Wymuszenie otwarcia widoku biletu i notatnika w interfejsie.

### Weryfikacja końcowa
- `npm run build`
- Przeklikanie Dziennika, Tablicy i Ekwipunku w UI.

### Co może się zepsuć
- Wygląd modali sprzętu może się zepsuć przy rozbudowanych układach wizualnych (szczególnie bilet), jeśli wejdzie w kolizję z max-width `90vw`.
