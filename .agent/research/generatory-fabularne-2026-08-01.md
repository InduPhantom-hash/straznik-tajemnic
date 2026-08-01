## Research: Generatory Fabularne (Etap 3.5)
Data: 2026-08-01

### Mapowanie (Wiedza z RAG + Drzewo Plików)
Projekt opiera się na wyizolowanym środowisku `.silnik/`. Kod generatorów już w dużej części istnieje fizycznie: 
- `src/lib/random-event-generator.ts` posiada definicje zdarzeń (pogoda, miasto itp.).
- `src/components/ui/random-event-generator.tsx` posiada gotowy interfejs w oknie Mistrza Gry, lecz przycisk "Użyj w Grze" nie jest podłączony do przepływu danych.

### Obszar problemu
1. `src/components/ui/random-event-generator.tsx` - brak implementacji propsa `onEventGenerated`.
2. `src/hooks/useChat.ts` oraz `page.tsx` - konieczność przepuszczenia callbacka i przetrzymywania "Zdarzenia Oczekującego".
3. `src/app/api/chat/_helpers/run-chat-pipeline.ts` - brak logiki aplikowania zdarzenia do `additionalContext`.
4. `src/lib/prompts/gm-protocol.ts` - brak instrukcji dla LLM, jak interpretować ukryte tagi reżyserskie.

### Blast Radius Analysis (Zagrożenia i Skutki Uboczne)
Próba wstrzyknięcia asynchronicznych komunikatów od generatorów jako osobnych wiadomości czatu spowodowałaby całkowity chaos, jak ustalili agenci:
- **TTS (Lektor):** Zatykanie i nałożenie audio (gadanie LLM i eventu jednocześnie).
- **Zarządzanie stanem (Race Conditions):** Aktualizacje `useChat.ts` (nadpisywanie historii, gubienie flagi `isLoading`) w trakcie strumieniowania SSE.
- **Konflikty Modali i limitów:** Automatyczne wyzwalacze obrazów w tle zjadłyby quota na ilustracje dla ważnych momentów gracza.

**Rozwiązanie łagodzące (Piggybacking):** Całkowicie porzucamy koncepcję bezpośredniego wysyłania eventu na czat. Event musi trafiać jako ukryta instrukcja (np. `[INSTRUKCJA REŻYSERSKA]`) do *kolejnego* promptu LLM (w additional context), dzięki czemu Mistrz Gry naturalnie zintegruje zdarzenie w swojej własnej, pojedynczej i synchronicznej odpowiedzi.

### Zależności (Testy i Markdowny do aktualizacji)
**Testy:**
- `useChat.session-end.test.ts` i `chat-window.duet-rolls.test.tsx` są wrażliwe na strukturę strumienia SSE i mocki obiektów `Message`. Zmiana struktury wiadomości bez updatu mocków posypie CI.
- Należy przewidzieć nowy plik izolowany: `useChat.generators.test.ts`.
**Dokumentacja:**
- `state.md`: Status Etapu (zmienić na DONE po implementacji), zaktualizować graf zależności (Mermaid).
- `README.md`: Sekcja "Co potrafi" oraz Change Log.
- `docs/ARCHITECTURE.md`: Tabela kluczowych ścieżek z dopiskiem dla strumienia w tle.

### Rekomendowany następny krok
Idziemy do `/dev-2-plan`.
Architektura wstrzykiwania oparta o "Piggybacking" i modyfikacja tak krytycznych punktów jak `useChat.ts` i `run-chat-pipeline.ts` wymaga sformalizowania ścieżki przejścia parametrów.
