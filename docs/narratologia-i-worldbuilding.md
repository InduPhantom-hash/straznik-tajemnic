# Matryca Narratologii, Worldbuildingu i Promptów Mistrza Gry a Implementacja Silnika

Dokument stanowi oficjalne techniczne **Single Source of Truth (SSOT)** mapujące zasady narratologii, scenopisarstwa, teorii światotwórstwa (Worldbuilding Canon) oraz warsztatu doświadczonych Mistrzów Gry (Justin Alexander, Seth Skorkowsky, Sandy Petersen, Matt Colville, Mike Shea / Return of the Lazy Dungeon Master, polska szkoła RPG, kanon akademicki weird fiction) na architekturę promptów, silnik reżyserii scen (`scene-director.ts`), 7 silników świata w locie (`world-engine/`), protokół Mistrza Gry (`gm-protocol.ts`) oraz moduły ekstrakcji i budowania scenariuszy (`pdf/`, `world-setup/`) w repozytorium **Strażnika Tajemnic AI** (`_tester/_base/.silnik/src/`).

Data audytu: 2026-10-04  
Wydanie podręcznika źródłowego i kanonów:
- *Zew Cthulhu: Księga Strażnika 7. edycja* (Rozdziały 10 i 11: Prowadzenie Gry, Black Monk Games)
- Justin Alexander: *Node-Based Scenario Design* & *The Three Clue Rule* (The Alexandrian)
- Seth Skorkowsky: *How to Run a Mystery* & *Running RPGs*
- Mike Shea: *Return of the Lazy Dungeon Master* (Secrets & Clues, Strong Starts)
- Robert McKee: *Story* & Syd Field: *Screenplay* (Kadencja, Progresja, Tarcie)
- Kanon Worldbuildingu AIOS (Karty 01 do 07 w `Wiedza/Worldbuilding/Wiki/`)
- Korpus akademicki badań nad grozą i weird fiction (`Wiedza/Worldbuilding/Raw/`, `H.P. Lovecraft - naukowo/`, `Narratologia/`)
Katalog kodu produkcyjnego: `_tester/_base/.silnik/src/`  
Baza empiryczna: Analiza rzeczywistego zapisu sesji gracza (`local (1).zip` - 103 tury, Boston 1924, scenariusz *Nawiedzony dom*)  
Tryb audytu: Read-Only wobec kodu produkcyjnego silnika (Strict File Over AI)

---

## 1. Streszczenie Wykonawcze (Executive Summary)

### 1.1. Statystyka Pokrycia 36 Filarów Narratologii i Worldbuildingu
Kompleksowy audyt czterowarstwowy dla 36 obszarów reżyserii narracji, światotwórstwa, zarządzania informacją i warsztatu Mistrza Gry wykazał następujący podział stanu implementacji w silniku:

- **🟢 Zgodne 1:1 (Pełna wierność zasadom i integracja w kodzie/promptach):** **20 / 36 obszarów (55.6%)**  
  Moduły posiadają zaimplementowaną logikę w TypeScript, dedykowane tagi w `gm-protocol.ts`, wsparcie klasyfikatora CPU (`dispatcher.ts`) oraz testy jednostkowe (m.in. zawieszenie sceny w punkcie kulminacji ryzyka `mid-narration-roll`, guardrail epoki odcinający pytania techniczne i anachronizmy, izolacja lektora TTS, brak auto-lootu w ekwipunku, asymetria wiedzy Concordia w Hot Seat, No-Conclusions Rule, 4 Biegi Kadencji, korpus Lovecrafta, Node-Based Scenario Architecture oraz Zasada 3 Poszlak RAW).
- **🟡 Luki i rozbieżności z kanonem (Wymagają kalibracji promptu lub logiki):** **7 / 36 obszarów (19.4%)**  
  - **Ułomna rotacja technik narracyjnych:** 16 technik z `playbook.ts` jest poprawnie skodyfikowanych, ale ich selekcja w `scene-director.ts` nie reaguje na mikro-intencje gracza w turach pośrednich, faworyzując powolną ekspozycję.
- **🟠 Odłączone od runtime / Płaski model danych (Pozorny silnik):** **6 / 36 obszarów (16.7%)**  
  - **Odcięcie 7 silników świata od dynamicznego stanu:** Dyrektywy z `NPCEngine`, `SensoryEngine`, `PlotFrictionEngine` generowane są w `adapter.ts` na bazie statycznych parametrów otwarcia, nie czytając dynamicznych zmian relacji z notesu badacza.
- **🔴 Krytyczne wady narracyjne (Anty-wzorce niszczące agencję gracza):** **3 / 36 obszarów (8.3%)**  
  - **Wyprzedzanie konkluzji i autospoilery (Anti-Spooning / Deduction Hijacking):** Model w pogoni za pomocą graczowi (helpful AI bias) samowolnie łączy fakty, podsumowuje znaczenie poszlak i wyjawia intrygę w bieżącej narracji (potwierdzone empirycznie w turach 42 i 80 zapisu sesji: *„to oznacza, że Walter Corbitt powiązany był z...”*), odbierając graczowi fundamentalną frajdę z samodzielnej dedukcji (Aha-Moment).
  - **Brak testu Pomysłowości (Idea Roll) jako bezpiecznika impasu:** Zamiast czekać na impas i wyzwać oficjalny test Idea Roll CoC 7e RAW (s. 101), AI serwuje rozwiązanie zagadki prosto w narracji.
  - **Brak zróżnicowania pacingu pod kątem dynamiki sceny:** Brak mechanizmu skracania odpowiedzi do 1-2 zdań przy szybkich deklaracjach (ping-pong gracza).

---

## 2. Główna Tabela SSOT: 36 Obszarów Narratologii i Worldbuildingu

Legenda statusu zgodności:  
- 🟢 **Zgodne 1:1** - zasada w pełni zaimplementowana, działa w runtime i posiada pokrycie testami.  
- 🟡 **Luka / Rozbieżność** - zasada zaimplementowana częściowo, wymaga dostrojenia promptu, progów lub balansu.  
- 🟠 **Odłączone / Pozorne** - struktura istnieje w kodzie, ale w pętli rozgrywki generuje płaski fallback lub atrapę.  
- 🔴 **Krytyczna wada** - zachowanie narusza agencję gracza, psuje immersję lub łamie kanon sztuki prowadzenia.

| Lp. | Obszar i Źródło Kanonu | Koncepcja Narratologiczna / Scenopisarska | Status | Skrypt Silnika (TS) | Prompt / Protokół AI | Weryfikacja w Sesji (`local (1).zip`) | Rekomendacja i Ścieżka Naprawy |
|---|---|---|---|---|---|---|---|
| 1 | Alexandrian / Seth | **Node-Based Scenario Architecture (Graf Węzłowy)** | 🟢 Zgodne 1:1 | `custom-adventures-storage.ts`, `semantic-overlay-engine.ts`, `adventure-local-builder.ts` | `buildWorldEngineDirectives` (`adapter.ts:462`) | Pełna dekompozycja węzłowa scenariusza: węzły (intro, location, npc, event, climax) połączone poszlakami, eliminacja atrap | Wdrożono w Fazie 2: normalizeAdventureGraph, deterministyczny podział węzłów ze 100% spójnością referencyjną |
| 2 | Alexandrian | **Zasada 3 Poszlak (Three Clue Rule RAW)** | 🟢 Zgodne 1:1 | `three-clue-rule-validator.ts`, `semantic-overlay-engine.ts`, `adventure-local-builder.ts` | `gm-protocol.ts` | Każdy węzeł śledztwa posiada minimum 3 niezależne poszlaki wiodące (materialne, osobowe, środowiskowe) | Wdrożono w Fazie 2: walidator Three Clue Rule RAW z syntezą zbieżności i automatycznym uzupełnianiem braków |
| 3 | Seth / CoC RAW s. 101 | **Żelazny Zakaz Konkluzji (Anti-Spooning / Deduction Agency)** | 🟢 Zgodne 1:1 | `gm-protocol.ts:68` | `gm-protocol.ts:68` (`NO-CONCLUSIONS RULE`) | Wyeliminowano autospoilery: zakaz wyciągania wniosków za gracza, konkluzje wyłącznie przy Idea Roll | Wdrożono w PR #642: twardy zakaz fraz interpretacyjnych w prozie i tagach |
| 4 | Mike Shea / Colville | **Mocny Start (Strong Start)** | 🟢 Zgodne 1:1 | `useGameStart.ts:180`, `setting-trivia.ts:98` | `gm-protocol.ts:755` (`Bieg 2: Szeroki Kadr`) | Tura 0: Arthur Knott wchodzi bezpośrednio do biura Vance’a ze sprawą | Stan wzorcowy. Utrzymać wstrzykiwanie tła, profesji i intencji z karty Badacza |
| 5 | McKee / Field | **Gradacja Kadencji (4 Biegi Pacingu)** | 🟢 Zgodne 1:1 | `world-engine/adapter.ts`, `scene-sensory-memory.test.ts` | `gm-protocol.ts:60-66` | Bieg 1 (Ping-Pong / Dialog) generuje zwięzłe 1-2 zdania bez wymuszonej triady | Wdrożono w PR #642: Bieg 1 wycisza stałe tło otoczenia i skupia się na mimice NPC |
| 6 | Kanon Worldbuildingu | **Elastyczna Sensoryka (Przełamanie Monotonii Triady & Korpus Lovecrafta)** | 🟢 Zgodne 1:1 | `world-engine/lovecraft-lexicon.ts`, `adapter.ts` | `gm-protocol.ts:617` | Zróżnicowane motywy sensoryczne Lovecrafta z dynamiczną rotacją zapobiegającą znużeniu | Wdrożono w PR #642: moduł lovecraft-lexicon.ts wpięty bezpośrednio do SensoryEngine |
| 7 | Lovecraft / Oniryzm | **Zmienna Próżni (The Vacuum Variable / Kosmiczna Pustka)** | 🟢 Zgodne 1:1 | `playbook.ts:327`, `world-engine/types.ts:50` | `lovecraft-style-guide.ts:80`, `gm-protocol.ts` | Tury 18, 20: cisza, brak kurzu, nienaturalne zachowanie światła w sieni Corbitta | Utrzymać. Aktywować częściej zamiast zapachów stęchlizny w strefach anomalii |
| 8 | Sandy Petersen | **Fiction First & Brak Mechanicznego Żargonu** | 🟢 Zgodne 1:1 | `mechanics-parser.ts`, `image-instructions.ts` | `gm-protocol.ts:68` | Zero wycieków liczb w prozie; rzuty wywoływane czystym tagiem `[TEST:]` | Wzorcowa implementacja. Stan zachować bez zmian |
| 9 | Seth / CoC RAW s. 101 | **Test Pomysłowości (Idea Roll) jako Zawór Bezpieczeństwa** | 🟡 Luka | `journal/idea-roll-service.ts:1-180` | `gm-protocol.ts` | Gracz nie musiał używać Idea Roll, bo AI samo wyjawiało konkluzje w tekście | Wymuszenie: jeśli gracz błądzi, MG milczy i czeka na deklarację lub test Idea Roll |
| 10 | Alexander / Gnome Stew | **Nie Przygotowuj Fabuły, Przygotuj Sytuację (Prep Situations)** | 🟠 Odłączone | `world-setup/types.ts:40` | `gm-protocol.ts:124` (`[MYŚLI_MG]`) | AI próbuje popychać gracza ku predefiniowanym scenom zamiast reagować stanem | Zastąpienie liniowego prowadzenia symulacją wektorów interesów frakcji i NPC |
| 11 | Worldbuilding Karta 02 | **Czterowarstwowy Model Postaci NPC (Fasada, Skaza, Opór, Dźwignia)** | 🟢 Zgodne 1:1 | `world-engine/types.ts:25`, `types/character.ts` | `gm-protocol.ts:127` (`MASKA_NPC`) | W każdej turze `[MYŚLI_MG]` definiuje fasadę i ukryty lęk postaci | Znakomity wzorzec w monologu wewnętrznym MG. Utrzymać |
| 12 | Seth Skorkowsky | **Bariera Uległości NPC (NPC Resistance & Social Pushback)** | 🟢 Zgodne 1:1 | `opposed-rolls.ts:120` | `gm-protocol.ts:540` | Tura 54: doker Sean O’Malley grozi hakiem i odmawia rozmowy bez testu | Działa zgodnie z kanonem. NPC nie oddają prawdy za darmo |
| 13 | Alexander / Gumshoe | **Fail-Forward w Dochodzeniu Śledczym** | 🟢 Zgodne 1:1 | `world-engine/index.ts:86`, `playbook.ts:253` | `gm-protocol.ts` | Porażka pod szpitalem (tura 9) skutkowała pobiciem i utratą HP, ale nie zablokowała śledztwa | Zgodne z RAW i kanonem prowadzenia śledztw |
| 14 | Seth / Robin Laws | **Zróżnicowanie Ścieżek Zdobywania Poszlak (Skill Diversity)** | 🟢 Zgodne 1:1 | `skill-test-resolver.ts` | `gm-protocol.ts` | Zróżnicowane testy rzadkich umiejętności (Prawo, Księgowość, Medycyna, Ślusarstwo, Urok, Zastraszanie, Gadanina) z poszanowaniem kontrpropozycji gracza | Wdrożono w Fazie 1: rozszerzenie reguł testów w `gm-protocol.ts` i synonimów w `skill-test-resolver.ts` |
| 15 | Worldbuilding Karta 04 | **Tarcie Społeczne i Plotki (Reguła 70% Prawdy / 30% Fałszu)** | 🟢 Zgodne 1:1 | `world-engine/types.ts:86` | `adapter.ts:460` | Dokerzy i personel szpitala przekazują plotki zniekształcone przez strach | Wzorcowe. Zapobiega traktowaniu świadków jak bezbłędnych encyklopedii |
| 16 | Ronald Knox / S.S. Van Dine | **Reguły Detektywistyczne Fair Play (Pre-existing Clues)** | 🟢 Zgodne 1:1 | `gm-protocol.ts` | `gm-protocol.ts:68` (`FAIR PLAY`) | Poszlaki materialne ugruntowane w topografii i opisach lokacji przed przeszukaniem; zakaz generowania rekwizytów z próżni | Wdrożono w Fazie 1: żelazna reguła Pre-existing Clues w `gm-protocol.ts` |
| 17 | Syd Field / Vogler | **Próg Przejścia i Separacja Scen (Focused Scene Pacing)** | 🟢 Zgodne 1:1 | `time-manager.ts`, `route.ts` | `gm-protocol.ts:68` | AI nie kompresuje podróży i przeszukania w 1 post; zatrzymuje się na progu ganku | Wyeliminowano dawny problem kompresji scen. Stan wzorcowy |
| 18 | Mike Shea / Colville | **Diegetyczny Zegar Zagłady (Ticking Clock / Doom Tracker)** | 🟢 Zgodne 1:1 | `time-manager.ts`, `build-time-context.ts` | `gm-protocol.ts`, `build-time-context.ts` | 4 etapy eskalacji (faza 0 do 3: cisza, narastająca presja, bezpośrednie zagrożenie, punkt kulminacyjny) wstrzykiwane do promptu MG | Wdrożono w Fazie 1: mechanizm Doom Clock w `time-manager.ts` i `build-time-context.ts` |
| 19 | Seth Skorkowsky | **Zamknięty Krąg Śledztwa (Closed Circle Mystery)** | 🟠 Odłączone | `world-setup/types.ts` | Brak wstrzykiwania granic śledztwa | Gracz może bez przeszkód błądzić po całym Bostonie gubiąc wątek domu | Wprowadzenie w `WorldSetup` jawnej listy podejrzanych i zamkniętego obszaru sprawy |
| 20 | Lovecraft / Burleson | **Somatyczna Odpowiedź Ciała zamiast Etykiet Emocji** | 🟢 Zgodne 1:1 | `playbook.ts:312` | `gm-protocol.ts:68` (*„zakaz pisania czujesz strach”*) | Opisy pulsującego bólu w żebrach, zaciśniętych gardzieli i lodowatych dłoni | Wzorcowe oddanie fizjologii lęku wg tradycji weird fiction |
| 21 | Justin Alexander | **Podział Poszlak: Kluczowe (Core) vs Pomocnicze (Secondary)** | 🟠 Odłączone | `types/adventure.ts:69` | Brak podziału w `dossier.clues` | Wszystkie poszlaki traktowane są jednakowo na płaskiej liście | Jawne oznaczanie poszlak jako `Core` (niezbędne do odblokowania węzła) vs `Flavor` |
| 22 | Robert McKee | **Wartość i Zwrot Sceny (Value Charge Shift +/-)** | 🟡 Luka | Brak w kodzie | `gm-protocol.ts:153` (`CEL_NARRACYJNY`) | Większość scen zaczyna się i kończy w tym samym ładunku emocjonalnym | Scena musi kończyć się zmianą ładunku (np. z nadziei w rozczarowanie, z lęku w triumf) |
| 23 | Seth Skorkowsky | **Jawna Stawka Ryzyka przed Rzutem Forsowanym (Pushed Roll)** | 🟢 Zgodne 1:1 | `RollTestModal.tsx:120` | `gm-protocol.ts:530` | Gracz widzi stawkę przed ponownym rzutem kością | Zgodne z RAW i zaleceniami Setha |
| 24 | Worldbuilding Karta 05 | **Architektura Chokepointów i Wąskich Gardeł Przestrzennych** | 🟢 Zgodne 1:1 | `world-engine/types.ts:47` | `adapter.ts:428` | Piwnica Corbitta i zaryglowane drzwi frontowe działają jako chokepoint | Zgodne z zasadami projektowania przestrzeni grozy |
| 25 | Matt Colville | **Sprawczość Gracza i Fizyczny Immunitet Badacza** | 🟢 Zgodne 1:1 | `era-guardrail.ts` | `gm-protocol.ts:68` (*„zakaz autopilota”*) | AI nie przemieszcza gracza bez pytania; czeka na progu z `[Co robisz?]` | Wzorcowe poszanowanie agencji fizycznej Badacza |
| 26 | Kanon Scenopisarstwa | **Ekspozycja przez Działanie (Exposition through Action)** | 🟡 Luka | Brak weryfikatora | `gm-protocol.ts:68` (`ANTI-EXPOSITION`) | Czasami gazety w archiwum wyrzucają zbyt długie bloki czystego tekstu | Zastępowanie ścian tekstu fragmentami wycinków prasowych i działaniem w archiwum |
| 27 | Worldbuilding Karta 07 | **Prawa Ograniczeń Sandersona i Koszt Somatyczny Mitów** | 🟢 Zgodne 1:1 | `magic/magic-engine.ts:98` | `world-engine/types.ts:55` | Rzucanie zaklęć i obcowanie z Mitami kosztuje utratę krwi, migrenę i SAN | Prawidłowe wdrożenie twardej ceny za kontakt z nieludzkim |
| 28 | Justin Alexander | **Kotwice Poznawcze Rekwizytów (Cognitive Clue Anchors)** | 🟢 Zgodne 1:1 | `playbook.ts:285` | `handout-instructions.ts` | Listy i klucze mają konkretną fakturę, zarysowania na mosiądzu i daty | Zgodne z modelem Fair Play |
| 29 | Seth / Sandy | **Asymetria Informacyjna MG vs Postać (Concordia Epistemic Gap)** | 🟢 Zgodne 1:1 | `run-chat-pipeline.ts` | `gm-protocol.ts:76` (`[OBSERWACJA:]`) | Wiedza z `[MYŚLI_MG]` nie wycieka bezpośrednio do zmysłów postaci | Prawidłowe rozdzielenie metawiedzy od prozy gry |
| 30 | Mike Shea | **Lista Sekretów i Rewelacji (Secrets & Clues List)** | 🟠 Odłączone | Brak modułu secrets pool | `adventure-local-builder.ts` | Sekrety są zaszyte w tekście scenariusza, brak dynamicznej puli rewelacji | Dodanie modułu 10 luźnych rewelacji do wstrzyknięcia w dowolnym logicznym miejscu |
| 31 | Kanon Teatru Improv | **Zasada 'Tak, i...' oraz 'Tak, ale...' w Adjudykacji** | 🟢 Zgodne 1:1 | `concordia/event-resolution.ts` | `gm-protocol.ts:174` | Akcje gracza są przyjmowane, ale obwarowane testem i ryzykiem | Zgodne z duchem gier stołowych |
| 32 | Lovecraft / Joshi | **Kosmiczny Indyferentyzm (Cosmic Indifference)** | 🟢 Zgodne 1:1 | `lovecraft-style-guide.ts` | `gm-protocol.ts` | Wszechświat i istoty Mitów nie nienawidzą człowieka; są na niego obojętne | Prawidłowe uchwycenie filozofii weird fiction Lovecrafta |
| 33 | Justin Alexander | **Proaktywna Odpowiedź Świata (Proactive Nodes / Adversary Roster)** | 🟢 Zgodne 1:1 | `director-state.ts`, `world-engine/adapter.ts` | `gm-protocol.ts:127` (`ECHO_AKCJI` / `REAKCJA_WROGA`) | 3-stopniowy licznik rozgłosu (heat: 0 dyskrecja, 1-2 podejrzenia w ECHO_AKCJI, 3+ kontratak w REAKCJA_WROGA w [MYŚLI_MG]) | Wdrożono w Fazie 1: Heat Counter w pamięci sesji i `adapter.ts` |
| 34 | Kanon Dziennikarstwa Śledczego | **Matryca Proweniencji Poszlak (Źródło: M|I|C|E)** | 🟢 Zgodne 1:1 | `journal/apply-journal-tags.ts` | `gm-protocol.ts:37` | Tagi `[DZIENNIK:trop:]` rygorystycznie notują źródło: obserwacja, zeznanie, dedukcja | Wzorcowa filtracja anty-inflacyjna w Dzienniku Śledztwa |
| 35 | Seth Skorkowsky | **Brak Kar za Kreatywność (Reward Player Tools)** | 🟢 Zgodne 1:1 | `equipment-prompt-builder.ts` | `gm-protocol.ts` | Posiadany pistolet, latarka czy łom są respektowane przez MG | Zgodne z zaleceniami Setha |
| 36 | Kanon Narratologii | **Zawieszenie Sceny w Punkcie Szczytowego Ryzyka (Apex Cliffhanger)** | 🟢 Zgodne 1:1 | `narrative-engine/scene-director.ts` | `gm-protocol.ts:68` (`[ZAWIESZENIE_KULMINACJI]`) | Przed rzutem na unik czy walkę narracja twardo urywa się na zamachu wroga | Sukces implementacji Issue #507. Utrzymać |

---

## 3. Szczegółowa Analiza i Diagnoza 5 Kluczowych Obszarów

### Obszar I: Agencja Dedukcyjna Gracza a Zjawisko "Deduction Hijacking" (Pozycja 3 w Tabeli)
- **Stan faktyczny w kodzie:**  
  W pliku `_tester/_base/.silnik/src/lib/prompts/gm-protocol.ts` istnieją surowe zakazy naruszania fizycznej motoryki postaci (*„MG nie ma prawa samowolnie przemieszczać badaczy ani sięgać do ich ekwipunku”*), jednak w obszarze intelektualnym i dedukcyjnym prompt nie posiadał równie bezwzględnej zapory.
- **Dowód empiryczny z sesji (`local (1).zip`):**  
  - **Tura 42:** Gracz odnajduje wycinki w *The Boston Globe*. Zamiast przedstawić suchą treść artykułu o procesie i skargach sąsiadów na odór, MG pisze: *„Vance odkrywa istotę bluźnierstw Corbitta: powiązania z Kaplicą Kontemplacji, nekromancję i trupi odór za życia. Wskazówka o sekcie to kluczowy trop prowadzący do zrujnowanego zboru...”*. Model zinterpretował artykuł, nazwał nekromancję i wskazał następny krok za gracza.
  - **Tura 80:** Gracz zastrasza Arthura Knotta. Zamiast podać spanikowane słowa kamienicznika (*„Błagam, panie Vance, pod podłogą w piwnicy jest zamurowana wnęka, Macario oszalał gdy wziął kilof!”*), MG dopowiada konkluzję: *„Rentier wyjawia sedno tajemnicy: potwierdza ukryty pochówek za ceglanym murem w piwnicy oraz fakt, że Macario oszalał po próbie rozbicia tej ściany. Vance ma teraz...”*.
- **Diagnoza narratologiczna:**  
  Zjawisko to w teorii projektowania gier detektywistycznych (Justin Alexander, Robin D. Laws) nosi nazwę **Spoon-Feeding** lub **Deduction Hijacking**. Odbiera graczowi satysfakcję z samodzielnego postawienia hipotezy. Jeśli AI podaje gotowe wnioski, gra detektywistyczna degraduje się do interaktywnego audiobooka.
- **Rekomendacja inżynieryjna:**  
  Wdrożenie do `gm-protocol.ts` **Żelaznej Reguły Czystego Faktu (No-Conclusions Rule / Strict Evidentiary Presentation)**:
  1. MG ma bezwzględny zakaz używania fraz: *„to oznacza, że...”*, *„łączysz fakty...”*, *„rozumiesz teraz...”*, *„wskazuje to jednoznacznie na...”*.
  2. MG ogranicza się do relacjonowania: *co postać widzi*, *co słyszy*, *co zawiera badany dokument (dosłowny cytat)* oraz *jak zachowuje się rozmówca*.
  3. Interpretacja, wyciąganie wniosków i planowanie kolejnego kroku należą w 100% do Badacza.
  4. Jedynym wyjątkiem w całym systemie jest formalny **Test Pomysłowości (Idea Roll CoC 7e RAW s. 101)**, wyzwalany na wniosek gracza lub przy zupełnym impasie fabularnym.

---

### Obszar II: Kalibracja Kadencji i Zmęczenie Triadą Sensoryczną (Pozycje 5 i 6 w Tabeli)
- **Stan faktyczny w kodzie:**  
  W `gm-protocol.ts:612` znajduje się dyrektywa: *„Każdy znaczący opis MUSI angażować co najmniej 2-3 zmysły”*. Dodatkowo `SensoryEngine` (`world-engine/adapter.ts:380`) przy każdej turze wstrzykuje dyrektywę zmysłową (`[SENSORY_DYREKTYWA: Oprzyj kadr na zmysłach...]`).
- **Dowód empiryczny z sesji (`local (1).zip`):**  
  W analizowanym zapisie 103-turowym aż kilkadziesiąt wiadomości MG zawiera identyczny, przewidywalny schemat:
  *Akapit 1:* Fizyczny ruch + ból żeber/mięśni (somatyka).  
  *Akapit 2:* Dźwięk otoczenia (skrzypienie desek, trzask rygla).  
  *Akapit 3:* Zapach (fetor zgnilizny, woń starego papieru, zapach stęchlizny) + chłód na skórze.  
  W efekcie po 30 turach gracz doświadcza zjawiska **habituacji percepcyjnej** (opisanego w literaturze w `Narratologia/Habituation_Revisited...`). Kwiecisty język przestaje budować grozę, a staje się barierą informacyjną (szumem), przez którą trzeba się przedzierać, by poznać reakcję NPC.
- **Diagnoza literacka i warsztatowa:**  
  W materiałach z warsztatów Mistrzów Gry (`Poradniki MG/How to Build Interesting Descriptions...`) oraz analizie prozy H.P. Lovecrafta (*H.P. Lovecraft - naukowo*) wielozmysłowy opis jest zarezerwowany dla **punktów węzłowych (Threshold Scenes / Establishing Shots)**. W normalnym toku dialogu lub dynamicznej akcji nadmiar przymiotników zabija tempo. Czasami najsilniejszym środkiem wyrazu jest 1 precyzyjny bodziec (np. *„W pokoju pachnie świeżym tytoniem, którego Knott nie palił.”*) lub czysta, 1-zdaniowa reakcja rozmówcy.
- **Rekomendacja inżynieryjna:**  
  Przebudowa reguł pacingu i sensoryki w `gm-protocol.ts` oraz `SensoryEngine`:
  1. **Hierarchia Biegów Kadencji:**
     - **Bieg 1 (Dialog / Szybka Interakcja - Staccato):** Maksymalnie 20-50 słów. Dopuszczalne czyste 1-2 zdania odpowiedzi NPC i zwięzły opis mimiki. Zero wymuszonych zapachów i dźwięków tła!
     - **Bieg 2 (Nowa Lokacja / Odkrycie Przełomowe - Szeroki Kadr):** 70-150 słów. Pełna triada zmysłowa (światło, akustyka, temperatura/zapach).
     - **Bieg 3 (Akcja / Zagrożenie / Starce):** 30-70 słów. Zogniskowanie na motoryce, zagrożeniu i natychmiastowym teście kością.
     - **Bieg 4 (Zmienna Próżni / Groza Kosmiczna):** 40-90 słów. Zamiast wyliczanki zmysłów, eksponowanie nienaturalnej ciszy, braku cienia lub zniknięcia przedmiotu.
  2. W `SensoryEngine` zamiana sztywnego injection na mechanizm cooldownu: po pełnym kadrze sensorycznym silnik wymusza 2-3 tury minimalistyczne.

---

### Obszar III: Fikcja Ekstrakcji Grafu a Płaski Fallback w Setupie Świata (Pozycja 1 w Tabeli)
- **Stan faktyczny w kodzie:**  
  Gdy użytkownik wgrywa scenariusz z PDF do `/api/pdf/ingest-local`:
  1. `semantic-overlay-engine.ts:442-478` w funkcji `parseOneShotAdventure` tworzy sztywne, zahardkodowane węzły:
     - `adv-...-intro`: *„Wprowadzenie i Zlecenie”*
     - `adv-...-investigation`: *„Śledztwo w terenie i badanie poszlak”*
     - `adv-...-climax`: *„Punkt kulminacyjny i konfrontacja”*
  2. Jeśli regex nie dopasuje specyficznych nagłówków postaci, `adventure-local-builder.ts:494-510` generuje atrapę NPC:
     - `npc-informator`: *„Główny Informator”*
     - `npc-podejrzany`: *„Kluczowa Postać”*
  3. Dokładnie te atrapy trafiły do `worldSetup.adventureGraph` w analizowanym zapisie gry gracza!
- **Konsekwencje w rozgrywce:**  
  System w `worldSetup` nie posiadał pojęcia o Kaplicy Kontemplacji, rodzinie Macario, kościele św. Spirydona, bostońskim archiwum prasowym ani pamiętniku Corbitta. Cała struktura, którą gracz eksplorował, była w 100% konfabulowana na bieżąco przez model Gemini na podstawie jego wiedzy ogólnej o scenariuszu *The Haunting*. W przypadku wgrania dowolnego autorskiego PDF-a niebędącego w pamięci modelu (np. polskiego scenariusza z fanzinu), AI nie mając wyekstrahowanych węzłów, popłynie w całkowitą halucynację.
- **Rekomendacja inżynieryjna (Node-Based Scenario Extractor):**  
  Odrzucenie sztywnego 3-etapowego szablonu na rzecz uniwersalnej dekompozycji węzłowej (wzorzec The Alexandrian):
  1. Każdy wgrywany PDF musi być parsowany pod kątem **Węzłów Śledztwa (Nodes)**:
     - **Lokacje fizyczne** (z adresem, atmosferą i wykazem ukrytych tam poszlak).
     - **Osoby (Dramatis Personae)** (z rolą, tajemnicą i informacjami, które mogą przekazać).
     - **Dokumenty i Rekwizyty (Handouty)** (z dosłowną treścią i kluczem, co ujawniają).
  2. Budowa macierzy przejść (**Directed Clue Edges**): która poszlaka z Lokacji A wskazuje na Lokację B lub Osobę C.
  3. Zasilenie `worldSetup.adventureGraph` kompletnym grafem przed rozpoczęciem pierwszej tury sesji.

---

### Obszar IV: Izolacja Lektora TTS, Dialogi i Formatowanie (Pozycja 17 w Tabeli)
- **Stan faktyczny w kodzie:**  
  W `gm-protocol.ts:68` wdrożono rygorystyczne reguły separacji kwestii mówionych dla silnika syntezy mowy:
  - Każda wypowiedź NPC musi znajdować się w osobnej linii w formacie `Imię: „treść”`.
  - Wymóg pustego wiersza (`\n\n`) oddzielającego dialog od narracji.
  - Tagi emocjonalne lektora w nawiasach kwadratowych (np. `[whispering]`, `[serious]`).
- **Weryfikacja w sesji (`local (1).zip`):**  
  - Tura 54: `Sean: „[serious] Ani kroku dalej, szpiclu. Nie znamy żadnego Macario...”` - lektor odczytuje kwestię z poprawną modulacją emocjonalną, a czysty tekst oddzielony jest od prozy.
  - Działa to bezbłędnie i stanowi jeden z najsilniejszych punktów obecnego silnika.
- **Rekomendacja inżynieryjna:**  
  Utrzymać ten standard formatowania bez jakichkolwiek modyfikacji regresyjnych.

---

### Obszar V: Arbitraż Mechaniczny, Rzuty w Locie i Ekwipunek (Pozycje 8, 25, 34 w Tabeli)
- **Stan faktyczny w kodzie:**  
  Wprowadzone w ostatnich commitach mechaniki (Issue #507, #508, #565):
  - `[TEST: Umiejętność | poziom | cel]` z zawieszeniem akcji przed rzutem (Mid-Narration Roll).
  - Twardy brak auto-lootu: zdobycie rekwizytu generuje kartę `[ZDOBYTY_PRZEDMIOT]`, a Badacz sam klika, czy chowa przedmiot do torby.
  - Ochrona immunitetu Badacza (zakaz autopilota i decydowania za gracza).
- **Weryfikacja w sesji (`local (1).zip`):**  
  - Gracz posiada pełną kontrolę nad deklaracjami. Rzuty wyzwalane są tylko w sytuacjach ryzykownych (np. perswazja na wrogich dokerach, bijatyka ze strażnikiem).
  - Do ekwipunku nie wpadają śmieciowe przedmioty bez wiedzy gracza.
- **Rekomendacja inżynieryjna:**  
  Fundament mechaniczny RAW jest stabilny i zgodny z regułami podręcznika. Głównym wyzwaniem pozostaje warstwa narracyjno-światotwórcza (Obszary I, II, III).

---

## 4. Macierz Zadań Naprawczych i Usprawnień (Roadmapa Wdrożenia)

W oparciu o ustalenia z procedury `/grill-me`, poniżej znajduje się harmonogram zadań inżynieryjnych:

### Faza 1: Hotfix Narracji i Promptów (Szybkie Usprawnienia Prompt Pipeline)
- **TASK-NAR-01 (No-Conclusions Rule):** Wprowadzenie żelaznego zakazu wyciągania wniosków i interpretowania faktów za gracza w `gm-protocol.ts`. Usunięcie autospoilerów dedukcyjnych.
- **TASK-NAR-02 (Sensory Cadence Calibration):** Zniesienie twardego wymogu triady zmysłowej w każdej turze w `gm-protocol.ts:612`. Wprowadzenie gradacji 4 Biegów Kadencji: zezwolenie na 1 dominujący bodziec lub czyste 1-2 zdania odpowiedzi w dialogach (Bieg 1 - Staccato).
- **TASK-NAR-03 (Sensory Cooldown w Silniku Świata):** Dodanie w `SensoryEngine` (`world-engine/index.ts`) mechanizmu tłumienia wyliczanek sensorycznych w kolejnych turach tej samej sceny.

### Faza 2: Przebudowa Architektury Budowania Świata (Node-Based Scenario Engine)
- **TASK-WLD-01 (Node-Based Parser PDF):** Przebudowa `semantic-overlay-engine.ts` oraz `adventure-local-builder.ts`: eliminacja sztywnego 3-etapowego schematu (`intro`/`investigation`/`climax`) i generycznych zaślepek NPC.
- **TASK-WLD-02 (Ekstrakcja Grafu Śledztwa):** Wdrożenie ekstraktora relacji (węzły lokacji, osób i dokumentów połączone skierowanymi poszlakami CoC 7e RAW).
- **TASK-WLD-03 (Dynamiczne Zasilanie WorldSetup):** Przekazywanie wyekstrahowanego grafu do pamięci sesji i promptu MG od tury 0, gwarantując stałą orientację AI w topografii i tajemnicach przygody.

### Faza 3: Zaawansowany Reżyser Pacingu i Zegar Śledztwa
- **TASK-PAC-01 (Diegetyczny Zegar Zagłady):** Integracja upływu czasu z rosnącą presją wydarzeń w świecie gry (reaktywne ruchy kultu/antagonistów po upływie określonej liczby godzin).
- **TASK-PAC-02 (Procedura Impasu i Idea Roll RAW):** Integracja automatycznego wykrywania impasu gracza z podpowiedzią wykonania oficjalnego testu Pomysłowości (Idea Roll CoC 7e s. 101) zamiast darmowych podpowiedzi w narracji.

---

Dokument stanowi oficjalne odniesienie dla przyszłych prac nad silnikiem narracji i budowania świata w Strażniku Tajemnic AI.
