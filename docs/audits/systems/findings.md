# Ustalenia audytu systemów

Data: 2026-09-01. Audyt statyczny, bez usuwania plików i bez zmian runtime w ramach tej karty.

## P0

### P0-1: deklarowana lokalność nie odpowiada aktywnej konfiguracji

- Wpływ: PDF, pamięć, obrazy lub ustawienia mogą wejść w ścieżkę GCS mimo opisu produktu jako lokalnego.
- Dowód: `src/lib/ai-settings/defaults.ts` ustawia `googleCloudStorageEnabled: true`; istnieją endpointy GCS, cloud session i upload PDF.
- Właściciel: ustawienia i storage.
- Bramka naprawy: świeży profil bez env nie wykonuje żadnego requestu GCS; lokalny PDF, save, obrazy i RAG działają bez chmury.

### P0-2: źródło encyklopedii Mythos istnieje wyłącznie w wrapperze

- Wpływ: runtime uruchomiony lub spakowany samodzielnie nie potrafi odbudować namespace `mythos`.
- Dowód: `scripts/embed-mythos.ts` czyta `../../../../data/epochs/lovecraft-mythos/dictionary_wiki.json`; runtime nie ma `data/epochs/lovecraft-mythos`.
- Właściciel: lokalny RAG i build danych.
- Osobna karta naprawcza: `package-mythos-data`, status `intake`, ryzyko `high` z powodu praw do danych i wpływu na paczkę.
- Bramka naprawy: runtime ma jawnie paczkowane źródło albo gotowy indeks wraz z licencją, hashem i testem uruchomionym z katalogu paczki.

## P1

### P1-1: graf Graft nie jest żywym grafem runtime

- Dowód: `graft/.graph/wiring.json` ma 203 węzły i 377 krawędzi, commit z 2026-08-24, a indeks opisuje 58 plików i stare skrypty patchujące. Polecenie `graft` nie jest dostępne w PATH.
- Wpływ: graf nie może potwierdzić obecnych zależności runtime.
- Bramka: odtworzenie grafu z `_tester/_base/.silnik`, test świeżości i komenda CI porównująca fingerprint.

### P1-2: dokumentacja ma dwa źródła

- Dowód: root i runtime mają różne hashe `ARCHITECTURE.md` oraz `TESTING.md`; `USER_GUIDE.md` i ADR-y są identycznymi kopiami.
- Wpływ: poprawka może trafić tylko do jednej kopii.
- Bramka: root `docs/` jest źródłem, runtime kopiuje wymagane pliki w prebuild albo nie pakuje kopii.

### P1-3: Pinecone i GCS pozostają w aktywnym kodzie

- Dowód: zależność `@pinecone-database/pinecone`, typy i klucze Pinecone, endpoint nazwany `index-to-pinecone`, cloud-context, GCS service i kilka endpointów upload/cloud.
- Wpływ: niejasna granica prywatności, większa powierzchnia błędów i martwe konfiguracje.
- Bramka: osobna karta usuwa elementy dopiero po teście call graph i migracji starych save'ów.

### P1-4: kandydaci na martwe endpointy

Statyczne wyszukiwanie nie znalazło callerów dla 12 endpointów:

- `/api/adventure-creator`
- `/api/adventure/setup`
- `/api/ai/gemini`
- `/api/analyze-image`
- `/api/gcs/configure-cors`
- `/api/immersion/daylight`
- `/api/immersion/historical-news`
- `/api/immersion/npc-identity`
- `/api/npc/generate-rich`
- `/api/pdf/extract-text`
- `/api/session/cliffhanger`
- `/api/vertex-imagen`

To kandydaci, nie zgoda na usunięcie. Dynamiczne callery i testy runtime trzeba sprawdzić osobno.

### P1-5: stan gry jest rozproszony między magazyny

- Dowód: localStorage przechowuje czat, postacie, flagi setupu i ustawienia; IndexedDB przechowuje obrazy i przygody; dysk przechowuje save, journal i RAG; część legacy używa GCS.
- Wpływ: save/load może nie objąć stanu zapisanego poza `FullGameSave`.
- Bramka: test restartu aplikacji porównuje pełny stan przed zapisem i po restore.

### P1-6: koszty mają trzy implementacje

- Dowód: `cost-event-emitter.ts`, `ai-cost-tracker.ts` i `ai-settings/cost-control.ts` zapisują powiązane dane w localStorage.
- Wpływ: panel może pokazywać inne liczby niż limiter lub telemetria.
- Bramka: jeden ledger zdarzeń i test zgodności panelu, limitu oraz save.

## P2

- Rejestr nawigacji ma 31 węzłów i 30 akcji, ale kod nadal utrzymuje równoległe strony locale/non-locale.
- Tylko 6 z 53 endpointów ma test obok `route.ts`; inne testy mogą istnieć wyżej, ale pokrycie kontraktów endpointów nie jest jawne.
- `MAPA-POWIAZAN.md` zawierała nieistniejące ścieżki i plany jako źródła prawdy. Zastępuje ją mapa runtime.
- Domyślne ustawienia zawierają historyczne opcje providerów, które nie odpowiadają jednej ścieżce wykonania.

## Dowody pozytywne

- `navigation:check`, pełny Jest i TypeScript przeszły podczas preflightu wyposażenia 2026-09-01.
- Lokalny store ma atomowy zapis temp plus rename i testy namespace.
- Save zachowuje kompatybilność v0.9.3 oraz opcjonalny `worldSetup`.
- Mechanika rzutów pozostaje w kodzie, a narracja otrzymuje wynik.
