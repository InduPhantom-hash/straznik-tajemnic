# Mikro-szablony architektoniczne dla Strażnika Tajemnic AI

Katalog zawiera kanoniczne wzorce strukturalne dla agentów programistycznych i deweloperów (wzorzec ze skilla `aios-vibe-coder`, Faza 3).

## Dostępne szablony:

1. **`ui-component.template.tsx`**:
   - Wymuszone użycie `useTranslations` (zakaz surowych tekstów w JSX).
   - Defensywna normalizacja tablic i obiektów na wejściu (`Array.isArray`).
   - Standardowa struktura stanów (loading, empty, content).

2. **`i18n-regression.template.test.ts`**:
   - Sprawdzenie spójności kluczy użytych w kodzie z `messages/pl.json` i `messages/en.json`.
   - Ochrona przed asymetrią typów (np. tablica w PL a string w EN).

## Zasady użycia:
- Każdy nowo tworzony komponent UI musi bazować na strukturze `ui-component.template.tsx`.
- Każda zmiana dotykająca kluczy tłumaczeń musi przejść walidację `npm run i18n:check` w `_tester/_base/.silnik`.
