# 🎙️ Plan: Lektor & Synteza Audio (TTS) - Punkt 5 z bug.md
Data: 2026-07-23  
Złożoność: Średnia  

---

### Problem
Lektor audio posiada 4 kluczowe usterki i opóźnienia: długie oczekiwanie na start lektora na początku sesji ([TTS-01]), brak aktywacji dedykowanego głosu NPC ([TTS-02]), sporadyczne gubienie polskich znaków diakrytycznych ([TTS-03]) oraz głośne odczytywanie ukrytych w czacie tagów systemowych tzw. "duchowych zdań" ([TTS-04]).

---

### Rozwiązanie
1. **[TTS-01] Instant Streaming:** Zmiana buforowania pierwszego zdania – gdy bufor przekroczy ~25 znaków i napotka dowolną pauzę interpunkcyjną (przecinek, średnik, dwukropek, kropkę), nastąpi natychmiastowa wysyłka pierwszego segmentu do TTS.
2. **[TTS-02] Multi-Voice NPC Fix:** Ujednolicenie parsera imion NPC. Zachowanie cudzysłowów w buforze przeszukiwania mówcy przed ich usunięciem w `removeDidaskalia()` oraz rozszerzenie dopasowania głosu o elastyczne przeszukiwanie bez ścisłego wymogu tagu `@`.
3. **[TTS-03] Polskie znaki (UTF-8):** Weryfikacja i zabezpieczenie przekazu surowego tekstu w UTF-8 do API Gemini TTS bez zbędnego zastępowania polskich znaków diakrytycznych.
4. **[TTS-04] Eliminacja Duchowych Zdań:** Wykorzystanie wspólnego modułu czyszczenia tekstu (`text-cleaner.ts` / `cleanup.ts`) do odfiltrowywania wszystkich tagów systemowych (`[DZIENNIK:]`, `[LOKACJA:]`, `[ZDOBYTY_PRZEDMIOT:]` itp.) przed wysłaniem do bufora TTS.

---

### Pliki do modyfikacji

| Plik | Zmiana | Ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/hooks/useTTS.ts` | Poprawa chunkingu pierwszego zdania (~25+ znaków) oraz parsowania mówcy NPC | Średnie |
| `_tester/_base/.silnik/src/lib/parsers/text-cleaner.ts` | Rozbudowa czyszczenia tagów systemowych i osłona polskich znaków | Niskie |
| `_tester/_base/.silnik/src/app/api/tts/gemini/route.ts` | Weryfikacja UTF-8 payloadu i nagłówków Gemini TTS API | Niskie |
| `_tester/_base/.silnik/src/tests/unit/tts-cleaner.test.ts` [NEW] | Dodanie unit testów dla czyszczenia i parsowania wypowiedzi TTS | Niskie |

---

### Fazy implementacji

#### Faza 1: Ujednolicenie czyszczenia tekstu i eliminacja duchowych zdań ([TTS-03], [TTS-04])
- [ ] Rozszerzenie reguł filtrujących w `text-cleaner.ts` o pełny zestaw tagów systemowych i metadanych.
- [ ] Upewnienie się, że polskie znaki diakrytyczne (*ą, ę, ś, ć, ż, ź, ó, ł, ń*) są w pełni zachowane przy czyszczeniu.
- [ ] Napisanie testów jednostkowych w `tts-cleaner.test.ts`.
- **Weryfikacja:** `npx jest src/tests/unit/tts-cleaner.test.ts` (lub odpowiednia komenda testowa Jest).

#### Faza 2: Naprawa rozpoznawania głosu NPC ([TTS-02])
- [ ] Zmiana kolejności parsowania w `useTTS.ts`: wykrywanie nazwy mówcy przed wyczyszczeniem cudzysłowów.
- [ ] Dodanie metody `findNpcVoice(speakerName)` obsługującej częściowe dopasowania imion NPC.
- **Weryfikacja:** Test jednostkowy parsowania dialogu typu `Inspektor Fisk: „Nie wchodźcie tam!”`.

#### Faza 3: Instant Streaming pierwszego zdania ([TTS-01])
- [ ] Modyfikacja logiki `EARLY_FIRST_SEGMENT_MIN_CHARS` z 40 na 25 znaków i rozszerzenie separatorów o interpunkcję (`.,:;!?`).
- [ ] Przetestowanie zachowania przy długim wstępie sesji.
- **Weryfikacja:** Weryfikacja w logach czasu reakcji TTS na pierwszy chunk.

---

### Weryfikacja końcowa
1. `npx tsc --noEmit` - sprawdzanie typów TypeScript.
2. `npm test` - uruchomienie testów jednostkowych.

---

### Co może się zepsuć
- **Zwiększona liczba zapytań HTTP do Gemini API:** Zbytnie rozbicie zdań na początku może zbliżyć się do rate-limitów (429). Mitygowane progiem min. 25 znaków.
- **Niezgodność nazwy NPC:** Jeśli imię w narracji różni się drastycznie od bazy NPC, nastąpi fallback do głosu narratora (zachowanie bezpieczne).
