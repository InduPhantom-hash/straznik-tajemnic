# v0.9.4 - karta wydania

## Status

W przygotowaniu. Ten dokument nie jest zgodą na tag, publikację ani kasowanie gałęzi.

## Zawartość komunikatu wydaniowego

### Polski

v0.9.4 porządkuje przepływ startu gry w PL i EN, stabilizuje gotowe przygody oraz wzmacnia granicę między stanem gry a narracją AI. Kod wybiera startowe wyposażenie i przechowuje kontekst świata, a AI prowadzi opis. Wydanie obejmie wyłącznie paczkę macOS.

### English

v0.9.4 improves the PL and EN game-start flow, stabilizes preset adventures, and strengthens the boundary between game state and AI narration. Code selects starting equipment and stores world context while AI leads the narrative. This release will ship as a macOS package only.

## Bramka publikacji

- `npm run navigation:check` i `npm run navigation:guard`.
- `npx tsc --noEmit`, pełny Jest, lint i build.
- Krytyczne E2E PL/EN bez błędów konsoli.
- Save v0.9.3 i zapis z `worldSetup` bez utraty danych.
- Świeżo zbudowana paczka macOS, potwierdzony `BUILD_ID`, ręczny test i akceptacja wizualna.
- Dopiero potem: merge do `main`, tag `v0.9.4`, upload artefaktu, publikacja release oraz sprzątanie wyłącznie gałęzi scalonych z `main`.
