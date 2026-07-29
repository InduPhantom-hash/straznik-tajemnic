## Brief: Stabilizacja Immersji (Karta Badacza, Awatary, Parser)
**Co**: Wdrożenie poprawek dla awatarów NPC, metadanych postaci i parsera dokumentów.
**Jak**: Zmiana `notes` na `tacticalNotes`, dodanie Flexbox + Image dla dialogów czatu, i skopiowanie udoskonalonego parsera regex z `_tester` do `src/`.
**Pliki**: `types.ts`, `predefined-characters.ts`, `predefined-characters-selector.tsx`, `render-sections.tsx`, `acquired-equipment.ts` (i testy).
**Test**: Uruchomienie testów lokalnych i weryfikacja wizualna renderowania czatu.
**Ryzyko**: Średnie ryzyko związane z dopasowywaniem regex przy parserze dokumentów.
