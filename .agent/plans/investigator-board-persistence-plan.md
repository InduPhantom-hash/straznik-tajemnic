# Plan: Automatyczna Persystencja Tablicy Badacza (Investigator Board) i Save'y Sesji

Data: 2026-07-22  
Złożoność: Średnia  

---

## 1. Problem
Wszelkie modyfikacje dokonywane przez gracza na Tablicy Badacza (zmiana statusów hipotez/faktów, dodawanie oraz edycja połączeń sznurkami `EvidenceRelation`, przesunięcia kart) są przechowywane wyłącznie w ulotnym stanie Reacta (`useState`) w modale `SessionJournal.tsx`. W rezultacie przepadają po zamknięciu okna modalu, odświeżeniu aplikacji lub zapisaniu/odczytaniu gry przez system `FullGameSave`.

---

## 2. Rozwiązanie
1. **Rozszerzenie typów danych:** Dodanie pola `investigatorBoard?: InvestigatorBoardState` do typu postaci `Character`, struktury `sharedJournal` oraz interfejsu `FullGameSave`.
2. **Synchronizacja w `SessionJournal.tsx`:** Powiązanie zmian `boardNodes` i `boardRelations` z callbackami `onUpdateCharacter` oraz `onUpdateSharedJournal`.
3. **Wsparcie w `FullGameSave` & API `/api/game-save`:** Zapewnienie, że stan Tablicy Badacza jest zapisywany w plikach JSON sesji dyskowej i odtwarzany podczas odczytu gry (także w trybie Hot Seat).

---

## 3. Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
| :--- | :--- | :--- |
| `src/types/investigator-board.ts` | Wyeksportowanie i doprecyzowanie interfejsu `InvestigatorBoardState` | Niskie |
| `src/lib/types.ts` | Dodanie `investigatorBoard?: InvestigatorBoardState` do `Character` oraz `HotSeatConfig` | Niskie |
| `_tester/_base/.silnik/src/lib/full-game-save-manager.ts` | Dodanie pola `investigatorBoard` do interfejsu `FullGameSave` | Niskie |
| `src/components/ui/session-journal.tsx` | Inicjalizacja `boardNodes` i `boardRelations` ze stanu zaktualizowanej postaci/sharedJournal oraz zapis po każdej zmianie | Średnie |
| `src/hooks/useFullSave.ts` | Pobranie i dołączenie `investigatorBoard` przy tworzeniu payloadu zapisu sesji | Niskie |
| `src/app/page.tsx` | Przekazanie stanu Tablicy do save'u i odtworzenie przy wczytywaniu | Średnie |

---

## 4. Fazy implementacji

### Faza 1: Rozszerzenie typów i modelu danych
- [ ] Dodanie opcjonalnego pola `investigatorBoard` do struktury `Character` w `src/lib/types.ts`.
- [ ] Dodanie pola `investigatorBoard?: InvestigatorBoardState` do `FullGameSave` w `_tester/_base/.silnik/src/lib/full-game-save-manager.ts`.
- Weryfikacja: Brak błędów kompilacji TypeScript (`npx tsc --noEmit`).

### Faza 2: Persystencja stanu w `SessionJournal.tsx`
- [ ] Inicjalizacja `boardNodes` i `boardRelations` z `character.investigatorBoard` / `sharedJournal.investigatorBoard` (fallback do `convertEntriesToBoardNodes`).
- [ ] Stworzenie powiązanego wywołania aktualizacji postaci / sharedJournal przy zmianie węzłów (`setBoardNodes`) oraz połączeń sznurkami (`setBoardRelations`).
- Weryfikacja: Po zamknięciu i ponownym otwarciu modalu `SessionJournal` dodane połączenia sznurkami oraz zmodyfikowane hipotezy pozostają na tablicy.

### Faza 3: Integracja z systemem zapisów (`FullGameSave`)
- [ ] Aktualizacja `useFullSave.ts` oraz `app/page.tsx`, aby przy wywołaniu zapisu stan Tablicy trafiał do pliku save'a.
- [ ] Odtworzenie stanu Tablicy Badacza przy operacji `loadGameSave`.
- Weryfikacja: Wykonanie zapisu gry, przeładowanie strony, wczytanie save'a – sprawdzenie czy Tablica Badacza zachowała stan.

---

## 5. Weryfikacja końcowa
- Kompilacja TypeScript: `npx tsc --noEmit`
- Uruchomienie testów UI: `npm test src/components/ui/investigator-board.test.tsx`

---

## 6. Co może się zepsuć
- **Stare pliki save'ów:** Brak pola `investigatorBoard` w dotychczasowych save'ach – rozwiązane przez bezpieczne wprowadzanie pola opcjonalnego (`investigatorBoard?: InvestigatorBoardState`) z domyślnym fallbackiem do `convertEntriesToBoardNodes()`.
