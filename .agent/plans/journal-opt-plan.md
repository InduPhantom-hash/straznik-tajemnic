## Plan: Optymalizacja i Testy Dziennika Sesji
Data: 2026-07-27
Złożoność: Prosta

### Problem
Funkcja `convertEntriesToBoardNodes` ma luki: przepuszcza ogólne wpisy na tablicę badacza mimo deklaracji o ich zablokowaniu. Używane są brudne rzutowania TS. Brakuje testów jednostkowych zabezpieczających logikę kaskadowego ułożenia nowych dowodów (X, Y) bez niszczenia swobodnego ułożenia zachowanego po save/load.

### Rozwiązanie
Refaktoryzacja `convert-entries.ts` z nałożeniem silniejszego typowania (bez `as unknown`) oraz bezpośrednim ignorowaniem typów "journal" i "note". Następnie dodanie kompleksowego zestawu testów przy użyciu Jesta w `convert-entries.test.ts`. Opcjonalnie lekka inspekcja wydajności `session-journal.tsx`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/lib/journal/convert-entries.ts` | Wyczyszczenie TS, nałożenie filtrowania `journal` | Niskie |
| `src/lib/journal/convert-entries.test.ts` | Nowy plik z pokryciem testowym logiki Tablicy | Niskie |
| `src/components/ui/session-journal.tsx` | (Opcjonalnie) Memoizacja list renderowania | Średnie |

### Fazy implementacji

**Faza 1: Typowanie i Filtrowanie**
- [ ] Zmiana rzutowania `as unknown` w `convert-entries.ts` na bezpieczne metody z interfejsu.
- [ ] Dodanie jawnego blockera `if (typeStr === 'journal' || typeStr === 'note') return;`.
- Weryfikacja: Kompilacja TSC przechodzi bez błędu.

**Faza 2: Testy Jednostkowe**
- [ ] Napisanie testów sprawdzających mapowanie typu (encyclopedia_character -> suspect itd.)
- [ ] Napisanie testów chroniących wybrane przez gracza koordynaty `existingNodes`.
- [ ] Sprawdzenie czy kaskadowe pozycje `cascadeOffset` dla całkowicie nowych elementów działają poprawnie.
- Weryfikacja: `npm test -- convert-entries` kończy się 100% passem.

### Weryfikacja końcowa
- `npm run test` (dla nowych testów)
- Obejrzenie Tablicy Badacza po wgraniu sztucznych wpisów typu `journal` (nie powinny pojawić się na tablicy).

### Co może się zepsuć
Zablokowanie starych typów może sprawić, że niektóre specyficzne wskazówki mistrza gry nie trafią z dziennika na tablicę jako dowód. Minimalne ryzyko, bo MG powinien je oznaczać jako Odkrycia / quest.
