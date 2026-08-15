# Session Notes: Strażnik Tajemnic AI

## Podsumowanie sesji: 2026-08-15
Branch: main

### Co zrobiono
- Utworzono i zaimplementowano pełne 200-300 słowne biografie (pole `backstory`) dla wszystkich 16 predefiniowanych badaczy ze Strefy 11 w `_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts`.
- Wyczyszczono zduplikowaną tablicę badaczy w `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts` i połączono ją bezpośrednio z `strefa-11-characters.ts`.
- Usunięto zdezaktualizowany katalog `src/` z korzenia repozytorium (Single Source of Truth w `_tester/_base/.silnik/src/`).
- Zaktualizowano i zaliczono testy jednostkowe (`npm test` PASS w 100%).
- Zbudowano produkcyjnie Next.js (`npm run build` PASS) i zrekonstruowano pakiet aplikacji desktopowej na biurku (`desktop/build-app.sh --rebuild`).
- Zaktualizowano tracker zadań `zadania.md`.

### Co otwarte (do następnej sesji)
- Wygenerowanie dedykowanych portretów dla postaci Strefy 11 w klimacie epoki (Polska lat 90./2000.) do katalogu `public/portraits/predefined/strefa11/`.
- Generator ręczny badacza: integracja automatycznego generowania 300-słownego życiorysu z wybranych atrybutów.

### Decyzje podjęte
- `_tester/_base/.silnik/src/` jest wyłącznym źródłem prawdy dla kodu i danych aplikacji.
- Wszystkie postacie Strefy 11 są zintegrowane w jednej wspólnej bazie `PREDEFINED_CHARACTERS` i dostępne we wszystkich modalach.

## Podsumowanie sesji: 2026-08-15 (Zadanie 1 - Legacy Journal Cleanup)
Branch: main

### Co zrobiono
- Usunięto 4 pliki legacy: `app/journal/page.tsx`, `app/api/journal/route.ts`, `components/ui/journal.tsx`, `lib/journal/types.ts` oraz martwe pliki pomocnicze (`categories.ts`, `markdown-export.ts`, `pdf-template.ts`, `index.ts`).
- Zaktualizowano `useFullReset.ts` (usunięcie nieistniejącego endpointu `/api/journal`).
- Wdrożono mechanikę Rzutu na Pomysł (Idea Roll / Test INT) z dedukcją postaci na Tablicy Badacza (`corkboard-investigation-board.tsx`, `types.ts`, `investigator-board.ts`).
- Zaktualizowano testy i skrypty weryfikacyjne (`feature-16-settings.spec.ts`, `feature-4-image-gallery.spec.ts`, `build-tester-pack.sh`, `apply-journal-tags.ts`).
- Wszystkie testy jednostkowe zaliczone (`npm test` PASS 47/47) oraz pomyślna kompilacja Next.js (`npm run build` PASS, 65 tras).
- Zaktualizowano `state.md`.

### Co otwarte (do następnej sesji)
- Zadanie 2: Rozbudowa i optymalizacja Dziennika Sesji / Tablicy Badacza.
- Dedykowane portrety graczy Strefy 11 w klimacie lat 90.

### Decyzje podjęte
- `session-journal.tsx` oraz `src/lib/types.ts` stanowią jedyne źródło prawdy (SSOT) dla dziennika i tablicy dowodów.

## Podsumowanie sesji: 2026-08-15 (Zadanie 2 - Rzut na Pomysł i Wnioski Badacza)
Branch: main

### Co zrobiono
- Rozszerzono typy danych (`JournalEntry`, `ExtendedJournalEntry`, `EvidenceNode`, `DiscoveryEntry`) o pole `investigatorInsight?: string`.
- Zaimplementowano mechanikę Rzutu na Pomysł (Idea Roll - INT) na Tablicy Badacza (`corkboard-investigation-board.tsx`) z kalkulacją progów CoC 7e RAW (Zwykły, Trudny, Ekstremalny, Krytyk, Fumble), animacją kości k100, fabularną interpretacją sukcesu/porażki, przypinaniem wniosku jako notatki do tablicy oraz zapisem w Kronice.
- Dodano renderowanie winiety z wnioskiem dedukcyjnym bezpośrednio na kartach tablicy korkowej.
- Zaimplementowano sekcję "Wniosek Badacza" w Aktach Sprawy (`discoveries-view.tsx`) z maszynowym krojem na pergaminowym tle oraz możliwością bezpośredniego dopisywania i edycji wniosków.
- Zintegrowano przekazywanie `activeCharacter` i `investigatorInsight` w `session-journal.tsx` oraz `inspection-lightbox-modal.tsx`.
- Dodano testy jednostkowe (`corkboard-investigation-board.test.tsx`, `discoveries-view.test.tsx`).
- Wszystkie testy jednostkowe (`npm test` 48/48 suite'ów, 175 testów) i TypeScript (`npx tsc --noEmit`) zaliczone na 100% zielono.
- Zaktualizowano `zadania.md`.

### Co otwarte (do następnej sesji)
- Zadanie 3: Klimatyczny stempel powiadomień w czacie (`📜 Zapisano w aktach sprawy: [Nazwa]`).
- Zadanie 4: Dwustronna konfrontacja teorii i aktualizacja kolorów sznurków (`[HIPOTEZA]`).
- Dedykowane portrety postaci Strefy 11 w klimacie lat 90.

### Decyzje podjęte
- Rzut na Pomysł (INT) jest w pełni zgodny z CoC 7e RAW: porażka w teście dedukcji nie blokuje śledztwa, lecz wprowadza komplikację fabularną (np. stratę czasu lub ryzyko).
- Wnioski Badacza (`investigatorInsight`) są traktowane jako osobna warstwa diegetyczna względem surowych faktów i poszlak.


