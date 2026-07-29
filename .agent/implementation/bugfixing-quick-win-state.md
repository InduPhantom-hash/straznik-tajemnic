# Stan początkowy: Bugfixing & Test Coverage (Quick Win)
Data: 2026-07-29

Przed wdrożeniem planu uruchomiono `npm test` w katalogu silnika (`_tester/_base/.silnik`).

**Wyniki bazy startowej:**
- 🔴 `src/app/api/equipment/generate-starting/route.test.ts` (1 failed)
- 🔴 `src/app/api/pdf/ingest-local/route.test.ts` (3 failed)
- 🔴 `src/components/ui/investigator-board.test.tsx` (1 failed)
- 🟢 43 passed

**Logi błędów potwierdzają wcześniejszą diagnozę:**
- `generate-starting`: Oczekiwano `/equipment/catalog/revolver-1940s.webp`, a otrzymano `undefined`.
- `ingest-local`: Mismatch kontraktu błędów JSON (asercje vs faktyczne returny) i błędne mockowanie `recordCount`.
- `investigator-board`: Test odrzucania "Prof. Archibald Sterling" zawodzi, bo komponent renderuje wszystko mimo filtrów.

Rozpoczynam Fazę 1: **Test Coverage dla Ekwipunku** w pliku `acquired-equipment.test.ts`.
