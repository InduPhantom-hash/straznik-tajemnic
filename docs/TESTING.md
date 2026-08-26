# Testy

## Uruchamianie

```bash
npm test               # testy jednostkowe (Jest)
npx tsc --noEmit       # kontrola typów (TypeScript strict)
npm run lint           # ESLint
npm run build          # build produkcyjny (łapie błędy SSR)
npm run qa:e2e         # testy e2e (Playwright)
```

## Co czym pokrywamy

- **Jest (unit)** - logika domenowa: mechanika kości (`dice-utils`), resolver testów,
  ekonomia/ekwipunek, parsery narracji i tagów, providery AI, hooki. Testy leżą obok
  kodu w `__tests__/`.
- **Playwright (e2e)** - krytyczne ścieżki UI (ustawienia, kreator, sesja) z mockowanym API.

## Zasady

- Każda nowa funkcja domenowa = testy jednostkowe (pure functions najłatwiej testować).
- `npx tsc --noEmit` musi przechodzić na zielono (0 błędów) przed commitem.
- Zmiany UI: uruchom `npm run build` (wyłapuje problemy SSR).

## Husky (hooki Git)

Po `npm install` aktywują się lokalne hooki:

- **pre-commit** → `lint-staged`: ESLint `--fix` + Prettier + `jest --findRelatedTests`
  na zmienionych plikach. Błąd lub failujący test = commit zablokowany.
- **pre-push** → `tsc --noEmit` na całym projekcie. Błąd typów = push zablokowany.

Nie omijaj hooków przez `--no-verify` - jeśli blokują, złapały regresję.

## Regresja niepełnej odpowiedzi MG

Scenariusz nie używa prawdziwego klucza Gemini. Mock SSE zwraca częściowy tekst oraz
końcowe metadata z `finishReason: "MAX_TOKENS"`, a następny request zwraca osobną
kontynuację.

```bash
npm test -- --runInBand \
  src/lib/ai-providers/gemini-provider.test.ts \
  src/app/api/chat/_helpers/__tests__/create-sse-stream.test.ts \
  src/hooks/useChat.truncation.test.tsx \
  src/hooks/useGameStart.truncation.test.tsx \
  src/components/chat/chat-window/components/message-card.test.tsx \
  src/lib/full-game-save-manager.test.ts \
  src/hooks/useFullSave.test.tsx

npx playwright test tests/e2e/narrative-continuation.spec.ts \
  --project=chromium --workers=1
```

Testy potwierdzają:

- zachowanie całego partialu i końcowego `finishReason` w SSE;
- ostrzeżenie tylko na ostatniej wiadomości MG zakończonej przez `MAX_TOKENS`;
- jedno żądanie po kliknięciu, także przy szybkim podwójnym kliknięciu;
- techniczne polecenie wyłącznie w body requestu, bez dymku gracza;
- osobną wiadomość i osobny TTS dla kontynuacji;
- trwałość statusu w `localStorage`, pełnym zapisie oraz odczycie gry;
- brak ostrzeżenia dla `STOP` i braku `finishReason`.

Przed wydaniem wykonaj też próbę z prawdziwym modelem na osobnym zapisie testowym:

1. W presetach LOW i MID ustaw tymczasowo kontrolowany niski limit wyjścia, wymuś
   `MAX_TOKENS` i sprawdź partial, przycisk oraz brak requestu przed kliknięciem.
2. Zapisz i wczytaj grę przed kliknięciem, potem kliknij raz i sprawdź brak
   powtórzenia oraz domknięcie sceny.
3. Powtórz dla intra, Solo i Hot Seat.
4. W presecie HIGH bez wymuszania limitu potwierdź, że zwykłe `STOP` nie pokazuje
   ostrzeżenia.

Nie zapisuj klucza ani treści narracji w logach i przywróć ustawienia limitu po teście.
