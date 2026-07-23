## Plan: Przebudowa Dziennika & Tablicy Badacza od zera (EPIC-01)
Data: 2026-07-23  
Złożoność: Duża  

### Problem
Dotychczasowa Tablica Badacza była jedynie wyliczanym po okręgu widokiem bezstanowym. Tworzone sznurki i położenie kart nie zapisywały się trwale w zapisać gry, a gracz nie miał możliwości ręcznego przypinania poszlak, rysowania nitek ani wygodnego podglądu rekwizytów/zdjęć.

### Rozwiązanie
Zbudowanie natywnego, trwałego płótna korkowego `CorkboardInvestigationBoard` opartego na React 19, Pointer Events oraz warstwie SVG. Gracz otrzymuje pełną swobodę przeciągania kart, łączenia ich zakrzywionymi czerwonymi sznurkami Beziera ze zwisem grawitacyjnym, przypinania wpisów z Szuflady Poszlak oraz podglądu zdjęć w pełnoekranowym **Inspection Lightbox Modal**.

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/types/investigator-board.ts` | Rozszerzenie typów `EvidenceNode`, `EvidenceRelation`, `BoardViewport` | Niskie |
| `src/components/ui/journal/corkboard-investigation-board.tsx` | [NEW] Komponent trwałego płótna corkboard, Drag&Drop, sznurki Beziera SVG, szuflada poszlak | Średnie |
| `src/components/dialogs/inspection-lightbox-modal.tsx` | [NEW] Full-screen Lightbox do podglądu grafik i rekwizytów z notatkami | Niskie |
| `src/components/ui/session-journal.tsx` | Podpięcie nowego płótna, dodanie przycisków "Przypnij do Tablicy" | Średnie |
| `src/lib/journal/convert-entries.ts` | Uaktualnienie konwertera wstępnych węzłów tablicy | Niskie |
| `src/components/ui/journal/evidence-graph-view.tsx` | [DELETE] Usunięcie starego, matematycznego wykresu | Niskie |
| `src/components/ui/session-journal.test.tsx` | Uzupełnienie i aktualizacja testów pod nową tablicę | Niskie |

### Fazy implementacji

**Faza 1: Rozszerzenie typów i modelu danych**
- [ ] Zaktualizować `src/types/investigator-board.ts` o powiązania źródłowe (`sourceJournalEntryId`), opcje zakotwiczenia `fromAnchor`/`toAnchor` oraz statusy hipotez.
- [ ] Zaktualizować `convert-entries.ts` pod kątem nowego formatu węzłów.
- Weryfikacja: `npx tsc --noEmit`

**Faza 2: Komponent Korkowej Tablicy Badacza (Corkboard & SVG Strings)**
- [ ] Stworzyć `src/components/ui/journal/corkboard-investigation-board.tsx` z tłem korkowym i pozycjonowaniem kart.
- [ ] Wdrożyć mechanizm PointerEvents (`setPointerCapture`) do płynnego przeciągania kart z zachowaniem 60 FPS.
- [ ] Zaimplementować zakrzywione czerwone sznurki Beziera w SVG z grawitacyjnym zwisem i podwójną warstwą cienia.
- [ ] Stworzyć Szufladę Poszlak (Evidence Drawer) pozwalającą przypinać notatki, wpisy i rekwizyty na tablicę.
- Weryfikacja: `npx tsc --noEmit` i testy weryfikacyjne w przeglądarce.

**Faza 3: Full-screen Inspection Lightbox Modal**
- [ ] Stworzyć `src/components/dialogs/inspection-lightbox-modal.tsx` dla podglądu zdjęć, listów i gazet w wysokiej rozdzielczości z opcją zapisu statusu hipotezy.
- Weryfikacja: Otwieranie podglądu po kliknięciu na miniaturę karty.

**Faza 4: Integracja w SessionJournal, persystencja i testy**
- [ ] Podłączyć `CorkboardInvestigationBoard` do `session-journal.tsx`.
- [ ] Zapewnić automatyczny zapis stanu tablicy (`investigatorBoard`) do karty postaci (`Character`) oraz save'a gry (`FullGameSave`).
- [ ] Zaktualizować testy w `session-journal.test.tsx`.
- Weryfikacja: `npx tsc --noEmit` oraz `npm test`.

### Weryfikacja końcowa
- `npx tsc --noEmit`
- `npx jest src/components/ui/session-journal.test.tsx`

### Co może się zepsuć
- Przypadek brzegowy: Zaznaczenie wielu kart naraz na małych ekranach ➔ Zabezpieczone responsywnym kontenerem z przeskakiwaniem pozycji X/Y.
- Zgodność ze starymi save'ami ➔ Zabezpieczona automatyczną migracją w `convertEntriesToBoardNodes`.
