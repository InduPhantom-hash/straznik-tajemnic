## Brief: Lektor & Synteza Audio (TTS) - Punkt 5 z bug.md
**Co**: Naprawa opóźnień lektora, głosu NPC, polskich znaków oraz odczytywania ukrytych tagów systemowych.
**Jak**: Obniżenie progu pierwszego segmentu do ~25 znaków, wykrywanie imion NPC przed czyszczeniem cudzysłowów i rozbudowa filtrowania tagów systemowych.
**Pliki**: `useTTS.ts`, `text-cleaner.ts`, `route.ts` (API TTS), testy jednostkowe.
**Test**: `npx tsc --noEmit` + `npm test` dla parsera TTS.
**Ryzyko**: Częstsze zapytania HTTP do API przy bardzo krótkich pierwszych frazach (zabezpieczone progiem 25 znaków).
