# Plan: Rozbudowa Tablicy Dowodów Badacza (Evidence Board & Mindmap Relations) [v2 - Poprawiony]

**Data**: 2026-07-21  
**Złożoność**: Średnia  

---

### Problem
Obecna Tablica Badacza (`session-journal.tsx`) zawiera cztery główne zakłady (Misje, Kronika, Encyklopedia, Notatki) z możliwością dodawania i edytowania poszlak. Brakuje jej jednak wizualnych relacji powiązań między poszlakami, NPC, artefaktami i hipotezami oraz dedykowanego podglądu mapy myśli / grafu powiązań (Evidence Graph / Mindmap), co utrudnia badaczom łączenie faktów w sprawach lovecraftowskich.

---

### Rozwiązanie
Rozbudujemy system Dziennika/Tablicy Badacza o:
1. **Model Relacji i Hipotez w `types.ts`**: Dodanie opcjonalnych wskaźników relacji powiązanych wpisów (`linkedEntryIds?: string[]`, `hypothesisStatus?: 'unverified' | 'confirmed' | 'disproven'`).
2. **Rozdzielenie Zakładek UI od Typów Wpisów**: Wprowadzenie jawnego typu zakładek UI (`JournalTab = 'quest' | 'journal' | 'encyclopedia_character' | 'encyclopedia_location' | 'encyclopedia_item' | 'note' | 'evidence_graph'`), co zapobiegnie błędowym filtrowaniom wpisów.
3. **Zakładka "Tablica Powiązań / Graf" (`EvidenceGraphView`)**: Interaktywny widok Canvas/SVG rysujący węzły (poszlaki, postaci, miejsca, artefakty) z detektywistycznymi połączeniami (czerwone nitki) i autolayoutem.
4. **Rozbudowa Formularzy i Logiki Czyszczenia**: Modyfikacja `AddEntryForm` oraz `EditEntryForm` o możliwość wyboru powiązań, wsparcie dla eksportu Markdown oraz kaskadowe czyszczenie odnośników w `deleteEntry`.

---

### Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|---|---|---|
| [`src/lib/types.ts`](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/lib/types.ts) | Rozszerzenie `JournalEntry` o `linkedEntryIds?: string[]` i `hypothesisStatus` | Niskie |
| [`src/components/ui/session-journal.tsx`](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/session-journal.tsx) | Dodanie zakładki `evidence_graph`, podpięcie powiadomień, obsługa formularzy, czyszczenie sierot w `deleteEntry` i export Markdown | Średnie |
| [`src/components/ui/journal/evidence-graph-view.tsx`](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/journal/evidence-graph-view.tsx) `[NEW]` | Dedykowany komponent Canvas/SVG z automatycznym ukradem węzłów i podglądem połączeń | Niskie |
| [`src/components/ui/session-journal.test.tsx`](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/components/ui/session-journal.test.tsx) | Dodanie testów jednostkowych przełączania zakładki Grafu oraz czyszczenia relacji przy usuwaniu wpisu | Niskie |

---

### Fazy implementacji

#### Faza 1: Model relacji w typach i kaskadowe czyszczenie sierot
- [ ] Rozszerzenie interfejsu `JournalEntry` w `types.ts` o pola: `linkedEntryIds?: string[]` oraz `hypothesisStatus?: 'unverified' | 'confirmed' | 'disproven'`.
- [ ] Aktualizacja `ExtendedJournalEntry` w `session-journal.tsx` oraz wprowadzenie typu zakładek `JournalTab`.
- [ ] Modyfikacja `deleteEntry` w `session-journal.tsx` usuwająca ID usuwanego wpisu z tablic `linkedEntryIds` we wszystkich pozostałych wpisach.
- **Weryfikacja**: `npm test -- --testPathPatterns=journal` (brak regresji w istniejących testach).

#### Faza 2: Komponent Grafu Powiązań (`EvidenceGraphView`)
- [ ] Stworzenie nowego komponentu Canvas/SVG (`evidence-graph-view.tsx`), który generuje pozycje węzłów po okręgu/siatce z detektywistycznymi czerwonymi nitkami.
- [ ] Dodanie interaktywności: kliknięcie w węzeł otwiera szczegóły wpisu lub podświetla połączone poszlaki.
- **Weryfikacja**: Kompilacja TypeScript bez błędów.

#### Faza 3: Integracja z `SessionJournal`, Formularzami i Testy
- [ ] Dodanie wyboru powiązanych poszlak w formularzach `AddEntryForm` i `EditEntryForm`.
- [ ] Aktualizacja funkcji `unseenCounts`, `markTabAsSeen` oraz `exportToMarkdown`.
- [ ] Dodanie nowej zakładki "Tablica Powiązań" w pasku nawigacji `SessionJournal`.
- [ ] Uzupełnienie testów jednostkowych w `session-journal.test.tsx`.
- **Weryfikacja**: `npm test` oraz sprawdzenie w produkcyjnym buildzie `npm run dev`.

---

### Weryfikacja końcowa
- `npm test`
- `npx tsc --noEmit`
- Manualna weryfikacja w interfejsie Dziennika

---

### Co może się zepsuć
- Zamieszanie przy dużej liczbie połączeń – rozwiązanie: wyliczanie pozycji węzłów po okręgu z filtrowaniem niepołączonych elementów w osobnym panelu.
