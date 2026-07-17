# CHANGELOG - Zew-App

> Szczegółowa historia sesji dewelperskich (sesje 14-135) w [CLAUDE.md](./CLAUDE.md) + [CLAUDE-history.md](./CLAUDE-history.md). Linear: tickety IND-NNN. Ten plik streszcza top-level zmiany.

## [v4.0.0] - 2026-05-23 (sesje 28-135)

### ✨ Nowości (główne osie)

- **Pinecone RAG Pipeline (Etap 2 done):** wektorowa baza wiedzy `coc-rag-v2` (3072 dim) + 5 namespaces: `rules` (986 wektorów), `adventures` (882), `sessions/{id}`, `npcs`, `world`. Hybrid search semantic + BM25 + RRF. `embeddingService` (`gemini-embedding-001` @ 768 dim z MRL), `conversationMemory` (auto-save turns). Eliminacja halucynacji CoC 7e. **IND-9** zamknięte (Opcja D: brak migracji localStorage → Pinecone, ortogonalne warstwy).
- **Single-instance + Hot Seat** (sesja 74): natywny coop 2-4 graczy na 1 urządzeniu, per-character UI color + `@ImięPostaci:` w narracji (OPT-22). Multi-user online explicit OUT OF SCOPE dla v4.x. 7 ticketów Urgent (IND-74/88/96/104/109/116/155) zamknięte jako "Accepted dług single-instance".
- **Flux.1 Pro w HIGH+ULTRA** (IND-166, 2026-05-12): Replicate (~$0.055/obraz) jako default Tier 1. Vertex AI Imagen 3 → fallback Tier 2, Gemini Flash → Tier 3 emergency. Master switch `imageGenerationEnabled` (IND-91, provider-agnostic).
- **Gemini Native SDK** (IND-15/IND-19): migracja `@google/generative-ai` (EOL) → `@google/genai@1.50.x`. Files API (IND-15 Faza 3), embeddingi 3072-dim z MRL, taskType API.
- **Sentry + PostHog telemetry:** X-Trace-Id propagation w middleware/proxy, `chat_message_sent` event, `ai_request_completed` event (sesja 125, wiring done w `run-chat-pipeline.ts` → SSE metadata → useChat onMetadata). PostHog browser-only z transparent fallback (IND-25).
- **Husky pre-commit + pre-push** (IND-18): lint-staged (eslint --max-warnings=20 + prettier + jest --findRelatedTests) + tsc --noEmit. Zakaz `--no-verify`.

### 🔨 Refaktory (-tysiące linii)

- **`/api/chat/route.ts` 543 → 69 lin (-87%)** w 9 micro commitach (IND-71/183/184, sesje 123+126+127). 9 helperów w `_helpers/` (build-context, run-rag-summary, create-sse-stream, resolve-settings, build-time-context, resolve-gemini-cache, build-pdf-strategy, build-gemini-options, run-chat-pipeline).
- **Character zone** (IND-125/IND-180/IND-185, sesje 100+132): drop 3 dead pliki (character-creator/profile/state ~2812 lin); split character-sheet 936 → 17 (-98%) i skill-calculator 599 → 12 (-98%) w 23 mikrokomitach. Razem 1535 → 29 lin (-98%).
- **Chat UI** (IND-144, sesje 129-131, 3 warianty): NarrativeFormatter 627 → 13 (-98%), WelcomeScreen 493 → 18 (-96%), ChatWindow 438 → 13 (-97%). Razem 1558 → 44 lin (-97%) w 23 mikrokomitach.
- **Settings** (IND-58, sesje 119-122, 4 micro splits): elevenlabs 272 → 112, cost-control 265 → 195, game-master 314 → 50, debug 289 → 74. SCOPE COMPLETE.
- **Dead code total w IND-42 audytach:** ~7232 lin dropped przez 14 sesji (9-ty raz dead code pattern w IND-42 = systemowy tech debt z fork v3.8.6).

### 🐛 Bug fixes

- **IND-57:** `resetSessionTokens` przy `handleStartGame` - bug żył miesiące (sessionTokens rosło nieskończenie).
- **IND-80:** `/api/tts/openai/route.ts` DOUBLE BILLING - drop CALL #1, 50% overcharging eliminated.
- **IND-149 B6:** WelcomeScreen audio.loop regression guard.
- **IND-167:** anti-halucynacja AI (smoke 3/5 odpowiedzi explicit "nie ma w kontekście RAG").
- **IND-172:** raw `<img>` data URL workaround dla AI inline gen base64.
- **IND-174:** guard `if (isLoading) return;` w `handleSendMessage` przeciw race condition.

### 📊 Testy

- Jest: ~465 PASS (sesja 99) → **~834 PASS** (sesja 135), +369 testów, 0 regresji
- 100% test coverage dla wszystkich nowych helperów (B/R/S/T/W/C/CS/RS/TC/GC/PS/GO testy)

### 📦 Provider Layer

- **IND-46 (wycofany 2026-05-05):** OpenRouter wycięty (klucz nie istniał + Gemini 3 Flash + 3.1 Pro pokrywają wszystkie tier'y). Single-provider Gemini. `IChatProvider` interface zachowany dla type safety.

### ⚠️ Blockery prod

- **IND-168 Vercel + Clerk Free:** beta deploy dla 10 testerów, ~3h pracy, unblock prod p95 measurement + IND-171 KROK 10.
- **IND-171 Pinecone V2:** Urgent In Review, manual blocker u user'a (KROK 1-11), większość done w sesji 124.

---

## [v3.8.6] - 2026-02-25

### ✨ Nowości i Ulepszenia

- **Game Time Sync:** Pełna synchronizacja czasu gry wyświetlanego w górnym pasku z timestampami wiadomości w oknie chatu.
- **SSE Parser Optimization:** Nowy, stabilniejszy parser Server-Sent Events poprawiający obsługę streamingu odpowiedzi AI i czyszczenie tagów technicznych.
- **Reactive Settings Sync:** Implementacja systemu `settings-event-emitter.ts`, pozwalającego na natychmiastową synchronizację ustawień AI (model, lektor) we wszystkich komponentach bez przeładowania strony.

### 🐛 Poprawki (Fixes)

- Naprawiono błąd typów TypeScript w `page.tsx` związany z przekazywaniem `aiSettings` do hooka `useChat`.
- Poprawiono stabilność generowania obrazów (Imagen 3) poprzez optymalizację cooldownów i promptów systemowych.
- Rozwiązano problem z artefaktami CSS w oknie chatu po szybkim przeładowaniu strony.

---

Wszystkie istotne zmiany w projekcie są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [3.8.5] - 2026-02-20

### ✨ Added

- **Integracja Gemini 3.1 Pro i Gemini 3 Flash**:
  - Obsługa parametrów "thinking" dla zaawansowanego rozumowania GM.
  - Nowe presety jakości (LOW/MID/HIGH używają wersji Flash, ULTRA używa 3.1 Pro).
  - Aktualizacja logiki API chat obsługującej PDF dla nowych modeli.
- **System Kontroli Kosztów v2**:
  - Nowy cennik API Gemini 2026 wbudowany w `ai-cost-tracker.ts`.
  - Dynamiczne obliczanie kosztów sesji.

### 📝 Documentation

- Zaktualizowano **wszystkie pliki .md** (README, GEMINI.md, COST_ESTIMATION.md, Quality-Presets.md, TODO.md, FEATURE_STATUS.md) do standardu 3.1 Pro.

---

## [3.8.0] - 2026-02-10

### 🔧 Refactored

- **Refaktoryzacja projektu** - kompleksowe czyszczenie kodu i dokumentacji:
  - Usunięto nieużywane zależności (`@vercel/blob`, `@vercel/kv`)
  - Usunięto martwe pliki (`character-sheet.tsx.backup`, `fix_black_bg.sh`, pliki qa-\*)
  - Naprawiono błędy TypeScript w `tests/e2e/extended-playtest.spec.ts`
  - Zaktualizowano `package.json` (wersja 3.8.0, nazwa `zew-app-3.5`)

### ✨ Added

- **Azure TTS** - nowy provider Text-to-Speech (Microsoft Cognitive Services)
- **OpenAI TTS** - dodatkowy provider TTS
- **Eternal Memory & Chrono-Travel** - system podróży w czasie i zegar kampanii
  - Komponent `CampaignClock` w głównym UI
  - `TravelLoader` - wizualny feedback podróży
  - `TimeManager` z unit testami

### 📝 Documentation

- Zaktualizowano **wszystkie 40 plików .md** do wersji 3.8.0
- Ujednolicono nazewnictwo (Zew-App 3.5 / wersja 3.8.0)
- Zaktualizowano DEPENDENCY_MAP, FEATURE_STATUS, ARCHITECTURE, README

---

## [3.7.0] - 2026-02-02

### 🔧 Refactored

- **Modularyzacja Content Library** - rozbito `content-library.ts` (83KB, 1906 linii) na 6 mniejszych modułów:
  - `src/lib/content-library/types.ts` - interfejsy TypeScript
  - `src/lib/content-library/npc-archetypes.ts` - archetypy NPC
  - `src/lib/content-library/mythos-creatures.ts` - bestiariusz istot Mitów
  - `src/lib/content-library/locations.ts` - lokacje gry
  - `src/lib/content-library/scenario-hooks.ts` - haki fabularne
  - `src/lib/content-library/random-tables.ts` - tabele losowe, księgi, folklor
  - Lepszy tree-shaking i bundle size

### 🐛 Fixed

- **Naprawa konfiguracji Next.js** - przeniesiono `serverExternalPackages` do `experimental.serverComponentsExternalPackages`
- **Migracja ESLint** - przeniesiono `.eslintignore` do `eslint.config.mjs` (ESLint Flat Config)

### 📘 TypeScript Improvements

- **Eliminacja `any` types** w krytycznych plikach:
  - `character-import-export.ts` - pełna walidacja typów przy imporcie postaci
  - `useChat.ts` - import `DialogueLine`, właściwe typy dla `Message`
  - `use-save-manager.ts` - import `Message`, `Record<string, unknown>`
  - `ai-settings.ts` - typowanie Hot Seat config

### 📁 New Files

- `src/lib/content-library/` - nowy katalog z modułami content library
- `src/lib/content-library/index.ts` - re-eksporty dla kompatybilności wstecznej

---

## [3.6.0] - 2026-01-16

### ✨ Added

- **Usunięty moduł ekwipunku** - uproszczenie architektury aplikacji
  - Usunięto komponent `inventory.tsx`
  - Usunięto typ `InventoryItem` z `types.ts`
  - Usunięto funkcje `detectHandouts` i `handoutsToInventoryItems`
  - Zaktualizowano kartę postaci i dokumentację

### 📁 Removed

- `src/components/ui/inventory.tsx`
- `src/components/ui/inventory-modal.tsx`
- `src/components/ui/inventory-item-card.tsx`
- `src/components/ui/inventory-item-detail.tsx`
- `src/lib/handout-detector.ts`
- Związane typy i interfejsy

### 📝 Documentation

- Zaktualizowano wszystkie pliki .md usuwając odniesienia do ekwipunku

---

## [3.5.0] - 2026-01-16

### ✨ Added

- **PDF→Tekst dla lepszych modeli AI** - hybrydowy system plików:
  - Nowy endpoint `/api/pdf/extract-text` używający gemini-2.0-flash
  - Automatyczna ekstrakcja tekstu z PDF po uploadzie
  - Ekstrakcja wieloetapowa (part1/part2) dla dużych dokumentów
  - Retry z exponential backoff dla błędów sieciowych
  - Modele 2.5/3.x używają plików tekstowych, 2.0-flash obsługuje PDF
- **Ulepszony kreator postaci**:
  - Naprawiono obsługę traits (array vs string)
  - Generator portretu uwzględnia erę przygody (nie tylko 1920s)

### 🔄 Changed

- **Hybrydowa selekcja modeli** w `/api/chat/route.ts`:
  - Automatyczne przełączanie na gemini-2.0-flash gdy pliki PDF załączone
  - Preferowanie plików tekstowych dla gemini-2.5-flash/3.x
- **Presety jakości** używają teraz gemini-2.5-flash jako domyślny model
- **Zaktualizowano pdf-memory** o pola `textGeminiFileUri` dla zasad i przygód

### 📁 New Files

- `src/app/api/pdf/extract-text/route.ts` - **NOWY** endpoint ekstrakcji tekstu

### 🐛 Fixed

- Naprawiono błąd `split` na traits gdy AI zwraca tablicę zamiast stringa
- Naprawiono błąd MIME type gdy model 2.5 próbował użyć PDF
- Naprawiono fallback gdy ekstrakcja tekstu nie powiedzie się

---

## [3.4.0] - 2025-12-25

### ✨ Added

- **Lovecraft Style Guide** - kompleksowy przewodnik stylistyczny dla AI Game Mastera:
  - Nowy moduł `src/lib/lovecraft-style-guide.ts` (~600 linii)
  - 6 kategorii słownictwa (horror, architektura, kosmiczne, fizyczne, dźwięki, stan mentalny)
  - Polskie i angielskie tłumaczenia wszystkich terminów
  - 4 wzorce narracyjne (foreshadowing, ineffability, retrospective, gradual revelation)
  - 4 techniki narracyjne (delayed revelation, horror by effect, sensory hierarchy, cosmic perspective)
  - Archetypy lokacji (zdegradowane miasto, nawiedzone lasy, podziemne krypty, krajobrazy obce)
  - Archetypy postaci (zdegenerowani mieszkańcy, szaleni uczeni, istoty kosmiczne, kultyści)
  - Elementy rytuałów i zakazana wiedza (Necronomicon, Great Old Ones, elder races)
  - Checklista stylu dla MG
  - Funkcja `getLovecraftStylePrompt()` generująca prompt-inline w PL/EN
- **Automatyczna Integracja Stylu** - styl Lovecrafta automatycznie dodawany do promptu AI:
  - Modyfikacja `ai-settings.ts` - dynamiczny import modułu
  - Styl aplikowany przed Session Zero i instrukcjami obrazów
  - Hierarchia zmysłów: ZAPACH → DŹWIĘK → DOTYK → WZROK

### 📁 New Files

- `src/lib/lovecraft-style-guide.ts` - **NOWY** moduł stylistyczny

### 📝 Documentation

- Zaktualizowano `DEPENDENCY_MAP.md` - poprawiono nazwę na Zew-App 3.0
- Zaktualizowano `DOCS_INDEX.md` - data i wersja 3.3
- Zaktualizowano `CHANGELOG.md` - nowy wpis 3.4.0

---

## [3.3.0] - 2025-12-25

### ✨ Added

- **Automatyczne Handouty** - AI wykrywa i generuje handouty w narracji:
  - Wycinki prasowe, listy, telegramy generowane przez AI
  - Parser rozpoznaje tagi `[HANDOUT: ...]` z odpowiedzi AI
- **Hot-Seat Multiplayer** - gra dla wielu graczy na jednym ekranie:
  - Nowy komponent `hot-seat-setup.tsx` do konfiguracji graczy
  - `player-switcher.tsx` do przełączania aktywnego gracza
  - Kolorowe obramowania perspektyw w narracji (każdy gracz ma swój kolor)
  - AI generuje intro uwzględniające wszystkich graczy po komendzie "Zaczynamy!"
- **Persystencja Obrazów w Czacie** - wygenerowane obrazy nie znikają po odświeżeniu:
  - Zapis `generatedImages` URL w localStorage wraz z wiadomościami
  - Integracja z `PersistentMediaCache` (IndexedDB)
- **Kolorowe Perspektywy Postaci** - narracja oznaczona tagami perspektywy:
  - Tagi `[PERSPEKTYWA: ImięPostaci]` w odpowiedziach AI
  - Kolorowe obramowania wokół tekstu dotyczącego danej postaci
  - TTS czyta wszystkie perspektywy sekwencyjnie
- **Karty Testów Umiejętności (NOWE!)** - wizualne powiadomienia o testach:
  - Nowy komponent `SkillTestCard.tsx` z pełnymi informacjami o teście
  - AI używa formatu `[TEST: umiejętność | trudność | modyfikatory | uzasadnienie]`
  - Automatyczne pobieranie wartości z karty postaci
  - Przycisk "Rzuć kością" otwiera tacę na kości z wypełnionymi danymi
  - Obsługa wpisywania wyniku w czacie: "wynik 47"
  - Karty wyłączone z TTS (lektor nie czyta mechaniki)
  - Jasne instrukcje rzutu zamiast technicznego "Netto"
- **Menedżer Własnych Przygód (NOWE!)** - wgrywaj własne scenariusze PDF:
  - Upload wielu przygód PDF z automatyczną analizą przez AI
  - Gemini AI ekstrahuje tytuł, erę, lokalizację, motywy, trudność
  - Karty przygód w tym samym stylu co wbudowane
  - Zarządzanie listą przygód (dodawanie, usuwanie)
  - Synchronizacja z Google Cloud Storage

### 🐛 Fixed

- **Kreator Postaci - licznik punktów** - poprawiono UX wyświetlania punktów w kroku 5:
  - Zmieniono mylący format "0 / 280" na czytelny "Pozostało punktów: 280 (wydano 0 z 280)"
  - Liczba główna pokazuje teraz punkty POZOSTAŁE zamiast WYDANYCH

### 🔄 Changed

- **Refaktoryzacja page.tsx** - wyodrębnienie logiki do hooków:
  - `useChat.ts` - logika czatu i parsowania odpowiedzi
  - `useTTS.ts` - obsługa Text-to-Speech
  - `useCharacterManagement.ts` - zarządzanie postaciami
  - `useFullSave.ts` - zapisywanie/wczytywanie stanu gry
  - `usePdfMemory.ts` - obsługa wgranych PDF
- **Domyślne ustawienia HIGH** - zmieniono `qualityPreset` na 'high'
- **Rozszerzony JournalDialog** - przypisanie wpisu do konkretnej postaci
- **Zaktualizowano NarrativeFormatter** - obsługa perspektyw i handoutów

### 📁 New Files

- `src/components/chat/SkillTestCard.tsx` - **NOWY** karta testu umiejętności
- `src/components/ui/hot-seat-setup.tsx` - setup multiplayer
- `src/components/ui/player-switcher.tsx` - przełączanie graczy
- `src/components/ui/adventure-selector.tsx` - wybór przygody
- `src/components/ui/image-lightbox.tsx` - powiększanie obrazów
- `src/hooks/useChat.ts` - hook czatu
- `src/hooks/useTTS.ts` - hook TTS
- `src/hooks/useCharacterManagement.ts` - hook postaci
- `src/hooks/useFullSave.ts` - hook zapisu
- `src/hooks/usePdfMemory.ts` - hook PDF
- `src/hooks/useCustomAdventures.ts` - **NOWY** hook własnych przygód
- `src/app/api/adventure/analyze/route.ts` - **NOWY** API analizy PDF przez Gemini
- `src/lib/handout-detector.ts` - wykrywanie handoutów
- `src/lib/context-collector.ts` - zbieranie kontekstu gry
- `src/lib/game-context.ts` - kontekst dla AI

---

## [3.2.0] - 2025-12-19

### ✨ Added

- **Gemini 3 Flash** - nowy model AI w presecie LOW:
  - 3x szybszy niż Gemini 3 Pro
  - 60-70% tańszy
  - Prawie ta sama jakość (SWE-bench: 78% vs 76.2%)
  - Obsługa thinking levels
- **Persystentne głosy NPC** - głosy zapisywane w localStorage:
  - Profesor Smith zawsze ma ten sam głos (między sesjami!)
  - Nowy serwis `npc-voice-service.ts`
  - Automatyczne przekazywanie głosów do API
- **Ekstrakcja nazw NPC** - parser wykrywa nazwy z kontekstu:
  - "Profesor Smith mówi:" → speaker = "Profesor Smith"
  - "-powiedział Kowalski" → speaker = "Kowalski"
- **Detekcja wieku NPC** - automatyczne przydzielanie głosów:
  - "starzec", "profesor" → male_old
  - "chłopiec", "mały" → male_young
- **50 głosów Chirp3-HD** - rozszerzone pule:
  - 7 głosów męskich (było 4)
  - 8 głosów żeńskich (było 4)
  - 6 głosów starców (było 3)
  - 5 głosów młodych mężczyzn (NOWE!)
  - 5 głosów potworów (było 3)

### 🔄 Changed

- Preset LOW używa teraz `gemini-3-flash` zamiast `gemini-2.5-flash`
- **Preset LOW ma teraz obrazy Replicate** ($0.003/obraz)
- Koszt presetu LOW: ~$1.50/sesja (było ~$2.50)
- **Dodano `imageProvider` do presetów jakości:**
  - LOW → Replicate ($0.003/obraz)
  - MID → Gemini Flash ($0.02/obraz)
  - HIGH → Vertex AI Imagen 3 ($0.04/obraz)
  - ULTRA → Vertex AI Imagen 3 ($0.04/obraz)
- **Ujednolicono definicję "sesji"** w całej dokumentacji: ~3h gry, 40-60 wiadomości AI, 10-20 obrazów
- Zaktualizowano dokumentację: Quality-Presets.md, Go-Online.md, COST_ESTIMATION.md
- Rozszerzono `determineVoiceType()` o kategorię `male_young`

### 📁 New Files

- `src/lib/npc-voice-service.ts` - zunifikowany serwis głosów NPC
- `Go-Online.md` - instrukcja deploymentu
- `Quality-Presets.md` - dokumentacja presetów

---

## [3.1.0] - 2025-12-16

### ✨ Added

- **Kreator Postaci - zgodność z CoC7:**
  - Przycisk "Zastosuj kary wieku" dla postaci 40+ lat (automatyczne odejmowanie S/KON/ZR/WYG)
  - Przycisk "Rzuć test WYK" - mechanika testów rozwoju wykształcenia dla starszych postaci
  - Limit 75% na umiejętności podczas tworzenia (wyjątki: Język Ojczysty, Majętność)
  - Automatyczne ustawienie Język Ojczysty = WYK
  - Dynamiczne obliczanie Unik = ZR/2
  - **Nowy przycisk "🤖 Rozdziel punkty AI"** - automatyczne optymalne rozdzielenie punktów umiejętności

### 🔄 Changed

- **Kreator Postaci - zgodność z Visual_Design.md:**
  - Zamieniono wszystkie hardcoded kolory (amber, red, green, purple, blue) na zmienne CSS
  - Nowy schemat: `primary` (emerald green), `destructive`, `muted`, `foreground`, `border`
  - Pełna zgodność z wytycznymi designu projektu

### 🐛 Fixed

- Naprawiono brak aplikowania modyfikatorów wieku do cech postaci
- Naprawiono niepoprawne wartości bazowe dla Język Ojczysty i Unik

---

## [3.0.0] - 2025-12-15

### ✨ Added

- **Session Zero wpływa na AI** - ton narracji (purist/pulp/noir) i poziom trudności modyfikują odpowiedzi AI
- **YouTube Player** - alternatywa dla Spotify z pełnym sterowaniem głośnością (IFrame API)
- **Portrety postaci** - poprawiono zapis i wyświetlanie w sidebarze i karcie postaci
- **Opisy poziomów trudności** - szczegółowe wyjaśnienia pod każdą opcją
- **Tooltipy dla resetów** - wyjaśnienia co resetuje każdy przycisk

### 🔄 Changed

- **Ujednolicono UI wszystkich okienek** - zamiana 40+ plików z gray-\* na zmienne theme
- **Reorganizacja sidebara** - nowe sekcje: Pomoce Badacza, Ustawienia
- **Nazwanictwo projektu** - zmiana na Zew-App-3.0
- **Zaktualizowano README.md** - nowe funkcje i tabela Session Zero

### 🐛 Fixed

- Naprawiono zapis portraitUrl w character-wizard.tsx
- Naprawiono display poziomów trudności bez opisów
- Poprawiono konsystentność kolorów w całej aplikacji

---

## [2.1.0] - 2025-12-13

### ✨ Added

- **Session Zero Modal** - wizard kalibracji przed grą (era, ton, linie/zasłony)
- **System Walki** - tracker inicjatywy, kości premiowe/karne, głębokie rany
- **System Pościgów** - interfejs z punktami decyzji, timer napięcia
- **System Snów** - automatyczne sny po utracie SAN, generator koszmarów
- **System Rytuałów** - interfejs odprawiania, koszty MP/SAN/HP, efekty uboczne
- **Fobie i Manie** - automatyczne zapisywanie po szaleństwie
- **Multi-Voice TTS** - różne głosy dla narratora i NPC (słuchowisko)
- **TTS Preloading** - zmniejszenie opóźnienia między głosami
- **Persistent Media Cache** - IndexedDB dla obrazów i audio
- **Gemini Vision** - analiza portretów postaci i lokalizacji
- **Generator Wydarzeń Losowych** - endpoint `/api/random-event`
- **Eksport sesji do Markdown** - timeline ze zdjęciami
- **Handout Generator** - wycinki prasowe, listy, dzienniki, telegramy
- **Archetypy NPC** - Świadek Traumatyczny, Kultista, Ofiara Szaleństwa, itp.
- **Kontekst Polski** - realia II RP, polskie lokacje i folklor

### 🔄 Changed

- **Google Imagen** jako główny provider obrazów (Replicate jako fallback)
- Zaktualizowano wszystkie dokumenty `.md` do stanu aktualnego
- Rozszerzono `content-library.ts` o szablony scenariuszy i wydarzeń

### 🐛 Fixed

- Usunięto prefix "MG: Assistant:" z wyświetlania czatu
- Naprawiono display tagów ilustracji w narracji
- Poprawiono Multi-Voice TTS konsystentność głosów

---

## [2.0.2] - 2025-12-10

### ✨ Added

- **Licznik tokenów** - śledzenie zużycia tokenów (sesja, dzisiaj, ogółem)
- Nowa sekcja "🔢 Licznik Tokenów" w panelu ustawień
- **🎵 Ambient Sound System** - system muzyki i dźwięków atmosferycznych:
  - 8 presetów (Mroczny Las, Podziemia, Arkham Nocą, Kosmiczny Horror, itp.)
  - Mikser dźwięków z indywidualną kontrolą głośności
  - Integracja z YouTube dla zewnętrznych playlist
  - Auto-przyciszanie podczas TTS narracji
- **🎭 NPC Voice Profiles** - profile głosów dla postaci:
  - 12 predefiniowanych profili (Stary Uczony, Kultista, Wiedźma, itp.)
  - Auto-przypisanie głosu na podstawie nazwy NPC
  - Integracja z Google TTS
- **📜 Session Timeline** - oś czasu sesji:
  - 10 typów wydarzeń (walka, odkrycie, NPC, poczytalność, itp.)
  - Zakładki i notatki graczy
  - Eksport do Markdown
- **🗺️ Dynamic Scene Cards** - karty scen:
  - 6 predefiniowanych scen Lovecrafta
  - Generowanie obrazów AI dla scen
  - Atmosfery (neutralna, napięta, horror, spokojna, mistyczna)
- **⚔️ Quick Combat Tracker** - szybki tracker walki:
  - Zarządzanie inicjatywą (auto-sortowanie)
  - HP tracker dla PC/NPC/potworów
  - 10 statusów CoC7e (oszołomiony, przerażony, obłąkany, itp.)
  - Import postaci graczy
- **🎮 GM Tools Panel** - panel narzędzi MG integrujący powyższe komponenty

### 🔄 Changed

- **Aktualizacja modeli Gemini** do oficjalnych nazw z API (grudzień 2025):
  - `gemini-3-pro-preview` (najnowszy)
  - `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`
  - `gemini-2.0-flash`, `gemini-2.0-flash-exp`, `gemini-2.0-flash-lite`
  - `gemini-flash-latest`, `gemini-pro-latest` (automatyczne)
- Zaktualizowano cennik modeli w `chat/route.ts`
- Rozszerzono `recordAIRequest()` o parametr `tokens`
- Integracja GMToolsPanel z CthulhuSidebar

### 🐛 Fixed

- Naprawa Google Cloud Storage (Uniform bucket-level access)
- Zmiana uploadu PDF z presigned URL na bezpośredni upload
- Usunięcie `public: true` i `makeFilePublic` (nieobsługiwane z Uniform access)
- Usunięcie `bucket.exists()` i `getFileInfo` checks (wymagały dodatkowych uprawnień)

### 💾 Backups

- `zew-app-backup-20251210-073633` - przed naprawą GCS

---

## [2.0.1] - 2025-10-05

### ✨ Added

- **ARCHITECTURE.md** - nowy, kompleksowy dokument architektury systemu
- **DOCS_INDEX.md** - centralny indeks całej dokumentacji projektu
- **CHANGELOG.md** - śledzenie zmian w projekcie
- Folder `docs/archive/` dla przestarzałej dokumentacji
- dokumentacja.md jako przekierowanie do nowej struktury

### 🔄 Changed

- **Refaktoryzacja systemu ustawień AI** (redukcja o 70% kodu):
  - AISettings interface: z ~970 linii do ~520 linii
  - AISettingsModal: z ~3000 linii do ~900 linii
  - Usunięto 12 nieużywanych pól
  - Zredukowano zagnieżdżenie z 5 do 2 poziomów
- **Aktualizacja dokumentacji:**
  - README.md - pełna aktualizacja funkcjonalności i instrukcji
  - IMPLEMENTATION_GUIDE.md - dodano Replicate API, zaktualizowano stack
  - AUTO_ILLUSTRATION_SYSTEM.md - całkowicie przepisany dla Replicate
  - PROJECT_BRIEF.md - zaktualizowano do obecnego stanu (v2.0)
  - dokumentacja.md - przekierowanie do podzielonej dokumentacji
- **Usprawnienie suwaków w ustawieniach AI:**
  - Wartości min/max po bokach
  - Wyświetlanie aktualnej wartości (bold, kolorowe)
  - Wypełnienie gradientowe (wizualizacja postępu)
  - Poprawiono kontrast (ciemniejsze tło)
  - Większe uchwyty z animacją hover
  - Custom CSS styling w globals.css

### 🗑️ Removed

- Usunięto przestarzałe API z ustawień:
  - ElevenLabs API (nieużywany)
  - Vercel Blob Storage (zastąpiony przez Google Cloud Storage)
- Usunięto zduplikowane ustawienia głosu
- Usunięto zbędne zagnieżdżone struktury konfiguracji

### 🐛 Fixed

- Naprawiono test API Replicate (obsługa `type: 'test'`)
- Naprawiono wszystkie błędy TypeScript po refaktoryzacji
- Naprawiono odwołania do nieistniejących pól w komponentach:
  - `emotionControl` → `pitchControl` i `speakingRate`
  - `imageGeneration` → `replicateSettings`
  - `soundEffects` → usunięto (nieobsługiwane)
  - `elevenLabsEnabled` → `googleTTSEnabled`

### 📦 Archived

- Przeniesiono do `docs/archive/` (przestarzałe dokumenty):
  - NAPRAWA_APLIKACJI_RAPORT.md
  - PLAN_TESTOWANIA_KARTY_POSTACI.md
  - PODSUMOWANIE_TESTOW_KARTY_POSTACI.md
  - PROBLEM_ROZWIAZANY.md
  - PRZEWODNIK_TESTOWANIA_KARTY_POSTACI.md
  - ARCHITECTURE_MIGRATION_REPORT.md
  - PERFORMANCE_COST_ANALYSIS.md
  - VERCEL_BLOB_SETUP.md
  - dokumentacja_legacy.md (stara wersja dokumentacji technicznej)

### 💾 Backups

- `zew-app-backup-2025-10-05T11-20-38` - przed refaktoryzacją ustawień
- `zew-app-backup-2025-10-05T11-48-40` - po pierwszej aktualizacji dokumentacji
- `zew-app-backup-2025-10-05T11-50-12` - po pełnej aktualizacji dokumentacji
- `zew-app-backup-2025-10-05T11-59-46` - **FINALNY** z kompletną dokumentacją

### 📊 Statystyki Refaktoryzacji

- **Kod:**
  - Usunięto ~2200 linii zbędnego kodu
  - Naprawiono 10+ plików z błędami TypeScript
  - 100% code compiles without errors
- **Dokumentacja:**
  - 14 plików .md w głównym katalogu
  - 9 plików przeniesiono do archiwum
  - 5 dokumentów całkowicie przepisanych/zaktualizowanych
  - 3 nowe dokumenty utworzone
- **Testy:**
  - ✅ Wszystkie API testy przechodzą
  - ✅ Build produkcyjny bez błędów
  - ✅ TypeScript validation passed

---

## [2.0.0] - 2025-09-28

### ✨ Added

- Pełna integracja z Google Cloud Storage
- System Google Cloud Text-to-Speech
- Generowanie obrazów przez Replicate API
- System backupów z manifest tracking
- Zaawansowane ustawienia AI (6 sekcji)

### 🔄 Changed

- Migracja z Vercel Blob na Google Cloud Storage
- Migracja z ElevenLabs na Google TTS
- Przeprojektowanie interfejsu ustawień AI

### 🗑️ Removed

- Vercel Blob integration
- ElevenLabs integration (zamienione na Google TTS)

---

## [1.x] - 2025-09 i wcześniej

### ✨ Features

- System kart postaci (CoC7)
- Chat AI z Gemini
- System kości RPG
- Dziennik przygody
- System kampanii
- Podstawowy system głosowy (ElevenLabs)
- Przechowywanie lokalne i Vercel Blob

---

## Legenda

- ✨ **Added** - nowe funkcjonalności
- 🔄 **Changed** - zmiany w istniejących funkcjonalnościach
- 🗑️ **Removed** - usunięte funkcjonalności
- 🐛 **Fixed** - poprawki błędów
- 🔒 **Security** - poprawki bezpieczeństwa
- 📦 **Archived** - przeniesione do archiwum
- 💾 **Backups** - utworzone backupy
- ⚠️ **Deprecated** - funkcje do usunięcia w przyszłości
