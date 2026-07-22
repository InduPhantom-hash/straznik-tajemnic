# Research: Przycisk Obrazy oraz Błędy w Czacie

Data: 2026-07-22
Stack: Next.js (React), TypeScript, Tailwind CSS

## Obszar problemu

### 1. Zniknięta opcja "Obrazy: Wł / Wył" w pasku bocznym (Ustawienia)
- **Plik**: `src/components/sidebar/CthulhuSidebar.tsx` (linie 615–638)
- **Rola**: Przycisk przełączania obrazów znajduje się w bocznym panelu `CthulhuSidebar`, ale warunek jego renderowania to `{aiSettings && onUpdateAISettings && (...)}`.
- **Przyczyna**: W `src/app/page.tsx` komponent `<CthulhuSidebar />` wywoływany jest **bez przekazania propów `aiSettings` oraz `onUpdateAISettings`**. Przez to `aiSettings` i `onUpdateAISettings` są `undefined` i przycisk w ogóle się nie renderuje.

### 2. Komunikat ostrzegawczy / sypanie błędami w czacie przy generowaniu obrazu
- **Pliki**: 
  - `src/hooks/useGameStart.ts` (linie 231–243)
  - `src/components/chat/narrative/render-narrative-with-images.tsx` (linie 99–102)
  - `src/components/chat/chat-window/components/message-card.tsx`
- **Rola**: Podczas Zimnego Startu / nowej przygody wywoływane jest `generateIntroImage()`. Gdy API zwraca błąd (lub brak skonfigurowanego klucza Replicate/Vertex/Gemini), wyłapywany jest wyjątek i do historii chatu dodawana jest wiadomość:
  `⚠️ Nie udało się wygenerować obrazu intro. Sprawdź klucze API w Settings (image provider: Replicate / Vertex AI / Gemini).`
- **Dodatkowa kwestia**: Jeśli obraz zostanie zwrócony jako niedziałający URL/base64 lub wystąpi błąd ładowania `<img>`, `renderNarrativeWithImages` ukrywa go (`display: none`), a puste/uszkodzone bloki mogą wpływać na układ.

## Zależności i przepływ danych
1. `page.tsx` zarządza stanem `aiSettings` (`setAiSettings`) oraz posiada funkcję zapisującą i emitującą zmiany.
2. `page.tsx` przekazuje props do `CthulhuSidebar`. Dodanie `aiSettings={aiSettings}` oraz `onUpdateAISettings={setAiSettings}` (lub odpowiedniego handlera z `saveAISettings`) przywraca widoczność przycisku w panelu bocznym.
3. `useGameStart` i `useChat` sprawdzają `aiSettings.imageGenerationEnabled`. Gdy użytkownik wyłączy obrazy (`Obrazy: Wył`), generowanie obrazów intro oraz scen zostanie zablokowane na poziomie hooka, co zapobiegnie błędom API obrazów w okienku chatu.

## Rekomendowany następny krok
Przejście do fazy planowania i naprawy:
1. Przekazanie `aiSettings` i `onUpdateAISettings` do `CthulhuSidebar` w `page.tsx`.
2. Uwzględnienie `imageGenerationEnabled` w `useGameStart.ts` (aby nie próbował wywoływać `generateIntroImage()`, gdy obrazy są wyłączone).
