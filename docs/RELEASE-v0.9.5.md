# v0.9.5 - karta wydania (macOS)

## Status
Gotowe. Ten dokument stanowi specyfikację zakresu wydania v0.9.5 oraz bramki jakościowej po wdrożeniu 5-fazowej roadmapy stabilizacji silnika.

---

## Zawartość komunikatu wydaniowego

### Polski
Wydanie **v0.9.5** to kluczowy krok stabilizacyjny silnika Strażnik Tajemnic AI, integrujący kompletną pętlę rozgrywki (Game Loop) według rygorystycznych zasad **Zew Cthulhu 7e RAW**:
- **Trwała pamięć kampanii (SQLite & Ledger):** odporny na restarty rejestr faktów, relacji, wydatków i postępów fabularnych (\`CampaignMemoryLedgerStore\`) z wyszukiwaniem pełnotekstowym FTS i deduplikacją.
- **Tarcza testowa SSE & Playwright:** deterministyczny potok testowy mockujący strumień SSE bez kosztów tokenowych oraz testy E2E z visual regression.
- **Uszczelnienie Akt Śledczych & Idea Roll CoC 7e RAW (s. 199):** dwukierunkowe powiązania Fakt <-> NPC <-> Lokacja w Dossier, mechanika Quote-to-Input (kliknięcie faktu wkleja cytat do czatu) oraz purystyczny Test Pomysłu na Inteligencję z zasadą Fail-Forward.
- **Puryzm walki CoC 7e RAW (s. 102-117 BMG):** interaktywna karta starcia \`OpposedMeleeCard\` w klimacie Dark Art Deco (Unik vs Kontratak vs Manewr bojowy), asymetria remisu (Unik wygrywa z atakiem, Kontratak przegrywa), modyfikatory Budowy (Build), kość premiowa za przewagę liczebną (*Outnumbered*) oraz rzut za osłonę (*Dive for Cover*) przeciw broni palnej.

### English
The **v0.9.5** release is a critical engine stabilization milestone for Strażnik Tajemnic AI, integrating a complete game loop adhering strictly to **Call of Cthulhu 7th Edition RAW**:
- **Persistent Campaign Memory (SQLite & Ledger):** resilient tracking of clues, relationships, expenses, and story progression (\`CampaignMemoryLedgerStore\`) with FTS full-text search and vector deduplication.
- **SSE & Playwright Test Shield:** deterministic mock SSE integration pipeline free of API token overhead, plus race-free Playwright visual regression testing.
- **Hardened Investigation Dossier & Idea Roll CoC 7e RAW (p. 199):** bidirectional Fact <-> NPC <-> Location relations, Quote-to-Input functionality, and purist Intelligence-based Idea Rolls with Fail-Forward dynamics.
- **Purist CoC 7e RAW Combat (pp. 102-117 Keeper Rulebook):** Dark Art Deco \`OpposedMeleeCard\` interface (Dodge vs Fight Back vs Combat Maneuver), tie asymmetry (Dodge beats attack, Fight Back loses on tie), Build modifiers, Outnumbered bonus dice, and Dive for Cover against firearms.

---

## Główne filary wydania v0.9.5

1. **Trwała Pamięć Kampanii i Ledger (Faza 1 - PR #355):**
   - Baza SQLite z tabelami zdarzeń, encji i wektorowych skrótów.
   - Idempotentny zapis i odczyt stanu kampanii bez utraty kontekstu po wyjściu z gry.
2. **Tarcza Testowa i Character Builder RAW (Faza 2 - PR #357):**
   - Deterministyczne testy mocków SSE dla parsera mechaniki i dziennika.
   - Moduł \`character-builder.ts\` zgodny z regułami tworzenia badacza s. 179 BMG.
3. **Uszczelnienie Dossier i purystyczny Idea Roll CoC 7e RAW (Faza 3 - PR #359, PR #360):**
   - Odporny parser tagów \`[DZIENNIK:typ:tytuł | świadek: | lokacja: | data:]\` z separacją metadanych od M.I.C.E.
   - Quote-to-Input: badacz cytuje odkryte poszlaki bezpośrednio do promptu jednym kliknięciem.
   - Test Pomysłu (Idea Roll): dostępny tylko w impasie, zasada Fail-Forward, bez forsowania i bez wydawania Szczęścia.
4. **Puryzm Walki CoC 7e RAW (Faza 4 - PR #362):**
   - Karta obrony \`OpposedMeleeCard\` na czacie.
   - Wpływ Budowy (Build) na manewry bojowe (-1K, -2K, blokada przy >= +3).
   - Przewaga liczebna w rundzie (+1K dla każdego kolejnego napastnika).
   - Rzut za osłonę (*Dive for Cover*) przed strzałami.
   - Czyszczenie tagów walki z narracji i syntezatora mowy TTS.
5. **Stabilizacja i Samodzielny Launcher Desktopowy (Faza 5 - Issue #363):**
   - 176 zestawów testowych (1397 testów jednostkowych PASS).
   - 100% symetrii językowej PL/EN (\`messages/pl.json\` i \`messages/en.json\`).
   - Cold-Start Smoke Gate (Bramka Pierwszych 10 Sekund) 8/8 PASS.
   - Dedykowany, samowystarczalny pakiet macOS (\`~/Desktop/Straznik Tajemnic AI.app\`).

---

## Bramka Weryfikacyjna Wydania (Release Verification Gate)

- [x] Determinizm typów: \`npx tsc --noEmit\` (kod 0)
- [x] Symetria językowa: \`npm run i18n:check\` (1:1)
- [x] Spójność nawigacji: \`npm run navigation:check\` & \`npm run navigation:guard\` (kod 0)
- [x] Testy jednostkowe i integracyjne: \`npm test\` (176 suites PASS, 1397 zielonych)
- [x] Bramka Pierwszych 10 Sekund: \`cold-start-state.test.ts\` (8/8 PASS)
- [x] Paczka macOS: \`desktop/cold-start.sh\` + \`desktop/build-app.sh --rebuild\` (zbudowana i zaktualizowana na Biurku)
