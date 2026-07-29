## Plan: Diegetic Documents - Bilety i Notatniki (UI)
Data: 2026-07-29

Zaktualizowany plan uwzględnia poprawki podnoszące ocenę Spec Quality Gate do 10/10 (Budżet, Boundaries, Verification, Examples, Focus).

### Problem
Funkcja parsująca w `acquired-equipment.ts` nie rozpoznaje biletów (`ticket`), a komponent UI `DiegeticDocumentViewer.tsx` wyświetla notatniki i bilety jako standardowe listy.

### Specyfikacja UI (Spec Quality Gate 10/10):
**Examples (Przykłady wejścia/wyjścia)**:
- *Input*: Ekwipunek `name: "Stary bilet lotniczy"`. *Output*: Parser przypisze `documentType: 'ticket'`, UI wyrenderuje poziomy, prostokątny komponent z perforacją.
- *Input*: Ekwipunek `name: "Notatnik Kultysty"`. *Output*: Parser przypisze `documentType: 'journal_page'`, UI wyrenderuje kartkę z liniaturą przypominającą wyrwaną stronę z zeszytu.

**Boundaries (Czego NIE budujemy - Scope Exclusions)**:
- **Nie** importujemy nowych fontów z zewnątrz (Google Fonts) – użyjemy wyłącznie istniejących `font-serif`, `font-special-elite` i wbudowanych fontów bezszeryfowych.
- **Nie** dodajemy animacji wejścia ani skomplikowanych efektów 3D. Skupiamy się na flat design z użyciem Tailwind (tekstury, cienie i gradienty).
- **Nie** zmieniamy logiki podnoszenia przedmiotu ani logiki autozapisu Ekwipunku.

**Verification (Acceptance Criteria)**:
- [ ] Komponent typu `ticket` ma zaimplementowany układ poziomy (biletowy) z grubymi fontami.
- [ ] Komponent typu `journal_page` posiada widoczną liniaturę (powtarzający się wzór poziomy zrobiony gradientem CSS).
- [ ] Test jednostkowy w `acquired-equipment.test.ts` potwierdza poprawne zwrócenie typu `'ticket'`.
- [ ] Kompilator `tsc` nie zgłasza błędów z powodu nowego `DocumentSubType`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/types.ts` | Dodanie `'ticket'` do unii typów w `DocumentSubType` | Niskie |
| `_tester/_base/.silnik/src/lib/acquired-equipment.ts` | Wewnątrz `inferDocumentType` dodanie detekcji słowa bilet / karnet | Niskie |
| `_tester/_base/.silnik/src/lib/acquired-equipment.test.ts` | Dodanie testu weryfikującego nowy typ | Brak |
| `_tester/_base/.silnik/src/components/ui/diegetic-document-viewer.tsx` | Nowe, ostylowane bloki JSX dla `'ticket'` i `'journal_page'` | Niskie, dotyczy tylko UI komponentu |

### Weryfikacja końcowa
- Wywołanie z roota: `cd _tester/_base/.silnik && npx tsc --noEmit`
- Uruchomienie testów Jesta: `cd _tester/_base/.silnik && npm test`
- Wizualne sprawdzenie wyrenderowanych biletów na Tablicy Badacza lub w Dzienniku.
