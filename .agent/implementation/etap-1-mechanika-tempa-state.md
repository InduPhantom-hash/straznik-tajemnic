# Stan implementacji: Etap 1 - mechanika tempa i bezpieczna podstawa

- Data: 2026-07-19
- Gałąź: `main`
- Plan: `.agent/plans/etap-1-mechanika-tempa-plan.md`
- Runtime: `_tester/_base/.silnik/`

## Stan wyjściowy

- Brak `CLAUDE.md` i `GEMINI.md`; źródłami konwencji są `README.md` i `docs/TESTING.md`.
- Pełny Jest przed zmianami: PASS, 25 zestawów / 66 testów.
- TypeScript `npx tsc --noEmit`: PASS.
- Drzewo robocze przed wdrożeniem zawiera zastane, nieśledzone pliki planu, researchu i dokumentacji mechanik; nie należą do kodu Fazy 1.

## Fazy

1. Kontrakt i normalizacja ustawień: zakończona.
2. Kalibracja w Sesji Zero: oczekuje.
3. Dyrektywa promptu: oczekuje.
4. Trwałość i regresja: oczekuje.

## Checkpoint Fazy 1

- `SessionZeroSettings` jest jednym eksportowanym kontraktem dla `AISettings`, modalu i generatora promptu.
- Dodano wersjonowany `SessionMechanicsSettingsV1`, fabrykę wartości startowych i normalizację nieufnych danych.
- Odczyt `ai_settings` oraz serverowy `resolveSettings()` normalizują kontrakt; request scala Sesję Zero głęboko, więc częściowy patch nie gubi istniejących pól.
- `pure_narrative` usuwa aktywną mechanikę niezależnie od zapisanej flagi.
- Dodano testy migracji localStorage oraz merge requestu.
- Testy Fazy 1: PASS, 2 zestawy / 7 testów.
- TypeScript: PASS.
- ESLint zmienionych plików: PASS.
- `git diff --check`: PASS.
