# Research: urwany tekst narracji MG

Data: 2026-08-18
Status: rozpoznanie zakończone - potrzebny plan naprawy przed zmianą kodu.

## Objaw

Na zrzucie z rozgrywki odpowiedź MG kończy się dosłownie w rozpoczętym dialogu: `Genowefa: „`. Interfejs nie pokazuje błędu ani informacji, że odpowiedź była niepełna.

## Mapowanie

### RAG i dokumentacja

- `rag_search` nie jest dostępny w tym runtime, więc nie użyto lokalnego RAG.
- `docs/ARCHITECTURE.md` i `state.md` mają niezapisane zmiany użytkownika. Nie traktowano ich jako źródła aktualnego zachowania.
- Źródłem ustaleń jest kod runtime'u `_tester/_base/.silnik/` oraz zrzut użytkownika.

### Droga danych

1. `src/hooks/useChat.ts:651-675` wysyła turę do `/api/chat`.
2. `src/app/api/chat/_helpers/run-chat-pipeline.ts:315-358` przekazuje aktualne `maxOutputTokens` do providera.
3. `src/lib/ai-providers/gemini-provider.ts:250-273` czyta z ostatniego chunka Gemini `finishReason` i zużycie tokenów.
4. `src/app/api/chat/_helpers/create-sse-stream.ts:71-141` wysyła chunki tekstu oraz końcowe metadane SSE.
5. `src/lib/sse-parser.ts:51-112` scala wszystkie chunki po stronie przeglądarki.
6. `src/hooks/useChat.ts:684-702` wpisuje pełny zebrany tekst do wiadomości.
7. `src/components/chat/chat-window/components/message-card.tsx:158-183` przekazuje tekst do `NarrativeFormatter`.

## Graf kodu (Graft)

- Stan: aktualny, warstwa wiring w synchronizacji z kodem.
- `GeminiChatProvider.streamChat` ma wywołania z `runChatPipeline`, `POST /api/chat` i endpointu utility.
- `createSseStream` ma ścieżkę `runChatPipeline` -> `POST /api/chat`.
- Hotspoty tego problemu: `GeminiChatProvider.streamChat`, `createSseStream`, `parseSSEStream`.

## Ustalenia

### 1. Najbardziej prawdopodobna przyczyna: limit odpowiedzi modelu

Pewne:

- Provider odczytuje `finishReason` Gemini, np. `MAX_TOKENS` (`gemini-provider.ts:250-265`).
- Po wyemitowaniu choćby części tekstu provider nie wznawia odpowiedzi. Kod zaznacza wprost, że „urywanie długiej odpowiedzi” jest osobnym problemem (`gemini-provider.ts:279-284`).
- Domyślny preset HIGH ma limit `maxOutputTokens: 4096`; LOW i MID mają 2048 (`src/lib/ai-presets/definitions.ts:15-103`).
- UI w normalnej turze oczekuje 30-300 słów, zależnie od sytuacji (`src/lib/prompts/gm-protocol.ts:353-357`). To tylko instrukcja promptu, nie twardy limit techniczny.
- Występujący na zrzucie koniec wewnątrz cytatu jest zgodny z zatrzymaniem generacji przez limit, a nie z kompletną odpowiedzią MG.

Prawdopodobne:

- Ta konkretna tura zakończyła się przez `MAX_TOKENS`. Nie da się tego potwierdzić dla historycznego zrzutu: lokalne logi telemetryczne nie istnieją, a do klienta nie trafia `finishReason`.

### 2. System gubi informację o niepełnej odpowiedzi

Pewne:

- `lastFinishReason` pozostaje lokalne w `GeminiChatProvider`; nie jest częścią `StreamChunk` ani `CompletionUsage` (`src/lib/ai-providers/types.ts:107-124`).
- Końcowe metadane SSE zawierają koszt i telemetrię, ale nie `finishReason` (`create-sse-stream.ts:103-141`).
- Klient kończy loading jak po poprawnej turze, ponieważ strumień został domknięty bez wyjątku (`useChat.ts:916-938`).
- Efekt: gracz widzi urwaną narrację bez komunikatu i bez bezpiecznego sposobu kontynuacji.

### 3. Renderer ani parser SSE nie są głównym podejrzanym

Pewne:

- Parser SSE buforuje niepełne linie TCP i przetwarza resztkę po końcu streamu (`sse-parser.ts:60-106`). To chroni końcowy chunk przed zgubieniem na granicy odczytu.
- `useChat` otrzymuje pełny narastający tekst, nie pojedynczy chunk (`sse-parser.ts:74-79`, `useChat.ts:684-702`).
- Parser narracji zachowuje niedomkniętą linię `Genowefa: „` jako narrację, bo nie spełnia ona wzorca pełnego dialogu (`parse-sections.ts:58-93`). Nie ma ścieżki, która obcina dalszą część pełnego tekstu.

Niepotwierdzone:

- Błąd sieci lub dostawcy mógłby przerwać stream podobnie. W takim przypadku `createSseStream` powinien propagować błąd (`controller.error`), a klient pokazać komunikat błędu. Zrzut nie daje dowodu, czy wystąpił wyjątek.

## Braki testów

Pewne:

- Nie ma testu provider -> SSE -> klient dla częściowego tekstu z `finishReason: MAX_TOKENS`.
- Nie ma testu regresji, że UI oznacza niekompletną odpowiedź zamiast udawać sukces.

## Blast Radius

Zmiana mechanizmu wymaga sprawdzenia:

- `src/lib/ai-providers/types.ts` - kontrakt streamu i metadanych zakończenia.
- `src/lib/ai-providers/gemini-provider.ts` - przekazanie wyniku zakończenia.
- `src/app/api/chat/_helpers/create-sse-stream.ts` - metadane SSE i post-stream side effects.
- `src/lib/sse-parser.ts` - typ metadanych.
- `src/hooks/useChat.ts` - stan wiadomości i komunikat dla gracza.
- `src/hooks/useGameStart.ts` - identyczny klient `/api/chat` dla otwarcia przygody.
- `src/components/chat/chat-window/components/message-card.tsx` - czytelne oznaczenie urwanej narracji.
- TTS i zapis rozmowy - nie mogą traktować uciętego tekstu jak pełnej tury.

## Testy do dodania

1. Test providera: częściowy tekst + `MAX_TOKENS` zwraca status zakończenia.
2. Test SSE: status zakończenia dociera jako metadata po ostatnim chunku tekstu.
3. Test `useChat`: `MAX_TOKENS` zachowuje tekst, oznacza wiadomość jako uciętą i nie ukrywa problemu.
4. Test `useGameStart`: ten sam przypadek dla intra.
5. Test renderera: widoczny komunikat oraz akcja kontynuacji, bez modyfikowania już odebranego tekstu.

## Dokumentacja po wdrożeniu

- `docs/ARCHITECTURE.md` - kontrakt streamu i status zakończenia.
- `docs/TESTING.md` - testy przerwania po limicie.
- `state.md` i `zadania.md` - wyłącznie po zakończeniu implementacji.

## Rekomendowany następny krok

`/dev-2-plan` dla jednego zadania: „Niepełna odpowiedź MG - wykrywanie `finishReason`, widoczny status i kontrolowana kontynuacja”.

Przed implementacją trzeba wybrać UX kontynuacji:

- ręczny przycisk „Kontynuuj narrację” - najbezpieczniejszy, nie generuje kosztu bez działania gracza;
- automatyczne jedno wznowienie - płynniejsze, ale może podwoić koszt i powtórzyć fragment;
- wyłącznie komunikat - najtańszy, ale przerzuca pracę na gracza.

Kontra: jeśli telemetryka z przyszłego powtórzenia pokaże `STOP` albo brak `finishReason`, źródłem nie będzie limit tokenów. Wtedy trzeba badać przerwanie sieci lub błąd providera, nie podnosić limitu w ciemno.
