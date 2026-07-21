## Brief: Etap 3 — Tablica Badacza (Investigator Evidence Board)
**Co**: Przebudowa Dziennika Badacza na interaktywną Tablicę Śledztwa (dowody, poszlaki, hipotezy, relacje ze sznurkami detektywistycznymi).
**Jak**: Tworzymy typy `EvidenceNode` i `EvidenceRelation`, komponent `InvestigatorBoard` z widokiem sieciowym SVG/karty, osadzamy w `SessionJournal.tsx` i uniezależniamy backend od GCS.
**Pliki**: `src/types/investigator-board.ts`, `src/components/ui/investigator-board.tsx`, `src/components/ui/session-journal.tsx`, `src/app/api/journal/route.ts`.
**Test**: `npx tsc --noEmit && npm test && npm run build`
**Ryzyko**: Skalowanie wydajności rysowania krawędzi przy wielu wpisach (rozwiązane przez dedykowany SVG layer).
