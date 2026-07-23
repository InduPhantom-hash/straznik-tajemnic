## Plan Review: Jakość Językowa LLM [LNG-01 & LNG-02]
Data: 2026-07-23  

### Ocena ogólna
🟢 **Zielony** – Plan jest zwięzły, defensywny i precyzyjnie zaadresował wymagania `LNG-01` i `LNG-02` bez naruszania istniejącej architektury syntezy mowy TTS ani Context Cachingu Gemini.

---

### Analiza przez siedem wymiarów

1. **Definicja problemu:** 🟢 Jasna i precyzyjna. Bezpośrednio rozwiązuje punkt 6 z `bug.md`.
2. **Kompletność:** 🟢 Kompletna. Obejmuje pliki instrukcji (`lovecraft-style-guide.ts`, `gm-protocol.ts`) oraz nowy plik testowy (`prompts-generator.test.ts`).
3. **Dopasowanie do architektury:** 🟢 Doskonałe. Zgodne z architekturą w `_tester/_base/.silnik/src/lib/ai-settings/prompts-generator.ts`.
4. **Rabbit holes:** 🟢 Brak. Operujemy wyłącznie na stałych promptów i defensywnych testach stringowych.
5. **Promise gaps:** 🟢 Przejścia między fazami są czyste (najpierw definicje promptów, potem testy weryfikujące).
6. **Strategia testowania:** 🟢 Konkretne komendy `npx tsc --noEmit` oraz `npm test -- prompts-generator.test.ts`.
7. **Zgodność z guardrails projektu:** 🟢 Dokładnie 3 pliki do modyfikacji, brak typów `any`, brak zmian niszczących w API.

---

### Znalezione problemy

**Krytyczne:** Brak.  
**Ostrzeżenia:** Brak.  
**Obserwacje:**
- Upewnić się, że słowa kluczowe w teście Jest (`LNG-01`, `LNG-02`, `metryczny`, `polszczyzna`) zgadzają się z nagłówkami w dyrektywach promptu.

---

### Rekomendacja
**Implementuj** – Plan jest zweryfikowany i gotowy do wykonania w kroku `/dev-4-implement`.
