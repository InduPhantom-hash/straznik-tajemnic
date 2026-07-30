## Podsumowanie sesji: 2026-07-29 (Sekcja 3.6 Immersja UI)
Branch: main

### Co zrobiono
- **Dokumenty Diegetyczne (Etap 3.6):** Wdrożono szczegółowy układ CSS i Tailwind dla znalezionych w trakcie gry biletów (`ticket`) oraz wyrwanych kartek notatnika (`journal_page`) w komponencie `diegetic-document-viewer.tsx`.
- Potwierdzono, że logika parserów `acquired-equipment.ts` po obu stronach repozytorium (Główne vs `_tester`) działa poprawnie.

### Co otwarte (do następnej sesji)
- Zgodnie z wcześniejszymi notatkami w `state.md` czeka nas dalsza stabilizacja immersji (Etap 3.6) – m.in. wsparcie dla awatarów NPC na czacie czy Przebudowa Predefiniowanych Badaczy.

### Decyzje podjęte
- Odseparowano logikę wizualną w osobnych blokach `if`, utrzymując stary, domyślny fallback "Listu Osobistego", tak aby dawne zapisy stanu gry z niesprecyzowanym do końca `documentType` nie zostały ucięte przez wybredny interfejs.

## Podsumowanie sesji: 2026-07-27 (Noc II)
Branch: main

### Co zrobiono
- **Przesyłanie `characterId` w Hot Seat:** Naprawiono błąd gubienia identyfikatora postaci wybranej z listy rozwijanej podczas podnoszenia przedmiotu na czacie.
- **Aktualizacja sygnatur typów:** Rozszerzono `ChatWindowProps` i `MessageCardProps` o opcjonalny parametr `characterId?: string` w `onConfirmAcquiredItem`.
- **Prop-drilling i domknięcie TODO:** Przekazano `characterId` w `message-card.tsx` z `AcquiredItemCard` wyżej w hierarchii aż do gotowego hooka `useChat.ts`.
- **Weryfikacja:** Wykonano udaną kompilację produkcyjną `npm run build` (TypeScript PASS).

### Co otwarte (do następnej sesji)
- Dalsze wsparcie / stabilizacja Tablicy Badacza & Ekwipunku według Roadmapy v0.9.3.
- Rozważenie implementacji wersji angielskiej EN / Multi-LLM BYOK.

### Decyzje podjęte
- Zachowano pełną wsteczną kompatybilność dzięki opcjonalnemu charakterowi parametru `characterId?: string`.

## Podsumowanie sesji: 2026-07-27 (Noc)
Branch: main

### Co zrobiono
- **Przebudowa Dziennika (Odkrycia):** Refaktor `discoveries-view.tsx` na klimatyczne "Akta Śledcze" (jasny twardy papier, czcionka imitująca maszynę do pisania Special Elite, pieczątka poufne, polaroidy dopinane spinaczem).
- **Auto-Loot na czacie:** Uproszczenie `acquired-item-card.tsx` dla trybu Solo (dyskretny tekst ładowania w tle) i Hot Seat (skondensowany miniformularz przypisania).
- **Naprawa typów encyklopedii:** Rozszerzono filtry `CATEGORIES` w Dzienniku o powiązanie nowszych (encyclopedia_item) jak i starych kluczy wpisów.
- **Dodanie testów (TDD follow-up):** Dodano plik `discoveries-view.test.tsx` pokrywający nowe interakcje w Dzienniku, testy przechodzą pomyślnie. Zabezpieczono wyszukiwarkę optional-chainingiem.
- Utworzono dokumentację fazy Research i Planów we właściwych lokalizacjach `.agent/`.

### Co otwarte (do następnej sesji)
- Skonfigurować z backendem przesyłanie parametru `characterId` w trybie Hot Seat z miniformularza `acquired-item-card.tsx` (obecnie pozostawiono odpowiednie `TODO` na karcie wyższej - `message-card.tsx`).

### Decyzje podjęte
- Wybrana opcja Auto-Lootu zakłada istnienie mechaniki wyboru postaci tylko w Hot Seat / Duet, z całkowicie przezroczystym automatyzmem dla gracza solowego, niezaśmiecającym UI.

# Session Notes

## Podsumowanie sesji: 2026-07-27 (Wieczór)
Branch: main

### Co zrobiono
- **Ekstrakcja Typów**: Wydzielono `ExtendedJournalEntry` z wnętrza `session-journal.tsx` do globalnego repozytorium `src/lib/types.ts`.
- **Łatanie wycieków do Tablicy**: Do `convert-entries.ts` wprowadzono bezpieczne typy (usunięto `as unknown`) oraz ostatecznie obwarowano przepuszczanie wpisów `journal` i `note`, przez co przestały lądować na siatce Tablicy Badacza.
- **Bezpieczeństwo kordów (Tests)**: Stworzono obszerną suite testową w `convert-entries.test.ts` za pomocą frameworku Jest. Udowodniono działanie persystencji (X,Y) starych kart oraz logiczną izolację nowych wpisów kaskadowych.
- **Zimny Start & Zakończenie**: Wykonano procedurę `/zew-zimny`, przeczyszczono przeglądarkę i cache oraz zrzucono save'y, na koniec przebudowując cały `.app`.

### Decyzje podjęte
- Zablokowano modyfikacje UI logiki `session-journal.tsx` (Rabbit Hole). Konwerter `convertEntriesToBoardNodes` podlega teraz rygorowi typowania z `types.ts`.

## Podsumowanie sesji: 2026-07-27
Branch: main

### Co zrobiono
- **Synchronizacja tagów i Dziennika**: Ujednolicono nazwy tagów między parserem MG (`journal-parser.ts`, `types.ts`) a Dziennikiem Sesji (`session-journal.tsx`), co rozwiązało problem "pustych odkryć" i błędnego domyślnego typu dla nowej notatki.
- **Logika podnoszenia przedmiotów**: Wdrożono autoselekcję dla 1 gracza (Solo) i wybór z listy rozwijanej dla 2+ graczy (Hot Seat/Duet) w `acquired-item-card.tsx`.
- **Wpisy o przedmiotach**: Dodano automatyczne generowanie wpisu typu `item` w Dzienniku po zaakceptowaniu przedmiotu.
- **Czystość Tablicy Badacza**: Odcięto automatyczne trafianie ogólnych wpisów `journal` i `note` na korkową tablicę w `convert-entries.ts`.
- **Redesign UI Dziennika**: Przebudowano interfejs `session-journal.tsx` do ciemnego stylu Art Déco (mosiężne ramki, nagłówki Cinzel, tło zbieżne z Kartą Postaci).
- **Zimny Start**: Wykonano procedurę `/zew-zimny`, pomyślnie zweryfikowano i przebudowano aplikację desktopową.

### Decyzje podjęte
- Notatki gracza oraz ogólne wpisy kroniki nie pojawiają się automatycznie na Tablicy Badacza (wymagają ręcznego powiązania).
- Podniesiony przedmiot automatycznie tworzy notatkę fabularną w zakładce Odkrycia -> Przedmioty.

## Podsumowanie sesji: 2026-07-27
Branch: main

### Co zrobiono
- **Persystencja Tablicy Badacza:** Powstrzymano konwerter `convert-entries.ts` od nadpisywania pozycji kart, zachowując wybrane przez gracza współrzędne (X,Y) po wczytaniu Save'a.
- **Kaskadowe Nowe Dowody:** Nowe dowody trafiają do rogu tablicy, zapobiegając całkowitemu mieszaniu siatki z istniejącymi elementami.
- **Fałszywe Tropy (Red Herrings):** Prompt Mistrza Gry został wzbogacony o dawkowanie "Fałszywych Tropów" z ok. 20% szansą przy zwykłym sukcesie.
- **Oddzielenie Ekwipunku:** Sprzęt użytkowy z generatora nie wpływa na poszlaki.

### Decyzje podjęte
- Zachowano układ Tablicy Badacza jako swobodny layout oparty o Drag&Drop gracza zamiast sztywnej siatki wymuszanej algorytmicznie. Zabezpieczono stary kod.
## Podsumowanie sesji: 2026-07-27
Branch: main

### Co zrobiono
- **equipment-detail-dialog.tsx**: Rozszerzono modal do formatu szerokoekranowego (90vw) z immersyjnym tłem (rozmycie + mosiężne ramki).
- Zintegrowano `DiegeticDocumentViewer` poprzez nałożenie `max-w-4xl` wewnątrz powiększonego dialogu ekwipunku w celu bezpiecznego utrzymywania layoutów dokumentów.
- **predefined-characters-selector.tsx**: Zmodyfikowano kafelki Ekwipunku gracza (mroczne gradienty na najechanie kursorem, mosiężne retro cieniowanie).

### Co otwarte (do następnej sesji)
- Globalny refactor generycznego fallbacku dla brakujących obrazków (obecnie radzi sobie z tym inline `onError`).



## Podsumowanie sesji: 2026-07-29 13:02
Branch: main

### Co zrobiono
- Zaktualizowano i ustrukturyzowano żądania API Gemini (responseMimeType: 'application/json').
- Silne typowanie węzłów i zabezpieczenie parsera PDF (route.ts, AdventureGraph).
- Aktualizacje w fallbackach dla własnych przygód oraz we wstrzykiwaniu do bazy wektorowej (useCustomAdventures.ts, retrieval-service.ts, vector-types.ts).
- Dodano brakujące interfejsy dla zdarzeń dziennika oraz obrazów w starszych modułach.

### Co otwarte (do następnej sesji)
- Usunięcie wielu nagromadzonych błędów, zgłoszonych przez Użytkownika. Nowa sesja intake'owa przedstawi problemy i przydzieli tickety.

## Podsumowanie sesji: 2026-07-29 (Sekcja 1 UI/UX)
Branch: main

### Co zrobiono
- Naprawiono brakujące zmienne dla scrollbarów w jasnym motywie (`globals.css`)
- Przywrócono widżet pogody z ikony `lucide-react` w pełnym trybie zegara (`campaign-clock.tsx`)
- Wdrożono szczelniejszy regex odcinający logi modelu z obrazami "Prompt LLM: " + wprowadzono nowe instrukcje testowe.

### Co otwarte (do następnej sesji)
- Sekcja 2 Roadmapy (Ekwipunek i Finanse).

### Decyzje podjęte
- Zmiany zatwierdzono semantycznie.

## Podsumowanie sesji: 2026-07-29 (Sekcja 2)
Branch: main

### Co zrobiono
- **Odzyskanie Ekwipunku:** Zintegrowano wyrzucone pliki `.ts` oraz `.test.ts` odpowiadające za Ekwipunek z archiwum testera bezpośrednio do głównej struktury `src/lib/`.
- **Ekonomia i Finanse:** Wdrożono nowy plik `credit-rating.ts` wprowadzający system majętności (Biedny/Zamożny itp.) uniezależniając w ten sposób kod UI od starych, twardych deklaracji ról postaci. Podpięto pod `equipment-modal.tsx`.
- **UI Fallbacki:** Zlikwidowano usterki pętli przy renderowaniu pustych obrazów na Tablicy Badacza oraz w Dzienniku Sesji, zamieniając twarde ucinanie (display=none) na bezpieczne załadowanie ikon SVG. Zabezpieczono komponenty przed Infinite Loop.

### Co otwarte (do następnej sesji)
- Implementacja systemu generowania dokumentów fabularnych (część 3 z Intake).
- Rozbudowa testów dla logiki Ekwipunku pod root environment.

### Decyzje podjęte
- Pomyślnie użyto systemu testowego `convert-entries.test.ts` do weryfikacji izolacji logiki Dziennika z Ekwipunkiem. Odstąpiono od modyfikacji plików CI/CD w ramach tej sesji.

## Podsumowanie sesji: 2026-07-29
Branch: main

### Co zrobiono
- Zidentyfikowano właściwą ścieżkę kodową: odkryliśmy, że aktualny kod silnika gry znajduje się w `_tester/_base/.silnik/`, a główny `src/` to martwa odnoga.
- Rozszerzono `createAcquiredEquipmentSeed` w parserze ekwipunku (`_tester/_base/.silnik/src/lib/acquired-equipment.ts`), tak aby po przyznaniu dokumentu na czacie poprawnie przypisywany był właściwy `documentType`.
- Poprawiono błędy z wyrażeniami regularnymi dla typów dokumentów dziennikarskich (`press_pass`) i gazet (`newspaper`) w `inferDocumentType`.
- Utworzono pliki z planami i zapiskami dla sztucznej inteligencji w `.agent/`.

### Co otwarte (do następnej sesji)
- Brak dobrego pokrycia testami nowej funkcji przypisywania podtypów w pliku `acquired-equipment.test.ts`.
- Naprawa uszkodzonych, starych testów (PDF, Investigator Board, generate-starting), które nie przechodzą w silniku.

### Decyzje podjęte
- Konsekwentnie ignorujemy testy z głównego katalogu na rzecz testowania zaizolowanego silnika w `_tester/_base/.silnik/`.

## Podsumowanie sesji: 2026-07-29
Branch: main

### Co zrobiono
- **Test Coverage (Faza 1)**: Dodano 9 testów jednostkowych w `acquired-equipment.test.ts` weryfikujących zachowanie `inferDocumentType` i fallbacku `documentType`.
- **Naprawa Tablicy Śledczej (Faza 2)**: Zmodyfikowano `investigator-board.tsx`, zastępując renderowanie na podstawie `localNodes` użyciem przefiltrowanej tablicy `filteredNodes`. Zsynchronizowano cykl życia Hooka tak, aby filtry działały płynnie z systemem drag & drop.
- **Naprawa Testów PDF Ingest (Faza 2)**: Zaktualizowano mocki wektorowej bazy lokalnej w `route.test.ts`, przez co test asercji klucza i środowiska wreszcie przechodzi na zielono.
- **Logika generowania broni (Faza 2)**: Zastosowano funkcję `resolveEraVisualProfile` do prawidłowego rozwiązywania parametrów dat w promptach na sztywne identyfikatory epoki (np. 1946 -> 1940s) podczas ładowania assetów graficznych broni.
- Wszystkie 158 testów w środowisku `.silnik/` świeci się na zielono.

### Co otwarte (do następnej sesji)
- Implementacja UI Fallbacku dla brakujących obrazków (Globalny `SafeImage`).
- Zmiany fabularne (Diegetic Documents) przygotowane w osobnym planie (z wcześniejszego researchu).

### Decyzje podjęte
- Postanowiono użyć szybkiego rzutowania typów mocków `as any` dla instancji `localVectorStore`, aby zredukować narzut tworzenia sztywnych atrap dla złożonych klas bazy wektorowej.

## Podsumowanie sesji: 2026-07-29
Branch: main

**Co zrobiono:**
- Wdrożenie komponentu `SafeImage` z dyskretnym fallbackiem sepia-Lucide.
- Oczyszczenie 25 komponentów UI i zastąpienie zagnieżdżonych struktur `img` bezpiecznym wrapperem.
- Zaktualizowanie backlogu w `state.md` (odłożono logikę parserów dokumentów i design biletów).

**Co otwarte (do następnej sesji):**
- Synchronizacja logiki `documentType` (parserów).
- Przebudowa układu CSS dla biletów i notatnika w `DiegeticDocumentViewer`.

**Decyzje podjęte:**
- Celowe pominięcie upiększania layoutu biletów (vibe-coding focus) na rzecz szybkiej izolacji krytycznego błędu "infinite loop" z obrazkami.

## Podsumowanie sesji: 2026-07-29 (Diegetic Documents UI)
Branch: main

### Co zrobiono
- **Rozszerzenie logiki parsera:** Wprowadzono typ "ticket" do DocumentSubType oraz dodano regex wyłapujący "bilety", "wejściówki" i "karnety" w acquired-equipment.ts. Dodano również asercje do testów.
- **Wizualizacje biletów i notatników:** Wdrożono w diegetic-document-viewer.tsx style Tailwind odpowiadające za wyświetlenie biletu (podzielony układ poziomy, charakterystyczny layout z grubą czcionką numeryczną) oraz z wyśrodkowanej kartki notatnika (liniatura, zagięty rożek/taśma).
- **Testy pomyślne:** 159/159 testów świeci się na zielono.

### Co otwarte (do następnej sesji)
- Implementacja etapu 0.5 (Onboarding & Quick Setup Flow).

### Decyzje podjęte
- Wybrano flat design wspierany wyłącznie wbudowanym Tailwindem (bez zaciągania assetów z zewnątrz). Zaakceptowano surowe testowanie w Spec Quality Gate przed kodowaniem UI.

## Podsumowanie sesji: 2026-07-29
Branch: aktywnego-brancha

### Co zrobiono
- Zintegrowano Roadmapę do state.md
- Zrealizowano stabilizację immersji: notatki PredefinedCharacter, portrety NPC w render-sections, parser biletów w acquired-equipment

### Co otwarte
- Etap 3.5: Generatory Fabularne

### Decyzje podjęte
- Rozszerzono PredefinedCharacter o tacticalNotes bez dotykania bazowego Character

## Podsumowanie sesji: 2026-07-29
### Co zrobiono
- Zaimplementowano Hard-loading screen (Sekcja 4) zasłaniający UI podczas buforowania pierwszego fragmentu TTS z timeoutem 6s.
- Zabezpieczono UI przed zawieszeniem poprzez rygorystyczne zdejmowanie timera oraz odblokowanie okna po wyjątku startu (try-catch useGameStart).

## Podsumowanie sesji: 2026-07-29 (Etap 0.5)
Branch: main

### Co zrobiono
- **Zabezpieczenia:** Usunięto deweloperskie obejście `localMode = true` z `useFirstRun.ts`. Weryfikacja fizycznego klucza (BYOK) działa poprawnie i uszczelnia system przed omijaniem kreatora.
- **Interfejs (UI):** Zaimplementowano nowy `WelcomeScreen` (Czysty Ekran). Stare, zajmujące miejsce kafelki (`onboarding-buttons.tsx`) zostały wykasowane, a w ich miejsce wpięto nowy, odseparowany komponent `StartModeCards` z dwoma przyciskami ("Szybka Przygoda" i "Ustawienia Ręczne").
- **Naprawy E2E:** Zaktualizowano i naprawiono przestarzałe asercje Playwright (`homepage.spec.ts`, `feature-2-game-start.spec.ts`) - zlikwidowano fałszywe przejścia (ślepe asercje na `__NEXT_DATA__` i pomijanie przez SSR hydration).
- **TypeScript & Dług (Tech Debt):** Naprawiono brakujące typowanie `stopCurrentAudio` w interfejsie TTS oraz niejawne wycieki `any` w `page.tsx` i `useGameStart.ts`.

### Co otwarte (do następnej sesji)
- Implementacja logiki za nowymi przyciskami "Szybka Przygoda" (Krok 3/4) i "Ustawienia Ręczne".

### Decyzje podjęte
- Testy E2E poświadczają stabilność na Next.js App Router bez sztywnych asercji na stary routing i ucieczek hydratacyjnych (zastosowano node fs i locator.or()).

## Podsumowanie sesji: 2026-07-29 (Sekcja 4 - UI i Ekran Ładowania)
Branch: main

### Co zrobiono
- **Faza 1 (UI Dziennika Sesji)**: Masowa aktualizacja `session-journal.tsx` (w katalogu głównym i `.silnik`). Usunięto mosiężne i brązowe kolory (`brass`, `#14110c`, `#bfa15f`) na rzecz chłodnego grafitu i szmaragdowych akcentów (`zinc-950`, `emerald-500`), ujednolicając styl z resztą UI Badacza.
- **Faza 2 (Hard-Loading Screen)**: Całkowicie przebudowano ekran ładowania TTS (`tts-hard-loading-screen.tsx`). Zamiast półprzezroczystego tła jest nieprzejrzysta czerń z pulsującą szmaragdową poświatą, a ikony i fonty zmieniły kolor z mosiądzu na zieleń.

### Co otwarte (do następnej sesji)
- **Faza 3 (Portrety NPC i Sceny w czacie)**: Wdrożenie zaktualizowanego planu – wymuszenie na LLM używania tagu `[PORTRET: ...]` i `[SCENA: ...]`, zmiana logiki parsera (`media-parser.ts`) i `useChat.ts`, aby przekazywać proporcje `aspectRatio` do `/api/imagen`, a na koniec renderować avatary ze stylem w linii w komponencie wiadomości.

### Decyzje podjęte
- **API Obrazów**: Odkryto, że `/api/imagen` i natywne API Gemini 2.5 Flash obsługuje pole `aspectRatio`. Dzięki temu rezygnujemy ze skomplikowanego kadrowania CSS, przerzucając to na LLM i API. Zdefiniowano twarde "Boundaries" dla Fazy 3.

## Podsumowanie sesji: 2026-07-29
Branch: main

### Co zrobiono
- **Etap 0.3 (Multimedia)**: Rozszerzono media-parser i message-card o detekcję oraz renderowanie tagów obrazków inline [IMG]...[/IMG]. Dostosowano instrukcje promptów.
- **Etap 0.5 (Szybka Przygoda)**: Zaimplementowano QuickSetupModal w WelcomeScreen, pozwalając na szybki start gry w trybie Solo lub Duet (Hot Seat) z automatycznym przypisaniem pre-definiowanych postaci.
- **UI/UX**: Stworzono mroczny ekran ładowania HardLoadingScreen (z pulsującą świeczką), który maskuje proces buforowania TTS przy starcie nowej gry. Dolne, techniczne linki w menu przeniesiono pod ikonę opcji (zębatki).
- **Testy E2E**: Zoptymalizowano feature-1-gm-narration.spec.ts i feature-2-game-start.spec.ts, redukując flakiness asercji tekstowych.

### Co otwarte (do następnej sesji)
- Realizacja kolejnych, większych kroków ze state.md (Etap 1: Inwentarz i zasady gry w RAG).

### Decyzje podjęte
- Mechanika "Hot Seat" w szybkiej przygodzie została połączona "na twardo" (z pominięciem wizarda przypisywania imion) używając hotSeat.restoreConfig, by zapewnić bezawaryjne zestawienie 2 graczy i postaci od ręki.
- Opcje deweloperskie (Zimny Start, Zapis/Odczyt) ukryto z widoku domyślnego dla czystszego onboardingu.


## Podsumowanie sesji: 2026-07-30 (SafeImage Refactor)
Branch: main

### Co zrobiono
- **Globalny refactor obrazków (Quick Win):** Zastąpiono surowe wywołania `onError` w plikach UI silnika (`message-card`, `inspection-lightbox-modal`, `investigator-board`, `corkboard-investigation-board`, `discoveries-view`, `session-journal`).
- Wdrożono bezpieczny import i użycie `SafeImage` w `render-sections.tsx`.
- Przeprowadzono pomyślne wykonanie 156 testów na środowisku `_tester/_base/.silnik`.

### Co otwarte (do następnej sesji)
- Implementacja awatarów NPC w czacie (`[PORTRET: ...]`) - Etap 3.6 (Faza 3)
- Przebudowa układu i metadanych Predefiniowanych Badaczy (Sekcja 3)
- Logika wejścia do gry z przycisków Quick Setup i Ustawień Ręcznych (Etap 0.5)

### Decyzje podjęte
- Zabezpieczono UI przed przerwaniami przy dogrywaniu portretów LLM, usuwając problematyczne tagi wymuszające `display: none` i stawiając w 100% na fallback z wdrożonego komponentu `SafeImage.tsx`.

## Podsumowanie sesji: 2026-07-30
Branch: main

### Co zrobiono
- **Implementacja parsowania tagów portretowych:** Zaktualizowano `media-parser.ts` oraz typy tak, aby poprawnie wyciągał z tagów AI (`[PORTRET: Imię, opis]`) zmienną `portraitName` oraz przypisywał typ obrazka `portrait` z wymuszonym aspect ratio 3:4.
- **Dodanie testów jednostkowych (TDD):** Utworzono plik `media-parser.test.ts`, który gwarantuje odporność parsera portretów oraz `detectSFX` na przypadki brzegowe i synonimy.
- **Integracja portretów z Dziennikiem Gry:** Zmodyfikowano `useChat.ts`, co pozwala asynchronicznie po wygenerowaniu obrazu połączyć jego URL (`imageUrl`) z właściwym, odpowiednim dla NPC wpisem w wirtualnym profilu (`gameContext.characters.journal`).
- **Instrukcje dla LLM:** Uzupełniono główny prompt systemowy w `image-instructions.ts` dla AI Mistrza Gry o nowy format wymuszający odpowiednią strukturę przy rzucaniu portretów.

### Co otwarte (do następnej sesji)
- Skonfigurowanie ewentualnego wyświetlania połączonego `imageUrl` w samym widoku Profilu Dziennika (`session-journal.tsx`), jeśli sam zapis do bazy postaci jeszcze nie mapuje obrazka w panelu po lewej stronie ekranu gry. Zależy to od układu wizualnego interfejsu Dziennika.

### Decyzje podjęte
- Wyrenderowany portret postaci pozostaje pełnoprawnym obrazkiem w komponencie chata na desktopach, ale jest jednocześnie permanentnie rejestrowany (zapisywany) wewnątrz profilu postaci ułatwiając przyszłą ciągłość świata i immersję. Brak zmian ingerujących w lay-out kart samego logu chata.

## Podsumowanie sesji: 2026-07-30 (Architektura Szybkiej Przygody)
Branch: main

### Co zrobiono
- **Implementacja Dedykowanych Postaci Strefy 11:** Utworzono odrębny plik z pulą (Helena, Barbara, Tomasz, Ryszard) pasujących do realiów PRL/Lata 90 by urealnić grę w Strefie 11. 
- **Przebudowa QuickSetupModal:** Skorygowano szerokość okna (responsive siatka kolumn grid) i poprawiono stylizację okien, ucinając pętlę restartu i bug braku dopasowania CSS "brass". Zastąpiono go mrocznym szmaragdowym profilem "primary".
- **Aktualizacja Hot Seat:** Odcięto automatyczne, złośliwe zaciąganie postaci dla Gracza 2 – odtąd jest jawne, manualne UI.
- **Refaktoryzacja Asynchroniczności (page.tsx):** Zastąpiono podatny na błedy `setTimeout(..., 50)` dedykowanym, wbudowanym systemem stanu Reacta (useEffect na fladze `pendingGameStart`), dbając o płynne i wolne od błędów zaczytywanie zmienionych postaci do silnika z modali menu.

### Co otwarte (do następnej sesji)
- Implementacja Etapu 1 (Rozszerzenie ekwipunku) z Roadmapy z wykorzystaniem naprawionych dzisiaj przepływów logowania postaci.

### Decyzje podjęte
- Wyeliminowano ukryty automatyzm na rzecz jawności interakcji w Hot Seat, poprawiając stabilność sesji duetowych.
