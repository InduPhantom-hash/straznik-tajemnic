# Plan: Rozszerzona Ekstrakcja Przygody z PDF (Gemini 3.6 Flash)

Data: 2026-07-21
Złożoność: Średnia

### Problem
Obecnie wczytywany scenariusz PDF trafia do lokalnego magazynu RAG w postaci surowych chunków tekstowych (`data/rag/adventures.*`). Brak ustrukturyzowanych danych o postaciach (NPC), kluczowych lokacjach, przedmiotach fabularnych oraz powiązaniach uniemożliwia automatyczne zasilanie Tablicy Badacza oraz precyzyjne odwołania w kontekście MG.

### Rozwiązanie
Wykorzystamy udostępniony dzisiaj model `gemini-3.6-flash` (wysoka wydajność, niska cena, wysoka precyzja w strukturyzowanym JSON). 
Po sparsowaniu tekstu z pliku PDF utworzymy dedykowany moduł `adventure-extractor.ts`, który przetworzy wyekstraktowany tekst i za pomocą Gemini 3.6 Flash zwróci pełną ustrukturyzowaną mapę przygody (NPC z maską/ukrytym celem, lokacje, rekwizyty/dokumenty oraz wskazówki). Wynik zostanie zapisany w lokalnym katalogu `data/adventures/{adventureId}.json`.

---

### Pliki do modyfikacji / utworzenia

| Plik | Zmiana | Ryzyko |
| :--- | :--- | :--- |
| `src/types/adventure.ts` | **[NEW]** Definicje interfejsów dla struktur wyekstrahowanej przygody (`AdventureEntity`, `NPC`, `Location`, `Clue`, `Item`) | Niskie |
| `src/lib/pdf/adventure-extractor.ts` | **[NEW]** Moduł wywołujący `gemini-3.6-flash` do strukturyzacji tekstu scenariusza w JSON | Średnie |
| `src/app/api/pdf/ingest-local/route.ts` | **[MODIFY]** Dodanie kroku wywołania `extractAdventureEntities` gdy typ dokumentu to `adventure` oraz zapis wyniku JSON | Niskie |
| `state.md` | **[MODIFY]** Aktualizacja statusu Etapu 2 w roadmapie projektu | Niskie |

---

### Fazy implementacji

#### Faza 1: Typy danych & Moduł Ekstraktora (`gemini-3.6-flash`)
- [ ] Utworzenie `src/types/adventure.ts` zawierającego czyste typy danych dla wyekstrahowanych encji z przygody.
- [ ] Utworzenie `src/lib/pdf/adventure-extractor.ts` realizującego zapytanie do `gemini-3.6-flash` z instrukcją ekstrakcji struktury JSON (z uwzględnieniem masek i ukrytych celów NPC, lokacji i dowodów).
- Weryfikacja: Testy typu TypeScript `npx tsc --noEmit`.

#### Faza 2: Integracja z API Ingestu & Zapis Pliku Przygody
- [ ] Zintegrowanie ekstraktora w `src/app/api/pdf/ingest-local/route.ts` przy przesłaniu pliku z `type = 'adventure'`.
- [ ] Zapis ustrukturyzowanego wyniku w `data/adventures/{adventureId}.json`.
- Weryfikacja: Wysłanie przykładowej przygody przez API `ingest-local` i sprawdzenie poprawności zapisanego pliku JSON.

#### Faza 3: Aktualizacja Dokumentacji i Roadmappy
- [ ] Aktualizacja `state.md` oraz `docs/ROADMAP-MECHANIKI-AI.md` z informacją o wdrożeniu ekstrakcji z wykorzystaniem `gemini-3.6-flash`.
- Weryfikacja: Pełna kompilacja projektu (`npm run build`).

---

### Weryfikacja końcowa
- `npx tsc --noEmit`
- `npm run build`

### Co może się zepsuć
- Wytrzymanie limitu tokenów przy bardzo długich PDF-ach — rozwiązane poprzez przekazywanie do syntezy kluczowych fragmentów lub skróconego tekstu przygody.
