# Stan wyjściowy implementacji: Jakość Językowa LLM [LNG-01 & LNG-02]
Data: 2026-07-23

- Jest Baseline: PASS (`resolve-settings.test.ts` 3/3 passed)
- TypeScript Baseline: Błąd `TS2345` w `predefined-characters-selector.tsx` (niezwiązany z promptami, istniejący wcześniej).

Planowane Fazy:
- Faza 1: Rozszerzenie `lovecraft-style-guide.ts` oraz `gm-protocol.ts` o dyrektywy `[LNG-01]` i `[LNG-02]`.
- Faza 2: Utworzenie i uruchomienie testów jednostkowych w `prompts-generator.test.ts`.
