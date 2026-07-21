# Tracker zgłoszeń i poprawek (Issues & Debt)

## 2026-07-21 Optymalizacja uploadu PDF oraz obsługa stanu PROCESSING w Gemini File API

**Status:** Rozwiązane (Fixed)  
**Typ:** Bug / Performance  
**Priorytet:** P1  

**Kontekst:**  
Wgrywanie plików PDF na etapie Zasad (rules) trwało bardzo długo (8 MB), natomiast Przygoda (adventure) zatrzymywała się na ~20% bez komunikatu o błędzie.

**Przyczyna:**  
1. Gemini File API po przesłaniu natywnego pliku PDF pozostawia plik w stanie `PROCESSING`. Kod serwera zbytnio pochopnie zwracał sukces, powodując wyścigi lub zawieszenie żądań.
2. Podczas generowania embeddingów dla lokalnego RAG, pętla generująca wektory wysyłała setki sekwencyjnych żądań HTTP bez przerwy/throttlingu, co doprowadzało do dławienia rate-limitów API.

**Rozwiązanie:**  
- Dodano pętlę pollingującą `files.get()` w `uploadNativePDFToGemini` z oczekiwaniem na stan `ACTIVE` oraz obsługą stanu `FAILED`.
- Wdrożono krótkie opóźnienie (throttling 50ms co 5 chunków) w pętli generowania embeddingów `indexTexts` w `indexing-service.ts`.

**Powiązane pliki:**
- `_tester/_base/.silnik/src/lib/gemini-file-service.ts`
- `_tester/_base/.silnik/src/lib/vector-db/indexing-service.ts`
