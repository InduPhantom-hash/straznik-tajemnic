# 📜 Research: Punkt 6 z pliku bug.md (Jakość Językowa LLM)

**Data:** 2026-07-23  
**Projekt:** Strażnik Tajemnic AI (`straznik-tajemnic`)  
**Zakres:** `[LNG-01]` Obowiązkowy System Metryczny & `[LNG-02]` Zero Ponglish & Poprawna Polszczyzna  

---

## 🎯 1. Podsumowanie problemu

Punkt 6 z pliku `bug.md` dotyczy dwóch mankamentów w narracji generowanej przez LLM:
1. **[LNG-01] Obowiązkowy System Metryczny:** LLM wtrąca jednostki imperialne (stopy, funty, mile, cale) charakterystyczne dla amerykańskich scenariuszy. Wymóg: wszystkie odległości, wymiary i wagi muszą być bezwzględnie przeliczane na system metryczny (metry, kilometry, kilogramy, cm), niezależnie od miejsca akcji (nawet w USA lat 20.).
2. **[LNG-02] Zero Ponglish & Poprawna Polszczyzna:** LLM sporadycznie wtrąca angielskie słówka w tekście (np. *hat*, *room*, *handout*) lub generuje kalki językowe/agramatyzmy (np. *"Złoty setka zaliczki jest pana"*). Wymóg: czysta, literacka polszczyzna w narracji i dialogach, przy zachowaniu angielskich tagów audio TTS (`[whispers]`, `[trembling]`).

---

## 🔍 2. Obszar problemu (Pliki i ich rola)

Analiza kodu w `_tester/_base/.silnik/src/` wykazała, że żaden z obecnych plików nie zawiera jeszcze dyrektyw `LNG-01` ani `LNG-02`:

- **`_tester/_base/.silnik/src/lib/lovecraft-style-guide.ts`**:
  - *Rola:* Główny przewodnik po polskim stylu narracyjnym Lovecrafta (11 filarów).
  - *Obecny stan:* Brak jakichkolwiek instrukcji dotyczących systemu metrycznego oraz zakazu wtrąceń Ponglishu. Zawiera jedynie angielskie audio tagi TTS.
- **`_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts`**:
  - *Rola:* Definiuje protokół tagowania strukturalnego (`[MYŚLI_MG]`, `[NASTRÓJ]`, `[TEST]`, `[SANITY]`, `[HP]`) oraz zasady narracji (sensoryka, dialogi, sprawczość).
  - *Obecny stan:* Brak dyrektyw językowych dotyczących miar metrycznych i poprawności gramatycznej.
- **`_tester/_base/.silnik/src/lib/ai-settings/prompts-generator.ts`**:
  - *Rola:* Składa prompt systemowy `getGameMasterPrompt()` łączący `mainPrompt`, `ROLE LOCK`, `Lovecraft Style Guide` i `GM Protocol`.
  - *Obecny stan:* Brak dedykowanych sekcji dla zasad jakości językowej `[LNG-01]` i `[LNG-02]`.

---

## 🔗 3. Zależności i przepływ danych (Prompt Pipeline)

1. **Konkatenacja Promptu:** `getGameMasterPrompt(aiSettings)` w `prompts-generator.ts` twardo dokleja sekcje na końcu promptu systemowego:
   - `mainPrompt` (wczytany z pliku lub zmodyfikowany przez gracza)
   - `ROLE LOCK` & `ZASADA KOMPLETNOŚCI`
   - `getLovecraftStylePrompt('pl')` (z `lovecraft-style-guide.ts`)
   - `getGMProtocolPrompt()` (z `gm-protocol.ts`)
2. **Context Caching (Gemini API):**
   - Zsyntetyzowany system prompt trafia do `run-chat-pipeline.ts` i przez `resolve-gemini-cache.ts` jest wysyłany do Gemini API (`cachedContent`).
   - Twardo doklejane dyrektywy na końcu promptu uniemożliwiają wymazanie reguł przez klienta.

---

## 🧪 4. Istniejące testy i plan weryfikacji

- **Obecny stan testów:** BRAK testów jednostkowych sprawdzających zawartość wygenerowanego system promptu pod kątem dyrektyw językowych.
- **Planowany test:** Utworzenie pliku `_tester/_base/.silnik/src/lib/ai-settings/prompts-generator.test.ts` lub `src/lib/prompts/gm-protocol.test.ts` w środowisku Jest, weryfikującego obecność kluczy:
  - `LNG-01` (wymóg metryczny: metry, kilometry, kilogramy)
  - `LNG-02` (Zero Ponglish & poprawna polszczyzna)

---

## ⚠️ 5. Ryzyka i uwagi

- **Mylenie tagów TTS z Ponglishem:** Angielskie tagi audio (np. `[whispers]`, `[trembling]`) są obowiązkowe dla syntezatora Gemini TTS. Reguła `[LNG-02]` musi wyraźnie zaznaczać, że zakaz Ponglishu dotyczy wyłącznie prozy narracyjnej i dialogów, a NIE tagów w nawiasach kwadratowych.
- **Odniesienia historyczne w klimacie lat 20.:** Niektóre potoczne pojęcia (np. "milowy krok" jako idiom) mogą występować w języku polskim. Reguła `LNG-01` powinna precyzyjnie nakazywać przeliczanie miar odległości/wagi (np. 10 feet ➔ 3 metry, 50 lbs ➔ 23 kg).

---

## 🚀 6. Rekomendowany następny krok

Przejście do skilla `/dev-2-plan` w celu stworzenia ustrukturyzowanego planu implementacji dyrektyw `[LNG-01]` i `[LNG-02]` w `lovecraft-style-guide.ts` / `gm-protocol.ts` oraz napisania testów w `prompts-generator.test.ts`.
