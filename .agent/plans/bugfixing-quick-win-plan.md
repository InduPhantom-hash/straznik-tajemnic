## Plan: Bugfixing & Test Coverage (Quick Win)
Data: 2026-07-29
Złożoność: Prosta

### Problem
Niedziałające testy w izolowanym silniku gry (Investigator Board, PDF Ingest, Generate Starting Equipment) oraz brak asercji dla nowej logiki przypisywania podtypów dokumentów w parserze ekwipunku.

### Rozwiązanie
Uzupełnienie brakujących testów bazując na gotowych snippetach wygenerowanych w fazie badawczej. Załatanie 3 zidentyfikowanych błędów: podmiana tablicy w Tablicy Badacza na przefiltrowaną (`filteredNodes`), unifikacja mocków w testach in-gest, wstrzyknięcie zadeklarowanej ery jako argument do fabryki ekwipunku startowego.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/acquired-equipment.test.ts` | Dodanie asercji dla `inferDocumentType` i integracji w generowaniu. | Niskie |
| `_tester/_base/.silnik/src/components/ui/investigator-board.tsx` | Zmiana mapowania z `localNodes` na `filteredNodes` w renderze płótna. | Niskie |
| `_tester/_base/.silnik/src/app/api/pdf/ingest-local/route.test.ts` | Poprawa mocka dla `localVectorStore` i kontraktu sprawdzanego API. | Niskie |
| `_tester/_base/.silnik/src/app/api/equipment/generate-starting/route.ts` | Dopasowanie argumentów do `createEquipmentItem` (przekazanie `targetEra`). | Niskie |

### Fazy implementacji

**Faza 1: Test Coverage dla Ekwipunku**
- [ ] Dopisanie dostarczonych przez Subagenta testów do `acquired-equipment.test.ts`
- Weryfikacja: `cd _tester/_base/.silnik && npm test -- acquired-equipment`

**Faza 2: Naprawa zepsutych testów (Silnik)**
- [ ] Modyfikacja `investigator-board.tsx` -> podmiana `localNodes.map` na `filteredNodes.map` (w rejonie siatki kart).
- [ ] Zaktualizowanie mocków i asercji w `ingest-local/route.test.ts`.
- [ ] Przekazanie odpowiedniej ery w `generate-starting/route.ts`.
- Weryfikacja: `cd _tester/_base/.silnik && npm test` na naprawionych plikach.

### Weryfikacja końcowa
- Wywołanie w terminalu z roota silnika: `cd _tester/_base/.silnik && npm test`
- Kompilacja w poszukiwaniu błędów typów: `cd _tester/_base/.silnik && npx tsc --noEmit`

### Co może się zepsuć
- Przefiltrowana Tablica Badacza potencjalnie mogłaby gubić koordynaty przeciągnięć (drag&drop), ryzyko jest bardzo niskie, ale weryfikowane przez inne testy.
- Typowanie mocków dla VectorStore'a w testach z PDF-ami, wymaga starannego mockowania obiektów Jestem.
