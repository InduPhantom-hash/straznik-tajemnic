## Podsumowanie sesji: 2026-07-22
Branch: main

### Co zrobiono
- **Faza 1 (Polskie Aliasy & Fuzzy Matching):** Rozszerzono `findEquipmentTemplate` w `equipment-catalog.ts` o elastyczny fuzzy matching polskich słów kluczowych i dodano przypadek testowy w `equipment-catalog.test.ts`.
- **Faza 2 (AI Item Enrichment & CoC 7e Mechanics):** Utworzono nowy endpoint `/api/equipment/enrich` (Gemini 3.6 Flash Low) z defensywnym parsowaniem i graceful degradation oraz automatycznym wyliczaniem parametrów walki (`damage`, `range`, `skill`) i wyceną USD z lat 20.
- **Faza 3 (UI Redesign & Safe Queueing):** Redesign kafelków i placeholderów Art Déco w `equipment-modal.tsx`, usunięcie zablokowania generowania przez ikony SVG oraz dodanie 500ms throtllingu w `useEquipmentThumbnails.ts` (zero błędów HTTP 429).
- **Testy i Weryfikacja:** 10/10 testów jednostkowych PASS, kompilacja TypeScript (`npx tsc --noEmit`) PASS.

### Co otwarte
- Brak otwartych zadań w obszarze ekwipunku. Pipeline gotowy do sesji narracyjnych.

### Decyzje podjęte
- Wykorzystanie istniejącej infrastruktury Gemini API bez zewnętrznych paczek.
- Pełna wsteczna kompatybilność typów dla obiektów `Character`.

## Podsumowanie sesji: 2026-07-22 (Diegetic Documents)
Branch: main

### Co zrobiono
- **Typowanie i Inferencja Sub-typów Dokumenów (`types.ts`, `acquired-equipment.ts`)**: Dodano unię `DocumentSubType`, pole `documentType` w `EquipmentItem` oraz funkcję `inferDocumentType(item)`.
- **Dedykowany Komponent Rekwizytów Diegetycznych (`DiegeticDocumentViewer.tsx`)**: Utworzono komponent renderujący warianty rekwizytów 1920s: legitymację prasową/ID z portretem postaci, teczkę dowodową/policyjną, pismo rządowe, artykuł prasowy i papeterię.
- **Integracja w Podglądzie Ekwipunku (`EquipmentDetailDialog.tsx`)**: Podpięto podgląd diegetyczny z automatyczną hydracją portretu badacza.
- **Weryfikacja**: `npx tsc --noEmit` PASS (0 błędów), Jest PASS (4/4 testy).

### Decyzje podjęte
- Powiązanie legitymacji prasowych/dowodów z `character.portraitUrl` i fallbackiem na sylwetkę z epoki.

## Podsumowanie sesji: 2026-07-23
Branch: main

### Co zrobiono
- [UI-01] Header Bar UI & Jawna Pogoda: Miejsce · Region (Kawiarnia Dormand’s · Boston) oraz słowna pogoda/księżyc w CampaignClock.
- [UI-02] Przycisk Eksport MD: przesunięto w górę w CharacterSheet (-mt-1).
- [UI-03] Dublowany Ekwipunek: usunięto SheetEquipment z Karty Postaci.
- [UI-04] Retro Portrety: zmiana awatara czatu z kółka na prostokątną ramkę retro.
- [UI-05] Full-Screen Inspector: przebudowa EquipmentDetailDialog na nakładkę z createPortal.
- [UI-06] Odznaka NEW: usunięto cyfrę 8, dodano dynamiczną odznakę NEW dla ekwipunku.

### Co otwarte
- Pozostałe punkty z bug.md (TTS, Faza Rozwoju, Grafik ekwipunku).

## Podsumowanie sesji: 2026-07-23 (IMG-01)
Branch: main

### Co zrobiono
- Wykonano pełen proces `/dev-1` do `/dev-5` dla punktu 2 w `bug.md` (`[IMG-01] Brakujące Grafiki Przedmiotów / Pętla Generowania`).
- `_tester/_base/.silnik/src/hooks/useEquipmentThumbnails.ts`: Wyeliminowano pętlę nieudanych zapytań HTTP po błędzie generowania obrazów AI w tle. Dodano natychmiastowe oznaczanie `visualSource: 'fallback'`.
- `_tester/_base/.silnik/src/lib/equipment-catalog.ts`: Uzupełniono szablony i aliasy polskich nazw przedmiotów startowych (np. *Koperty na dowody*, *Zniszczona odznaka*, *Pistolet sygnalizacyjny* itd.).
- `src/app/api/equipment/generate-starting/route.ts`: Zintegrowano automatyczne mapowanie grafik statycznych z katalogu `.webp` i ikonek `.svg` przy tworzeniu ekwipunku postaci.
- `_tester/_base/.silnik/src/lib/types.ts`: Rozszerzono typ `EquipmentVisualSource` o opcję `'fallback'`.

### Co otwarte
- Pozostałe punkty z bug.md (np. punkt 3 [LOG-01] Dwuetapowy Przepływ "Koniec Sesji" lub punkt 4 [CHA-01]).

### Decyzje podjęte
- Wykorzystano istniejącą infrastrukturę `visualSource` do oznaczania fallbacku zamiast wprowadzania dodatkowych zoptymalizowanych flag stanu.

## Podsumowanie sesji: 2026-07-23 (LOG-01)
Branch: main

### Co zrobiono
- **[LOG-01] Dwuetapowy Przepływ "Koniec Sesji" & Faza Rozwoju CoC 7e**:
  - Wykonano pełen cykl od `/dev-1-research` do `/dev-6-end` dla punktu 3 z `bug.md`.
  - Backend (`run-chat-pipeline.ts` & `default-gm-prompt.md`): Dwuetapowy protokół – Krok 1 (`[KONIEC_SESJI]`) domyka scenę pytaniem `[Co robisz?]` bez tagu potwierdzenia. Krok 2 (`[KONIEC_SESJI:FINAL]`) po finałowym słowie gracza generuje Lovecraftowski monolog z cliffhangerem i dopisuje `[KONIEC_SESJI:POTWIERDZENIE]`.
  - Frontend State (`useChat.ts` & `page.tsx`): Wprowadzono typ i stan `sessionEndStatus` (`'idle' | 'awaiting_player_closure' | 'ended'`) z przekazaniem do `CthulhuSidebar` oraz `ChatWindow`.
  - Sidebar & Input (`CthulhuSidebar.tsx` & `MessageInput.tsx`): Przycisk przejść (Koniec Sesji ➔ Oczekiwanie na słowo gracza... ➔ Sesja Zamknięta 🔒) z dedykowanym placeholderem w inpucie.
  - Development Phase Inline (`DevelopmentPhaseCard.tsx` & `MessageCard.tsx`): Zbudowano komponent inline Fazy Rozwoju CoC 7e (rzuty +1K10% na oznaczone `[✓]`, bonus SAN +2K6 za 90%+, odzysk Szczęścia 1K10, Samopomoc oraz podziękowanie/zapis) osadzony pod banerem Kroniki po zamykającej wiadomości MG.
  - Testy: Napisano `cleanup.test.ts` oraz `useChat.session-end.test.ts`. `npx tsc --noEmit` PASS (0 błędów), Jest PASS (5/5).

### Co otwarte
- Punkty w `bug.md`: [CHA-01] Rozbudowa biografii postaci, [TTS-01] do [TTS-04] Lektor & synteza audio, [LNG-01]/[LNG-02] Prompty systemowe metryczny/polszczyzna.

### Decyzje podjęte
- Osadzenie Fazy Rozwoju CoC 7e bezpośrednio w oknie czatu jako interaktywna karta inline pod finałową wiadomością MG zamiast przesłaniania ekranu modalem.

## Podsumowanie sesji: 2026-07-23 (CHA-01)
Branch: main

### Co zrobiono
- **[CHA-01] Rozbudowa Biografie Predefiniowanych Postaci (Punkt 4 z `bug.md`)**:
  - Wykonano pełny cykl `/dev-1` do `/dev-6` dla zadania rozbudowy biografii predefiniowanych postaci.
  - Przepisano opisy tła, wyglądu, ideologii, ważnych osób, znaczących miejsc i cennego przedmiotu dla wszystkich 30 postaci predefiniowanych we wszystkich 3 epokach (Gaslight 1890s, Classic 1920s, Modern).
  - Każda postać otrzymała bogaty, wieloakapitowy biogram w klimacie CoC 7e z wyraźnie wydzieloną adnotacją `\n\n[Kluczowa więź: <Nazwa/Opis> - <uzasadnienie>]`.
  - Wyeliminowano literówki w przymiotnikach (`Prezyzyzyjny` $\rightarrow$ `Precyzyjny`) oraz nagłówkach sekcji (`ŚLEDÇZY` $\rightarrow$ `ŚLEDĆZY`).
  - Ujednolicono klucze umiejętności u postaci (np. `Spostrzegawczość`, `Nasłuchiwanie`).
  - Dokonano zsynchronizowania zmian do pliku produkcyjnego (`src/lib/immersion/predefined-characters.ts`) oraz lustrzanego pliku silnika (`_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts`).
  - Testy: `npm test -- predefined-characters.test.ts` w `_tester/_base/.silnik` $\rightarrow$ **PASS (4/4 testów passed)**.

### Co otwarte
- Punkty z `bug.md`: [TTS-01] do [TTS-04] Lektor & synteza audio, [LNG-01]/[LNG-02] Prompty systemowe metryczne i polszczyzna.

### Decyzje podjęte
- Zachowano pełną zgodność z istniejącym API `PredefinedCharacter` i unikatowymi portretami/lokalną ikonografią bez modyfikacji identyfikatorów postaci ani statystyk mechanicznych.

## Podsumowanie sesji: 2026-07-23 (LNG-01 & LNG-02)
Branch: main

### Co zrobiono
- **[LNG-01] Obowiązkowy System Metryczny & [LNG-02] Zero Ponglish & Poprawna Polszczyzna (Punkt 6 z `bug.md`)**:
  - Wykonano pełny cykl od `/dev-1-research` do `/dev-6-end` dla punktu 6 w `bug.md`.
  - `_tester/_base/.silnik/src/lib/lovecraft-style-guide.ts`: Dodano sekcję 12 (`[LNG-01] OBOWIĄZKOWY SYSTEM METRYCZNY`) oraz sekcję 13 (`[LNG-02] ZERO PONGLISH & POPRAWNA POLSZCZYZNA`) nakazujące bezwzględne przeliczanie stóp, mil i funtów na metry, km i kg oraz zakazujące angielskich wtrąceń i kalk gramatycznych.
  - `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts`: Dodano sekcję `A-BIS` w instrukcjach narracji tekstowej z przypomnieniem wymogów metrycznych i poprawności językowej.
  - Ochrona TTS: Obie dyrektywy wyłączają angielskie tagi syntezatora mowy TTS w nawiasach kwadratowych `[...]` (np. `[whispers]`, `[trembling]`), gwarantując poprawne działanie głosów Gemini.
  - `_tester/_base/.silnik/src/lib/ai-settings/prompts-generator.test.ts` [NEW]: Utworzono test jednostkowy Jest sprawdzający, czy wygenerowany system prompt oraz protokół GM zawierają dyrektywy `LNG-01` i `LNG-02`.
  - Weryfikacja: `npm test -- prompts-generator.test.ts` $\rightarrow$ **PASS (3/3 testów passed)**.

### Co otwarte
- Punkty z `bug.md`: [TTS-01] do [TTS-04] Lektor & synteza audio.

### Decyzje podjęte
- Zamieszczenie dyrektyw językowych w sztywno doklejanych sekcjach `Lovecraft Style Guide` i `GM Protocol` w `prompts-generator.ts`, aby uniemożliwić ich przypadkowe wyłączenie z poziomu ustawień gracza.

## Podsumowanie sesji: 2026-07-23 (TTS-01 do TTS-04)
Branch: main

### Co zrobiono
- **[TTS-01] Instant Streaming (Szybki start lektora):** Obniżono próg wczesnego startu pierwszego segmentu z 40 do 25 znaków i rozszerzono terminatory pauz o interpunkcję `, : ; ! ? .`, umożliwiając start lektora po 2-3s na początku wprowadzenia sesji.
- **[TTS-02] Naprawa Multi-Voice dla NPC:** Wprowadzono funkcję `resolveNpcVoice()` odporną na tytuły (*Inspektor*, *Profesor*, *Doktor*) oraz częściowe dopasowania imienia/nazwiska NPC.
- **[TTS-03] Polskie Znaki Diakrytyczne:** Osłonięto UTF-8 i polskie litery w `text-cleaner.ts`.
- **[TTS-04] Duchowe Zdania (Ghost Sentences):** Rozbudowano filtrowanie tagów systemowych (`[POSTAĆ:]`, `[EKSPOZYCJA:]`, `[KLIMAT:]` itp.) przed podaniem bufora do TTS.
- **Testy i Weryfikacja:** Utworzono test jednostkowy `src/tests/unit/tts-cleaner.test.ts` $\rightarrow$ **PASS (7/7 testów passed)**.

### Co otwarte
- Wszystkie zgłoszone w `bug.md` punkty 1-6 zostały w pełni rozwiązane. Osobny Epik 7 (Tablica Badacza) pozostaje zaplanowany na osobną sesję.

### Decyzje podjęte
- Zachowano próg 25 znaków na pauzie interpunkcyjnej dla pierwszego segmentu zdania, co gwarantuje natychmiastową reakcję bez ryzykownych skoków liczby zapytań API do Gemini.

## Podsumowanie sesji: 2026-07-23 (EPIC-01 Tablica Badacza od zera)
Branch: main

### Co zrobiono
- **[EPIC-01] Przebudowa Dziennika & Tablicy Badacza od zera (Punkt 7 z `bug.md`)**:
  - Wykonano pełen cykl od `/dev-1-research` do `/dev-6-end` dla ostatniego punktu 7 z pliku `bug.md`.
  - **Nowy komponent `CorkboardInvestigationBoard`**: Stworzono trwałe płótno korkowe o oknach 2400x1600px z kartami o losowych rotacjach (`rotation` -4..4 deg), 3D pineskami z gradientem i cieniem oraz natywnym pozycjonowaniem przez PointerEvents (`setPointerCapture`) zapewniającym 60 FPS.
  - **Sznurki Beziera SVG**: Zaimplementowano zakrzywione czerwone sznurki Beziera SVG ze zwisem grawitacyjnym (`sag = Math.min(80, Math.max(20, distance * 0.15))`), podwójną warstwą z cieniem oraz edycją etykiet w modalu UI.
  - **Szuflada Poszlak (Evidence Drawer)**: Boczny wysuwany panel z zakładkami Kronika / Ekwipunek i filtrem wyszukiwania pozwalający przypinać dowolne notatki, poszlaki i przedmioty na tablicę.
  - **Inspection Lightbox Modal**: Zbudowano pełnoekranowy lightbox z mosiężną ramką Art Déco do badania szczegółów poszlak, zoomowania skanów grafik, edycji obserwacji badacza i zmiany statusu hipotezy (*Potwierdzona / Hipoteza / Obalona*).
  - **Utrwalanie stanu & Czyszczenie**: Zapewniono pełny zapis stanu `investigatorBoard` w kasecie postaci `Character` oraz save'ach gry (`FullGameSave`). Usunięto przestarzały, bezstanowy wykres `evidence-graph-view.tsx`.
  - **Weryfikacja**: `npx tsc --noEmit` PASS (0 błędów w kodzie EPIC-01), Jest PASS (9/9 testów passed w `session-journal.test.tsx` oraz `shared-adventure-journal.test.ts`).

### Co otwarte
- Wszystkie punkty z pliku `bug.md` (od UI-01 do EPIC-01) zostały w 100% rozwiązane i przetestowane.


### Decyzje podjęte
- Użyto wyłącznie natywnych mechanizmów React 19 + SVG Overlay bez wprowadzania zewnętrznych bibliotek (React Flow/Konva), zapewniając zero dodatkowych zależności i idealny klimat Lovecraftowski.

## Podsumowanie sesji: 2026-07-25
Branch: main

### Co zrobiono
- **ElevenLabs TTS Integration (BYOK)**: Utworzono endpoint `/api/tts/elevenlabs/route.ts` w silniku, zarejestrowano w unified TTS routerze i rozszerzono mapowanie głosów NPC o `ElevenLabsNpcVoiceConfig`.
- **Przebudowa Presetów Jakości**:
  - LOW: Pure text (bez lektora, bez obrazów, ultra-tani)
  - MID: Standard (Gemini TTS Charon)
  - HIGH: Hybrydowe słuchowisko ElevenLabs (`multilingual_v2` + `turbo_v2_5`)
  - ULTRA: Pełne słuchowisko ElevenLabs Pro (`multilingual_v2` dla wszystkich mówców)
- **Fallback TTS**: W `useTTS.ts` dodano przezroczyste przełączanie na Gemini TTS (`Charon`/`Gacrux`) przy braku klucza ElevenLabs w `localStorage` gracza oraz zabezpieczenie przed przesyłaniem nazw głosów Gemini do ElevenLabs API.
- **Chrome AI Nano (Client-side RAG Reranker)**: Utworzono typy `window-ai.d.ts` oraz kliencki re-ranker `chrome-ai-reranker.ts` wykorzystujący Gemini Nano w Chrome 127+ do bezgłośnego odsiewania szumu tokenowego z RAG.
- **Drift-guard Test**: Stworzono `model-registry.test.ts` weryfikujący spójność `PRESET_MODELS` i `QUALITY_PRESETS` (PASS).
- **Zew-update & Zew-zimny**: Zaktualizowano `docs/MAPA-POWIAZAN.md` oraz wykonano pełny reset stanu profilu testowego (`desktop/cold-start.sh`).

### Decyzje podjęte
- Re-ranker Chrome AI działa w 100% po stronie klienta (privacy-first, zero modyfikacji serwerowego RAG).
- Dla presetów HIGH/ULTRA domyślnym providerem jest ElevenLabs z automatycznym fallbackiem przy braku klucza.

### Statystyki
- Zmienione/nowe pliki: 12
- TypeScript: PASS (0 błędów)
- Testy: 138 PASS (w tym nowy drift-guard test)


## Podsumowanie sesji: 2026-07-26
Branch: main

### Co zrobiono
- **Ingest bazy MediaWiki XML Fandom Lovecraft Wiki**: Utworzono skrypt `scripts/ingest-lovecraft-wiki.mjs` zamieniający zrzut XML (`wiki-lovecraft_pages_current.xml.7z`) na bazę danych 7 024 czystych haseł Mitów Cthulhu (`data/epochs/lovecraft-mythos/dictionary_wiki.json`).
- **Aktualizacja UI Encyklopedii (`EpochWikiTab.tsx`)**: Dodano przełącznik baz wiedzy (Polska 1990-2000 vs Mity Cthulhu), widoczne plakietki prawne `CC-BY-SA 3.0` oraz `Domena Publiczna`, a także ramkę informującą o autorstwie społeczności Fandom.
- **Aktualizacja Zapisów Prawnych (`NOTICE`)**: Dopisano dedykowaną sekcję regulującą licencję Creative Commons (CC-BY-SA 3.0/4.0) dla treści encyklopedycznych z Fandom Wiki.
- **Weryfikacja produkcyjna**: Przeszedł build produkcyjny Next.js (`npm run build` -> PASS).

### Decyzje podjęte
- Wykorzystano lokalny strumień parsowania XML, eliminując jakiekolwiek zewnętrzne zanieczyszczenia i zapewniając płynność działania aplikacji.
## Podsumowanie sesji: 2026-07-26
Branch: main

### Co zrobiono
- **Przebudowa historii 46 postaci predefiniowanych** w `src/lib/immersion/predefined-characters.ts`:
  - Wdrożono konstrukcję Maska vs Ukryty Strach/Cel oraz nawyki somatosensoryczne i unikalny ton głosu/socjolekt dla każdej z 30 postaci er historycznych (Gaslight 1890s, Classic 1920s, Modern) i 16 postaci z autorskich scenariuszy Strefa 11 (PRL 1970s, Kowary 1990s, Traszyn 1999, Głogów 2001).
  - Zachowano 100% nienaruszalności statystyk mechanicznych CoC 7e, umiejętności oraz wyliczeń pochodnych (HP, SAN, MP, STR-LUCK).
  - Przeprowadzono audyt z subagentami i uruchomiono testy jednostkowe (`npm test -- predefined-characters.test.ts` - 4/4 PASS, `npx tsc --noEmit` - clean).

### Co otwarte (do następnej sesji)
- Przeprowadzenie pełnego przeglądu interfejsu wyboru postaci pod kątem wyświetlania nowych rozwiniętych tekstów biografii.


## Podsumowanie sesji: 2026-07-26 (Encyklopedia Aplikacji & Przewodnik Gracza)
Branch: main

### Co zrobiono
- **Wdrożenie Encyklopedii Aplikacji & Przewodnika Gracza**:
  - `src/lib/data/app-help-data.ts`: utworzono ustrukturyzowane opisy interfejsu (Karta Badacza, Dziennik & Tablica Poszlak, Rzuty & Tacka), mechaniki CoC 7E wirtualnego MG oraz poradnika klimatycznego gracza RPG z protipami do rozmawiania z czatem.
  - `src/components/ui/app-help-modal.tsx`: zbudowano responsywny modal z 3 zakładkami i klimatyczną oprawą Art Déco / Cthulhu Dark.
  - [CthulhuSidebar.tsx](file:///Volumes/Karta/Developer/straznik-tajemnic/src/components/sidebar/CthulhuSidebar.tsx): dodano przycisk "Pomoc & Przewodnik" w sekcji Ustawienia i zamontowano modal.
- **Weryfikacja**:
  - Pomyślnie przeszły testy budowania Next.js & TypeScript (`npm run build`).
  - Git: commit `db5c4b0` zrealizowany i zpushowany na `origin/main`.

### Podjęte decyzje
- Zaplanowanie i separacja treści encyklopedii w osobnym module danych `app-help-data.ts`.
- Wykluczenie nieaktualnego generatora rekwizytów (handoutów) z treści pomocy.
- Całkowite odizolowanie komponentu UI modalu, zapewniające brak wpływu na bieg i stan rozgrywki.

## Podsumowanie sesji: 2026-07-27 (Dynamic Pacing Narracji)
Branch: main

### Co zrobiono
- **Kontekstowy Pacing Narracji (Opcja A)**:
  - Usunięto sztywne progi liczbowe (np. 150-250 słów) z `pacing-controller.ts`.
  - Wdrożono szerokie, dynamiczne progi tempa odpowiedzi:
    - `social` (dialog / wymiana zdań): **do 30–70 słów (1–3 zdania)** – zwięzłe odpowiedzi bez sztucznego lania wody.
    - `exploration` / `investigation`: **do 60–150 słów**.
    - `dream` / `ritual`: **150–300 słów**.
  - Dodano dyrektywę zwięzłości zakazującą rozciągania narracji tłem na siłę przy prostych pytaniach lub dialogu.
- **Aktualizacja Instrukcji i Promptów**:
  - `gm-protocol.ts`: doprecyzowano sekcję `D. TEMPO NARRACJI I ELASTYCZNOŚĆ DŁUGOŚCI`.
  - `default-gm-prompt.md` (zarówno w `public/` jak i w `_tester/_base/.silnik/public/`): zaktualizowano punkt `7. DŁUGOŚĆ I DYNAMIKA (PACING)`.
- **Aktualizacja Paczki Wydaniowej i Build**:
  - `build-tester-pack.sh`: poprawnie zbudowano zaktualizowaną paczkę zip (`Straznik-Tajemnic-AI-0.9.0-beta-Win-Mac-2026-07-17.zip` - 37 MB).
  - Build produkcyjny Next.js (`npm run build`): **PASS** (66/66 stron prerenderowanych bez błędów).

### Co otwarte
- Kod i silnik są w pełni gotowe do rozgrywek solo oraz duet.


## Podsumowanie sesji: 2026-07-27 (Przebudowa Dziennika, Ekwipunku i Biografii)
Branch: main

### Co zrobiono
- **Faza 1 (Biografie Postaci):** Rozbudowano biografie dla wszystkich 30 predefiniowanych badaczy w `predefined-characters.ts` (3 ery x 5 archetypów x 2 płcie). Każdy biogram zawiera głęboki opis A4 (~1000-1400 znaków, 3 akapity: Geneza, Przełom, Motywacja + `[Kluczowa więź]`). Testy 8/8 PASS.
- **Faza 2 (Modal Detalu Ekwipunku & SVG Placeholdery):** Przebudowano `equipment-detail-dialog.tsx` na layout 2-kolumnowy (45% lewy podgląd/placeholder/mapa, prawa kolumna informacje, wartość USD 1920s, CoC 7e mechanika), dodano `equipment-image-placeholder.tsx` dla 8 kategorii, wyeliminowano błędne przyciski "Przeczytaj" dla artefaktów oraz powiększono kontener do 93vw/92vh. Testy 4/4 PASS.
- **Faza 3 (Dziennik Sesji & Odkrycia):**
  - Stworzono `discoveries-view.tsx` łączący dawne Misje i Encyklopedię w jeden zunifikowany interfejs z 4 kategoriami (*Miejsca*, *Postacie*, *Przedmioty*, *Misje*).
  - Wdrożono ciemne scrollbary Art-Deco `.journal-scroll` w `globals.css` oraz zreorganizowano menu `session-journal.tsx` do 4 zakładek (*Tablica Badacza*, *Odkrycia*, *Kronika*, *Notatki*), usuwając ~345 linii martwego kodu.
  - Naprawiono przechwytywanie PointerEvents na kartach tablicy korkowej (`corkboard-investigation-board.tsx`).
  - Zapewniono jedno źródło prawdy (SSOT) dla `convertEntriesToBoardNodes` w `journal-storage.ts`.
- **Faza 4 (Weryfikacja & Build):** `npx tsc --noEmit` PASS (0 błędów), Jest PASS (139/144), Next.js `npm run build` PASS.
- **Dokumentacja (Zew-update):** Zaktualizowano `docs/MAPA-POWIAZAN.md`.

### Decyzje podjęte
- Zachowano lokalny `git commit` bez natychmiastowego `git push` do GitHuba – zgodnie z zaleceniem Jakuba przed weryfikacją na aplikacji z biurka.
- Wykonano pełny `cold-start` i przebudowano instalator `.app` na biurko (`~/Desktop/Strażnik Tajemnic AI.app`) do testowania.
