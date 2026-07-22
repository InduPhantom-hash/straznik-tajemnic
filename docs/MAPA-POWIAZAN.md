# 🗺️ Mapa Powiązań (Instrukcje & Dokumentacja ↔ Kod Source)

Dokument ten pełni rolę **Single Source of Truth (SSOT)** dla architektury zależności funkcjonalnych i instrukcji w projekcie **Strażnik Tajemnic AI**. Określa jednoznacznie, na które pliki źródłowe (`src/`) wpływa poszczególna instrukcja lub dokument w systemie.

---

## 🧭 System Powiązań Głównych Osi

```mermaid
graph TD
    subgraph Instrukcje_Systemowe["Instrukcje & Prompty (.md)"]
        STATE["state.md<br/>(Master Tracker Projektu)"]
        PROMPT["public/default-gm-prompt.md<br/>(Master Prompt MG CoC 7e)"]
        ARCH["docs/ARCHITECTURE.md<br/>(Architektura Systemu)"]
        UGUIDE["docs/USER_GUIDE.md<br/>(Przewodnik Gracza)"]
        ROADMAP["docs/ROADMAP-MECHANIKI-AI.md<br/>(Roadmapa AI)"]
        SECURITY["SECURITY.md<br/>(Polityka Bezpieczeństwa)"]
    end

    subgraph Logika_Backend_API["Logika Backend & API (src/app/api & src/lib)"]
        BUILD_CTX["src/app/api/chat/_helpers/build-context.ts"]
        CHAT_PIPE["src/app/api/chat/_helpers/run-chat-pipeline.ts"]
        RAG_STORE["src/lib/vector-db/local-vector-store.ts<br/>vector-types.ts"]
        DICE_CALC["src/lib/dice-utils.ts<br/>skill-test-resolver.ts"]
        TTS_API["src/app/api/tts/gemini/route.ts"]
        IMAGEN_API["src/app/api/imagen/route.ts"]
        IMMERSION["src/app/api/chat/_helpers/build-immersion-context.ts"]
    end

    subgraph Komponenty_UI["Komponenty UI & Hooki (src/components & src/hooks)"]
        MSG_INPUT["src/components/chat/message-input.tsx"]
        SIDEBAR["src/components/sidebar/cthulhu-sidebar.tsx"]
        DICE_TRAY["src/components/dice/dice-tray.tsx"]
        SHEET["src/components/character-sheet/"]
        EQUIPMENT["src/components/equipment/"]
    end

    PROMPT -->|Wstrzykiwany prompt bazowy| BUILD_CTX
    PROMPT -->|Tagowanie SAN, HP, Wynik| CHAT_PIPE
    PROMPT -->|Zasady rzutów RAW| DICE_CALC
    PROMPT -->|Tagi głosu [whispers]| TTS_API
    ARCH -->|Implementacja Float32 RAG bez chmury| RAG_STORE
    UGUIDE -->|Tacka na Kości CoC 7e| DICE_TRAY
    UGUIDE -->|Karta badacza| SHEET
    ROADMAP -->|Przycisk Koniec Sesji| SIDEBAR
    ROADMAP -->|Wygaszanie i autozapis| MSG_INPUT
    ROADMAP -->|Dane immersyjne w kontekscie MG| IMMERSION
    SECURITY -->|Obsluga kluczy lokalnych| SIDEBAR
```

---

## 📋 Tabela Zależności Szczegółowych

| Dokument / Instrukcja (`.md`) | Obszar funkcjonalny | Powiązane pliki źródłowe (`src/`) |
| :--- | :--- | :--- |
| **`state.md`**<br/>*(Single Source of Truth / Tracker Projektu)* | • Tablica statusów zadań Linear-style<br/>• Stan Etapów 0-6, Etapu 0.5 (Onboarding) i Etapu 3.5 (Encyklopedia)<br/>• Mapa powiązań modułów i RAG assets | • `docs/ROADMAP-MECHANIKI-AI.md`<br/>• `docs/ARCHITECTURE.md`<br/>• Wszystkie pliki `src/` wymienione w trackerze |
| **`public/default-gm-prompt.md`**<br/>*(Master Prompt Mistrza Gry)* | • Kontekst i ton Lovecrafta<br/>• Sesja Zero i kalibracja<br/>• Tryb Duet / Hot Seat (1-2 graczy, spójność relacji i pytania otwierające)<br/>• Realizm epoki i spójność wizualna Badacza/NPC na ilustracjach<br/>• Organiczne otwarcia przygód (ekspozycja przez dialog przed hookiem)<br/>• Elastyczny pacing opowiadań (brak sztywnych kagańców akapitowych)<br/>• Tagi `[SANITY:]`, `[HP:]`, `[WYNIK:]`<br/>• Procedura `[KONIEC_SESJI]`<br/>• Tagi Audio TTS (np. `[whispers]`, `[trembling]`, `[sighs]`) | • `src/app/api/chat/_helpers/build-context.ts`<br/>• `src/app/api/chat/_helpers/run-chat-pipeline.ts`<br/>• `src/app/api/adventure/setup/route.ts`<br/>• `src/hooks/useGameStart.ts`<br/>• `src/lib/prompts/gm-protocol.ts`<br/>• `src/lib/prompts/image-instructions.ts`<br/>• `src/app/api/imagen/route.ts`<br/>• `src/lib/prompts/lovecraft-style-guide.ts`<br/>• `src/lib/parsers/text-cleaner.ts`<br/>• `src/hooks/useTTS.ts`<br/>• `src/components/chat/message-input.tsx` |
| **`docs/ARCHITECTURE.md`**<br/>*(Dokumentacja Architektura)* | • Monolit Next.js 14 App Router<br/>• Centralny Rejestr Modeli Gemini (`model-registry.ts` - SSOT dla modeli chat `gemini-3.6-flash`, obrazów `imagen-3.0-generate-002`, TTS `gemini-2.5-flash-preview-tts` i cennika)<br/>• Lokalny RAG Float32 (`Float32Array`), bez Pinecone i chmury<br/>• Storage (`localStorage` + dysk)<br/>• Bezpieczne aktualizacje kodu bez naruszania danych<br/>• Presety jakości (LOW / MID / HIGH / ULTRA) | • `_tester/_base/.silnik/src/lib/model-registry.ts`<br/>• `src/lib/vector-db/local-vector-store.ts`<br/>• `src/lib/vector-db/vector-types.ts`<br/>• `src/app/api/pdf/ingest-local/route.ts`<br/>• `src/lib/ai-settings/`<br/>• `src/app/api/chat/route.ts`<br/>• `src/app/api/imagen/route.ts`<br/>• `src/app/api/tts/gemini/route.ts`<br/>• `src/lib/pdf/adventure-extractor.ts`<br/>• `desktop/launcher.sh`<br/>• `desktop/build-app.sh` |
| **`docs/USER_GUIDE.md`**<br/>*(Przewodnik Gracza)* | • Kreator badacza (charakterystyki, zawód)<br/>• Tacka na Kości (k100, progi, Push Roll, Szczęście)<br/>• Tryb Hot Seat (1-2 graczy, spójny start i pytania otwarcia)<br/>• Zapis i wczytanie sesji<br/>• Tablica Badacza (poszlaki, hipotezy, sznurki) | • `src/components/character-sheet/`<br/>• `src/components/dice/dice-tray.tsx`<br/>• `src/lib/dice-utils.ts`<br/>• `src/components/chat/hot-seat-banner.tsx`<br/>• `src/hooks/useGameStart.ts`<br/>• `src/components/ui/investigator-board.tsx`<br/>• `src/components/ui/session-journal.tsx` |
| **`docs/ROADMAP-MECHANIKI-AI.md`**<br/>*(Roadmapa rozwoju)* | - Lokalny RAG jako zrodlo prawdy<br/>- Domkniecie "Koniec Sesji"<br/>- Lokalny pipeline przygody<br/>- Immersja i assety<br/>- Adventure Creator i Quick Start<br/>- Onboarding & Quick Setup Flow (Etap 0.5)<br/>- i18n PL/EN | - `src/lib/pacing-controller.ts`<br/>- `src/components/sidebar/CthulhuSidebar.tsx`<br/>- `src/components/chat/chat-window/components/message-input.tsx`<br/>- `src/lib/vector-db/local-vector-store.ts`<br/>- `src/lib/adventures-data.ts`<br/>- `src/app/api/chat/_helpers/build-immersion-context.ts`<br/>- `src/lib/immersion/astronomy-service.ts`<br/>- `src/lib/immersion/news-service.ts`<br/>- `src/lib/immersion/pricing-service.ts`<br/>- `src/components/onboarding/` |
| **`docs/TESTING.md`**<br/>*(Standardy testowania)* | • Testy jednostkowe Jest (`__tests__/`)<br/>• Kontrola typów TypeScript (`npx tsc`)<br/>• Git Hooks (Husky pre-commit / pre-push) | • `jest.config.js`<br/>• `package.json`<br/>• `.husky/pre-commit`<br/>• `.husky/pre-push` |
| **`SETUP.md`**<br/>*(Instrukcja setupu)* | • Wprowadzanie klucza Gemini API<br/>• Ingestion własnego PDF<br/>• Onboarding & Quick Setup (Etap 0.5)<br/>• Launcher `.app` na macOS | • `src/components/onboarding/`<br/>• `src/hooks/useFirstRun.ts`<br/>• `desktop/build-app.sh` |
| **`SECURITY.md`**<br/>*(Polityka bezpieczeństwa)* | • Przechowywanie kluczy API<br/>• Brak chmury i brak telemetrii PII<br/>• Przepływ danych w 100% lokalny | • `src/app/api/chat/route.ts`<br/>• `.env.example`<br/>• `src/lib/telemetry.ts` |
| **`.agent/plans/investigator-board-persistence-plan.md`**<br/>*(Plan Tablicy Badacza & Miro-style DnD)* | • Pozycjonowanie swobodne (absolutne) i Drag & Drop (Miro-style)<br/>• Zapis relacji SVG (sznurków) i statusów hipotez<br/>• Wspinanie ilustracji/obrazków (`imageUrl`) do węzłów<br/>• Integracja z `FullGameSave` i `Character.investigatorBoard` | • `src/types/investigator-board.ts`<br/>• `src/components/ui/investigator-board.tsx`<br/>• `src/components/ui/session-journal.tsx`<br/>• `src/lib/full-game-save-manager.ts`<br/>• `src/lib/types.ts` |
| **`.agent/plans/dziennik-przebudowa-brief.md`**<br/>*(Plan przebudowy Dziennika Sesji)* | • Cele misji z gwarantowanymi unikalnymi ID (`QuestObjective`)<br/>• Podsumowania scen w Kronice (2. osoba l.mnogiej dla drużyny przy `participantCount > 1`)<br/>• Wyłączenie rzutów z zakładek Notatek (ręczna przestrzeń graczy) | • `src/components/ui/session-journal.tsx`<br/>• `src/app/api/summarize-scene/route.ts`<br/>• `src/lib/journal/convert-entries.ts` |
| **`.agent/plans/weather-status-plan.md`**<br/>*(Plan pogody i otoczenia)* | • Dynamiczna pogoda i wskaźnik UI<br/>• Priorytet klimatu i woli MG (`[POGODA:]`) nad danymi z API<br/>• Spójność z generatorem obrazów i kontekstem LLM | • `src/lib/time-manager.ts`<br/>• `src/components/chat/narrative/cleanup.ts`<br/>• `src/components/ui/campaign-clock.tsx`<br/>• `src/app/api/chat/_helpers/build-time-context.ts`<br/>• `src/lib/prompts/image-instructions.ts` |
| **`.agent/plans/ekwipunek-*.md`**<br/>*(Plany ekwipunku i assetów)* | • Lokalny katalog CoC 7e<br/>• Wyłączanie generowania AI dla assetów<br/>• Dedykowane ikony epoki | • `src/lib/equipment/equipment-catalog.ts`<br/>• `src/components/equipment/`<br/>• `src/hooks/useImageGenerationQueue.ts` |
| **`.agent/plans/przywrocenie-przycisku-obrazy-plan.md`**<br/>*(Plan przełącznika obrazów i kontroli API)* | • Szybki przełącznik "Obrazy: Wł / Wył" w bocznym menu<br/>• Zabezpieczenie przed błędami API przy wyłączonych obrazach (intro & sceny) | • `src/components/sidebar/CthulhuSidebar.tsx`<br/>• `src/app/page.tsx`<br/>• `src/hooks/useGameStart.ts`<br/>• `src/hooks/useChat.ts` |
| **`.agent/plans/no-forced-dialogue-plan.md`**<br/>*(Plan zniesienia wymuszania dyskusji drużynowych & pytanie `[Co robicie?]`)* | • Brak zmuszania graczy do dialogu na czacie celem pchnięcia akcji<br/>• Ujednolicenie pytania końcowego dla drużyny do `[Co robicie?]`<br/>• Aktualizacja regexu w parserze czatu | • `src/hooks/useGameStart.ts`<br/>• `src/app/api/chat/_helpers/build-context.ts`<br/>• `src/lib/prompts/gm-protocol.ts`<br/>• `src/components/chat/narrative/cleanup.ts` |
| **`.agent/plans/etap-0-5-onboarding-plan.md`**<br/>*(Plan Onboardingu & Quick Setup Flow)* | • 4-krokowy kreator (Klucz Gemini z natychmiastową walidacją -> Podręcznik -> Wgraj PDF -> Powitanie MG & Quick Setup)<br/>• Narracyjny wstęp Wirtualnego MG (`StepWelcomeGM`) z wyborem predefiniowanej polskiej przygody i postaci | • `src/components/onboarding/FirstRunWizard.tsx`<br/>• `src/components/onboarding/steps/step-welcome-gm.tsx`<br/>• `src/components/onboarding/steps/step-gemini-key.tsx`<br/>• `src/app/page.tsx`<br/>• `src/hooks/useFirstRun.ts` |
| **`zew-encyklopedia`**<br/>*(Wewnętrzna Encyklopedia USA 1920s)* | • Generator i baza wiedzy historyczno-klimatycznej<br/>• Zasilanie RAG i wstrzykiwanie danych sensorycznych/slangu/cen do MG<br/>• Kompas epoki dla graczy i generator rekwizytów | • `~/.gemini/config/skills/zew-encyklopedia/SKILL.md`<br/>• `data/encyclopedia/1920s-usa/`<br/>• `src/app/api/chat/_helpers/build-immersion-context.ts`<br/>• `src/lib/immersion/pricing-service.ts` |

---

## 🛠️ Procedura Aktualizacji Mapy (Zewdrzewko Update)

W przypadku wywołania procedury aktualizacji mapy powiązań (Zewdrzewko Update) lub modyfikacji dowolnego dokumentu systemowego:
1. **Przegląd całościowy (Audyt cykliczny)**: Należy przejrzeć po kolei wszystkie dokumenty Markdown wymienione w tabeli zależności i upewnić się, że informacje w nich zawarte są w 100% spójne z obecnym stanem faktycznym w kodzie (np. brak odniesień do nieużywanych API, starych baz danych jak chmurowe Pinecone itp.).
2. **Weryfikacja zmian w kodzie**: Jeżeli modyfikowana jest instrukcja / prompt (`.md`), należy przeanalizować odpowiadający plik źródłowy w `src/` (zgodnie z tabelą powiązań) i nanieść stosowne korekty deweloperskie w tym samym kroku.
3. **Synchronizacja promptu testowego**: Po modyfikacji `public/default-gm-prompt.md` należy bezwzględnie zsynchronizować plik `_tester/_base/.silnik/public/default-gm-prompt.md`, aby były identyczne, i sprawdzić to poleceniem:
   ```bash
   diff -u public/default-gm-prompt.md _tester/_base/.silnik/public/default-gm-prompt.md
   ```
4. **Weryfikacja integracyjna**: Po zakończeniu aktualizacji należy uruchomić testy i kontrole typów:
   ```bash
   npx tsc --noEmit
   npm test
   ```
