## Brief: Przebudowa Predefiniowanych Badaczy
**Co**: Rozbudowa bazy gotowych badaczy z 34 do 40 oraz odświeżenie ich prezentacji wizualnej w menu wyboru postaci.
**Jak**: Wygenerowanie 6 nowych postaci, uzupełnienie `tacticalNotes` na starych i wyświetlenie go na poprawionych kafelkach w UI modalu.
**Pliki**: `predefined-characters.ts`, `strefa-11-characters.ts`, `predefined-characters-selector.tsx`, `predefined-characters-selector.test.tsx`
**Test**: Weryfikacja testów `npm test` dla modalu oraz ręczne testowanie wyboru trybów nowej gry (Szybka/Manualna).
**Ryzyko**: Średnie (wymagana precyzyjna integracja z istniejącym kodem React Modali; ryzyko flakiness w E2E).
