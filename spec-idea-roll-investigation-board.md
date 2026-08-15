# Specyfikacja: Rzut na Pomysł (Idea Roll - INT) i Wnioski Badacza

## 1. Cel Biznesowy i Fabularny (CoC 7e RAW)
Gracz w dowolnym momencie śledztwa może skorzystać z dedukcji swojej postaci (Rzut na Pomysł / Idea Roll w oparciu o cechę Inteligencja INT lub powiązaną wiedzę) na Tablicy Badacza. 
Dodatkowo w Aktach Sprawy (Dossier) wpisy poszlak, lokacji i postaci otrzymują dedykowaną sekcję "Wnioski Badacza" (`investigatorInsight`), prezentującą dedukcję postaci niezależnie od surowego opisu faktów.

---

## 2. Zmiany w Strukturze Typów Danych

### A. `src/lib/types.ts`
1. W `JournalEntry` dodać:
   ```typescript
   /** Wniosek Badacza / Dedukcja postaci (np. z rzutu na INT / Pomysł lub sukcesu śledczego) */
   investigatorInsight?: string;
   ```
2. W `ExtendedJournalEntry` (rozszerzającym `JournalEntry`) upewnić się, że pole `investigatorInsight?: string;` jest dostępne.

### B. `src/types/investigator-board.ts`
1. W `EvidenceNode` dodać:
   ```typescript
   /** Opcjonalny wniosek lub hipoteza badacza wyciągnięta z tej poszlaki */
   investigatorInsight?: string;
   ```

### C. `src/components/ui/journal/discoveries-view.tsx`
1. W `DiscoveryEntry` dodać:
   ```typescript
   investigatorInsight?: string;
   ```

---

## 3. Implementacja Mechaniki Rzutu na Pomysł na Tablicy Badacza

### Plik: `src/components/ui/journal/corkboard-investigation-board.tsx`
1. **Rozszerzenie Propsów:**
   - Dodać `activeCharacter?: Character;`
   - Dodać `onAddJournalEntry?: (entry: { title: string; content: string; type: string; tags?: string[]; inGameDate?: string; investigatorInsight?: string }) => void;`
2. **Pasek Narzędzi (Toolbar):**
   - Dodać przycisk `💡 Błysk Dedukcji (INT)` obok przycisku "Nowa notatka" i "Szuflada poszlak".
   - Przycisk ma wyróżniający się, klimatyczny złocisto-bursztynowy styl (`text-[#f4ebd0] bg-[#3a2518] hover:bg-[#503422] border border-[#bfa15f]/60`).
3. **Modal Rzutu na Pomysł (`IdeaRollModal`):**
   - Modal stylizowany na retro notes / akta detektywistyczne.
   - Prezentuje:
     - Imię postaci i cechę INT (np. `INT: 65`).
     - Progi sukcesu obliczone wg CoC 7e:
       - Zwykły (<= INT)
       - Trudny (<= INT/2)
       - Ekstremalny (<= INT/5)
       - Krytyk (01)
       - Fumble (96-100 dla INT < 50, 100 dla INT >= 50)
     - Przycisk "Wykonaj Rzut Dedukcji (k100)".
     - Po rzucie (przy użyciu `rollD100` lub `createSkillRoll` z `@/lib/dice-utils`):
       - Wyświetla animację/wynik i interpretację CoC 7e RAW:
         - **Sukces:** Badacz dostrzega powiązania między zebranymi dowodami.
         - **Porażka:** Badacz i tak uzyskuje kierunek działania, lecz z komplikacją fabularną (strata czasu, ryzyko, zły trop).
       - Pole tekstowe z edytowalnym wnioskiem dedukcyjnym (domyślnie wypełnione szablonem np. `[Błysk Dedukcji]: Badacz {imię} analizuje zgromadzone poszlaki...`).
       - Akcja: "Przypnij wniosek do Tablicy" (tworzy węzeł `clue` lub `player_note` ze statusem `hypothesis` i pozycją w centrum widoku).
       - Opcjonalna akcja zapisu do Kroniki (jeśli dostępny handler).

---

## 4. Prezentacja "Wniosków Badacza" w Aktach Sprawy (Dossier)

### Plik: `src/components/ui/journal/discoveries-view.tsx`
1. W widoku szczegółów wybranego elementu (prawa kolumna akt):
   - Jeśli wpis posiada `investigatorInsight`:
     - Wyświetlić klimatyczny blok wizualny "Wniosek Badacza":
       - Tło: pergaminowe/bursztynowe z ramką (`bg-[#d9cbb2] border-2 border-[#8c7353] p-4 my-4 rounded shadow-sm text-[#1f1712]`).
       - Nagłówek z ikoną lupy lub żarówki: `🔍 WNIOSEK BADACZA / DEDUKCJA`.
       - Tekst wniosku w kroju maszynowym (`font-special-elite` lub `font-mono`).
   - Dodać możliwość szybkiego dopisania / edycji wniosku badacza bezpośrednio w widoku dossier (przycisk "Dodaj wniosek" / pole edycji), co wywołuje `onEditEntry`.

---

## 5. Integracja w `src/components/ui/session-journal.tsx`
1. Przekazać `activeCharacter={character}` do `<CorkboardInvestigationBoard ... />`.
2. Przekazać handler `onAddJournalEntry` dla zapisywania wniosków do kroniki sesji.
3. W `<DiscoveriesView ... />` obsługiwać pole `investigatorInsight` podczas edycji i przypinania do tablicy.

---

## 6. Bramki Jakościowe (Checker / CI)
1. `npx tsc --noEmit` w `_tester/_base/.silnik` zwraca 0 błędów.
2. `npm test` w `_tester/_base/.silnik` przechodzi w 100% zielono (w tym testy `session-journal.test.tsx` i `discoveries-view.test.tsx`).
3. Spójność estetyczna: brak placeholderów, zachowanie pełnych stylów Tailwind, retro czcionek i kompatybilności z trybami Solo / Duet / Hot Seat.
