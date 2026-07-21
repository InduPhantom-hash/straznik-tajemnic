## Brief: Tablica Dowodów i Graf Powiązań (v2 - Po Review)
**Co**: Wdrożenie interaktywnej Tablicy Dowodów z detektywistycznym grafem powiązań (nitki łączące poszlaki, NPC i artefakty) w `SessionJournal`.
**Jak**: 
1. Dodanie pól `linkedEntryIds` oraz `hypothesisStatus` do `JournalEntry`.
2. Wydzielenie typu zakładek UI (`JournalTab`) od typu wpisu (`JournalEntryType`) dla uniknięcia błędów filtrowania.
3. Utworzenie komponentu `EvidenceGraphView` (SVG/Canvas z automatycznym układem okręgowym i interaktywnym podświetlaniem powiązań).
4. Rozbudowa formularzy edycji/dodawania o powiązania, kaskadowe czyszczenie usuniętych odnośników w `deleteEntry` oraz wsparcie dla powiadomień i eksportu Markdown.
**Pliki**: 
- `src/lib/types.ts`
- `src/components/ui/session-journal.tsx`
- `src/components/ui/journal/evidence-graph-view.tsx` [NEW]
- `src/components/ui/session-journal.test.tsx`
**Test**: `npm test -- --testPathPatterns=journal`, `npx tsc --noEmit`
**Ryzyko**: Średnie (wymaga starannej aktualizacji komponentu `session-journal.tsx`).
