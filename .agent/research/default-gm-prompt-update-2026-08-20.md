## Research: Aktualizacja Instrukcji Systemowych MG o Kontrast Grozy, Materialne User Story i Echo Akcji
Data: 2026-08-20

### Mapowanie (Wiedza z RAG + Drzewo Plików)
- **Kontekst:** Wnioski z analizy transkrypcji poradnika światotworzenia Mary Stojne (10 błędów w kreowaniu loru i worldbuildingu) oraz debaty oksfordzkiej nad zjawiskiem inflacji anomalii, braku logistyki codzienności i braku reaktywności świata w sesjach RPG.
- **Lokalizacje plików:**
  - `public/default-gm-prompt.md` (root projektu)
  - `_tester/_base/.silnik/public/default-gm-prompt.md` (kopia bazowa dla paczki dystrybucyjnej)
  - `_tester/_base/.silnik/src/lib/lovecraft-style-guide.ts` (filary stylu Lovecrafta)
  - `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts` (protokół tagów MG)
  - `_tester/_base/.silnik/src/lib/prompt-section-parser.ts` (dynamiczny parser sekcji promptu)
  - `_tester/_base/.silnik/src/lib/location-era-validator.ts` (nowo dodany walidator i generator wytycznych)

### Graf kodu (Graft)
- **Stan:** Zbudowany i zsynchronizowany w `.silnik/graft/`
- **Hotspoty:**
  - `getGameMasterPrompt` (`src/lib/ai-settings/prompts-generator.ts`) -> punkt wejścia dla pełnego promptu MG
  - `parsePromptSections` / `getCachedSections` (`src/lib/prompt-section-parser.ts`) -> parsuje `default-gm-prompt.md` na 22 sekcje wg nagłówków `# CZĘŚĆ [I-XXII]`
  - `buildAdditionalContext` (`src/app/api/chat/_helpers/build-context.ts`) -> wstrzykuje wytyczne epoki i reguły sesji
  - `runChatPipeline` (`src/app/api/chat/_helpers/run-chat-pipeline.ts`) -> orchestrator zapytań czatu
- **Ślad zależności:**
  - `default-gm-prompt.md` -> wczytywany przez `prompts-generator.ts` (`loadDefaultPrompt` / `initializeDefaultPrompt`)
  - Parsowany przez `prompt-section-parser.ts` przy dynamicznym składaniu promptu
  - Kopiowany do paczki ZIP w `scripts/build-tester-pack.sh`

### Obszar problemu
1. **`public/default-gm-prompt.md` & `_tester/_base/.silnik/public/default-gm-prompt.md`:**
   - Główny przewodnik narracyjny MG (22 sekcje).
   - Wymaga zaktualizowania:
     - **CZĘŚĆ I (FUNDAMENT):** Wprowadzenie zasad *Kontrastu Grozy* (80% tła, 1 punkt anomalii), *Materialnego User Story* oraz *Echa Akcji*.
     - **CZĘŚĆ II (KREOWANIE ATMOSFERY):** Aktualizacja benchmarków lokacji o materialne rekwizyty epoki (lampy, piece, łączność) i ograniczenie nadmiaru nieeuklidesowych kątów w zwykłych budynkach.
     - **CZĘŚĆ IV (POSTACIE NIEZALEŻNE):** Dodanie reakcji BN-ów na plotki i rozgłos po głośnych akcjach badacza.
     - **CZĘŚĆ V & XVIII (HANDOUTY I KSIĘGI):** Wdrożenie dyrektywy *Actionable Clues* (skupienie na poszlakach tu i teraz, ograniczenie biografii sprzed wieków).
     - **CZĘŚĆ VIII (PROWADZENIE GRY):** Zakaz przeładowania nazwami własnymi (info-dumping).
2. **`_tester/_base/.silnik/src/lib/lovecraft-style-guide.ts`:**
   - Doprecyzowanie filaru 1 (Atmosfera i sensoryka), filaru 3 (Realizm topograficzny) i filaru 9 (Anomalia geometryczna) o zasadę kontrastu (anomalia jako wyjątek i pęknięcie w normalności, nie wszechobecna norma).
3. **`_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts`:**
   - Wzbogacenie tagu `[MYŚLI_MG]` o opcjonalne pole `| ECHO_AKCJI: planowane reakcje otoczenia`.

### Blast Radius Analysis (Zagrożenia i Skutki Uboczne)
- **Zagrożenie 1: Parser sekcji promptu (`prompt-section-parser.ts`):**
  - *Ryzyko:* Zmiana lub usunięcie nagłówków `# CZĘŚĆ ...` zepsuje podział promptu na sekcje i selekcję kontekstową.
  - *Mitigacja:* Bezwzględnie zachować nienaruszoną numerację i strukturę nagłówków `^#\s*CZĘŚĆ (I|II|...|XXII)` w pliku `.md`.
- **Zagrożenie 2: Rozjazd między kopią w root a `.silnik`:**
  - *Ryzyko:* Aktualizacja tylko jednego pliku spowoduje, że build lub testy będą używać nieaktualnej wersji.
  - *Mitigacja:* Zsynchronizować treść obu plików (`public/default-gm-prompt.md` oraz `_tester/_base/.silnik/public/default-gm-prompt.md`).
- **Zagrożenie 3: Testy integracyjne i E2E:**
  - *Ryzyko:* Zmiana fraz kluczowych może wpłynąć na asercje w testach promptów (np. `feature-1-gm-narration.spec.ts`).
  - *Mitigacja:* Sprawdzenie asercji w testach przed i po edycji promptu.
- **Zagrożenie 4: Długość promptu i limity tokenów:**
  - *Ryzyko:* Nadmierne rozbudowanie promptu zwiększy zużycie tokenów na start.
  - *Mitigacja:* Zwięzłe, gęste formułowanie reguł bez lania wody (Plain Polish, zasada anti-slop).

### Zależności (Testy i Markdowny do aktualizacji)
- `public/default-gm-prompt.md`
- `_tester/_base/.silnik/public/default-gm-prompt.md`
- `_tester/_base/.silnik/src/lib/lovecraft-style-guide.ts`
- `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts`
- `_tester/_base/.silnik/src/lib/prompt-section-parser.test.ts` (weryfikacja czy sekcje nadal poprawnie się parsują)
- `docs/ARCHITECTURE.md` (jeśli odnotowuje wytyczne promptu)
- `README.md` (odnotowanie usprawnień mechaniki narracyjnej)

### Rekomendowany następny krok
Przejście do fazy planowania implementacji (`/dev-2-plan`) w celu przygotowania dokładnego planu zmian i diffów dla `default-gm-prompt.md` oraz `lovecraft-style-guide.ts`.
