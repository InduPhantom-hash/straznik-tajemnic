# Brief: Rozszerzona Ekstrakcja Przygody z PDF (Gemini 3.6 Flash)

**Co:** Dwuetapowa ekstrakcja encji fabularnych (NPC, lokacje, przedmioty, mapy) z tekstu przygody PDF przy użyciu nowego modelu `gemini-3.6-flash`.
**Jak:** Po wstępnym parsowaniu PDF w pamięci i utworzeniu indeksu RAG, dodajemy krok syntezy encji przez Gemini 3.6 Flash z `responseSchema` (zod / JSON mode). Wynik zapisujemy w pliku danych przygody (`data/adventures/{adventureId}.json`) i uostępniamy dla Tablicy Badacza.
**Pliki:**
- `src/lib/pdf/adventure-extractor.ts` [NEW]
- `src/app/api/pdf/ingest-local/route.ts` [MODIFY]
- `src/types/adventure.ts` [MODIFY / NEW]
**Test:** Uruchomienie parsowania przykładowego pliku PDF przygody przez `ingest-local` API i weryfikacja wygenerowanego JSON z encjami w `data/adventures/`.
**Ryzyko:** Limity tokenów i czas odpowiedzi przy bardzo długich scenariuszach PDF (rozwiązane przez dedykowany prompt syntezy z limitem lub podział na kluczowe sekcje).
