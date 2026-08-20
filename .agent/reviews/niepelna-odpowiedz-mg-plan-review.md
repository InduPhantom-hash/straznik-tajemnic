# Plan Review: niepełna odpowiedź MG po limicie tokenów

Data: 2026-08-18

## Ocena ogólna

🔴 Czerwony - kierunek jest właściwy, ale plan pomija realną ścieżkę pełnego save/load i nie przechodzi Spec Quality Gate dla nowego zachowania widocznego dla gracza.

## Przegląd przez osiem wymiarów

### 1. Definicja problemu

- Pewne: plan poprawnie oddziela prawdopodobne `MAX_TOKENS` od błędów streamu oraz nie obiecuje automatycznego wznawiania.
- Pewne: użytkownik wybrał ręczny przycisk, więc rozwiązanie odpowiada celowi UX.
- Ostrzeżenie: `finishReason` nie rozstrzyga wszystkich powodów urwania. Plan poprawnie ogranicza przycisk do `MAX_TOKENS`, ale musi zdefiniować, co klient robi przy `undefined` i nietypowych reasonach.

### 2. Kompletność

- Krytyczne: plan wymienia `full-game-save-manager.ts` i `full-game-save-modal.tsx`, ale pomija `src/hooks/useFullSave.ts:78-93`. Ten hook ręcznie odtwarza każdą wiadomość i obecnie nie kopiuje żadnego nowego pola statusu. Po wczytaniu save'u przycisk zniknie.
- Krytyczne: `FullGameSaveModal` przed zapisem używa `sanitizeHistoryForApi` (`full-game-save-modal.tsx:248-255`). Obecny sanitizer zachowuje dodatkowe pola przez spread, ale plan musi uczynić to kontraktem testowanym, nie założeniem.
- Ostrzeżenie: obecny `Message` pełnego save'u jest lokalnym, węższym interfejsem (`full-game-save-manager.ts:14-23`). Należy dodać pola także tam, nie tylko w `src/lib/types.ts`.

### 3. Dopasowanie do architektury

- Pewne: provider -> `createSseStream` -> `parseSSEStream` -> `useChat` jest właściwym istniejącym torem.
- Ostrzeżenie: plan deklaruje „niewidoczne polecenie”, ale nie wskazuje kontraktu dla `handleSendMessage`. Obecny handler zawsze tworzy wiadomość gracza (`useChat.ts:615-648`) oraz wysyła ją do historii i `message` API (`useChat.ts:651-675`). Plan musi opisać opcjonalny tryb wewnętrznego requestu albo wydzielony helper, który zachowa race guard, sanitizację, telemetrykę i historię bez dymku.
- Ostrzeżenie: `useGameStart` ma osobny handler metadanych (`useGameStart.ts:422-445`), więc należy jawnie wskazać tam zapis `finishReason` i sprawdzić, że po intra przycisk korzysta już z `useChat`.

### 4. Rabbit holes

- Ostrzeżenie: Faza 2 skupia status, ukryty request, TTS, Hot Seat i intro w jednej fazie. To są dwie niezależne granice ryzyka: transport/status oraz semantyka ręcznej kontynuacji.
- Sugestia: rozdzielić Fazę 2 na stan wiadomości oraz późniejszą akcję kontynuacji. Po pierwszej z nich można zweryfikować UI bez dodatkowego kosztu API.

### 5. Promise gaps

- Krytyczne: plan nie ustala, kiedy wolno wykonać post-stream efekty częściowej odpowiedzi: dziennik, czas gry, obrazy, TTS i pamięć konwersacji. Obecny kod uruchamia je mimo `MAX_TOKENS` (`create-sse-stream.ts:87-199`, `useChat.ts:850-915`, `useGameStart.ts:457-475`). Kontynuacja może powtórzyć tagi albo rozjechać stan.
- Sugestia: przed implementacją ustalić i przetestować zasadę: partial zachowuje już zastosowane efekty, a continuation nie interpretuje ponownie starego tekstu; nowa wiadomość ma własny `messageId` i przetwarza wyłącznie swoje tagi. Nie łączyć tekstów w jeden rekord.

### 6. Strategia testowania

- Pewne: plan ma konkretne komendy i rozdziela testy unit, hook, komponent i E2E.
- Ostrzeżenie: trzeba dodać test round-trip nie tylko do `FullGameSaveManager`, lecz także do `useFullSave`, ponieważ to hook faktycznie gubi pola przy wczytywaniu.
- Ostrzeżenie: test kontynuacji musi sprawdzić payload API: partial odpowiedź znajduje się w historii, stałe polecenie istnieje tylko w request body, a UI nie ma dodatkowej wiadomości gracza.

### 7. Zgodność z guardrails projektu

- Pewne: plan korzysta z TypeScript strict, testów Jest/Playwright i nie zapisuje kluczy API.
- Ostrzeżenie: `run-chat-pipeline.ts` ma świadomie zaakceptowane przekroczenie limitu 200 linii (`run-chat-pipeline.ts:64-66`). Plan nie może dodawać do niego logiki poza pojedynczym przekazaniem getterów; ewentualną transformację trzeba trzymać w helperach.
- Ostrzeżenie: istnieją niezapisane zmiany użytkownika w dokumentacji i ekranie powitalnym. Implementacja musi stosować punktowe patche wyłącznie do wskazanych sekcji.

### 8. Spec Quality Gate

SPEC CHECK: Feature Spec | 136w / 200w

1. Budget: 2/2 - OK
2. Boundaries: 1/2 - istnieją wykluczenia, ale brakuje jawnej sekcji „Czego NIE budujemy”
3. Verification: 2/2 - plan ma ponad trzy mierzalne kryteria
4. Examples: 0/2 - brak przykładu input -> output z konkretnymi wartościami
5. Focus: 2/2 - jeden feature

SCORE: 7/10 - ALMOST

### Boundaries (1/2)

Problem: decyzje zakresowe są rozproszone, a Feature Spec nie ma wymaganej, jednoznacznej sekcji zakresu wyłączonego.

Before: „Nie wznawiamy automatycznie odpowiedzi i nie przebudowujemy protokołu narracyjnego.”

After: „### Czego NIE budujemy\n- Nie wznawiamy odpowiedzi automatycznie.\n- Nie podnosimy globalnego `maxOutputTokens`.\n- Nie pokazujemy przycisku dla `STOP`, safety ani braku `finishReason`.\n- Nie łączymy partialu i kontynuacji w jedną wiadomość.\n- Nie zapisujemy treści narracji w telemetrii.”

### Examples (0/2)

Problem: plan nie definiuje jednego pełnego scenariusza widocznego dla gracza ani oczekiwanego payloadu.

Before: „Dla `MAX_TOKENS` zachowujemy cały odebrany tekst, oznaczamy kartę jako niepełną i pokazujemy przycisk „Kontynuuj narrację”.”

After: „### Przykład\nInput SSE: ostatni tekst `Genowefa: „` oraz metadata `{ type: 'metadata', finishReason: 'MAX_TOKENS' }`.\nOutput UI: karta zachowuje `Genowefa: „`, pokazuje komunikat i jeden aktywny przycisk „Kontynuuj narrację”. Po kliknięciu powstaje nowa wiadomość MG, bez dymku gracza i bez automatycznego requestu przed kliknięciem.”

## Rekomendacja

Poprawić plan i ponownie uruchomić `/dev-3-plan-review`. Nie przechodzić do `/dev-4-implement` przed:

1. dodaniem `useFullSave.ts` oraz testu save/load do listy plików i faz;
2. decyzją o efektach ubocznych partialu oraz kontynuacji;
3. uzupełnieniem Feature Spec o sekcję „Czego NIE budujemy” i przykład input -> output.
