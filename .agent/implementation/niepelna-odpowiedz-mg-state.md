# Stan implementacji: niepełna odpowiedź MG po limicie tokenów

Data: 2026-08-18
Faza bieżąca: checkpoint po Fazie 1 - oczekuje na potwierdzenie przed Fazą 2
Status: Faza 1 zakończona i zweryfikowana w zakresie kontraktu.

## Stan wyjściowy

- Runtime: `_tester/_base/.silnik/`.
- `npx tsc --noEmit`: PASS, 0 błędów.
- `npm test -- --runInBand`: PASS, 49/49 zestawów, 184/184 testów.
- Repozytorium ma istniejące niezwiązane zmiany użytkownika w README, dokumentacji, ekranie powitalnym i innych artefaktach. Nie wolno ich nadpisać.

## Faza 1 - wykonane

- `StreamingChatResult` udostępnia `getFinishReason()`, odczytywane wyłącznie po skonsumowaniu streamu.
- `GeminiChatProvider` zachowuje ostatni surowy `finishReason` z chunku bez zmiany retry dla całkowicie pustej odpowiedzi.
- `runChatPipeline` przekazuje getter do `createSseStream`.
- Końcowe metadata SSE, telemetry klienta i meta `logApiEvent` zawierają `finishReason`; gdy provider go nie poda, SSE nie emituje pola, a telemetry serwerowa zapisuje `null`.
- Dodano test providera dla częściowego `MAX_TOKENS` oraz test SSE dla `MAX_TOKENS`, `STOP` i braku wartości.

### Weryfikacja

- Testy celowane: PASS, 2 zestawy / 4 testy.
- `npx tsc --noEmit`: PASS.
- Lint zmienionych plików: PASS.
- Pełny `npm run lint`: FAIL przez 129 istniejących błędów poza zakresem Fazy 1, m.in. `.desktop/chrome-profile/`, istniejące pliki `src/` i zmiany użytkownika w ekranie powitalnym.
- `git diff --check`: FAIL wyłącznie przez istniejące zmiany użytkownika w `src/components/chat/welcome/index.tsx` i `types.ts`; nowe pliki Fazy 1 nie mają zgłoszonych błędów białych znaków.

## Następny frontier

Faza 2: zapisać `finishReason` w stanie wiadomości oraz obsłużyć częściowe intro w `useGameStart`.

## Poza zakresem tej fazy

- `Message`, UI i przycisk „Kontynuuj narrację”.
- `useChat`, `useGameStart`, TTS, save/load i dokumentacja.
- Automatyczne ponawianie oraz zmiana limitu tokenów.

## Kolejny checkpoint

Przed Fazą 2: potwierdzenie użytkownika, ponieważ kolejna faza zmienia stan klienta, ale nadal nie buduje UI ani automatycznego ponawiania.
