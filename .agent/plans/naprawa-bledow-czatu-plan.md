# Plan: Naprawa błędów czatu i obrazu intro przy starcie gry

Data: 2026-07-22
Złożoność: Średnia

### Problem
Przy uruchamianiu nowej gry w czacie pojawia się osierocona pusta wiadomość asystenta z przyciskiem Stop (kwadrat) oraz błąd generowania obrazu intro (`⚠️ Nie udało się wygenerować obrazu intro...`). Dzieje się tak z powodu nieprzechwyconych/nieoczyszczonych błędów w strumieniowaniu `/api/chat` oraz niezabezpieczonego wywołania `/api/imagen`.

### Rozwiązanie
1. Czyszczenie osieroconego pustego dymka wiadomości (`assistantMessageId`) w `useGameStart.ts` w sekcji `catch`, jeśli błąd wystąpił zanim wygenerowano jakikolwiek tekst.
2. Zabezpieczenie wywołania `generateIntroImage()` w `useGameStart.ts` poprzez sprawdzenie flagi `aiSettings.imageGenerationEnabled` oraz walidację klucza.
3. Obsługa braku klucza lub błędów 401 z natychmiastowym wyświetleniem odpowiedniej wiadomości pomocniczej i zapobieganiem pozostawianiu zawieszonego dymka w czacie.

---

### Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/hooks/useGameStart.ts` | Wyczyszczenie pustej wiadomości w `catch`, dodanie osłony dla `generateIntroImage` | Niskie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/run-chat-pipeline.ts` | Precyzyjna obsługa błędu BYOK / braku klucza przy starcie | Niskie |

---

### Fazy implementacji

#### Faza 1: Osłona i czyszczenie stanu czatu w `useGameStart.ts`
- [ ] W `catch` w `useGameStart.ts` sprawdzić, czy odpowiedź `/api/chat` zgłosiła wyjątek.
- [ ] Wyfiltrować wiadomość `assistantMessageId` z `messages`, jeśli `content` pozostał pusty.
- [ ] Dodać czytelny komunikat błędu (np. o braku klucza lub problemie z połączeniem) zamiast pustego dymka z kwadratem.
- [ ] Sprawdzić flaga `imageGenerationEnabled` w `generateIntroImage()` i pomijać żądanie, jeśli wyłączono obrazy.

#### Faza 2: Weryfikacja i testy
- [ ] Uruchomienie istniejących testów jednostkowych i e2e dla czatu (`npm test`).
- [ ] Sprawdzenie braku błędów TypeScript (`npx tsc --noEmit`).

---

### Weryfikacja końcowa
- `npx jest src/hooks/useGameStart.test.ts` (lub odpowiedni pakiet testów)
- `npx tsc --noEmit`

---

### Co może się zepsuć
- Przegapienie błędu strumieniowania, jeśli część tekstu została odebrana przed awarią (obsłużone: usuwamy dymek tylko wtedy, gdy `content` jest pusty).
