## Podsumowanie sesji: 2026-07-17
Branch: feature/weather-osm-progress-bar

### Co zrobiono
- Backend: Integracja z Nominatim (geokodowanie), Open-Meteo (historyczna pogoda) i OpenHistoricalMap (POI z epoki) w `analyze/route.ts`.
- Hooki: Aktualizacja `useCustomAdventures.ts` o stany postępu procentowego i etapu ładowania.
- UI: Wdrożenie mosiężnego paska postępu w stylu retro w modalu `adventure-selector.tsx`.
- Wpięcie stanów do `CthulhuSidebar.tsx` oraz `page.tsx`.
- Zweryfikowano produkcyjny build Next.js/Turbopack poza piaskownicą (`BypassSandbox`).

### Co otwarte (do następnej sesji)
- Brak otwartych zadań w tym etapie.

### Decyzje podjęte
- Wykorzystanie darmowych i bezkluczowych API do automatycznego dociągania klimatycznego tła historycznego.

---

## Podsumowanie sesji: 2026-07-17 (UI overlap fix)
Branch: feature/immersion-apis

### Co zrobiono
- UI: Poprawiono nakładanie się elementów w nagłówku karty postaci (`_tester/_base/.silnik/src/components/ui/character-sheet/index.tsx`) poprzez dodanie klasy `pr-12` do `DialogHeader`, zapobiegając kolizji przycisku "Eksport MD" i dropdownu wyboru z przyciskiem zamknięcia (X).

### Co otwarte (do następnej sesji)
- Brak otwartych zadań.

### Decyzje podjęte
- Dodano bezpieczny prawy margines wewnętrzny (padding-right) w kontenerze nagłówka modala.

---

## Podsumowanie sesji: 2026-07-17 (Chat image fixes)
Branch: feature/redesigned-journal

### Co zrobiono
- UI/UX: Ujednolicono wyświetlanie grafik pod wiadomościami czatu do formatu pełnej szerokości (aspect-[16/9]) o spójnym wyglądzie (ramka, cienie, filtr sepia) z obrazkiem otwierającym.
- UI/UX: Dodano obsługę kliknięcia dla obrazków renderowanych w treści narracji (w tym intro) otwierających lightbox.

### Co otwarte
- Dalsza praca nad gałęzią feature/redesigned-journal.

### Decyzje podjęte
- Przekazano callback lightboxa do renderowania inline obrazów markdown.


---

## Podsumowanie sesji: 2026-07-17
Branch: feature/redesigned-journal

### Co zrobiono
- **Uzupełnienie bazy predefiniowanych postaci:** Dodano brakujące 14 kart badaczy (do pełnej liczby 24 plus 2 bonusowych mistyków) ze zbalansowanymi statystykami CoC 7e, opisem i ekwipunkiem dla epok 1890s, 1920s i Modern.
- **Integracja selektora postaci:** Osadzono w JSX dynamicznie importowany komponent `PredefinedCharactersSelector` w page.tsx i obsłużono poprawnie stany startowe.
- **Redesign Dziennika Sesji (session-journal.tsx):** Zaimplementowano nowy, bogaty w estetykę interfejs w stylu PoE z podziałem na Misje, Kronikę, Encyklopedię i Notatki oraz mechanizmem eksportu MD, w pełni połączony z lokalnym zapisem postaci (`character.journal`) i zoptymalizowany pod tryb offline.
- **Naprawa przełączania kart badaczy:** Usunięto race condition w `useCharacterManagement.ts` poprzez zjednoczenie modyfikacji listy postaci w jedną spójną operację mapowania.
- **Poprawa pozycjonowania w adventure-selector.tsx:** Przeniesiono przycisk śmietnika na dół obok szczegółów przygody, likwidując problem nakładania się na ptaszek zaznaczenia.

### Co otwarte (do następnej sesji)
- Przeprowadzenie pełnego playtestu w trybie Hot Seat z dwoma graczami w celu potwierdzenia optymalnego działania przełącznika postaci oraz nowego Dziennika Sesji.

### Decyzje podjęte
- Wycofano logikę strzałów chmurowych z Dziennika Sesji, opierając go wyłącznie o lokalną persystencję postaci (zapis do localStorage/offline).

---

## Podsumowanie sesji: 2026-07-17 (launcher i duże PDF-y)
Branch: feature/redesigned-journal

### Co zrobiono
- Naprawiono niespójności typów nowego Dziennika Sesji i kontekstu przygody, które blokowały produkcyjny build.
- Przywrócono działanie aplikacji `Straznik Tajemnic AI.app` z portem 4050 i zweryfikowano odpowiedź HTTP 200.
- Zastąpiono dowiązanie na pulpicie fizyczną kopią aplikacji oraz zaktualizowano skrypty i dokumentację launchera.
- Zwiększono limit przesyłania PDF-ów przygód z domyślnych 10 MB do 500 MB.
- Zweryfikowano formularze dla `ZC_Starter-Maski.pdf` (11,18 MB) i `ZC_Starter-MityWojny.pdf` (38,77 MB).
- Potwierdzono pełne przetworzenie `ZC_Starter-MityWojny.pdf`: 44 strony, analiza Gemini, przygoda `Noc Zagłady`.

### Co otwarte (do następnej sesji)
- Pełny playtest Hot Seat z dwoma graczami pozostaje do wykonania.
- Wcześniejsza lokalna zmiana `_tester/_base/.silnik/package.json` (`next dev --webpack`) pozostaje poza tym commitem.

### Decyzje podjęte
- Publiczny launcher zachowuje port 4050 i fizyczną aplikację na pulpicie, bez tworzenia dowiązań symbolicznych.
- Limit transportowy Next.js i limit endpointu PDF wynoszą 500 MB.

---

## Podsumowanie sesji: 2026-07-17 (duet - etap 1)
Branch: codex/duet-catalog-integration

### Co zrobiono
- Ograniczono skład rozpoczętej sesji do dwóch badaczy przypisanych graczom w konfiguracji Hot Seat.
- Naprawiono synchronizację aktywnego gracza, deklaracji i postaci oglądanej w karcie oraz ekwipunku.
- Dodano kompletną turę dwuosobową: dwie deklaracje, opcję `Pasuję` i jedno wspólne wywołanie MG.
- Dodano adresowane, grupowe testy obojga badaczy oraz właściwe przypisanie rzutów, Szczęścia, dziennika rzutu i rozwoju.
- Zweryfikowano testy fazy 1 (17/17), TypeScript i ESLint bez błędów.

### Co otwarte (do następnej sesji)
- Etap 2: zgodna biografia, większy ekwipunek z lokalnymi obrazami oraz wspólny Dziennik Przygody.
- Po etapie 2: pełny playtest Hot Seat, produkcyjny build i nowa paczka testowa.

### Decyzje podjęte
- Skład rozpoczętej sesji pochodzi wyłącznie z `HotSeatConfig.players[].characterId`.
- Pierwszy wynik wspólnej grupy testów zostaje lokalnie, a komplet trafia do MG w jednej wiadomości.
- Istniejąca paczka ZIP nie wchodzi do commitu.
- Branch pozostaje niescalony do czasu ukończenia etapu 2 i końcowej weryfikacji.

---

## Podsumowanie sesji: 2026-07-17 (duet - etapy 2 i 3)
Branch: codex/duet-catalog-integration

### Co zrobiono
- Ukończono etapy 2 i 3 obsługi duetu.
- Zweryfikowano biografie wszystkich 26 gotowych badaczy.
- Rozbudowano ich wyposażenie do minimum 6 przedmiotów z lokalnymi grafikami SVG.
- Dodano wspólny Dziennik Przygody z deduplikacją, synchronizacją i izolacją wpisów między przygodami.
- Naprawiono reset wyniku rzutu po wydaniu Szczęścia.
- Dodano czyszczenie niedokończonych deklaracji przy nowej przygodzie, zmianie duetu i wczytaniu zapisu.
- Przeprowadzono review i usunięto wszystkie problemy krytyczne oraz wymagane ostrzeżenia.
- Zweryfikowano 39/39 testów, TypeScript, build 61 stron i playtest Chromium 1/1.
- Przebudowano paczkę testową. SHA-256: `617afc8086fe5bafdf122f1e9c12204058e225cfc2be7742d8b48013b9e32d1d`.

### Co otwarte
- W4: integracyjny test dwóch adresowanych rzutów, Szczęścia i jednego żądania do MG.
- W5: test dodawania, edycji i usuwania wpisów wspólnego dziennika.
- Opcjonalnie później: mocniejsze E2E ładowania SVG i bezpośredni test przycisku `Pasuję`.

### Decyzje podjęte
- Skład sesji pochodzi wyłącznie z jawnych przypisań Hot Seat.
- Wspólna tura trafia do MG dopiero po komplecie deklaracji lub rzutów.
- Dziennik należy do konkretnego przebiegu przygody, ale zachowuje historię na kartach postaci.
- Lokalny ekwipunek presetów nie korzysta z API.
- W4 i W5 pozostają w planie następnej sesji.
