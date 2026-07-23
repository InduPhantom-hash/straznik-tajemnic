## Plan: Jakość Językowa LLM [LNG-01 & LNG-02] (punkt 6 z bug.md)
Data: 2026-07-23  
Złożoność: Średnia  

---

### Problem
Sztuczna inteligencja prowadząca sesję (LLM) używa jednostek imperialnych (stopy, funty, mile) zamiast systemu metrycznego oraz sporadycznie wtrąca angielskie słówka (Ponglish) i błędy gramatyczne w polskiej narracji.

### Rozwiązanie
Wprowadzenie twardych dyrektyw systemowych **[LNG-01]** (obowiązkowy system metryczny z przeliczaniem jednostek) oraz **[LNG-02]** (Zero Ponglish i poprawna polszczyzna z wyłączeniem angielskich tagów TTS w nawiasach kwadratowych) w przewodniku stylu Lovecrafta i protokole GM, poparte dedykowanym testem jednostkowym w Jest.

---

### Pliki do modyfikacji

| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/src/lib/lovecraft-style-guide.ts` | Dodanie sekcji dyrektyw językowych `LNG-01` (System Metryczny) oraz `LNG-02` (Zero Ponglish) do promptu stylu narracyjnego | Niskie |
| `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts` | Wzmocnienie zasad narracji o wymóg przeliczania miar oraz poprawności gramatycznej bez zaburzania anglojęzycznych tagów audio TTS | Niskie |
| `_tester/_base/.silnik/src/lib/ai-settings/prompts-generator.test.ts` | [NEW] Dodanie testów jednostkowych Jest weryfikujących obecność dyrektyw `LNG-01` i `LNG-02` w wygenerowanym system prompcie | Niskie |

---

### Fazy implementacji

**Faza 1: Rozszerzenie przewodnika stylu i protokołu GM**
- [ ] Dopisanie sekcji **[LNG-01] OBOWIĄZKOWY SYSTEM METRYCZNY** w `lovecraft-style-guide.ts` (bezwzględny nakaz przeliczania stóp na metry, mil na kilometry, funtów na kg/gramy).
- [ ] Dopisanie sekcji **[LNG-02] ZERO PONGLISH & POPRAWNA POLSZCZYZNA** w `lovecraft-style-guide.ts` (zakaz kalk językowych i obcych słów w opisie/dialogach; jawne dopuszczenie angielskich tagów audio TTS w `[...]`).
- [ ] Zaktualizowanie instrukcji w `gm-protocol.ts` o przypomnienie wytycznych metrycznych i językowych.
- Weryfikacja: Sprawdzenie poprawności typów TypeScript przez `npx tsc --noEmit`.

**Faza 2: Dodanie testów jednostkowych Jest**
- [ ] Stworzenie pliku `_tester/_base/.silnik/src/lib/ai-settings/prompts-generator.test.ts`.
- [ ] Napisanie testów sprawdzających, czy `getGameMasterPrompt(defaultAISettings)` oraz warianty `gm-protocol` zawierają dyrektywy `LNG-01` oraz `LNG-02`.
- Weryfikacja: Uruchomienie testu komendą `npm test -- prompts-generator.test.ts` w katalogu `_tester/_base/.silnik`.

---

### Weryfikacja końcowa
```bash
# w katalogu _tester/_base/.silnik
npx tsc --noEmit
npm test -- prompts-generator.test.ts
```

---

### Co może się zepsuć
- **Sprzeczność z tagami TTS:** Ryzyko, że model przestanie generować angielskie tagi audio TTS (`[whispers]`, `[trembling]`). *Mitygacja:* W dyrektywie `LNG-02` jawnie zaznaczamy, że zakaz obcego języka dotyczy wyłącznie tekstu czytanego przez gracza, a tagi w nawiasach kwadratowych `[...]` MUSZĄ pozostać po angielsku.
