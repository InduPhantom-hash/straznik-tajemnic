# Raport Graft - checkpoint Fazy 2

Data: 2026-08-20

## Wynik

- `graft build .`: 2873 wezly, 5899 krawedzi, 574 karty kodu.
- `graft check .`: OK, graf wykonania jest zgodny z kodem.
- Skan odczytow `.era` i `.eraLabel`: zero trafien poza `src/lib/era/legacy.ts`.
- Skan cichych fallbackow `1920`, `1920s` i `1925`: zero trafien w kodzie wykonawczym poza dozwolonym adapterem i rejestrem profili.

## Granica kompatybilnosci

Graft pokazuje, ze odczyty etykiet starego modelu przechodza przez funkcje:

- `getLegacyAdventurePresentation`;
- `getLegacyEraValue`;
- `normalizeLegacyEraKey`;
- `resolveLegacySessionEra`.

Bezposrednimi konsumentami adaptera sa tylko warstwy kompatybilnosci i prezentacji:

- analiza i import scenariusza;
- selektory oraz szczegoly scenariusza;
- onboarding i szybki start;
- selektor starych presetow postaci i wyposazenia;
- Session Zero i eksport ustawien.

Zaden konsument narracji, immersji, RAG, przedmiotow, lokacji, handoutow ani obrazow nie odczytuje surowych pol `era` lub `eraLabel`.

## Sprawdzone sciezki wykonania

- `runChatPipeline` rozwiazuje jeden `ResolvedEraContext` i przekazuje go do kontekstu narracji, czasu, immersji i RAG.
- generatory obrazu wymagaja kontekstu epoki i dodaja jego fingerprint do danych zadania lub cache;
- przedmiot jest walidowany przed dodaniem do stanu postaci;
- import i wlasna przygoda wymagaja konkretnego roku oraz kraju;
- ceny i ksiazki nie podstawiaja juz roku 1920 lub 1925 przy braku parametru.

## Komendy kontrolne

```sh
npx -y @nanonets/graft@0.10.1 build .
npx -y @nanonets/graft@0.10.1 check .
rg -n "\.(era|eraLabel)\b" src --glob '!src/lib/era/legacy.ts' --glob '!**/*.test.ts' --glob '!**/*.test.tsx'
```
