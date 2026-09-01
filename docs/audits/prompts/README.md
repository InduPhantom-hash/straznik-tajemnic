# Audyt promptów, epoki i preflightu

Data baseline: 2026-09-01.

## Zakres znaleziony w runtime

Prompty i ich składanie występują w następujących grupach:

- narracja i pamięć: `src/app/api/chat/`, `src/lib/prompts/`, `src/lib/ai-settings/`, `src/lib/conversation-summarizer.ts`, `src/lib/auto-summary-service.ts`;
- setup i przygody: `src/app/api/adventure/`, `src/lib/pdf/adventure-extractor.ts`, `src/app/api/adventure-creator/route.ts`;
- postacie i NPC: `src/lib/data/character/field-prompts.ts`, `src/lib/character-portrait-generator.ts`, `src/app/api/npc/`;
- lokacje i obrazy: `src/app/api/imagen/route.ts`, `src/app/api/vertex-imagen/route.ts`, `src/app/api/replicate-image/route.ts`, `src/app/api/flux-kontext/route.ts`, `src/lib/location-era-validator.ts`;
- ekwipunek: `src/lib/equipment-prompt-builder.ts`, `src/app/api/equipment/`;
- dziennik, handouty i podsumowania: helpery czatu, `src/app/api/session/cliffhanger/route.ts`, `src/app/api/summarize-scene/route.ts`.

## Wdrożony fundament

- `EraManifestV1` obejmuje kontekst ekonomiczny, klasowy, polityczny, wykluczenie, role płciowe i prawa, technologię, prawo, obyczaje, zawody, komunikację, transport, architekturę, wiedzę epoki, język, kierunek wizualny, zakazy, prezentyzm i źródła.
- `HistoricalSourceRef` zapisuje zaufanie, URL, datę, hash, prawa i status weryfikacji.
- `VisualSceneSpec`, `SetupPhaseResult` i `WorldSetupBundleV1` mają typy, walidację i testy.
- Analiza PDF odrzuca wynik bez roku i kraju. Własny scenariusz z zakresem lat wymaga wybrania jednego dokładnego roku w selektorze przed startem.
- Start gry uruchamia `/api/adventure/setup` przed pierwszym czatem, blokuje krytyczne błędy i zapisuje zatwierdzony `WorldSetupBundleV1` jako kanon sesji.
- `worldSetup` jest opcjonalne w save, odtwarzane przy load i zgodne ze starym formatem.
- `/api/imagen` przyjmuje `VisualSceneSpec`, kompiluje relacje przestrzenne i odrzuca sprzęt biurowy we wnętrzu samochodu.
- Endpoint obrazów nie ma już własnego cichego fallbacku do 1920. Legacy caller musi podać jawną epokę.
- Siedem manifestów istnieje jako `draft`. Nie udają zatwierdzonych źródeł historycznych.

## P0 - pozostałe ciche fallbacki

- Centralne endpointy czatu, setupu, analizy PDF, opisu dokumentu, wzbogacania przedmiotu i generowania NPC wymagają dokładnego `ResolvedEraContext` i nie ustawiają już epoki 1920 przy braku danych.
- Callery UI i hooki nadal potrafią ustawić profil `1920s`, gdy brak kontekstu: `useChat`, `use-media-cache`, kreator postaci, menedżer NPC, menedżer lokacji i sidebar. Endpointy wymagające dokładnego kontekstu odrzucą taki niepełny request, ale te callery wymagają osobnej migracji prezentacji i cache.

Tych fallbacków nie wolno usuwać mechanicznie. Każda ścieżka musi najpierw otrzymać `ResolvedEraContext`, a test ma dowieść braku regresji setupu, save i istniejących przygód.

## Research online

Adapter Google Search działa wyłącznie w `/api/adventure/setup`. Rejestr zaufania przepuszcza źródła zatwierdzonych domen, nowe domeny zapisuje w kwarantannie, a cache zapobiega ponownemu researchowi tego samego roku i regionu w jednym procesie. Brak researchu lub brak wyłącznie zaufanych źródeł daje `degraded` i neutralny fallback. Czat sesji nie wykonuje researchu online.

## Braki przed akceptacją

- źródła historyczne dla siedmiu manifestów,
- jawny wybór roku dla szerokich zakresów wbudowanych scenariuszy, w tym `1983-1999` w Traszynie,
- przepisanie czterech anachronicznych postaci `Cienia nad Prabutami` na mieszkańców PRL 1973-1974,
- migracja pozostałych callerów UI i cache z profilu `1920s` na `ResolvedEraContext`,
- centralne wstrzyknięcie manifestu do pozostałych promptów PL i EN,
- płatny test finalnego obrazu po zgodzie PO.
