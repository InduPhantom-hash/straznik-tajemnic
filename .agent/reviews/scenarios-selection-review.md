## Plan Review: Włączenie i wybór Autorskich Scenariuszy Strefa 11
Data: 2026-07-26

### Ocena ogólna
🟢 Zielony — Plan jest konkretny, precyzyjnie definiuje brakujący element w UI i adresuje właściwe pliki bez nadmiarowego zakresu.

### Przegląd według wymiarów

1. **Definicja problemu**: Jasna. Modal ukrywał autorskie scenariusze Strefa 11 w trybie publicznym `SHOW_BUILT_IN_ADVENTURES = false`.
2. **Kompletność**: Uwzględnia modyfikację komponentu UI `adventure-selector.tsx` oraz pliku pomocniczego `adventures-data.ts`.
3. **Dopasowanie do architektury**: Zgodne z przyjętymi konwencjami UI (spójne z resztą Radix UI / Tailwind).
4. **Rabbit holes**: Niskie ryzyko.
5. **Promise gaps**: Wszystkie punkty końcowe są jasne i weryfikowalne.
6. **Strategia testowania**: Kompilacja typów `npx tsc --noEmit` oraz weryfikacja wizualna modalu wyboru scenariuszy.
7. **Zgodność z guardrails**: Zakres zmian ograniczony do 2 plików.

### Rekomendacja
Przejść do fazy implementacji (`/dev-4-implement`).
