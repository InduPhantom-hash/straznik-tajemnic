# Session Notes

## Podsumowanie sesji: 2026-07-21 (Etap 3: Wdrożenie Tablicy Badacza / Investigator Evidence Board)
Branch: main

### Co zrobiono
- **Typy i Model danych Tablicy Badacza:** Stworzono `src/types/investigator-board.ts` określający strukturę węzłów (`EvidenceNode`), krawędzi (`EvidenceRelation`) oraz statusów pewności faktów (`confirmed`, `hypothesis`, `refuted`).
- **Lokalne Storage & API Dziennika:** Utworzono helper `src/lib/journal-storage.ts` zapewniający bezpieczny zapis JSON w `data/journals/` bez Path Traversal oraz automatyczną konwersję notatek `JournalEntry`. Przebudowano `/api/journal/route.ts` na czysty zapis plikowy, całkowicie eliminując powiązania z `GoogleCloudStorage`.
- **Wizualna Tablica Badacza:** Zbudowano komponent `InvestigatorBoard.tsx` (stylizowany w klimacie korkowej tablicy ze szpilkami, kartami dowodów w 5 typach oraz czerwonymi sznurkami śledczymi w SVG).
- **Zintegrowanie z Dziennikiem (`SessionJournal.tsx`):** Osadzono Tablicę Badacza jako pierwszą, domyślną zakładkę ("📌 Tablica Badacza"). Naprawiono odwołanie do `activeCharacter`.
- **Testy i Weryfikacja:** Dodano testy jednostkowe `investigator-board.test.tsx` (116/116 Jest PASS), kompilację TypeScript oraz produkcyjny build Next.js (`npm run build` - 61/61 wygenerowanych stron).
- **Aktualizacja Trackerów:** Zaktualizowano `docs/ROADMAP-MECHANIKI-AI.md` oraz `_pamiec/aktualny.md`.

### Co otwarte (do następnej sesji)
- Przeprowadzenie manualnych testów w przeglądarce pod kątem naciągania połączeń między dowodami na tablicy.
- Dalsze rozszerzenia Etapu 3 (podgląd map z ekwipunku).

### Decyzje podjęte
- Wyeliminowanie GCS na rzecz lokalnego zapisu plikowego w `data/journals/`.
- Domyślne otwieranie Dziennika na zakładce Tablicy Badacza dla maksymalnej immersji detektywistycznej.
Branch: main

### Co zrobiono
- **Ekstrakcja Przygody z PDF (Gemini 3.6 Flash):** Zbudowano dwuetapowy pipeline wspierany dzisiejszym modelem `gemini-3.6-flash` (`src/lib/pdf/adventure-extractor.ts`).
- **Zapewnienie czystej struktury JSON:** Wyekstrahowane dane zawierają precyzyjne mapowanie NPC (z maską i ukrytym celem), lokacji (z atmosferą i keyClues) oraz rekwizytów (z treścią dokumentów `readContent`).
- **Lokalny zapis przygody:** Wyekstrahowany JSON jest automatycznie zapisywany w `data/adventures/{adventureId}.json` po zasileniu lokalnego RAG w `/api/pdf/ingest-local`.
- **Baseline Gemini 3.6 Flash:** Zaktualizowano domyślny model i presety kosztowe w `model-registry.ts` na `gemini-3.6-flash`.
- **Weryfikacja:** Pomyślnie wykonano kompilację produkcyjną `npm run build` (61/61 stron). Zaktualizowano `state.md` oraz roadmapę.

### Co otwarte (do następnej sesji)
- Etap 3 (Tablica Badacza): Wykorzystanie plików `data/adventures/{adventureId}.json` do automatycznego zasilania grafu dowodów, poszlak i relacji.

### Decyzje podjęte
- Użycie Gemini 3.6 Flash jako domyślnego modelu dla całej aplikacji oraz silnika strukturyzacji z uwagi na premierę API (21.07.2026), 17% mniejsze zużycie tokenów i wysoką precyzję JSON schema.

Branch: main

### Co zrobiono
- **Zdiagnozowano i naprawiono zawieszanie/przerywanie uploadu PDF** na etapie Zasad i Przygód (problem zgłoszony na pliku 8 MB starter).
- **Gemini File API (Polling)**: Wdrożono pętlę pollingującą stan `ACTIVE` dla przesłanych plików PDF w `uploadNativePDFToGemini` w `_tester/_base/.silnik/src/lib/gemini-file-service.ts`.
- **Throttling Embeddingów**: Dodano bezpieczne opóźnienie (50ms co 5 chunków) w pętli `indexTexts` w `_tester/_base/.silnik/src/lib/vector-db/indexing-service.ts`, wyeliminowawszy przekraczanie rate-limitów HTTP API przy indeksowaniu lokalnym.
- **Weryfikacja**: Pomyślnie przebudowano całą aplikację za pomocą `npm run build` (61/61 stron wygenerowano poprawnie). Zaktualizowano `issues.md` oraz `state.md`.

### Co otwarte (do następnej sesji)
- Kontynuacja Etapu 2 (Lokalny Pipeline Przygody): Rozszerzona ekstrakcja z PDF do JSON (NPC, lokacje, mapy, przedmioty fabularne).

### Decyzje podjęte
- Polling stanu pliku w Gemini jest niezbędny przed zwróceniem fileUri do gracza, aby uniknąć błędów przy zapytaniach próbujących odwoływać się do pliku w stanie `PROCESSING`.


Branch: main

### Co zrobiono
- **Master Prompt:** Przepisano zasady walki w `public/default-gm-prompt.md` pod kątem Cinematic Combat i ukrytej, automatycznej inicjatywy opartej na logike sytuacji przestrzennej i statystykach badacza.
- **Sesja Zero:** Zaktualizowano `session-zero-instructions.ts` w celu wstrzykiwania reguł kinowej walki i ukrytej inicjatywy dla trybów narracyjnych (`full_rpg`, `story_priority`, `pure_narrative`).
- **Aktualizacja Roadmapy:** Zaktualizowano priorytety prac w `docs/ROADMAP-MECHANIKI-AI.md` (1. Izolacja przygód, 2. Tablica Badacza, 3. System aktualizacji, 4. STT i i18n Nice to have).
- **Synchronizacja i Weryfikacja:** Zsynchronizowano prompt z katalogiem testowym, pomyślnie zaliczono 111 testów Jest i produkcyjny build (61/61 stron).

### Co otwarte (do następnej sesji)
- Faza 1 z Etapu 2 (Roadmapa): Implementacja stabilnego identyfikatora przygody (`adventureId`) oraz izolacja namespace w lokalnym RAG.

### Decyzje podjęte
- Rezygnacja z wprowadzania skomplikowanych suwaków i przełączników mechaniki tempa w UI w celu zachowania prostoty i płynności gry (storytelling over power gaming).

## Podsumowanie sesji: 2026-07-20 (Dokończenie Etapu 2A)
Branch: `feature/immersion-context-injection`

### Co zrobiono
- Zastąpiono chmurowe wywołanie `/api/pdf/index-to-pinecone` w `useFirstRun.ts` lokalnym endpointem `/api/pdf/ingest-local`.
- Wdrożono metodę `GET` w `/api/pdf/ingest-local/route.ts` zwracającą statystyki indeksu zasad i przygody offline.
- Dodano testy jednostkowe metody GET do `route.test.ts`.
- Pomyślnie zweryfikowano wszystkie 104 testy Jest i kompilację TypeScript.

### Co otwarte (do następnej sesji)
- Faza 2 i 3 z plans/etap-2a-lokalny-pipeline-pdf-plan.md: eliminacja potencjalnych wyścigów w `usePdfMemory.ts` i wdrożenie bezpiecznej kolejki embeddingów.

### Decyzje podjęte
- Wyeliminowanie starego odpytywania o Pinecone na rzecz ujednoliconego GET `/api/pdf/ingest-local`.

## Podsumowanie sesji: 2026-07-20
Branch: `feature/session-end-flow`

### Co zrobiono
- Dodano PROTOKÓŁ KONIEC SESJI do Master Promptu.
- Zaktualizowano backend (run-chat-pipeline.ts) o wstrzykiwanie instrukcji końca sesji.
- Zaktualizowano hook useChat.ts o detekcję tokenu [KONIEC_SESJI:POTWIERDZENIE] i flagę isSessionEnded.
- Zaktualizowano UI (sidebar, input, page) o wyłączenie czatu, baner informacyjny i automatyczny zapis.
- Pomyślnie wykonano wszystkie testy (73/73).

### Co otwarte (do następnej sesji)
- Wybór kolejnego etapu z roadmapy (np. Etap 2 - lokalny pipeline przygody i czyszczenie wywołań Pinecone).

### Decyzje podjęte
- Użycie deterministycznego tokena technicznego [KONIEC_SESJI:POTWIERDZENIE] w celu wykrycia końca sesji przez klienta.

## Podsumowanie sesji: 2026-07-20 (Sesja 14)
Branch: main

### Co zrobiono
- **Audyt dokumentacji**: Zweryfikowano wszystkie pliki `.md` i zaktualizowano `SECURITY.md` (zastąpienie wzmianek o chmurowym Pinecone w pełni lokalnym RAG Float32).
- **Synchronizacja promptu**: Zsynchronizowano plik `default-gm-prompt.md` silnika testowego z wersją produkcyjną (czysty `diff -u`).
- **Utworzenie Mapy Powiązań**: Dodano dokument [MAPA-POWIAZAN.md](file:///Volumes/Karta/Developer/straznik-tajemnic/docs/MAPA-POWIAZAN.md) łączący instrukcje z kodem TypeScript (`src/`) oraz linki w `README.md` i `docs/ARCHITECTURE.md`.
- **Aktualizacja README i wersji**: Podniesiono wersję do `v0.9.1-beta` w [README.md](file:///Volumes/Karta/Developer/straznik-tajemnic/README.md), dodano sekcję `Change Log` na dole, zintegrowano angielskie tłumaczenie pod sekcją polską w tym samym pliku i usunięto redundantny plik `README.en.md`.
- **Roadmapa i18n**: Dodano *Etap 5: Internacjonalizacja (i18n) i Lokalizacja PL/EN* do [docs/ROADMAP-MECHANIKI-AI.md](file:///Volumes/Karta/Developer/straznik-tajemnic/docs/ROADMAP-MECHANIKI-AI.md).
- **Czyszczenie Git**: Utworzono i scalono PR #1 do `main` na GitHubie, a także usunięto wszystkie stare, nieaktywne, zmergowane gałęzie lokalnie i na serwerze origin.

### Co otwarte (do następnej sesji)
- Pełna implementacja mechaniki Końca Sesji w kodzie aplikacji Next.js zgodnie z `ROADMAP-MECHANIKI-AI.md` (Etap 2).
- Integracja i oprogramowanie pipeline'u setupowania przygód z paczek PDF/MP3 (Etap 3).
- Implementacja lokalizacji (Etap 5).

### Decyzje podjęte
- Wersje językowe opisu projektu na GitHubie (polski i angielski) będą utrzymywane w jednym wspólnym pliku `README.md` z dwujęzycznym tytułem u góry w celu ułatwienia nawigacji.
- Stare gałęzie deweloperskie po scaleniu do `main` są natychmiast usuwane z dysku i origin, by zachować pełny porządek.

## Podsumowanie sesji: 2026-07-19 (Sesja 8)
Branch: main

### Co zrobiono
- Przemodelowano roadmapę prac wokół katalogu ekwipunku, czytalnych dokumentów i późniejszej przebudowy dziennika.
- Zapisano plan i brief: `ekwipunek-katalog-dokumenty-dziennik-plan.md` oraz `ekwipunek-katalog-dokumenty-dziennik-brief.md`.
- Zweryfikowano, że szybki toggle `Obrazy: Wł/Wył` jest już w kodzie, ale użytkownik nie widzi go w działającej aplikacji.
- Zweryfikowano, że Hot Seat nie powinien być ustawieniem kosztowym i wymaga osobnego sprawdzenia widoku/runtime.
- Zweryfikowano, że poprawa ikony jest już obecna w skrypcie; temat pozostaje zamknięty do czasu nowej obserwacji wizualnej.

### Co otwarte (do następnej sesji)
- Najpierw znaleźć, dlaczego działająca aplikacja nadal pokazuje Hot Seat zamiast toggle `Obrazy: Wł/Wył`.
- Uruchomić właściwą powierzchnię aplikacji i sprawdzić, czy problemem jest nieaktualny build, źródło `_tester/_base/.silnik/` albo ścieżka renderowania ustawień.
- Dopiero po naprawie widoczności toggle przejść do researchu katalogu ekwipunku.

### Decyzje podjęte
- Kolejność: szybkie poprawki UX -> lokalny katalog ekwipunku -> czytalne przedmioty fabularne -> dziennik.
- Nie generować ponownie powtarzalnych przedmiotów startowych; docelowo mają być lokalnymi lekkimi assetami.
- Dokumenty i listy mają mieć osobną treść generowaną kontekstowo i akcję `Przeczytaj`.
- Dziennik nie będzie przebudowywany w ramach ekwipunku, tylko jako późniejszy osobny etap.

## Podsumowanie sesji: 2026-07-18
Branch: codex/duet-catalog-integration

### Co zrobiono
- Naprawiono przycięcie spodu i góry w karcie postaci (modal wyboru badacza) poprzez usunięcie my-auto z flex kontenera z overflow-y-auto i zastąpienie go bezpiecznym paddingiem.
- Naprawiono podobne ucięcie w modalu szczegółów przedmiotu w ekwipunku (zamiana overlay items-center na items-start z paddingiem, h-fit, oraz optymalizacja proporcji obrazu do aspect-[4/3]).
- Rozwiązano problem z brakiem aktualizacji fotografii (portretu) przy przełączaniu między postaciami w sesji gry - rozdzielono useEffect na synchronizację parametrów i osobną hydratację z IndexedDB odpalaną na zmianę ID (characterId), oraz dodano stabilny key={display.id} dla SheetHeader.
- Wykryto i zachowano wcześniejsze modyfikacje dewelopera w app/api/desktop/cold-start/route.ts.

### Co otwarte
- Weryfikacja poprawności pozostałych elementów modali na bardzo małych rozdzielczościach ekranu (responsive mobile).

### Decyzje podjęte
- Wykorzystano micro-split stanów w komponencie CharacterSheet do separacji operacji I/O (hydratacji obrazków z IndexedDB) od zwykłych aktualizacji zmiennych stanu (takich jak modyfikacje parametrów/PŻ/PR/PM).

## Podsumowanie sesji: 2026-07-18 (Sesja 2)
Branch: codex/duet-catalog-integration

### Co zrobiono
- Wyczyszczono pasek boczny poprzez usunięcie widgetu `PlayerSwitcher` z CthulhuSidebar.tsx.
- Zintegrowano przełączanie aktywnego gracza Hot Seat z wierszem tury nad polem czatu w message-input.tsx (plakietki "Czeka: {name}" są teraz klikalnymi przyciskami).
- Dodano przycisk zamknięcia `✕` wyłączający tryb Hot Seat bezpośrednio w wierszu tury w czacie.
- Przekazano nowe propsy `onSwitchPlayer` i `onDisableHotSeat` przez page.tsx oraz index.tsx.

### Co otwarte
- Brak.

### Decyzje podjęte
- Postanowiono zachować `hotSeatConfig` jako prop w `CthulhuSidebar` z uwagi na logikę wspólnego dziennika gry (`sharedJournal`), która zależy od tego stanu.

## Podsumowanie sesji: 2026-07-18 (Sesja 3)
Branch: main

### Co zrobiono
- **Uzupełnienie biografii**: Naprawiono uszkodzenie danych postaci w pliku [predefined-characters.ts](file:///Volumes/Karta/Developer/straznik-tajemnic/src/lib/immersion/predefined-characters.ts) (naprawa brakujących klamer domykających i sekcji postaci Dr Maya Patel) oraz zsynchronizowano te zmiany z runtime `.silnik`.
- **Naprawa przewijania karty postaci**: Poprawiono klasy w obu plikach `predefined-characters-selector.tsx` na `items-start justify-center` z marginesem wewnętrznym, eliminując błąd ucinania góry modalu.
- **Kompilacja i Build**: Zweryfikowano poprawność kompilacji TypeScript oraz przeprowadzono pełny build projektu Next.js z sukcesem.

### Co otwarte (do następnej sesji)
- Dalsze manualne testy z poziomu aplikacji.

### Decyzje podjęte
- Zastosowano pozycjonowanie `items-start` na flex-overlay modalu w celu umożliwienia prawidłowego przewijania elementów o wysokości większej niż wysokość ekranu (viewport).

## Podsumowanie sesji: 2026-07-18 (Sesja 4)
Branch: feature/duet-starting-prompt

### Co zrobiono
- **Miniatury ekwipunku (Faza 1)**: Zamieniono generyczny placeholder `◆` na ikony kategorii Lucide (`Sword`, `Shield`, `Wrench`, `FileText`, `Sparkles`, `User`, `HeartPulse`, `Flame`, `Package`) w `equipment-modal.tsx` i `sheet-equipment.tsx`. Nowy styl: `bg-gradient-to-br from-[#1c1712] to-[#0f0b07]`, `border-brass/30`, `shadow-md`, `text-brass/70`. W modalu ekwipunku hover odsłania nakładkę "Generuj".
- **Widok szczegółowy (Faza 3)**: W `equipment-detail-dialog.tsx` zmieniono proporcje obrazu na `aspect-square`, tryb na `object-cover`, dodano wewnętrzną ramkę art deco (`border-brass/25`) i zwiększono max-h do 380px.
- **Naprawa testów (Faza 4)**: Poprawiono 3 czerwone testy:
  - `predefined-characters.test.ts`: asercja długości rosteru 26 → 30.
  - `sheet-biography.test.tsx`: fixture na minimalny obiekt testowy trafiający w fallback "Tło Postaci".
  - `onboarding-buttons.test.tsx`: etykieta "Gotowa" → "Wybierz".
- **Wynik**: 18/18 suites, 41/41 tests passed.

### Co otwarte
- Brak - plan inventory-ui-plan.md w pełni zrealizowany.

### Decyzje podjęte
- Ikony kategorii jako komponent `CategoryIcon` (switch po category string) - reużywalna funkcja w obu plikach.
- W sheet-equipment.tsx placeholder jest czysto prezentacyjny (bez generowania) - dlatego brak nakładki hover "Generuj" (to robi modal/hook).

## Podsumowanie sesji: 2026-07-18 (Sesja 5)
Branch: feature/duet-starting-prompt

### Co zrobiono
- Zdiagnozowano i naprawiono desynchronizację między wersją testową a produkcyjną komponentu predefined-characters-selector.tsx.
- Dodano do produkcji: import EquipmentDetailDialog i EquipmentItem, stan selectedItem, klikalne przedmioty ekwipunku z hover efektem i płynną animacją.
- Pliki _tester/_base/.silnik/ i src/ są teraz w 100% identyczne (diff = pusty).
- Zamknięto plan full-character-sheet-preview - zapisano state.md.

### Co otwarte (do następnej sesji)
- przelacznik-hot-seat-brief.md - jest brief, brak planu i implementacji.
- Testy manualne aplikacji (otwarte od sesji 3).

- Plan full-character-sheet-preview był de facto już zrealizowany w poprzednich sesjach - brakował tylko sync jednego importu i state file.

## Podsumowanie sesji: 2026-07-19 (Sesja 6)
Branch: main

### Co zrobiono
- **Porządki w Sidebarze**: Wyśrodkowano logo gry i napisy w nagłówku sidebaru. Usunięto przycisk Hot Seat z sidebaru (ustawienie to jest wybierane na starcie przygody).
- **Toggle Obrazków**: Dodano szybki przełącznik generowania ilustracji scen bezpośrednio w panelu Ustawień sidebaru, co ułatwia zarządzanie kosztami API.
- **Naprawa Mute Lektora**: Zintegrowano natychmiastowe zatrzymywanie odtwarzanego dźwięku (`tts.stopCurrentAudio()`) w momencie wyłączenia lektora w sidebarze, wraz z reaktywnym useEffect w hooku `useTTS.ts`.
- **Weryfikacja**: Pomyślnie uruchomiono i zaliczono pełny pakiet testów jednostkowych i integracyjnych (41/41 testów passed).

### Co otwarte (do następnej sesji)
- Manualne testy w przeglądarce.
- Integracja predefiniowanego katalogu ekwipunku CoC 7e.

### Decyzje podjęte
- Reaktywne wyciszenie w `useTTS.ts` gwarantuje, że jakakolwiek zmiana flag w aplikacji natychmiast ubija aktywne audio, co zapobiega zjawisku doczytywania trwającego akapitu po wyciszeniu lektora.

## Podsumowanie sesji: 2026-07-19 (Sesja 7)
Branch: main

### Co zrobiono
- Uproszczono zegar kampanii: usunięto pogodę z widoku i powiązany przepływ danych.
- Naprawiono trzy błędy TypeScript: nieaktualny prop zegara, brakujący typ ustawień AI oraz kolejność reaktywnego wyciszania lektora.
- Weryfikacja: TypeScript bez błędów, pełne testy 41/41.

### Co otwarte (do następnej sesji)
- Manualny test aplikacji in przeglądarce.
- Integracja predefiniowanego katalogu ekwipunku CoC 7e.

### Decyzje podjęte
- Pogoda przestaje być parsowana i przekazywana tylko po to, by wyświetlić ją w zegarze.
- Funkcja zatrzymująca lektora jest deklarowana przed efektem, który ją wywołuje.

## Podsumowanie sesji: 2026-07-19 (Sesja 9)
Branch: main

### Co zrobiono
- Zdiagnozowano brak toggle `Obrazy: Wł/Wył` w działającej aplikacji: uruchamiany był nieaktualny produkcyjny build, starszy niż kod sidebara.
- Przebudowano aplikację produkcyjną i uruchomiono launcher `.app` na porcie 4050.
- Zapisano research katalogu ekwipunku: `.agent/research/equipment-catalog-2026-07-19.md`.
- Potwierdzono, że lokalne SVG ekwipunku są obecnie traktowane jak brak miniatury; hook automatycznych miniaturek może przez to wywoływać generator obrazów mimo toggle `Obrazy`.

### Co otwarte (do następnej sesji)
- Zaplanować i wdrożyć rozróżnienie lokalnych assetów katalogowych od obrazów AI wraz z testami respektowania `imageGenerationEnabled`.
- Zaprojektować `templateId` dla szablonu katalogowego oraz tolerancyjną migrację starych `EquipmentItem` i zapisów.
- Przed rozszerzaniem zawartości katalogu ustalić dokładny, legalnie dostępny materiał źródłowy zapisany wcześniej jako `The Walk Toolu`.

### Decyzje podjęte
- `id` pozostaje identyfikatorem konkretnego egzemplarza przedmiotu - nie wolno zastępować go `templateId`, ponieważ służy również jako klucz IndexedDB dla obrazów.
- Przedmioty katalogowe mają korzystać z lokalnych assetów bez generowania AI; obrazy generowane zostają dla egzemplarzy fabularnych i wyjątkowych.

## Podsumowanie sesji: 2026-07-19 (Sesja 10)
Branch: main

### Co zrobiono
- Domknięto Fazę 1 katalogu ekwipunku: lokalne assety katalogowe nie uruchamiają generatora AI, a toggle `Obrazy` zatrzymuje automatyczną kolejkę także w trakcie działania.
- Usunięto nakładające się kolejki i ryzyko podwójnych kosztów API; jedynym właścicielem startu kolejki jest `useGameStart`.
- Dodano właściwe assety zależne od epoki oraz trwałość profilu epoki w pełnym save/load.
- Naprawiono walidację `templateId` i zapis metadanych obrazów przedmiotów fabularnych.
- Dodano testy endpointu, modalu, kolejki, migracji i assetów epoki.
- Weryfikacja: pełny Jest 25 zestawów / 66 testów, TypeScript i produkcyjny build 61 stron - PASS.

### Co otwarte (do następnej sesji)
- Manualny test aplikacji.
- Fazy 2-4: czytalne dokumenty, kontrolowane przedmioty fabularne i osobny projekt UX Dziennika.
- Ustalenie legalnego źródła przed rozszerzeniem zawartości katalogu.
- ZIP wydania pozostaje bez przebudowy.

### Decyzje podjęte
- `id` identyfikuje egzemplarz przedmiotu, a `templateId` wzorzec katalogowy.
- Znaleziska fabularne pozostają generowane, nawet jeśli ich nazwa pasuje do katalogu.
- Katalogowe WebP mają pierwszeństwo przed ogólnymi SVG kategorii; SVG pozostaje fallbackiem.
- Trzy zastane pliki roadmapy mechanik pozostają poza zakresem commitu.

## Podsumowanie sesji: 2026-07-19 (Sesja 11)
Branch: main

### Co zrobiono
- Zakończono Fazę 1 Etapu 1 mechaniki tempa.
- Dodano wspólny typ `SessionZeroSettings` oraz wersjonowany kontrakt `SessionMechanicsSettingsV1`.
- Dodano normalizację starych i błędnych ustawień oraz głęboki merge `sessionZero` po stronie `/api/chat`.
- Dodano 7 testów migracji i normalizacji.
- Weryfikacja: 25/25 zestawów i 66/66 testów bazowych, 2/2 zestawy i 7/7 testów Fazy 1, TypeScript, ESLint oraz `git diff --check` - PASS.

### Co otwarte (do następnej sesji)
- Faza 2: UI Sesji Zero i przełącznik opt-in.
- Faza 3: dyrektywa struktury sceny w promptcie.
- Faza 4: pełna regresja, save/load i build.
- Brak commita, pusha i aktualizacji Linear.

### Decyzje podjęte
- `pure_narrative` zawsze blokuje mechanikę.
- Nowa dyrektywa nie będzie zawierać drugiego limitu słów.
- Nie zmieniamy jeszcze `activeGameState` ani nie wdrażamy walki/pościgów.
- Zastane pliki dokumentacyjne pozostają w drzewie roboczym.

## Podsumowanie sesji: 2026-07-19 (Sesja 12)
Branch: feature/faza-5-biografie-i-ui

### Co zrobiono
- Zmiana etykiety w UI z `Koncept Postaci` na `Biografia Postaci` w `sheet-biography.tsx`.
- Uzupełnienie biografii 30 predefiniowanych badaczy w `predefined-characters.ts` o pełne, 6-8 zdaniowe opisy fabularne.
- Dodanie tooltipów `title` do uciętych nazw przygód w nagłówku czatu oraz selektorze (`chat-header.tsx`, `adventure-selector.tsx`).
- Wdrożenie sieciowego limitu czasu (timeout 8s) z `AbortController` i precyzyjną obsługą błędów w panelu diagnostycznym Zdrowia Strażnika (`health-status-panel.tsx`).
- Przebudowa interfejsu Lightboxa dla ekranów mobilnych (`image-lightbox.tsx`): przeniesienie paska narzędzi na dół, zmniejszenie strzałek i podniesienie licznika zdjęć.
- Weryfikacja: pełne testy Jest (73/73 testy) – PASS.

### Co otwarte (do następnej sesji)
- Pozostałe fazy planu naprawczo-wdrożeniowego (Fazy 0-4 oraz Faza 6).

### Decyzje podjęte
- Użycie timeoutu 8s na zapytania diagnostyczne w Ustawieniach, aby zapobiec blokowaniu UI przy braku internetu.
- Umieszczenie mobilnych kontrolek lightboxa w dolnej strefie ekranu (pod palcem) dla wygody użytkownika.

## Podsumowanie sesji: 2026-07-20 (Sesja 13)
Branch: feature/faza-5-biografie-i-ui

### Co zrobiono
- Wyeliminowano paragrafowy system zamkniętych wyborów w default-gm-prompt.md, dając pełną swobodę graczowi.
- Zaimplementowano walkę w stylu Pulp Cthulhu (podwojone HP, wydawanie Szczęścia, filmowość) w default-gm-prompt.md.
- Wprowadzono bezwzględny wymóg generowania ilustracji dla snów, koszmarów i magii wraz z obsługą geometrii nieeuklidesowej.
- Wdrożono Home Rule na spowolniony rozwój bohaterów (Slow-Burn Development: limit 3 umiejętności, wzrost o +1d4/1d6).
- Dostosowano recap oraz cliffhangery do systemu Save/Load i dodano obsługę systemowej komendy [KONIEC_SESJI] z procedurą wygaszania.
- Utworzono mapę zależności instrukcji w Mapa-Instrukcji.md oraz procedurę Zewdrzewko update.
- Zaprojektowano pipeline setupowania i bogacenia przygód w Setupowanie-Przygody.md z bezpiecznym paskiem postępu.
- Założono plik ROADMAP-MECHANIKI-AI.md z zaplanowanymi etapami rozwoju (Koniec Sesji, Ingestion).
- Przeprowadzono pomyślną weryfikację testów (73/73 PASS) i kompilacji TS.

### Co otwarte (do następnej sesji)
- Pełna implementacja mechaniki Końca Sesji w kodzie aplikacji Next.js zgodnie z ROADMAP-MECHANIKI-AI.md (Etap 2).
- Zintegrowanie i oprogramowanie pipeline'u setupowania przygód z paczek PDF/MP3 (Etap 3).

### Decyzje podjęte
- Zastąpiono sztywne progi procentowe (narracja/mechanika) elastycznym dopasowaniem do trybu rozgrywki.
- Uznano priorytet wgranej przygody nad domyślnym katalogiem lokacji startowych.
- Zastąpiono generowanie na żywo materiałów dodatkowych wyświetlaniem gotowych plików z paczki przygody.

## Podsumowanie sesji: 2026-07-20 (Sesja 14)
Branch: feature/lovecraft-narrative-enhancements

### Co zrobiono
- Zaimplementowano 3 nowe filary stylu w `lovecraft-style-guide.ts` (Korelacja Wiedzy, Anomalie Geometryczno-Przestrzenne, Retrospektywne Ziarna Grozy).
- Rozbudowano ukryty monolog `[MYŚLI_MG]` w `gm-protocol.ts` o parametry `RETRO_ZIARNO` oraz `KORELACJA`.
- Zaktualizowano domyślny podręcznik narracji `default-gm-prompt.md` o Lovecraftowską syntezę faktów oraz Kaskadowy Filtr Percepcji zależny od SAN.
- Przeprowadzono pomyślną weryfikację produkcyjną (npm run build) i testy jednostkowe.

### Co otwarte (do następnej sesji)
- Przeprowadzenie rozgrywki testowej bezpośrednio w UI w celu oceny nowej plastyki i dynamiki narracji.

### Decyzje podjęte
- Wykorzystanie wbudowanego w interfejs parametru SAN postaci do bezpośredniego wpływania na ton i zniekształcenia opisu świata przez model LLM.

## Podsumowanie sesji: 2026-07-20

Branch: `main`

### Co zrobiono

- Przebudowano roadmapę pod lokalną aplikację bez Pinecone.
- Dodano rozdział prac programistycznych i nieprogramistycznych oraz zależności etapów.
- Dodano Etap 0: bezpieczny system aktualizacji aplikacji z GitHub Releases, checksumami, backupem, migracjami i rollbackiem.
- Zaktualizowano `docs/ARCHITECTURE.md` o granicę sieci i ochronę danych użytkownika podczas aktualizacji.
- Zaktualizowano `docs/MAPA-POWIAZAN.md` o zależności systemu aktualizacji.

### Co otwarte

- Implementacja systemu aktualizacji nie została rozpoczęta.
- Stare moduły Pinecone/GCS w kodzie wymagają osobnego audytu i usunięcia.
- Nie wykonano pushu ani scalania.

### Decyzje

- Pinecone nie jest częścią docelowej architektury.
- Aktualizacja zmienia kod aplikacji, ale nie może naruszać save'ów, lokalnego RAG-u, pamięci sesji, ustawień, postaci ani assetów.

## Podsumowanie sesji: 2026-07-20

Branch: `feature/immersion-context-injection`

### Co zrobiono

- Odłączono główną ścieżkę lokalnego RAG od nazewnictwa i typów Pinecone.
- Dodano `src/lib/vector-db/vector-types.ts` jako neutralne źródło typów i namespace'ów lokalnego indeksu.
- Zaktualizowano wyszukiwanie semantyczne, indeksowanie PDF i pamięć rozmowy do lokalnego RAG.
- Zaktualizowano mapę powiązań/Zewdrzewko w `docs/MAPA-POWIAZAN.md`.
- Uruchomiono 79 testów jednostkowych - wszystkie przeszły.
- Przeszedł TypeScript, ESLint i produkcyjny build.
- Przebudowano fizyczne kopie aplikacji w `/Users/phantom/Applications` i na biurku.

### Co otwarte

- Stare endpointy Pinecone/GCS nadal istnieją jako warstwa zgodności.
- Następny pakiet: stabilny `adventureId` i izolacja danych dwóch przygód.
- Nie wykonano pushu ani scalania.
- Nie uruchamiano aplikacji po buildzie; port 4050 pozostawał nieaktywny.

### Decyzje

- Lokalny RAG jest źródłem prawdy dla głównej ścieżki czatu.
- Commit: `refactor(rag): decouple local vector store from Pinecone`.

# Podsumowanie sesji: 2026-07-20 - zamknięcie po review Etapu 2A
Branch: `feature/immersion-context-injection`

## Co zrobiono
- Wdrożono Etap 2A lokalnego pipeline'u PDF.
- Dodano migrację pól `*IndexedToPinecone` do `*IndexedLocally`.
- Dodano walidację parsera, deterministyczny chunking, atomową podmianę namespace i kontrakt endpointu lokalnego RAG.
- Dodano 23 testy regresyjne.
- Weryfikacja: pełny Jest 102/102, TypeScript PASS, lint bez błędów, build produkcyjny 61 stron.
- Przeprowadzono code review przez three niezależne subagenty.

## Co otwarte do następnej sesji
- Review zablokował merge.
- Naprawić aktywny caller `/api/pdf/index-to-pinecone` w `useFirstRun`.
- Rozstrzygnąć i naprawić GCS-first oraz podwójny upload PDF.
- Naprawić kolizje ID przygodach o tej samej nazwie.
- Zabezpieczyć wyścigi równoległych uploadów oraz współdzielony singleton embeddingów.
- Domknąć bezpieczeństwo cache/zapisu JSON-BIN i limity zasobów dla dużych PDF-ów.
- Uzupełnić testy pełnego hooka, migracji save'ów i awarii zapisu.
- Nie wykonywać jeszcze commita, pusha ani merge'a.

## Decyzje podjęte
- Etap 2A nie jest jeszcze gotowy do scalania mimo przechodzących testów i buildu.
- W nowej sesji kontynuować od findings z `/dev-5-review`, bez ponownego wdrażania Etapu 2A od zera.
- Niezależne pliki dotyczące lokalnego STT i rozszerzeń roadmapy pozostają poza zakresem.

## Podsumowanie sesji: 2026-07-20 (Naprawa findings z review RAG/PDF)
Branch: `feature/immersion-context-injection-fixes`

### Co zrobiono
- **GCS-free & Ujednolicony lokalny upload**: Całkowicie wyeliminowano chmurowy GCS i podwójny upload pliku PDF. Zastąpienie wywołań `/api/upload-pdf` i `/api/pdf/parse` lokalnym `/api/pdf/parse-local` oraz przesyłanie sparsowanego tekstu jako JSON do `/api/pdf/ingest-local` (lekki obiekt JSON o strukturze `{ text, type, fileName, clearBefore }`).
- **Zapobieganie kolizjom nazw**: Wdrożono pseudolosowy suffix do ID przygód w `useCustomAdventures.ts` oraz zabezpieczono operacje zapisu i usuwania przed wyścigami stanu Reacta (pobieranie najświeższego stanu ze storage bezpośrednio przed modyfikacją).
- **Kolejkowanie zapisu (Mutex)**: Zaimplementowano asynchroniczną kolejkową zapisu (`writeQueue` i `enqueueWrite`) w `LocalVectorStore` (`local-vector-store.ts`), co chroni pliki JSON i binarne przed uszkodzeniem przy równoległych żądaniach zapisu.
- **Bezpieczny singleton embeddingów**: Wprowadzono bezpieczną propagację klucza API (`apiKey`) przez cały pipeline lokalnego indeksowania w `embedding-service.ts`, `indexing-service.ts` i `pdf-indexing-service.ts`, eliminując wyścigi różnych kluczy API.
- **Weryfikacja**: Dodano testy jednostkowe do `usePdfMemory.test.ts` i pomyślnie zaliczono cały pakiet testów (105/105 PASS). TypeScript kompiluje się bez błędów, linter przeszedł czysto, a build Next.js zakończył się sukcesem.

### Co otwarte (do następnej sesji)
- Przeprowadzenie manualnych testów działania wczytywania PDF-ów i przygód w przeglądarce pod kątem nowo wdrożonych poprawek.

### Decyzje podjęte
- Wyeliminowano poleganie na chmurowych plikach/urlach PDF (Rules/Adventure) – cała logika opiera się wyłącznie o lokalny RAG Float32 i Gemini File API (gdzie pliki żyją tymczasowo w chmurze Gemini bez obciążania storage GCS).

## Podsumowanie sesji: 2026-07-21 (Etap 3.5: Encyklopedia Gracza & HelpModal RAG)
Branch: main

### Co zrobiono
- **Rozbudowano Modal Pomocy (`HelpModal.tsx`):** Dodano stylizację w klimacie Lovecrafta, 5 pełnoprawnych zakładek, lazy-loading oraz obsługę zamykania klawiszem `Esc`.
- **Wdrożono `BestiaryRulesTab.tsx`:** Przejrzysty moduł ze skrótem zasad CoC 7e (k100, SAN) oraz zintegrowany Bestiariusz Mitów z opcją wyszukiwania stworów.
- **Wdrożono `HelpAssistantTab.tsx`:** Interaktywną pytajkę AI (RAG Assistant) odpowiadającą na pytania o mechanikę i lore w izolowanym modale.
- **Napisano testy jednostkowe (`HelpModal.test.tsx`):** 5 nowych testów (łączny pakiet: 116 PASS).
- **Zintegrowano w silniku aplikacji:** Osadzono `HelpModal` w `_tester/_base/.silnik/src/app/page.tsx` oraz zweryfikowano pełny build produkcyjny (61/61 wygenerowanych stron).
- **Zaktualizowano tracker projektu (`state.md`):** Oznaczono Etap 3.5 na 100% DONE.

### Co otwarte (do następnej sesji)
- **Etap 3:** Przebudowa Dziennika na automatycznie aktualizowaną Tablicę Badacza (dowody, poszlaki, hipotezy i relacje) zasilaną danymi z `data/adventures/{adventureId}.json`.

### Decyzje podjęte
- Użycie lekkiego asystenta RAG wewnątrz modalu pomocy bez zanieczyszczania głównego czatu narracyjnego sesji RPG.

## Podsumowanie sesji: 2026-07-21 (Etap 3: Tablica Dowodów Badacza & Graf Powiązań)
Branch: main

### Co zrobiono
- **Model Tablicy Dowodów**: Rozszerzono `JournalEntry` w `types.ts` o pola powiązań relacyjnych (`linkedEntryIds`) i statusy weryfikacji hipotez (`hypothesisStatus`).
- **Komponent `EvidenceGraphView`**: Wdrożono detektywistyczny widok Canvas/SVG z układem okręgowym, pineskami i czerwonymi nitkami łączącymi poszlaki, postaci, lokacje i artefakty.
- **Nawigacja i UX w Dzienniku**: Dodano zakładkę "Tablica Powiązań" w `SessionJournal`, wydzielono typ `JournalTab`, zaktualizowano formularz `AddEntryForm`, kaskadowe czyszczenie sierot przy usuwaniu oraz wsparcie dla nieprzeczytanych wpisów i eksportu Markdown.
- **Weryfikacja**: Przeszło 117/117 testów jednostkowych (37/37 plików testowych) oraz kompilacja TypeScript.

### Co otwarte (do następnej sesji)
- Możliwość automatycznego generowania powiązań między wpisami przez MG (prompt AI / tagi w odpowiedziach czatu).
- Dalszy rozwój Etapu 0 (zabezpieczony system autoupdate aplikacji z GitHub Releases).

### Decyzje podjęte
- Wydzielono typ zakładek UI (`JournalTab`) od typu wpisu (`JournalEntryType`), uniemożliwiając ignorowanie wpisów przez filtry.
- Nitki połączeń renderowane są z unikalnymi parami w Set, chroniąc krawędzie jednokierunkowe.

## Podsumowanie sesji: 2026-07-21 (Poprawki UI Ekwipunku, Karty Postaci, Dziennika i Dane Testowe)
Branch: main

### Co zrobiono
- **Ekwipunek i Przedmioty:** Zmieniono prezentację w `GearCard` i `WeaponCard` w `equipment-modal.tsx` oraz `predefined-characters-selector.tsx` – opis przedmiotu jest zawsze widoczny na kafelkach, a stan (`NOWY`, `UŻYWANY`, `USZKODZONY`) prezentowany jest jako dyskretny badge.
- **Zagospodarowanie wolnego miejsca na Karcie Postaci:** W lewej kolumnie karty postaci (pod paskami stanu PŻ/PR/PM/SZC) umieszczono sekcję osobistego ekwipunku badacza, co pozwoliło zagospodarować wolne miejsce i znacząco zmniejszyć wysokość całej karty postaci.
- **Wydajność i UX Notatek w Dzienniku:** Zreorganizowano siatkę notatek w `SessionJournal` na czytelną siatkę 3-kolumnową z lepszą typografią i pełną prezentacją treści.
- **Spreparowanie danych testowych:** Utworzono plik `src/lib/test-journal-data.ts` z kompletny zestawem danych w klimacie Lovecrafta dla zakładek Misje, Kronika, Encyklopedia, Notatki oraz połaczonymi nitkami śledczymi węzłami Tablicy Badacza. Dodano przycisk `🧪 Wypełnij testowo` w nagłówku Dziennika.
- **Weryfikacja:** Pomyślnie zweryfikowano poprawność kompilacji TypeScript oraz przeprowadzono produkcyjny build Next.js (`npm run build` - 61/61 stron wygenerowanych poprawnie).

### Co otwarte (do następnej sesji)
- Automatyczne tworzenie nitek śledczych na Tablicy Badacza prosto z narracji Mistrza Gry podczas sesji (Etap 3).
- Persystencja układu (x, y) węzłów Tablicy Badacza w plikach save gry.

### Decyzje podjęte
- Tag stanu przedmiotu nie powinien przesłaniać opisu – opis jest zawsze priorytetem w UI.
- Dodanie przycisku ładującego gotowe mocki w Dzienniku ułatwia szybkie testowanie i prezentację widoków.


