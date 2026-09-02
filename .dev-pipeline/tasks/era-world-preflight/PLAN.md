# Manifesty epok, audyt promptów i preflight świata

## Cel

Zbudować jeden kontrakt realiów historycznych i wersjonowany preflight przygody, który eliminuje ciche domysły epoki, utrwala kanon w save i chroni prompty narracyjne oraz wizualne przed anachronizmami i błędami kompozycji.

## Zakres

- Zinwentaryzować prompty narracji, setupu, PDF, NPC, lokacji, portretów, przedmiotów, dziennika i obrazów w PL i EN.
- Każda ścieżka otrzymuje jeden `ResolvedEraContext`. Własny scenariusz bez dokładnego roku i kraju nie przechodzi krytycznej bramki setupu.
- `EraManifestV1` obejmuje: zakres lat, dokładny rok i region, ekonomię, strukturę społeczną i klasową, politykę, rasizm i wykluczenie, role płciowe oraz ograniczenia praw i zawodów, technologię, prawo, obyczaje, zawody, komunikację, transport, architekturę, wiedzę epoki i jej ograniczenia, język, kierunek wizualny, zakazy, ryzyka prezentyzmu i źródła.
- `HistoricalSourceRef` zapisuje poziom zaufania, URL, datę pobrania, hash, prawa użycia i status weryfikacji.
- `VisualSceneSpec` zapisuje temat, miejsce, relacje przestrzenne, rekwizyty, postacie, epokę, wyjątek Mythos i zakazy.
- `WorldSetupBundleV1` zapisuje wersjonowany graf przygody, frakcje, NPC, lokacje, przedmioty, wydarzenia, szczegółowe otwarcie, najbliższe odnogi, dane PDF, źródła, braki i wyjątki.
- `SetupPhaseResult` ma status `pending`, `running`, `passed`, `degraded` albo `failed`, koszt, czas i możliwość ponowienia jednej fazy.
- Manifesty startowe: Wielka Brytania 1890s, USA 1920s, Polska 1973-74, Polska 1980s, Polska 1990s, Polska 2000-05 i współczesność.
- Szeroki zakres wymaga wyboru dokładnego roku podczas setupu.
- Hierarchia prawdy: dokładny rok i region, zatwierdzony manifest, lokalna encyklopedia/RAG, zatwierdzony cache online, jawna nakładka scenariusza, jawny wyjątek Mythos lub anomalia czasu.
- Brak wiedzy daje neutralny opis bez marki i niepewnego szczegółu.
- Research online działa tylko w preflight, zapisuje metadane uziemienia i respektuje rejestr zaufania. Nowe domeny i sprzeczności trafiają do kwarantanny.
- Krytyczny błąd epoki, zasad, grafu lub postaci blokuje start. Brak opcjonalnego researchu lub assetu daje `degraded` i neutralny fallback.
- `worldSetup` jest opcjonalnym polem save'a, aby zachować zgodność z v0.9.3.
- Regresja samochodu blokuje specyfikację, w której sprzęt biurowy znajduje się na desce rozdzielczej lub wnętrze samochodu jest opisane jak biuro.

## Fazy implementacji

1. Audyt promptów i fallbacków z raportem ścieżek runtime.
2. Typy, walidatory i siedem manifestów z testami.
3. Centralny kompilator kontekstu promptu i `VisualSceneSpec`.
4. Orkiestrator faz preflightu oraz zapis `WorldSetupBundleV1`.
5. Migracja save/load i test zgodności v0.9.3.
6. Adapter Google Search obecnego `@google/genai`, rejestr zaufania, cache i kwarantanna.
7. Integracja setupu i krytycznych bramek.
8. Hermetyczna regresja promptu i osobny płatny test obrazu po zgodzie PO.

## Walidacja

- Testy schematów odrzucają brak roku, kraju, wersji i źródeł wymaganych przez daną fazę.
- Testy promptów skanują wszystkie ścieżki pod kątem niejawnego `1920`.
- Test save/load wczytuje fixture v0.9.3 i nowy save z `worldSetup` bez utraty danych.
- Test adaptera dowodzi, że research nie jest wywoływany podczas rozmowy.
- Test samochodu odrzuca sprzeczne relacje przestrzenne przed wywołaniem modelu obrazowego.
- Płatny test API i akceptacja finalnego obrazu pozostają osobną bramką PO.

## Kryteria akceptacji

- EraManifestV1, HistoricalSourceRef, VisualSceneSpec, WorldSetupBundleV1 i SetupPhaseResult mają walidowane typy i testy
- Własny scenariusz bez dokładnego roku i kraju nie przechodzi krytycznej bramki setupu
- WorldSetupBundleV1 zapisuje się opcjonalnie w save i stare save v0.9.3 pozostają zgodne
- Prompty nie używają cichego fallbacku do 1920, a scena samochodu ma hermetyczną regresję kompozycji
- Research online działa wyłącznie w preflight i nie blokuje startu, gdy dostępny jest neutralny fallback
