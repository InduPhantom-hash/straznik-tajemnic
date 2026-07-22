## Brief: Naprawa błędów czatu i obrazu intro

**Co**: Usunięcie zawieszania się czatu (pusty dymek z kwadratem) oraz błędów przy generowaniu obrazu intro.
**Jak**: W `useGameStart.ts` wyczyścimy pustą wiadomość w przypadku niepowodzenia `/api/chat` oraz uodpornimy wywołanie `/api/imagen` (uwzględnienie flagi wyłączenia obrazów i walidacja).
**Pliki**: `_tester/_base/.silnik/src/hooks/useGameStart.ts`, `_tester/_base/.silnik/src/app/api/chat/_helpers/run-chat-pipeline.ts`.
**Test**: `npx tsc --noEmit` + testy jednostkowe czatu (`npm test`).
**Ryzyko**: Niskie – czysto defensywna obsługa stanów błędu w hooku.
