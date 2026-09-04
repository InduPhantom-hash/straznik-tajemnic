# Katalog systemów Strażnika Tajemnic

Stan na 2026-09-01. Ten dokument opisuje faktyczny runtime w `_tester/_base/.silnik`.
Dokumentacja w root `docs/` jest źródłem prawdy. Kopie w runtime nie są źródłem prawdy.

## Statusy

- `stable` - ma jedno źródło prawdy i działające bramki.
- `partial` - działa, ale ma rozproszone dane, fallbacki albo niepełne testy.
- `debt` - zawiera aktywny relikt, konflikt źródeł prawdy albo ścieżkę bez właściciela.
- `draft` - fundament istnieje, lecz integracja nie jest skończona.

## Katalog

| System | Odpowiedzialność i wejście | Źródło prawdy i storage | Kod, AI, RAG i fallback | Testy, stan i dług |
|---|---|---|---|---|
| Launcher i build | Uruchomienie Next.js jako aplikacji macOS. `desktop/launcher.sh`, `desktop/build-app.sh`. | Runtime `_tester/_base/.silnik`, dane użytkownika przez `ZEW_DATA_DIR`. | Kod. Health przez `/api/desktop/cold-start`. | Build działa. `partial`: wrapper i runtime mają osobne skrypty desktopowe. |
| Onboarding | Wybór języka, kluczy i pierwszego uruchomienia. `/welcome`, komponenty `onboarding/`. | `language_selected`, ustawienia i flagi w `localStorage`. | Kod, bez RAG. Fallback do PL istnieje w części starych ścieżek. | E2E i18n. `partial`: istnieją równoległe strony lokalizowane i nielokalizowane. |
| Języki | PL i EN w UI i przepływach gry. | `messages/pl.json`, `messages/en.json`, `next-intl`. | Kod i słowniki. | Walidator wiadomości, E2E. `partial`: dwa drzewa routingu zwiększają ryzyko driftu. |
| Klucze API | BYOK dla Gemini i opcjonalnych providerów. Modal `ApiKeysModal`. | `api-keys-service.ts`, `localStorage`, fallback serwerowy do env. | Kod. Nagłówki `X-*-Api-Key`. | Testy storage i endpointów. `debt`: nadal istnieje klucz Pinecone oraz wiele źródeł konfiguracji. |
| PDF | Parsowanie zasad i przygód, tworzenie chunków. UI ustawień PDF i upload przygody. | Lokalny plik wejściowy, `pdf-parser-service`, `pdf/adventure-extractor.ts`. | Kod plus Gemini do analizy i embeddingów. | Testy `ingest-local`. `debt`: równolegle istnieją lokalne, GCS i stare endpointy parse/upload. |
| Lokalny RAG | Indeks zasad, przygód, Mythos i pamięci. | `vector-db/local-vector-store.ts`, `data/rag`, `RAG_DATA_DIR`. | Embedding Gemini, wyszukiwanie cosine i BM25. Brak trafienia ma dać neutralny wynik. | Testy store i retrieval. `debt`: nazwa endpointu Pinecone oraz źródło Mythos wyłącznie w wrapperze. |
| Przygody | Presety i własne scenariusze. Selektor przygody. | `adventures-data.ts`, wygenerowany katalog i `custom-adventures-storage.ts`. | Kod, AI analizuje PDF. IndexedDB primary, localStorage fallback. | Testy storage i E2E. `partial`: kilka endpointów analizujących ten sam materiał. |
| Setup świata | Budowa otwarcia, postaci i kontekstu przygody. | `/api/adventure/setup`, `WorldSetupBundleV1`. Save zawiera opcjonalne `worldSetup`. | Kod waliduje, Gemini przygotowuje treść. | Testy walidacji i save. `draft`: brak pełnego grafu kanonu i retry faz. |
| Epoki | Rok, region, manifest i reguły wizualne. | `ResolvedEraContext`, `src/lib/era`, drafty `EraManifestV1`. | Kod wybiera kontekst, AI dostaje gotowe ograniczenia. | Testy epoki. `draft`: wiele ścieżek nadal ma fallback 1920. |
| Postacie | Presety, kreator, karta i rozwój. | `predefined-characters.ts`, `strefa-11-characters.ts`, `types.ts`. Roster w localStorage, obrazy w IndexedDB. | Kod ustala statystyki, AI może tworzyć opis. | Testy presetów, kreatora i save. `partial`: cztery postacie Prabut wymagają przepisania na 1973-1974. |
| Hot Seat | Przypisanie do dwóch graczy i wspólny start. | `src/lib/hot-seat`, `useGameStart`, zapis przypisań w save. | Kod. | Testy przypisań i E2E. `partial`: część stanu przechodzi przez tymczasowe klucze localStorage. |
| Narracja | Streaming MG, kontekst, tagi mechaniczne i kontynuacja. | `/api/chat`, helpery pipeline, domyślny prompt MG. | Gemini opowiada. Kod ustala stan, RAG dostarcza wiedzę. | Liczne testy helperów i E2E. `partial`: prompty i fallbacki epoki są rozproszone. |
| Pamięć rozmowy | Skróty, chunki i retrieval poprzednich scen. | `vector-db/conversation-memory.ts`, local RAG, pola wiadomości w save. | Kod, embeddingi i AI summarization. | Testy streamu i pamięci. `debt`: pozostały ścieżki cloud-context/GCS obok lokalnego store. |
| Mechanika | Kości, progi, broń, SAN, PŻ i rozwój. | `dice-utils.ts`, `skill-test-resolver.ts`, `combat/`, `economy/`. | Kod jest właścicielem wyniku. AI tylko opisuje. | Testy jednostkowe. `stable` dla rzutów, `partial` dla rozproszonych tagów narracji. |
| Ekwipunek | Zestawy startowe, katalog, mechanika i obrazy. | `equipment-data.ts`, `equipment-catalog.ts`, `predefined-equipment.ts`. | Kod wybiera zestaw. AI nie ustala ceny ani mechaniki. Katalog używa WebP lub ikony. | Testy katalogu, hooka i endpointu. `partial`: 80 nazw bez wzorca i brak pełnej produkcji assetów. |
| Obrazy | Sceny, NPC, portrety, przedmioty i cache. | `/api/imagen`, `VisualSceneSpec`, `use-media-cache`, IndexedDB. | Gemini Image, Replicate/Vertex jako pozostałe adaptery. Lokalny fallback dla katalogu. | Testy promptów i cache. `debt`: kilka providerów i legacy GCS równolegle. |
| TTS | Narrator i głosy NPC. | `useTTS.ts`, provider w `voiceSettings`, endpointy TTS. | Gemini, Google TTS, ElevenLabs. Fallback providera. | Testy hooka i endpointów. `debt`: trzy rodziny endpointów i historyczne ustawienia. |
| Dziennik | Kronika, odkrycia, encyklopedia i wpisy rzutów. | `session-journal.tsx`, `journal/`, `journal-storage.ts`. | Kod mapuje tagi narracji na wpisy. | Testy mapowania. `partial`: storage dyskowy i stan postaci wymagają jednego kontraktu. |
| Tablica Badacza | Węzły, połączenia, lightbox i trwałość. | `corkboard-investigation-board.tsx`, `Character.investigatorBoard`. | Kod, obrazy z istniejących wpisów. | Testy UI. `partial`: zależy od spójności typów Dziennika. |
| Save/load | Pełny zapis, migracje, obrazy i restore. | `full-game-save-manager.ts`, `/api/game-save`, `data/saves`, metadata w localStorage. | Kod. Stare save bez `worldSetup` pozostają zgodne. | Testy v0.9.3 i worldSetup. `partial`: część bieżącego stanu nadal żyje poza save w osobnych kluczach. |
| GM Tools | NPC, lokacje, inicjatywa, zdarzenia i synchronizacja. | `gmTools` w AI settings oraz komponenty managerów. | Kod plus AI dla treści NPC i zdarzeń. | Nierówne pokrycie. `debt`: endpoint `/api/gm-tools/sync` nie ma potwierdzonego callera. |
| Ustawienia | Modele, jakość, TTS, obrazy, pamięć i koszty. | `src/lib/ai-settings/`, localStorage. | Kod, ustawienia sterują providerami. | Testy storage. `debt`: deprecated `ai-settings.ts`, legacy Pinecone i GCS w domyślnych ustawieniach. |
| Koszty | Limity, tokeny i ceny wywołań. | `cost-event-emitter.ts`, `ai-cost-tracker.ts`, `ai-settings/cost-control.ts`. | Kod. | Testy częściowe. `debt`: trzy liczniki i różne klucze localStorage bez jednego właściciela. |
| Telemetria | Metadane wywołań, błędy i opcjonalne statystyki produktu. | `telemetry.ts`, `monitoring.ts`, `posthog.tsx`, opcjonalny Sentry. | Kod, bez treści narracji według kontraktu. | Testy helperów. `partial`: dokumentacja musi jawnie odróżniać telemetrię lokalną od PostHog/Sentry. |
| Nawigacja | Trasy, modale i przejścia. | `navigation/navigation-registry.json`, generowany `docs/NAVIGATION_MAP.md`. | Kod i generator. | `navigation:check`, `navigation:guard`, E2E. `stable` jako rejestr, `partial` przez podwójne strony locale/non-locale. |
| Pomoc | Instrukcje UI, zasady i onboarding gracza. | `help-modal/`, `app-help-data.ts`, root `docs/USER_GUIDE.md`. | Kod i statyczne treści. | Testy i18n. `partial`: runtime ma kopię dokumentacji bez mechanizmu generowania. |
| Aktualizacje i backup | Backup danych, wersja i przyszła aktualizacja aplikacji. | `backup.mjs`, launcher, docelowo manifest GitHub Releases. | Kod. | Build i ręczny restore. `draft`: brak pełnego, przetestowanego update/rollback. |

## Właściciele źródeł prawdy

- Stan mechaniczny i zapis gry: kod TypeScript oraz `FullGameSave`.
- Wiedza z PDF: lokalny RAG na dysku, nie Pinecone ani GCS.
- Epoka: `ResolvedEraContext` i zatwierdzony manifest.
- Nawigacja: `navigation-registry.json`, a mapa Markdown jest generowana.
- Dokumentacja: root `docs/`.
- Assety katalogowe: `public/equipment/catalog` i `equipment-catalog.ts`.

