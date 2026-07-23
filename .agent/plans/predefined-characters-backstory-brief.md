## Brief: Rozbudowa biografii predefiniowanych postaci [CHA-01]

**Co**: Przepisanie zdawkowych biografii 30 predefiniowanych badaczy (Gaslight, Classic, Modern) na wieloakapitowe opisy z głębią literacką CoC 7e.
**Jak**: Rozbudowa 8 aspektów tła (`characterConcept`, `description`, `ideology`, `significantPerson`, `meaningfulLocation`, `treasuredPossession`, `traits`, `backstory`) oraz jawne dodanie adnotacji Kluczowej Więzi.
**Pliki**: `src/lib/immersion/predefined-characters.ts` oraz lustrzany `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts`.
**Test**: `npx tsc --noEmit` oraz `npx jest src/lib/immersion/predefined-characters.test.ts`.
**Ryzyko**: Brak desynchronizacji plików i zachowanie kompatybilności wstecznej dla identyfikatorów postaci i ekwipunku.
