# v0.9.5 - karta wydania (macOS)

## Status
Gotowe. Ten dokument stanowi oficjalną specyfikację wydania v0.9.5 oraz bramki jakościowej po wdrożeniu 5-fazowej roadmapy stabilizacji silnika i zintegrowaniu kluczowych mechanik Call of Cthulhu 7e RAW.

---

## Zawartość komunikatu wydaniowego

### Polski
Wydanie **v0.9.5** to kamień milowy w rozwoju silnika Strażnik Tajemnic AI. Łączy ono pełną stabilizację architektury grywalnej z purystyczną implementacją zasad **Zew Cthulhu 7e RAW (Chaosium)**, zamknięciem pętli śledczej oraz pełną niezależnością offline:

- **Puryzm Walki Wręcz CoC 7e RAW (s. 102-117 BMG):** Karta starcia `OpposedMeleeCard` w klimacie Dark Art Déco (Unik vs Kontratak vs Manewry bojowe), asymetria remisu (Unik wygrywa z atakiem, Kontratak przegrywa), modyfikatory Budowy (Build), kość premiowa za przewagę liczebną (*Outnumbered*) oraz rzut za osłonę (*Dive for Cover*) przeciw broni palnej.
- **7 Silników Świata w locie (World Engine Director):** Wstrzykiwanie symulacji świata w zapytania narracyjne: `NPCEngine` (fasada, skaza, opór), `SensoryEngine` (triada zmysłowa, Zmienna Próżni, somatyka), `NarrativeGraphEngine` (branch-and-bottleneck), `PlotFrictionEngine` (plotki 70/30, tarcie społeczne), `MysteryClueEngine` (zasada 3 poszlak, fail-forward), `GeographyEngine` (chokepoints, hydraulika, geneza podziemi) oraz `OccultEngine` (prawa Sandersona, cena somatyczna, stopnie kultu).
- **Kompendium Badacza & Kodeks Zasad (Mini-Obsidian):** Wbudowany w boczny pasek system wiedzy: instrukcja interfejsu, przewodnik po odgrywaniu w duchu Fiction First i Fail Forward, leksykon Mitów Cthulhu oraz Kodeks Zasad CoC 7e RAW z lokalną wyszukiwarką podręcznika.
- **Dziennik Śledztwa, Raporty Aktów i Licznik Poszlak:** Reżyseria scen (`[ZMIANA_SCENY]`, `[KARTA_SCENY]`), raporty etapowe śledztwa (`[RAPORT_AKTU]`), dynamiczny licznik potwierdzonych wskazówek, funkcja cytowania hipotez do pola czatu (Quote-to-Input) oraz purystyczny Rzut na Pomysł (Idea Roll RAW, s. 199 BMG).
- **Zunifikowane Epoki Ekonomiczne i Waluty:** 6 kanonicznych epok (`1920s-us`, `1920s-pl`, `prl-1970s`, `1890s-uk`, `modern-pl`, `modern-us`), tabele Credit Rating dla funtów wiktoriańskich (£/s/d), dolarów i złotych, dynamiczny przelicznik PPP oraz znormalizowany zasięg broni (`formatWeaponRange`).
- **Trwała Pamięć Kampanii i Niezależność Offline:** Baza SQLite z rejestrem faktów i deduplikacją, kompresja gzip IndexedDB dla dużych antologii (>50MB), 100% self-hosted fonty WOFF2 w `public/fonts/` oraz Desktop Process Supervisor w Node.js (tree-kill, dynamiczne porty, Single Instance).
- **Auto-synchronizacja Języka Sesji (PL/EN):** Pole `locale` w `FullGameSave` gwarantujące stabilność językową zapisu oraz brak rozbieżności dwujęzycznych w aktywnej rozgrywce.

### English
The **v0.9.5** release is a definitive stabilization and feature milestone for Strażnik Tajemnic AI (Keeper of Arcane Lore AI). It unites an offline-ready standalone architecture with purist **Call of Cthulhu 7th Edition RAW (Chaosium)** mechanics, investigation loop synthesis, and robust campaign persistence:

- **Purist CoC 7e RAW Combat (pp. 102-117 Keeper Rulebook):** Dark Art Déco `OpposedMeleeCard` interface (Dodge vs Fight Back vs Combat Maneuvers), tie asymmetry (Dodge beats attack, Fight Back loses on tie), Build modifiers, Outnumbered bonus dice, and Dive for Cover against firearms.
- **7 Dynamic World Engines (World Engine Director):** Dynamic prompt simulation runtime injecting world depth: `NPCEngine` (facade, flaw, resistance), `SensoryEngine` (sensory triad, void variable, somatics), `NarrativeGraphEngine` (branch-and-bottleneck), `PlotFrictionEngine` (70/30 rumors, social friction), `MysteryClueEngine` (3-clue rule, fail-forward), `GeographyEngine` (chokepoints, hydrology, underworld genesis), and `OccultEngine` (Sanderson's laws, somatic cost, cult tiers).
- **Investigator Compendium & Rulebook (Mini-Obsidian):** Sidebar-integrated knowledge repository featuring UI atlas, Fiction First and Fail Forward roleplaying guide, Mythos lorebook, and CoC 7e RAW rule index with local PDF search.
- **Investigation Journal, Act Reports & Clue Counter:** Scene tracking (`[ZMIANA_SCENY]`, `[KARTA_SCENY]`), progressive act summaries (`[RAPORT_AKTU]`), live confirmed clue counter, Quote-to-Input hypothesis insertion, and purist Intelligence-based Idea Rolls (RAW p. 199) with Fail-Forward dynamics.
- **Unified Economic Eras & Historical Currencies:** 6 canonical eras (`1920s-us`, `1920s-pl`, `prl-1970s`, `1890s-uk`, `modern-pl`, `modern-us`), Credit Rating tables for Victorian pounds (£/s/d), old złotys, and dollars, dynamic PPP pricing converter, and standardized weapon range formatting (`formatWeaponRange`).
- **Persistent Campaign Memory & 100% Offline Readiness:** SQLite event ledger with vector deduplication, gzip IndexedDB compression for large anthologies (>50MB), 100% self-hosted WOFF2 fonts, and Node.js Desktop Process Supervisor (process tree-kill, dynamic port fallback, Single Instance).
- **Session-Bound Locale Auto-Synchronization:** `locale` metadata in `FullGameSave` ensuring complete language consistency across save imports.

---

## Główne filary wydania v0.9.5

1. **Trwała Pamięć Kampanii i Ledger (Faza 1 - PR #355):**
   - Baza SQLite z tabelami zdarzeń, encji i wektorowych skrótów.
   - Idempotentny zapis i odczyt stanu kampanii bez utraty kontekstu po wyjściu z gry.
2. **Tarcza Testowa i Character Builder RAW (Faza 2 - PR #357):**
   - Deterministyczne testy mocków SSE dla parsera mechaniki i dziennika.
   - Moduł `character-builder.ts` zgodny z regułami tworzenia badacza s. 179 BMG.
3. **Uszczelnienie Dossier i purystyczny Idea Roll CoC 7e RAW (Faza 3 - PR #359, PR #360):**
   - Odporny parser tagów `[DZIENNIK:typ:tytuł | świadek: | lokacja: | data:]` z separacją metadanych od M.I.C.E.
   - Quote-to-Input: badacz cytuje odkryte poszlaki bezpośrednio do promptu jednym kliknięciem.
   - Test Pomysłu (Idea Roll): dostępny tylko w impasie, zasada Fail-Forward, bez forsowania i bez wydawania Szczęścia.
4. **Puryzm Walki CoC 7e RAW (Faza 4 - PR #361, PR #362):**
   - Karta obrony `OpposedMeleeCard` na czacie w stylu Dark Art Déco.
   - Wpływ Budowy (Build) na manewry bojowe (-1K, -2K, blokada przy >= +3).
   - Przewaga liczebna w rundzie (+1K dla każdego kolejnego napastnika).
   - Rzut za osłonę (*Dive for Cover*) przed strzałami.
   - Czyszczenie tagów walki z narracji i syntezatora mowy TTS.
5. **7 Silników Świata w Locie (PR #445, PR #447, PR #456):**
   - Modularna architektura `WorldEngineDirector` w `src/lib/world-engine/`.
   - Automatyczna adaptacja promptu w `run-chat-pipeline.ts` z zachowaniem zerowych narzutów w UI.
6. **Kompendium Badacza & Kodeks Zasad (PR #461):**
   - 3 główne sekcje: Instrukcja Badacza & UI, Sztuka Odgrywania oraz Encyklopedia Wiedzy (Lore + Kodeks Zasad Mini-Obsidian).
   - Pełna integracja z lokalnym RAG i zerowa regresja tokenów Art Déco.
7. **Unifikacja Miar, Walut i Ekwipunku (PR #400, PR #475):**
   - 6 kanonicznych epok ekonomicznych z przelicznikiem PPP i progami majątkowymi.
   - Nowy, pełnoekranowy widok ekwipunku z kompaktowym paskiem statusu finansów w nagłówku.
8. **Dziennik Sesji i Raporty Aktów (PR #402, PR #460, PR #481, PR #485):**
   - Reżyseria scen `[ZMIANA_SCENY]` i `[KARTA_SCENY]`.
   - Raporty etapowe `[RAPORT_AKTU]` ze szeptami narracyjnymi i dynamicznym licznikiem poszlak.
9. **Samodzielny Launcher Desktopowy i Niezależność Offline (PR #479, PR #483, PR #488, PR #494):**
   - Desktop Process Supervisor (`desktop/supervisor.mjs`) w czystym Node.js: kaskadowe zamykanie procesów potomnych, dynamiczne porty (4050+), Single Instance.
   - 100% self-hosted fonty WOFF2 w `public/fonts/` z wykluczeniem z middleware `next-intl`.
10. **Stabilizacja Pamięci i Sesji (PR #450, PR #454, PR #455, PR #491, PR #492):**
    - Kompresja gzip w IndexedDB dla zrzutów grafu i wycinków >50MB.
    - Naprawa błędu SSR w `/api/chat`.
    - Zabezpieczenie metadanych `locale` w `FullGameSave` i automatyczne dopasowanie języka przy imporcie zapisu.

---

## Bramka Weryfikacyjna Wydania (Release Verification Gate)

- [x] Determinizm typów: `npx tsc --noEmit` (kod 0)
- [x] Symetria językowa: `npm run i18n:check` (1:1, 6516 kluczy)
- [x] Spójność nawigacji: `npm run navigation:check` & `npm run navigation:guard` (kod 0)
- [x] Testy jednostkowe i integracyjne: `npm test`
- [x] Bramka Pierwszych 10 Sekund: `cold-start-state.test.ts` (PASS)
- [x] Paczka macOS: `desktop/cold-start.sh` + `desktop/build-app.sh --rebuild` (zbudowana i zaktualizowana na Biurku)
