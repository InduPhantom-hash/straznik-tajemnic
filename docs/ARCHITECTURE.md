# Architektura Strażnika Tajemnic AI (v0.9.5)

Dokument techniczny opisujący stan architektury aplikacji **lokalnej / offline** w stabilnym wydaniu **v0.9.5**.

---

## 1. Z lotu ptaka & Single Source of Truth

Monolityczna aplikacja **Next.js 16 (App Router)** z podziałem na wrapper repozytorium i właściwy runtime silnika:

- **Git Root (`/straznik-tajemnic`):** Pełni rolę launchera i wrappera dystrybucyjnego, przechowuje dokumentację kanoniczną (`docs/`), pliki konfiguracyjne oraz skrypty powłoki launchera desktopowego (`desktop/`).
- **Silnik Aplikacji (`_tester/_base/.silnik/`):** Jest jedynym miejscem, w którym żyje 100% kodu produkcyjnego TypeScript, komponentów React 19, słowników i18n oraz zestawów testowych.

```
Przeglądarka / Desktop Webview (React 19 / Dark Art Déco)
        │
        ├──► Lokalny Mikromodel CPU (<1 ms, 0 tokenów) ──► era-guardrail.ts
        │
        └──► Route Handlers (/api/*) ──► Google Gemini API (Model BYOK)
                   │                                │
             localStorage                     data/rag/*.bin (Lokalny RAG Float32)
             IndexedDB (Media + gzip)         data/saves/    (Zapisy sesji i ledger SQLite)
```

Model użytkowania: **1 sesja przeglądarki = 1 gra = 1-2 graczy** (Hot Seat). Aplikacja jest jednoinstancyjna (Single Instance wymuszane przez Desktop Process Supervisor), co pozwala na stosowanie sprawdzonych singletonów modułowych i szybkiego storage'u lokalnego.

---

## 2. Podwójny Kontrakt Narracyjny (Silnik ↔ Prompt MG)

Architektura gwarantuje, że model LLM nie ma bezpośredniej władzy nad stanem gry i nie wymyśla mechaniki:

```
+-------------------------------------------------------------+
|                     KOD APLIKACJI (TS)                      |
|  - Rzuty kośćmi k100 (dice-utils.ts)                        |
|  - Progi trudności RAW (skill-test-resolver.ts)             |
|  - Faza Rozwoju Postaci (development-phase.ts)              |
|  - Walka OpposedMeleeCard (Unik vs Kontratak vs Manewry)    |
|  - Inwentarz i waluty epoki (equipment-catalog.ts)          |
+------------------------------+------------------------------+
                               | Twardy wynik mechaniczny
                               v
+-------------------------------------------------------------+
|                  MISTRZ GRY AI (LLM / GEMINI)               |
|  - Protokół promptu: gm-protocol.ts                         |
|  - 7 Silników Świata w locie (World Engine Director)        |
|  - 16 Technik narracyjnych i dynamiczny pacing MG           |
|  - Emisja tagów: [SANITY:], [HP:], [WYNIK:], [KARTA_SCENY]  |
+------------------------------+------------------------------+
                               | Strumień SSE z tagami
                               v
+-------------------------------------------------------------+
|                     PARSER I SANITYZACJA                    |
|  - apply-stat-changes.ts (aktualizacja stanu postaci)       |
|  - apply-journal-tags.ts (rejestr poszlak w Dossier)        |
|  - text-cleaner.ts (usunięcie tagów przed wyświetleniem)    |
|  - useTTS.ts (przekazanie czystego tekstu do lektora)       |
+------------------------------+------------------------------+
```

---

## 3. Kluczowe Podsystemy Silnika v0.9.5

### 3.1. 7 Dynamicznych Silników Świata w Locie (World Engine Director)
Zlokalizowany w `src/lib/world-engine/`, modularnie wstrzykuje wytyczne symulacji świata w prompt pipeline (`buildWorldEngineDirectives`):
1. **NPCEngine:** Fasada psychologiczna, ukryta skaza, opór przed wyjawieniem sekretu.
2. **SensoryEngine:** Triada zmysłowa, somatyka strachu, Zmienna Próżni (kosmiczny chłód).
3. **NarrativeGraphEngine:** Struktura branch-and-bottleneck, zapobieganie wykolejeniu śledztwa.
4. **PlotFrictionEngine:** Zasada plotek 70/30, lokalne tarcie społeczne i uprzedzenia.
5. **MysteryClueEngine:** Zasada 3 poszlak na wniosek, dynamika Fail-Forward.
6. **GeographyEngine:** Chokepoints, hydraulika i geneza lochów/podziemi.
7. **OccultEngine:** Prawa magii Sandersona, somatyczna cena czarów, stopnie wtajemniczenia kultu.

### 3.2. Lokalny Mikromodel Klasyfikacyjny na CPU i Guardrail Epoki
- **Dyspozytor CPU (`dispatcher.ts`):** Lekki klasyfikator działający w czystym TypeScript na CPU w czasie <0.01 ms (SLA <30 ms). Analizuje intencję gracza i kontekst tury, aktywując selektywnie tylko te silniki świata, które są potrzebne, co redukuje rozmiar promptu systemowego o >35% w turach spokojnych.
- **Guardrail Epoki (`era-guardrail.ts`):** Lokalna zapora odcinająca pytania o mechanikę, zasady i kartę postaci oraz twarde anachronizmy epoki (smartfony, GPS, Uber) w czasie <1 ms przy zerowym zużyciu tokenów API (0 tokenów).

### 3.3. 16 Technik Narracyjnych MG i Dynamiczny Reżyser Pacingu
W `src/lib/narrative-engine/techniques/` skodyfikowano 16 technik scenopisarskich (m.in. Anti-Exposition, Sensory Grounding, Cosmic Cold, Cliffhanger, Apex Risk Suspension). Reżyser scen (`scene-director.ts`) dobiera 1-2 techniki na turę z rotacją cooldownu zapobiegającą powtarzaniu tego samego wzorca narracyjnego.

### 3.4. Trwałość Danych Kampanii i Niezależność Offline
- **Ledger SQLite:** Trwały rejestr zdarzeń i faktów śledztwa z obsługą transakcji WAL i asercją spójności przed zapisem.
- **Kompresja Gzip w IndexedDB:** Odporność na ograniczenia pamięci przeglądarki przy dużych antologiach (>50MB).
- **100% Self-Hosted Fonty WOFF2:** Wszystkie kroje pisma (Cinzel, Cinzel Decorative, Cormorant Garamond, Special Elite) serwowane są lokalnie z `public/fonts/` bez zewnętrznych zapytań CDN.
- **Desktop Process Supervisor (`desktop/supervisor.mjs`):** Nadzorca procesów w czystym Node.js eliminujący procesy zombie przez kaskadowy `tree-kill`, obsługujący sygnały systemowe (`SIGINT`, `SIGTERM`), dynamiczny przydział portów (4050 -> 4051+) oraz politykę Single Instance.

---

## 4. Kluczowe ścieżki w kodzie (`_tester/_base/.silnik/src/`)

| Obszar | Ścieżka pliku | Odpowiedzialność |
|---|---|---|
| Główny pulpit gry | `src/app/page.tsx` | Ekran śledczy, okno narracji, Tacka na Kości |
| Pipeline Mistrza Gry | `src/app/api/chat/route.ts` (+ `_helpers/`) | Strumieniowanie SSE, prompt MG, adaptacja silników |
| Reżyseria Świata | `src/lib/world-engine/` | 7 modularnych silników symulacji świata |
| Techniki Narracyjne | `src/lib/narrative-engine/` | 16 technik narracyjnych, selektor technik i pacing |
| Klasyfikator i Guardrail | `src/lib/dispatcher.ts`, `era-guardrail.ts` | Lokalna inferencja na CPU (<30 ms, 0 tokenów) |
| Walka i Rzuty d100 RAW | `src/lib/dice-utils.ts`, `skill-test-resolver.ts` | Testy d100, progi sukcesu, starcia OpposedMeleeCard |
| Kompendium Badacza | `src/components/compendium/` | Mini-Obsidian: Atlas UI, Sztuka Odgrywania, Lore |
| Ekwipunek i Epoki | `src/lib/equipment/`, `manifests.ts` | 6 epok ekonomicznych, waluty, przelicznik PPP |
| Generator Dossier | `src/lib/setting-trivia.ts` | Bezspoilerowe, nastrojowe intro śledztwa |
| Rejestr nawigacji | `navigation/navigation-registry.json` | Źródło prawdy dla 31 ekranów i modali UI |
| Słowniki i18n | `messages/pl.json`, `messages/en.json` | 100% symetryczne tłumaczenia interfejsu |

---

## 5. Doktryna Czystego Emulatora BYOB & Dwuskładnikowy Bloker Sesji

W celu ochrony przed roszczeniami licencyjnymi aplikacja działa jako **Czysty Emulator Mechaniki d100 (model ScummVM & RetroArch)**:
- Kod silnika nie zawiera chronionych podręczników ani zastrzeżonych tabel.
- **Dwuskładnikowy Bloker Sesji (Two-Factor Session Blocker):**
  1. **Składnik 1 (Klucz API):** Własny klucz Google Gemini API (model BYOK).
  2. **Składnik 2 (Księga Szyfrów):** Legalnie nabyty przez gracza plik PDF z zasadami (Starter d100 lub pełna Księga Zasad).
- **Blokada Runtime (Hard Guard):** Dopóki oba warunki nie zostaną spełnione, ekran powitalny blokuje wejście do gry, a hook `useChat` zatrzymuje wywołania API na poziomie lokalnym (0 tokenów, brak wywołań sieciowych).
- **Fingerprint Podręcznika (`rulebook-fingerprint.ts`):** Przy imporcie pliku PDF silnik weryfikuje profil dokumentu (`starter-d100` lub `core-d100`) i dostosowuje poziom zaawansowania wstrzykiwanych reguł.
