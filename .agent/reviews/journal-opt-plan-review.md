## Plan Review: journal-opt-plan.md
Data: 2026-07-27

### Ocena ogólna
🟡 Żółty — Plan jest w 80% poprawny, ale zawiera ryzykowne rozmycie zakresu ("Opcjonalna optymalizacja Reacta") i pomija import kluczowego typu, przez co obiecywane "oczyszczenie TS" będzie niemożliwe bez dodatkowych zmian.

### Znalezione problemy

**Krytyczne** (blokują implementację):
- [Kompletność]: Plan nie precyzuje, jak pozbędzie się brudnego rzutowania `entry as unknown`. Powód rzutowania to fakt, że `convert-entries.ts` używa typu `JournalEntry`, podczas gdy `category` znajduje się w `ExtendedJournalEntry` (zdefiniowanym w `session-journal.tsx`!). 
  → Sugestia: Wydzielić `ExtendedJournalEntry` do osobnego, współdzielonego pliku typów (np. `src/lib/types.ts` lub wyciągnąć go do `convert-entries.ts`), aby `convert-entries` mogło importować czysty interfejs i przestać używać `unknown`.

**Ostrzeżenia** (warto adresować):
- [Rabbit holes]: "Opcjonalna inspekcja wydajności `session-journal.tsx`" - to plik mający ponad 1800 linii. Próba optymalizacji React Hooks (`useMemo`, `useCallback`) w "Quick Winie" bez wyraźnych wytycznych grozi zepsuciem state machine'a całego Dziennika.
  → Sugestia: Porzucić inspekcję Reacta na teraz. Skupić się absolutnie i wyłącznie w 100% na czystej logice `convert-entries` i testach jednostkowych Jesta.

**Obserwacje** (do rozważenia):
- Algorytm kaskady (zmienna `cascadeOffset`) nakłada proste pozycje w rogu (X=50, Y=50 +30 offset). Choć chroni pozycje "starych" kart, może nałożyć nową kartę prosto na starą, bo nie sprawdza macierzy kolizji. Ostrzegam przed próbą refaktoryzacji tego w tym konkretnym quick winie - algorytm kaskady to osobne, większe zadanie. Skupiamy się na dodaniu samych testów.

### Rekomendacja
Zrewidować plan (usunąć z niego edycję `session-journal.tsx`, włączyć refaktor typu `ExtendedJournalEntry`), następnie zaimplementować.
