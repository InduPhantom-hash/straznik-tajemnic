# Research: Diagnoza błędów czatu i generacji obrazu intro

Data: 2026-07-22
Stack: Next.js (React), TypeScript, Gemini API (Google AI Studio)

## Obszar problemu

Na załączonym zrzucie ekranu widoczne są dwa kluczowe błędy podczas startu przygody:
1. **Żółty błąd w czacie**: `⚠️ Nie udało się wygenerować obrazu intro. Sprawdź klucz Gemini API Key w Ustawieniach.`
2. **Kwadrat/Przycisk Stop obok dymka wiadomości**: Druga wiadomość narracji (pusta lub zablokowana podczas strumieniowania) z ikoną kwadratu (Stop) bez widocznego tekstu introdukcji.

---

## Szczegółowa analiza przyczyn (Root Causes)

### Przyczyna 1: Błąd bocznego strumienia generowania obrazu intro (`generateIntroImage` w `useGameStart.ts`)
- **Ścieżka kodu**: [useGameStart.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/hooks/useGameStart.ts#L196-L245)
- **Przepływ**: `handleStartGame` uruchamia `generateIntroImage()` bez `await` (fire-and-forget). `generateIntroImage()` wysyła żądanie `POST /api/imagen`.
- **Mechanizm usterki w `/api/imagen`**:
  - `/api/imagen` wymaga klucza Gemini. Priorytet ma nagłówek `X-Gemini-Api-Key` (klucz gracza z `localStorage`), a fallbackiem jest `process.env.GEMINI_API_KEY` z `.env.local`.
  - W `useGameStart.ts` żądanie do `/api/imagen` jest wykonywane przez `fetchWithRetry('/api/imagen', ...)` z `fetchWithApiKeys`. Jeśli gracz nie podał klucza w ustawieniach LUB klucz wygasł / przekroczono ratelimit (429/401/500), `response.ok` wynosi `false`.
  - `useGameStart.ts` przechwytuje wyjątek w bloku `catch` i wstrzykuje do czatu wiadomość typu `assistant` z ostrzeżeniem:
    `⚠️ Nie udało się wygenerować obrazu intro. Sprawdź klucz Gemini API Key w Ustawieniach.`

### Przyczyna 2: Zawieszone / Puste strumieniowanie narracji otwierającej
- **Ścieżka kodu**: [useGameStart.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/hooks/useGameStart.ts#L325-L445) oraz [run-chat-pipeline.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/_tester/_base/.silnik/src/app/api/chat/_helpers/run-chat-pipeline.ts#L160-L170)
- **Przepływ**:
  1. `handleStartGame` wysyła żądanie do `/api/chat` i wstawia do stanu `messages` pustą wiadomość z `id: assistantMessageId` oraz zawartością `content: ''`.
  2. Komponent dymka czatu renderuje pusty blok narracji, a przy nim przycisk akcji/stopu (kwadrat).
  3. Jeśli `/api/chat` zwróci błąd (np. 401 `BYOK_KEY_MISSING` z powodu braku `X-Gemini-Api-Key` lub błędu `process.env.GEMINI_API_KEY`), `parseSSEStream` zgłasza błąd lub wrzuca wyjątek do bloku `catch` w `useGameStart.ts`.
  4. W efekcie w historii wiadomości pozostaje pusta wiadomość z `id: assistantMessageId` (sam dymek z kwadratem), a po niej (lub równolegle) dodawany jest dymek z błędem intro / błędem połączenia.

---

## Ryzyka i uwzględnione zależności
- **Spójność klucza Gemini**: Klucz musi być przekazywany spójnie zarówno do `/api/chat`, jak i do `/api/imagen` oraz `/api/tts`.
- **Czyszczenie pustych wiadomości przy błędzie strumienia**: Jeśli strumień SSE zawiedzie przed odebraniem jakichkolwiek tokenów tekstu, nie odebrana pustka `id: assistantMessageId` powinna zostać usunięta lub zastąpiona komunikatem błędu (zamiast osieroconego dymka z kwadratem).
- **Flaga `imageGenerationEnabled`**: Jeśli opcja obrazów jest wyłączona w ustawieniach (`imageGenerationEnabled: false`), `generateIntroImage()` powinno być pomijane bez wywoływania API i bez generowania komunikatów ostrzegawczych.

---

## Rekomendowane kroki naprawcze (do `/dev-2-plan`)

1. **Czyszczenie osieroconej pustej wiadomości przy błędzie `/api/chat`**:
   W `useGameStart.ts` w sekcji `catch(error)` usuwać z `messages` pusty dymek `assistantMessageId`, jeśli nie został do niego dopisany żaden tekst.
2. **Weryfikacja dostępności klucza przed uruchomieniem `generateIntroImage`**:
   Sprawdzać dostępność klucza Gemini API lub flaki `imageGenerationEnabled` przed podjęciem próby strzału do `/api/imagen`.
3. **Lepsza obsługa błędów HTTP w SSE parserze dla `/api/chat`**:
   Upewnić się, że w przypadku braku klucza (status 401 `BYOK_KEY_MISSING`) czat wyświetla jednoznaczny monit o wklejenie klucza w modal.
