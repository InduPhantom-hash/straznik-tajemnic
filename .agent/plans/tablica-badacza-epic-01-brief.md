## Brief: Przebudowa Dziennika & Tablicy Badacza od zera (EPIC-01)
**Co**: Przebudowa Tablicy Badacza na trwały, ręczny model detektywistyczny (korkowe płótno, czerwone sznurki Beziera z grawitacją, szuflada poszlak, Inspection Lightbox).
**Jak**: Zastosowanie natywnego stacku React 19, Pointer Events oraz warstwy SVG dla sznurków i cieni. Utrwalanie pozycji i relacji w `Character.investigatorBoard` i save'ie gry.
**Pliki**: `src/types/investigator-board.ts`, `corkboard-investigation-board.tsx` [NEW], `inspection-lightbox-modal.tsx` [NEW], `session-journal.tsx`, `convert-entries.ts`.
**Test**: `npx tsc --noEmit` oraz `npx jest src/components/ui/session-journal.test.tsx`.
**Ryzyko**: Utrata spójności przy starych save'ach (rozwiązana automatycznym wyliczeniem pozycji początkowych).
