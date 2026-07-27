## Plan: Stabilizacja Ekwipunku i Tablicy Badacza (Evidence Board)
Data: 2026-07-27
Złożoność: Średnia

### Problem
Tablica Badacza (Evidence Board) oraz katalog Ekwipunku (Equipment) cierpią na okresowe niestabilności (wspomniane w changelogu v0.9.2-beta). Zapisywanie węzłów po Drag&Drop oraz automatyczne pozycjonowanie na planszy koliduje z przepływem danych z Dziennika. Brakuje pełnej jasności, czy nowo zebrane przedmioty mają automatycznie lądować na tablicy.

### Rozwiązanie
Zintegrujemy Ekwipunek i Dziennik z Tablicą: zapewnimy że nowo zdobyte przedmioty (generujące wpisy typu `item` w dzienniku) da się łatwo "Przypiąć" do Tablicy. Poprawimy też przepływ stanu (state flow) podczas Drag&Drop w `investigator-board.tsx`, aby pozycje kart X,Y zapisywały się niezawodnie w `investigatorBoard` (czyli w save). Zmodyfikujemy początkowe wyliczanie gridu, by nie resetowało ustawień użytkownika, tylko dokładało nową kartę na dole ekranu.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/components/ui/investigator-board.tsx` | Bezpieczniejsze callbacki dla `handlePointerUpNode` i update'u relacji. Dodanie przycisku przypinania przedmiotów, o ile zajdzie potrzeba w UI. | Niskie |
| `src/components/ui/session-journal.tsx` | Upewnienie się, że `investigatorBoard` wewnątrz `activeCharacter` faktycznie odbiera zaktualizowane dane od tablicy bez zbędnych re-renderów. | Średnie |
| `src/lib/journal/convert-entries.ts` | Poprawa logiki mapowania współrzędnych gridu: tak by nowe obiekty nie nadpisywały ustawień, a dostawały bezpieczną przestrzeń. | Średnie |

### Fazy implementacji

**Faza 1: Stabilizacja State'u w Dzienniku Sesji (Session Journal)**
- [ ] Zoptymalizować callbacki w `session-journal.tsx`, aby zmiany stanu tablicy (`onUpdateNodes` i `onUpdateRelations`) natychmiast synchronizowały się z `onUpdateCharacter` lub buforowały poprawnie przed autozapisem.
- Weryfikacja: `npx tsc --noEmit` i przetestowanie zachowania po "Save and Exit".

**Faza 2: Integracja Dziennika z Tablicą Dowodową**
- [ ] Poprawić `convert-entries.ts` by nowe węzły otrzymywały wolne koordynaty, zamiast wymuszać grid za każdym razem, nadpisując pracę gracza. (Można to obsłużyć tylko przy pierwszej generacji węzła i zapisywać w localStorage/Character).
- [ ] Dodać logikę w `session-journal.tsx`, która pozwala przypiąć zgromadzony "Equipment" bądź notatkę fabularną na tablicę (przycisk Pinned).
- Weryfikacja: Dodanie przedmiotu do ekwipunku z logów GM i ręczne przypięcie.

**Faza 3: Naprawa bugów Ekwipunku / Grafu powiązań**
- [ ] Dodanie szlifów z "backlogu Ekwipunku" o których mowa w roadmapie: poprawienie czytelności linii sznurków.

### Weryfikacja końcowa
- `npm run build` by zweryfikować brak błędów TypeScript w zintegrowanych komponentach.
- Zautomatyzowany test przepływu HotSeat dla Dziennika Sesji.

### Co może się zepsuć
- Jeśli `session-journal.tsx` re-renderuje się przy każdym ruchu kursora, UI zlaguje — wymaga weryfikacji że używamy tam stanu pochodnego (lokalnego) wewnątrz `investigator-board.tsx`.
