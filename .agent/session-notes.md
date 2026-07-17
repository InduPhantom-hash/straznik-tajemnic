## Podsumowanie sesji: 2026-07-17
Branch: feature/weather-osm-progress-bar

### Co zrobiono
- Backend: Integracja z Nominatim (geokodowanie), Open-Meteo (historyczna pogoda) i OpenHistoricalMap (POI z epoki) w `analyze/route.ts`.
- Hooki: Aktualizacja `useCustomAdventures.ts` o stany postępu procentowego i etapu ładowania.
- UI: Wdrożenie mosiężnego paska postępu w stylu retro w modalu `adventure-selector.tsx`.
- Wpięcie stanów do `CthulhuSidebar.tsx` oraz `page.tsx`.
- Zweryfikowano produkcyjny build Next.js/Turbopack poza piaskownicą (`BypassSandbox`).

### Co otwarte (do następnej sesji)
- Brak otwartych zadań w tym etapie.

### Decyzje podjęte
- Wykorzystanie darmowych i bezkluczowych API do automatycznego dociągania klimatycznego tła historycznego.

---

## Podsumowanie sesji: 2026-07-17 (UI overlap fix)
Branch: feature/immersion-apis

### Co zrobiono
- UI: Poprawiono nakładanie się elementów w nagłówku karty postaci (`_tester/_base/.silnik/src/components/ui/character-sheet/index.tsx`) poprzez dodanie klasy `pr-12` do `DialogHeader`, zapobiegając kolizji przycisku "Eksport MD" i dropdownu wyboru z przyciskiem zamknięcia (X).

### Co otwarte (do następnej sesji)
- Brak otwartych zadań.

### Decyzje podjęte
- Dodano bezpieczny prawy margines wewnętrzny (padding-right) w kontenerze nagłówka modala.
