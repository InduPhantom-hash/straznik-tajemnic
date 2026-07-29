## Plan: Dopięcie typu dokumentów w parserze Ekwipunku (Aktualizacja .silnik)
Data: 2026-07-29
Złożoność: Prosta

### Problem
Główna aplikacja znajduje się w `_tester/_base/.silnik`. Funkcja tworząca seed przedmiotu dla czatu (`createAcquiredEquipmentSeed` w `acquired-equipment.ts`) nie dopisuje wywnioskowanego podtypu `documentType`. Skutkuje to tym, że komponent `DiegeticDocumentViewer` w UI nie potrafi dobrać stylów (np. legitymacji prasowej czy teczki dowodowej) i fallbackuje do zwykłego listu.

### Rozwiązanie
Rozszerzenie obiektu wyjściowego funkcji `createAcquiredEquipmentSeed` o właściwość `documentType`, poprzez dodanie wywołania `inferDocumentType(proposal)` dla kategorii `document` bezpośrednio we właściwym katalogu kodowym aplikacji.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/acquired-equipment.ts` | Dopisanie `documentType` w obiekcie zwracanym przez `createAcquiredEquipmentSeed`. | Niskie |

### Fazy implementacji

**Faza 1: Rozszerzenie parsera (Kod produkcyjny)**
- [ ] Zlokalizowanie poprawnego pliku w `_tester/_base/.silnik/src/lib/acquired-equipment.ts`.
- [ ] Dopisanie destruktyzacji: `...(category === 'document' ? { documentType: inferDocumentType(proposal) } : {}),`.
- Weryfikacja: Wewnątrz katalogu `.silnik` odpalić `npx tsc --noEmit`.

### Weryfikacja końcowa
- Wywołanie z roota: `cd _tester/_base/.silnik && npx tsc --noEmit`
- Uruchomienie testów Jesta z roota: `cd _tester/_base/.silnik && npm test`

### Co może się zepsuć
- Przypisanie niewłaściwego layoutu w wyniku nietypowej nazwy od AI. Ryzyko bliskie zera (jest obsługiwane przez fallback do listu).
- Niestabilność okna czatu przy bardzo długich dokumentach, co łagodzimy utrzymaniem leniwego ładowania ("Przeczytaj dokument").
