# Plan: Włączenie i wybór Autorskich Scenariuszy Strefa 11 oraz podglądu opisów
Data: 2026-07-26
Złożoność: Średnia

### Problem
W modalu `AdventureSelector` użytkownik w trybie publicznym (`SHOW_BUILT_IN_ADVENTURES = false`) widzi tylko pojedynczą opcję "WŁASNA PRZYGODA" i instrukcję wgrania PDF, oraz sekcję z odnośnikami do Strefy 11 (Wikipedia/Filmweb/Player.pl), ale nie ma fizycznej możliwości obejrzenia kart autorskich scenariuszy Strefy 11, otwarcia ich szczegółowych opisów ani wybrania ich do gry.

### Rozwiązanie
Zaktualizujemy `adventure-selector.tsx` tak, aby:
1. Wydzielić autorskie przygody Strefy 11 (`STREFA_11_ADVENTURES`) jako wybraną grupę darmowych/autorskich scenariuszy dostępnych w UI bez względu na flagę `SHOW_BUILT_IN_ADVENTURES` (ponieważ są autorskie i bezspoilerowe).
2. Dodanie podglądu opisów przygód i kart wyboru dla `STREFA_11_ADVENTURES` z działającym przyciskiem "Więcej szczegółów" oraz zaznaczeniem ("Wybierz i kontynuuj").
3. Dodanie czystej obslugi kliknięcia w autorskie scenariusze Strefy 11 i przekazania wybranego `AdventureContext` do funkcji `onSelect`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/ui/adventure-selector.tsx` | Renderowanie kart `STREFA_11_ADVENTURES` i obsługa ich wyboru | Niskie |
| `_tester/_base/.silnik/src/lib/adventures-data.ts` | Eksport helpera pobierania przygody z autorskich w `getAdventureById` | Niskie |

### Fazy implementacji

**Faza 1: Aktualizacja danych i helperów**
- [ ] Zapewnienie, że `getAdventureById` potrafi odnaleźć scenariusz ze `STREFA_11_ADVENTURES`.
- Weryfikacja: Brak błędów wywołania `getAdventureById('cien-nad-prabutami')`.

**Faza 2: Renderowanie kart Strefa 11 w modalu**
- [ ] Wyświetlanie siatki kart z `STREFA_11_ADVENTURES` w `adventure-selector.tsx`.
- [ ] Podpięcie przycisku "Więcej szczegółów" pod `AdventureDetailsModal`.
- Weryfikacja: Karta przygody jest widoczna, reaguje na kliknięcie, otwiera podgląd szczegółów i pozwala na wybór przygody.

### Weryfikacja końcowa
- Kompilacja TypeScript: `npx tsc --noEmit`
- Testy komendą `npm test` lub uruchomieniem weryfikacji komponentów UI.

### Co może się zepsuć
- Przekazywanie ID wybranej przygody (brak dopasowania ID w `selectedAdventure`), zapobiegnie temu unifikowane wyszukiwanie po `STREFA_11_ADVENTURES`.
