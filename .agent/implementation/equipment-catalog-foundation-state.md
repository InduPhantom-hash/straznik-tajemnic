# Stan implementacji: fundament katalogu ekwipunku

- Data: 2026-07-19
- Gałąź: `main`
- Plan: `.agent/plans/ekwipunek-katalog-dokumenty-dziennik-plan.md`
- Runtime: `_tester/_base/.silnik/`

## Stan wyjściowy

- Drzewo robocze zawiera trzy zastane, nieśledzone pliki dokumentacyjne poza zakresem.
- Commit `b7eb940` wdrożył większość Fazy 1: `EquipmentTemplate`, `templateId`,
  lokalne WebP, migrację legacy oraz pomijanie katalogu w automatycznej kolejce.
- Testy katalogu, kolejki i save: PASS, 3 zestawy / 7 testów.
- TypeScript `npx tsc --noEmit`: PASS.

## Zakres domknięcia Fazy 1

- [x] respektowanie `imageGenerationEnabled` przez automatyczną kolejkę;
- [x] zakaz ręcznego generowania AI dla lokalnych assetów katalogowych;
- [x] zachowanie katalogowych assetów przy starcie gry także dla `templateId` legacy;
- [x] testy regresyjne i weryfikacja jakości.

## Poza zakresem

- treści czytalnych dokumentów i Dziennik;
- rozszerzanie katalogu z niepotwierdzonego źródła;
- porządkowanie zastanych plików roadmapy mechanik.

## Checkpoint Fazy 1

- Automatyczna kolejka kończy pracę przed wyborem przedmiotów, gdy toggle
  `Obrazy` jest wyłączony.
- Przedmioty katalogowe nie pokazują akcji generowania ani regenerowania AI.
- Obraz wygenerowany dla przedmiotu fabularnego otrzymuje `visualSource: generated`.
- Start gry rozpoznaje katalog po `visualSource` albo `templateId`, więc nie czyści
  lokalnych assetów także w częściowo zmigrowanych danych.
- Testy skupione: PASS, 3 zestawy / 8 testów.
- Pełny Jest: PASS, 23 zestawy / 59 testów.
- TypeScript: PASS.
- ESLint zmienionych plików: 0 błędów, 8 wcześniejszych ostrzeżeń.
- `git diff --check`: PASS.
- Produkcyjny build Next.js: PASS, 61 stron; pozostały wcześniejsze ostrzeżenia
  Prisma/Sentry oraz nieaktualnej bazy Browserslist.

## Status

Faza 1 zakończona po poprawkach z `dev-5-review`. Fazy 2-4 pozostają poza
zakresem tej sesji.

## Poprawki po review

- Usunięto efekt strony, który uruchamiał kolejne kolejki po każdej aktualizacji
  `activeCharacter`; jedynym właścicielem startu kolejki jest `useGameStart`.
- Dodano blokadę trwającej kolejki per postać oraz zatrzymanie następnych żądań
  po wyłączeniu toggle albo zmianie aktywnej postaci.
- Automatyczna generacja zapisuje atomowo `imageUrl`, `imagePrompt` i
  `visualSource: generated`.
- Predefiniowane postacie wybierają właściwy WebP katalogowy dla swojej epoki,
  a SVG kategorii pozostaje wyłącznie fallbackiem.
- Era wizualna przechodzi przez kreator, endpoint startowego ekwipunku oraz pełny
  save/load. Starsze save'y nadal używają tolerancyjnego fallbacku.
- `templateId` jest uznawany za katalogowy tylko wtedy, gdy istnieje w katalogu;
  jawnie wygenerowane znaleziska zachowują status fabularny.
- Dodano test endpointu, modalu, deduplikacji, zmiany toggle w trakcie kolejki,
  metadanych obrazu, assetów epoki i round-trip profilu epoki w save.
- Pełny Jest po poprawkach: PASS, 25 zestawów / 66 testów.
- TypeScript: PASS.
- Produkcyjny build: PASS, 61 stron.
- Katalog: 35 WebP, 7,5 MB; największy pojedynczy asset około 328 KB.
- Paczka ZIP nie została nadpisana, ponieważ jest śledzonym artefaktem wydania;
  jej przebudowa wymaga osobnej decyzji publikacyjnej.
