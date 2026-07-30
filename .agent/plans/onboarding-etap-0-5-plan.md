## Plan: Integracja trybów startu (Etap 0.5)
Data: 2026-07-30
Złożoność: Prosta

### Problem
Przyciski "Szybka Przygoda" i "Ustawienia Ręczne" w nowym komponencie ekranu powitalnego (`WelcomeScreen` > `StartModeCards`) nie reagują prawidłowo, ponieważ główny komponent `ChatWindow` nie przyjmuje i nie przekazuje zadeklarowanego propa `onQuickStart` w górę, aż do `page.tsx`.

### Rozwiązanie
Zaktualizujemy definicję typów TypeScript dla głównego okna czatu (`ChatWindowProps`), aby akceptowało nową funkcję callback, a następnie przekażemy istniejącą, zaawansowaną funkcję obsługi startu (`handleQuickStartOnboarding`) prosto z `app/page.tsx` do wnętrza `ChatWindow`, co połączy przyciski ze zdefiniowaną logiką. Ustawienia Ręczne są już połowicznie spięte, więc należy upewnić się, że działają bez zarzutu na tym przepływie.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/components/chat/chat-window/types.ts` | Dodanie `onQuickStart` do interfejsu `ChatWindowProps` | Niskie |
| `_tester/_base/.silnik/src/app/page.tsx` | Przekazanie `onQuickStart={handleQuickStartOnboarding}` jako props dla instancji `<ChatWindow>` | Niskie |

### Fazy implementacji

**Faza 1: Typowanie i Przekazanie**
- [ ] Otworzenie `types.ts` w katalogu `chat-window` i dodanie opcjonalnej metody `onQuickStart`.
- [ ] Otworzenie `page.tsx` i wstrzyknięcie callbacku `handleQuickStartOnboarding` pod atrybut `onQuickStart` w `<ChatWindow>`.
- Weryfikacja: Kompilacja i przejazd TypeScripcie (`npm run build` w `.silnik`).

### Weryfikacja końcowa
- Wywołanie `npm run test` dla środowiska `.silnik` dla sprawdzenia czy nowe modyfikacje nie łamią istniejących testów E2E, ze szczególnym naciskiem na `feature-2-game-start.spec.ts`.

### Co może się zepsuć
- **Niskie ryzyko:** Rozjazd typów w innych miejscach renderujących `<ChatWindow>` (nie powinno wystąpić, ponieważ uczynimy prop opcjonalnym, `?`).
