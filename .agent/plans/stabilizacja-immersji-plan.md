## Plan: Stabilizacja Immersji (Karta Badacza, Awatary, Synchronizacja Parsera)
Data: 2026-07-29
Złożoność: Średnia

### Problem
Należy dokończyć Etap 3.6 stabilizacji: zaktualizować metadane 40 predefiniowanych postaci (rozdzielić notatki MG od gracza), dodać portrety (awatary) NPC w czacie oraz naprawić błąd braku przypisywania `documentType` zdobywanego wyposażenia, używając poprawionej logiki z silnika testowego.

### Rozwiązanie
Rozdzielimy notatki przez zmianę klucza `notes` na `tacticalNotes` w szablonach postaci, dodamy układ Flexbox z komponentem awatara do okna czatu i zsynchronizujemy parser dokumentów kopiując gotowy kod z `_tester`.

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `src/lib/types.ts` | Usunięcie `notes` / dodanie `ticket` do `DocumentSubType` | Niskie |
| `src/lib/immersion/predefined-characters.ts` | Zamiana kluczy `notes` na `tacticalNotes` w obiektach | Niskie |
| `src/components/ui/predefined-characters-selector.tsx` | Aktualizacja powiązania w UI na `tacticalNotes` | Niskie |
| `_tester/_base/.silnik/src/components/chat/narrative/render-sections.tsx` | Wdrożenie awatarów NPC w bloku `dialogue` | Średnie |
| `src/lib/acquired-equipment.ts` | Skopiowanie parsera regex z `_tester` i przypięcie `documentType` przy tworzeniu | Wysokie |
| `src/lib/acquired-equipment.test.ts` | Migracja bloków testowych | Niskie |

### Fazy implementacji

**Faza 1: Aktualizacja Predefiniowanych Badaczy**
- [ ] Zmiana kluczy z `notes` na `tacticalNotes` w plikach z definicjami postaci i poprawa interfejsu.
- [ ] Poprawienie komponentu wyboru postaci.
- Weryfikacja: Załadowanie ekranu wyboru postaci w UI.

**Faza 2: Awatary w czacie NPC**
- [ ] Refaktoryzacja `case 'dialogue'` w parserze narracji, wdrożenie układu Flexbox.
- [ ] Stworzenie logiki rozwiązywania portretów NPC z domyślnego folderu `public/portraits/predefined/` (lub generyczne inicjały).
- Weryfikacja: Kompilacja i wizualny test czatu.

**Faza 3: Synchronizacja Parsera Dokumentów**
- [ ] Przeniesienie `DocumentSubType = 'ticket'` do typów głównej aplikacji.
- [ ] Kopia naprawionej logiki `inferDocumentType` z silnika testowego do głównej aplikacji.
- [ ] Skopiowanie testów z silnika testowego.
- Weryfikacja: `npm test` dla pliku testowego `acquired-equipment.test.ts`.

### Weryfikacja końcowa
`npx jest src/lib/acquired-equipment.test.ts` (jeśli projekt używa Jesta lokalnie) lub standardowe `npm run build`.

### Co może się zepsuć
- **Awatary w czacie:** Złamanie układu mobilnego po dodaniu awatara we Flexboxie (Ryzyko: Niskie).
- **Parser Dokumentów:** Nieprzewidziana klasyfikacja dotychczas poprawnie parsowanych dokumentów (brak zachowania backward-compatibility) u obecnych graczy ze względu na zmiany regexów (Ryzyko: Średnie).
