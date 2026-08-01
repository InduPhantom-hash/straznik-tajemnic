## Plan: Naprawa zagubionych zmian i Szybkiej Przygody
Data: 2026-07-31
Złożoność: Średnia

### Problem
Zmiany wprowadzane przez AI przez 2 ostatnie dni (w tym wdrożenie Szybkiej Przygody i awatarów) wylądowały w katalogu testowym `_tester/_base/.silnik/src/` zamiast w `src/`. W efekcie w grze Quick Setup ma zły interfejs (brak portretów, brzydki scrollbar) i startuje złą przygodę (Boston Globe z powodu asynchroniczności w `page.tsx`).

### Rozwiązanie
Przeniesienie nowych/zmodyfikowanych plików (modale, awatary w czacie, nowi badacze) ze złej ścieżki do głównego środowiska `src/`. Ujednolicenie UI Szybkiej Przygody z trybem manualnym (podgląd portretów). Załatanie błędu w `page.tsx` wymuszającego start "Boston Globe" przez upewnienie się, że stan przygody jest przekazywany asynchronicznie lub wywoływany w poprawnym bloku startu, zanim odpali się instancja sesji.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/ui/quick-setup-modal.tsx` | Skopiowanie i ulepszenie (UI z portretami) | Średnie |
| `src/components/chat/welcome/index.tsx` (i powiązane) | Skopiowanie komponentów nowego czystego startu | Niskie |
| `src/components/chat/chat-window/index.tsx` (i powiązane) | Skopiowanie mechaniki awatarów NPC | Niskie |
| `src/app/page.tsx` | Naprawa wywołania `handleQuickStart` (race condition) | Wysokie |
| `src/lib/immersion/strefa-11-characters.ts` | Skopiowanie nowej bazy postaci | Niskie |
| `src/lib/parsers/...` | Skopiowanie rozszerzonych parserów | Niskie |

### Fazy implementacji

**Faza 1: Skopiowanie i integracja zgubionych plików**
- [ ] Skopiuj brakujące pliki komponentów powitalnych (welcome) i modalu z `_tester` do `src`.
- [ ] Skopiuj obsługę awatarów z `chat-window` do `src`.
- [ ] Zintegruj brakujące pliki w `src/lib/immersion/` i `src/lib/parsers/`.
- Weryfikacja: Wstępna kompilacja/sprawdzenie lintów by wykryć błędne importy.

**Faza 2: Naprawa asynchroniczności i błędów Quick Setupu**
- [ ] `src/app/page.tsx`: Przerobienie startu `handleQuickStart`, tak aby używało bezpośrednio obiektów i ustawiało je stabilnie dla czatu zamiast wywoływać go przed re-renderem z domyślnym `adventureContext`.
- [ ] `quick-setup-modal.tsx`: Refaktoryzacja UI - użycie komponentów znanych z trybu ręcznego, ukrycie białego scrollbara.
- Weryfikacja: Załadowanie Szybkiej Przygody ładuje prawidłowy wpis, a nie domyślny Boston Globe, UI wygląda poprawnie.

### Weryfikacja końcowa
- Komenda `npm run dev` i wyklikanie całego flow wejścia dla Szybkiej Przygody w nowym oknie Chrome.

### Co może się zepsuć
- Przepisanie logiki z `page.tsx` może potencjalnie zdestabilizować inne sposoby wejścia do gry (np. powrót z zapisu, tryb Hot Seat). Wymaga chirurgicznej ostrożności i bazowania tylko na zatwierdzonych hookach Reactowych.
