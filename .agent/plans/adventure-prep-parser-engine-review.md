# Review Planu: Adventure Prep & Parser Engine

**Data:** 2026-07-29
**Pipeline pozycja:** Krok 3/5 (`/dev-3-plan-review`) → następny `/dev-4-implement`
**Oceniany plan:** `.agent/plans/adventure-prep-parser-engine.md`

## Wykryte luki i ryzyka (Red Teaming)

1. **Ryzyko z RAG (Wektoryzacja Grafu):**
   Wektoryzowanie "surowego JSONa" z grafem do RAG da kiepskie rezultaty przy wyszukiwaniu semantycznym. 
   **Poprawka do planu:** Zanim wrzucimy wyekstrahowane dane do lokalnego Vector Store, musimy przetransformować obiekty (NPC, Location, Clue) z powrotem na gęste semantycznie paragrafy tekstu. Np. JSON postaci `{"name": "Jan", "secret": "kultysta"}` musi zostać zmapowany do tekstu: *"Jan to postać niezależna występująca w scenariuszu. Jego ukrytym sekretem jest przynależność do kultu..."* i dopiero to wektoryzujemy.
2. **Koszty i blokady TTS (Pre-buffering):**
   Wygenerowanie otwarcia uderza w API `gemini-2.5-flash-preview-tts`. Musimy dodać deduplikację (sprawdzić w IndexedDB, czy plik audio już istnieje dla tego scenariusza, aby po odświeżeniu strony nie generować go i nie płacić ponownie).
3. **Problem "Wąskiego gardła" przy walidacji Schema:**
   Zwracanie gigantycznego ustrukturyzowanego grafu przez API Gemini naraz. Model może "zapomnieć" domknąć klamry JSON przy długim tekście.
   **Poprawka do planu:** W endpointach użyjemy standardowego `gemini-client-pool` oraz wymusimy `responseSchema`, które zrzuci obsługę formatowania na samo API Google'a (gwarancja struktury).
4. **Brak obsługi błędów ładowania:**
   Jeśli plik PDF ma 200 stron i analizuje się 3 minuty, potrzebujemy timeoutów oraz możliwości anulowania, by UI nie zawisło.

## Werdykt
Plan jest **warunkowo zatwierdzony**. Powyższe poprawki zostaną włączone do fazy implementacji (`/dev-4-implement`).
