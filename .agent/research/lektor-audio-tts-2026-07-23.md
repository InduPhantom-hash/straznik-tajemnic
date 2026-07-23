# 🎙️ Research: Lektor & Synteza Audio (TTS) - Punkt 5 z bug.md
Data: 2026-07-23  
Stack: Next.js 14 (App Router), React 18, Google Gemini 2.5 Flash TTS API (`@google/genai`), Web Audio API / HTMLAudioElement

---

## 📐 1. Obszar problemu

Punkt 5 z `bug.md` obejmuje 4 konkretne błędy i wymagania usprawnień w modułach syntezy mowy:

1. **[TTS-01] Instant Streaming (Szybki Start Lektora)**
   - **Pliki**: [_tester/_base/.silnik/src/hooks/useTTS.ts](file:///_tester/_base/.silnik/src/hooks/useTTS.ts) (linie 463-644), [_tester/_base/.silnik/src/hooks/useChat.ts](file:///_tester/_base/.silnik/src/hooks/useChat.ts)
   - **Przyczyna**: Na presetach MID/LOW audio grupowane jest akapitami (`stripped.split(/\n{2,}/)`). Pierwsze otwarcie sesji to często 1 długi akapit (1000+ znaków). Dopóki nie nastąpi koniec wiadomości (`flush`), lektor nie wysyła zapytania do API. Na presetach HIGH/ULTRA dzielenie jest per-zdanie, ale próg wczesnego startu `EARLY_FIRST_SEGMENT_MIN_CHARS` (40 znaków) działa wyłącznie, gdy w buforze streamingowym wykryto już terminator zdania (`.!?`), co przy powolnym streamingu opóźnia reakcję lektora do kilkudziesięciu sekund.

2. **[TTS-02] Naprawa Multi-Voice dla NPC**
   - **Pliki**: [_tester/_base/.silnik/src/hooks/useTTS.ts](file:///_tester/_base/.silnik/src/hooks/useTTS.ts) (linie 475-572), [_tester/_base/.silnik/src/lib/npc-voice-mapping.ts](file:///_tester/_base/.silnik/src/lib/npc-voice-mapping.ts), [_tester/_base/.silnik/src/lib/parsers/text-cleaner.ts](file:///_tester/_base/.silnik/src/lib/parsers/text-cleaner.ts)
   - **Przyczyna**: 
     - Multi-voice działa obecnie wyłącznie dla presetów HIGH i ULTRA (`isUltraOrHigh`).
     - Regex dopasowania markera mówcy w `useTTS.ts` wymaga dokładnej nazwy i formatu `@Imię:` lub `Imię: „dialog”`. Przez uprzednie wyczyszczenie cudzysłowów w `removeDidaskalia` (`cleanResponseText`), dopasowanie cudzysłowów „” może zawodzić.
     - Jeśli nazwa NPC różni się od wpisu w `localStorage` `gm_npcs` (np. w tekście pojawia się *"Inspektor Fisk"*, a w mapie jest *"Fisk"*), wyszukiwanie nie znajduje głosu i domyślnie przypisuje głos narratora.

3. **[TTS-03] Polskie Znaki Diakrytyczne**
   - **Pliki**: [_tester/_base/.silnik/src/app/api/tts/gemini/route.ts](file:///_tester/_base/.silnik/src/app/api/tts/gemini/route.ts) (linie 171-255), [_tester/_base/.silnik/src/lib/parsers/text-cleaner.ts](file:///_tester/_base/.silnik/src/lib/parsers/text-cleaner.ts)
   - **Przyczyna**: Gemini 2.5 Flash TTS poprawnie obsługuje UTF-8 z `languageCode: 'pl-PL'`, jednak w procesie czyszczenia tekstu (`cleanResponseText`) niektóre znaki lub specyficzne sekwencje interpunkcyjne mogły być zastępowane/usuwane lub zniekształcane (np. usuwanie podwójnych cudzysłowów, specyficzne zamiany znaków), co powodowało, że model Gemini czytał słowa bez polskich znaków (np. *"zrob"* zamiast *"zrób"*).

4. **[TTS-04] Duchowe Zdania (Ghost Sentences)**
   - **Pliki**: [_tester/_base/.silnik/src/hooks/useTTS.ts](file:///_tester/_base/.silnik/src/hooks/useTTS.ts) (linie 457-461), [_tester/_base/.silnik/src/lib/parsers/text-cleaner.ts](file:///_tester/_base/.silnik/src/lib/parsers/text-cleaner.ts), [_tester/_base/.silnik/src/components/chat/narrative/cleanup.ts](file:///_tester/_base/.silnik/src/components/chat/narrative/cleanup.ts)
   - **Przyczyna**: Istnieje rozbieżność między parserem wyświetlania czatu w UI (`narrative/cleanup.ts`), który ukrywa tagi oraz pewne sekcje (np. `[DZIENNIK:]`, `[LOKACJA:]`, sekcje mechaniczne), a czyszczeniem w `useTTS.ts` (`text-cleaner.ts`). Gdy tagi lub sekcje systemowe podsuwane są do `addToQueue`, lektor otrzymuje wyczyszczony tekst, w którym fragmenty ukrytych w UI zdań pozostają i są odczytywane głośno (stąd "duchowe zdania").

---

## 🔗 2. Zależności i przepływ danych

```
[Gemini Chat SSE Stream / Message]
       │
       ▼
[useChat.ts] ──(streaming content)──► [useTTS.ts: addToQueue(text, messageId, flush)]
                                                │
                                                ├─► [stripMultilineArtifacts()]
                                                ├─► [Sentence Splitting & Speaker Matcher]
                                                ├─► [cleanResponseText() / removeDidaskalia()]
                                                ▼
                                     [pendingQueueRef / runQueueWorker()]
                                                │
                                                ▼ (POST /api/tts/gemini)
                                     [Gemini 2.5 Flash TTS API]
                                                │
                                                ▼ (WAV Audio Payload)
                                     [playFromBuffer() -> HTMLAudioElement]
```

---

## 🧪 3. Istniejące testy

- `tests/e2e/feature-12-tts.spec.ts`: Test Playwright sprawdzający przełączanie wyciszenia i sterowanie lektorem na czacie.
- Brak dedykowanych unit testów dla `useTTS.ts` w kwestii chunkingu pierwszego zdania, parsowania multi-voice NPC oraz filtrowania ghost-sentences (wymagają dodania testów w Jest).

---

## ⚠️ 4. Ryzyka i uwagi

- **Liczba zapytań do Gemini API (RPM)**: Zbytnie rozbijanie pierwszego zdania na bardzo krótkie segmenty (<20 znaków) zwiększa liczbę zapytań HTTP do API i narusza rate limits (429). Pierwszy segment powinien mieć dokładnie ~25-40 znaków kończących się znakiem interpunkcyjnym.
- **Spójność prozodii**: Za małe fragmenty mogą powodować "rwaną" intonację lektora.
- **Niezgodność parserów**: Parser TTS i parser UI czatu (`narrative/cleanup.ts`) muszą dzielić wspólne reguły czyszczenia, aby to co widzi gracz było dokładnie tym samym co słyszy w głośnikach.

---

## 🎯 5. Rekomendowany następny krok

Przejście do etapu tworzenia planu wykonawczego (`/dev-2-plan`) dla punktu 5 z `bug.md`.
