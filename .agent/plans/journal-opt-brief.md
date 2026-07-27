## Brief: Optymalizacja i Testy Dziennika Sesji
**Co**: Naprawienie cichego błędu przeciekania wpisów z dziennika na Tablicę Badacza i napisanie pod to testów.
**Jak**: Zmiana `convert-entries.ts` na bezpieczne typy i zablokowanie typów 'journal' i 'note'. Dodanie Jesta do `convert-entries.test.ts`.
**Pliki**: `convert-entries.ts`, `convert-entries.test.ts`, ew. `session-journal.tsx`.
**Test**: Odpalenie nowo napisanych testów jednostkowych (`npm test -- convert-entries`).
**Ryzyko**: Bardzo małe; ryzykujemy tylko tym, że wpis z czatu nie trafi na tablicę (co jest celem tej operacji).
