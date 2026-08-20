# Plan: niepełna odpowiedź MG po limicie tokenów

Data: 2026-08-18
Złożoność: Duża

## Problem

Gemini może zakończyć częściową narrację przez `MAX_TOKENS`, ale aplikacja gubi `finishReason`, zamyka turę jak sukces i zostawia gracza bez informacji oraz bez bezpiecznego sposobu dokończenia.

## Rozwiązanie

Przenosimy surowy `finishReason` przez provider, SSE i model wiadomości. Dla `MAX_TOKENS` zachowujemy cały odebrany tekst, oznaczamy kartę jako niepełną i pokazujemy przycisk „Kontynuuj narrację”. Kliknięcie tworzy kontrolowane, niewidoczne polecenie kontynuacji przez istniejący tor `/api/chat`; nie wykonujemy automatycznego ani płatnego ponowienia.

## Decyzje zakresowe

### Czego NIE budujemy

- Nie wznawiamy odpowiedzi automatycznie.
- Nie podnosimy globalnego `maxOutputTokens`.
- Nie pokazujemy przycisku dla `STOP`, safety ani braku `finishReason`.
- Nie łączymy partialu i kontynuacji w jedną wiadomość.
- Nie zapisujemy treści narracji w telemetrii.

### Przykład

Input SSE: tekst `Genowefa: „` oraz metadata `{ type: 'metadata', finishReason: 'MAX_TOKENS' }`.

Output UI: karta zachowuje `Genowefa: „`, pokazuje komunikat i jeden aktywny przycisk „Kontynuuj narrację”. Po kliknięciu powstaje nowa wiadomość MG, bez dymku gracza i bez requestu przed kliknięciem.

- Tekst częściowej odpowiedzi pozostaje bez zmian.
- Przycisk pojawia się tylko dla ostatniej wiadomości MG z `finishReason === 'MAX_TOKENS'`.
- Kliknięcie generuje nową wiadomość MG i nie pokazuje technicznego polecenia jako wypowiedzi gracza.
- Po kliknięciu stara karta dostaje stan `continuationRequested`, aby zablokować podwójny koszt.
- Kontynuacja używa stałego polecenia: dokończ od urwanego zdania, nie powtarzaj wcześniejszej treści, zakończ pełną myślą i oddaj turę graczowi.
- Nie podnosimy globalnie `maxOutputTokens`; naprawiamy obserwowalność i odzyskanie tury.
- Nie wznawiamy automatycznie odpowiedzi i nie przebudowujemy protokołu narracyjnego.
- Inne przyczyny zakończenia, np. `STOP` lub safety, trafiają do telemetrii, ale nie pokazują przycisku kontynuacji w tym zadaniu.

## Pliki do modyfikacji

| plik | zmiana | ryzyko |
|---|---|---|
| `_tester/_base/.silnik/src/lib/ai-providers/types.ts` | Dodać kontrakt pobrania `finishReason` po skonsumowaniu streamu | Średnie |
| `_tester/_base/.silnik/src/lib/ai-providers/gemini-provider.ts` | Udostępnić zebrany `lastFinishReason` bez zmiany istniejącego streamowania i retry pustej odpowiedzi | Wysokie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/create-sse-stream.ts` | Dodać `finishReason` do końcowych metadanych SSE i telemetrii | Wysokie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/run-chat-pipeline.ts` | Przekazać getter zakończenia providera do fabryki SSE | Średnie |
| `_tester/_base/.silnik/src/lib/sse-parser.ts` | Uściślić typ końcowych metadanych o `finishReason` | Niskie |
| `_tester/_base/.silnik/src/lib/types.ts` | Dodać do `Message` opcjonalne `finishReason` i `continuationRequested` z kompatybilnością starych zapisów | Średnie |
| `_tester/_base/.silnik/src/hooks/useChat.ts` | Zapisać `finishReason`, dodać ręczną kontynuację bez widocznego dymku gracza i ochronę przed wielokrotnym kliknięciem | Wysokie |
| `_tester/_base/.silnik/src/hooks/useGameStart.ts` | Oznaczyć ucięte intro tym samym statusem | Średnie |
| `_tester/_base/.silnik/src/components/chat/chat-window/types.ts` | Przekazać callback ręcznej kontynuacji przez kontrakt okna czatu | Niskie |
| `_tester/_base/.silnik/src/components/chat/chat-window/index.tsx` | Przekazać callback i pokazać akcję tylko na ostatniej uciętej wiadomości | Średnie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.tsx` | Dodać ostrzeżenie i przycisk „Kontynuuj narrację”, disabled podczas ładowania lub po kliknięciu | Średnie |
| `_tester/_base/.silnik/src/app/page.tsx` | Podłączyć `chat.handleContinueNarration` do `ChatWindow` | Niskie |
| `_tester/_base/.silnik/src/lib/full-game-save-manager.ts` | Zachować opcjonalny stan ucięcia w typie wiadomości pełnego zapisu | Średnie |
| `_tester/_base/.silnik/src/components/ui/full-game-save-modal.tsx` | Zagwarantować, że sanitizer zachowuje status w payloadzie save'u | Średnie |
| `_tester/_base/.silnik/src/hooks/useFullSave.ts` | Odtworzyć `finishReason` i `continuationRequested` przy ręcznym mapowaniu wiadomości po loadzie | Wysokie |
| `_tester/_base/.silnik/src/lib/ai-providers/gemini-provider.test.ts` | Nowy test częściowego tekstu zakończonego `MAX_TOKENS` | Niskie |
| `_tester/_base/.silnik/src/app/api/chat/_helpers/__tests__/create-sse-stream.test.ts` | Nowy test metadanych `finishReason` i zachowania pełnego tekstu | Niskie |
| `_tester/_base/.silnik/src/lib/sse-parser.test.ts` | Test odczytu tekstu oraz końcowego `finishReason` | Niskie |
| `_tester/_base/.silnik/src/hooks/useChat.truncation.test.tsx` | Test oznaczenia wiadomości, pojedynczej kontynuacji i braku technicznego dymku gracza | Średnie |
| `_tester/_base/.silnik/src/components/chat/chat-window/components/message-card.test.tsx` | Test widoczności, blokady i kliknięcia przycisku | Niskie |
| `_tester/_base/.silnik/src/hooks/useFullSave.test.tsx` | Nowy test pełnego round-trip statusu uciętej wiadomości | Średnie |
| `_tester/_base/.silnik/tests/e2e/full-qa.spec.ts` | Mock SSE: częściowy tekst + `MAX_TOKENS` + ręczna kontynuacja | Średnie |
| `docs/ARCHITECTURE.md` | Opisać kontrakt zakończenia streamu | Niskie |
| `docs/TESTING.md` | Dodać scenariusz regresji niepełnej odpowiedzi | Niskie |
| `state.md`, `zadania.md` | Zaktualizować stan dopiero po pełnej weryfikacji | Niskie |

## Mapa Zadań

### Faza 1: Kontrakt zakończenia provider -> SSE

- [ ] Rozszerzyć `StreamingChatResult` o odczyt `finishReason` po zakończeniu streamu. `(Blokuje: Faza 2)`
- [ ] Udostępnić `lastFinishReason` z `GeminiChatProvider` bez zmiany retry dla całkowicie pustej odpowiedzi.
- [ ] Przekazać `finishReason` przez `runChatPipeline` do końcowych metadanych `createSseStream`.
- [ ] Dodać `finishReason` do telemetrii serwerowej i klientowej, bez zapisywania treści narracji.
- [ ] Dodać testy providera oraz SSE dla `STOP`, `MAX_TOKENS` i braku wartości.
- Weryfikacja: częściowy tekst i `finishReason: MAX_TOKENS` docierają razem, a zwykły `STOP` zachowuje dotychczasowy wynik.

### Faza 2: Stan wiadomości i obsługa partialu

- [ ] Rozszerzyć `Message` o opcjonalne `finishReason` oraz `continuationRequested`. `(Zablokowane przez: Faza 1; Blokuje: Faza 3)`
- [ ] W `useChat` zapisać końcowy `finishReason` na właściwej wiadomości asystenta.
- [ ] Zastosować ten sam zapis `finishReason` do intra w `useGameStart`.
- [ ] Zachować wykonane efekty partialu; następna wiadomość ma własny `messageId` i interpretuje tylko własne tagi.
- [ ] Dodać testy `STOP`, `MAX_TOKENS`, intra i persistencji localStorage.
- Weryfikacja: partial zachowuje tekst oraz wykonane efekty, ale nie ma jeszcze requestu kontynuacji.

### Faza 3: Ręczna kontynuacja, UI i save/load

- [ ] Dodać wewnętrzny tryb requestu w `useChat`, który zachowuje race guard, sanitizację, telemetrykę i historię API, ale nie tworzy dymku gracza. `(Zablokowane przez: Faza 2)`
- [ ] Dodać `handleContinueNarration(messageId)` tylko dla ostatniego `MAX_TOKENS`.
- [ ] Dodać pod uciętą kartą jasny komunikat oraz przycisk „Kontynuuj narrację”. `(Zablokowane przez: Faza 2; Blokuje: Faza 4)`
- [ ] Pokazywać akcję wyłącznie na ostatniej wiadomości MG z `MAX_TOKENS`; ukryć ją dla `STOP`, wiadomości gracza i starszych uciętych kart.
- [ ] Zablokować przycisk podczas requestu i po pierwszym kliknięciu.
- [ ] Zachować status w localStorage, pełnym save'ie oraz eksporcie/importcie; stare save'y bez pól muszą działać bez migracji.
- [ ] Sprawdzić TTS: partial jest czytany raz, a kontynuacja jako osobna wiadomość raz; kliknięcie nie odtwarza partialu ponownie.
- [ ] Dodać test payloadu: partial w historii, techniczne polecenie tylko w request body, brak nowej wiadomości gracza.
- [ ] Dodać test `useFullSave` i pełnego save/load.
- [ ] Dodać test komponentu i scenariusz Playwright z mockowanym SSE, bez realnego kosztu Gemini.
- Weryfikacja: po save/load ostatnia ucięta wiadomość nadal oferuje jedną kontynuację, a zwykłe wiadomości nie zmieniają wyglądu.

### Faza 4: Dokumentacja i pełna weryfikacja

- [ ] Uzupełnić `docs/ARCHITECTURE.md` i `docs/TESTING.md`. `(Zablokowane przez: Faza 3)`
- [ ] Uruchomić testy celowane, TypeScript, pełne Jest, lint, build i E2E.
- [ ] Wykonać ręczny test LOW/MID z kontrolowanym niskim limitem oraz HIGH bez wymuszania błędu.
- [ ] Zaktualizować `state.md` i zamknąć fazy w `zadania.md` dopiero po zielonej weryfikacji.
- Weryfikacja: wszystkie testy przechodzą, brak automatycznego kosztu, a ręczny scenariusz kończy się poprawną kontynuacją.

## Weryfikacja końcowa

Uruchamiane w `_tester/_base/.silnik/`:

```bash
npm test -- --runInBand src/lib/ai-providers/gemini-provider.test.ts
npm test -- --runInBand src/app/api/chat/_helpers/__tests__/create-sse-stream.test.ts
npm test -- --runInBand src/lib/sse-parser.test.ts
npm test -- --runInBand src/hooks/useChat.truncation.test.tsx
npm test -- --runInBand src/components/chat/chat-window/components/message-card.test.tsx
npx tsc --noEmit
npm test
npm run lint
npm run build
npm run qa:e2e
```

Ręcznie:

- ustawić lokalnie niski limit wyjścia i wymusić `MAX_TOKENS` bez publikowania klucza;
- potwierdzić zachowanie całego partialu oraz widoczność przycisku;
- kliknąć raz i sprawdzić brak technicznego dymku gracza, brak powtórzenia oraz pełne domknięcie sceny;
- zapisać i wczytać grę przed kliknięciem;
- sprawdzić intro, zwykłą turę, Solo i Hot Seat;
- potwierdzić, że `STOP` nie pokazuje ostrzeżenia.

## Co może się zepsuć

- Wysokie: błędny moment odczytu `finishReason` da zawsze `undefined`. Getter wolno wywołać dopiero po skonsumowaniu streamu.
- Wysokie: kontynuacja może powtórzyć ostatni fragment. Ogranicza to stałe polecenie, pełna historia i osobny test regresji.
- Wysokie: ukryte polecenie kontynuacji może ominąć część zwykłego toru wiadomości. Implementacja ma reużyć `/api/chat`, sanitizację, telemetrykę i race guard.
- Średnie: podwójne kliknięcie wygeneruje dwa płatne requesty. Chronią `isLoading`, `continuationRequested` i test dokładnie jednego wywołania.
- Średnie: status może zniknąć po save/load przez lokalne, węższe interfejsy `Message`. Trzeba rozszerzyć oba typy save'u i przetestować round-trip.
- Średnie: częściowa odpowiedź może zawierać już wykonane tagi dziennika lub czasu. Nie cofamy tych efektów w tym zadaniu; kontynuacja ma nie powtarzać treści.
- Średnie: `docs/ARCHITECTURE.md`, `state.md` i pliki ekranu powitalnego mają istniejące zmiany użytkownika. Edycje muszą być punktowe i nie mogą ich nadpisać.
- Niskie: przycisk może pojawić się na starej, nieostatniej wiadomości. Warunek `isLastMessage` blokuje rozgałęzianie historii.

## Brief: niepełna odpowiedź MG

**Co**: Wykryć `MAX_TOKENS` i dać graczowi ręczne dokończenie urwanej narracji.
**Jak**: Przekazać `finishReason` przez provider i SSE, zachować partial oraz pokazać przycisk tylko na ostatniej uciętej wiadomości.
**Koszt**: Brak automatycznego requestu; dodatkowy koszt powstaje dopiero po kliknięciu.
**Pliki**: Provider Gemini, pipeline/SSE, parser, `Message`, `useChat`, `useGameStart`, ChatWindow/MessageCard i save/load.
**Test**: Mock `MAX_TOKENS`, testy Jest, TypeScript, lint, build, Playwright oraz ręczne LOW/MID/HIGH.
**Ryzyko**: Powtórzenie fragmentu, podwójny request lub utrata statusu po save/load.
