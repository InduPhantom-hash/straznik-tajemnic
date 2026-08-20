# Plan Review: dedykowane portrety Strefy 11 dla czterech epok

Data: 2026-08-18

## Ocena ogólna

🔴 Czerwony - kierunek techniczny jest rozsądny, ale plan nie rozwiązuje konfliktu danych z epoką PRL, nie definiuje wykonywalnego pipeline'u generowania i nie przechodzi Spec Quality Gate.

## Przegląd przez osiem wymiarów

### 1. Definicja problemu

Problem portretów jest zdefiniowany jasno, ale rozwiązanie zakłada, że wystarczy zmienić assety. Dla pierwszej czwórki nie wystarczy: dane postaci zawierają elementy późniejsze niż 1974, m.in. telefon komórkowy „cegłę”, sprzęt NightVision/EMF oraz biografię byłego funkcjonariusza SB działającego po 1989 roku. Portret PRL będzie sprzeczny z kartą postaci.

### 2. Kompletność

Brakuje:

- dokładnej ścieżki i formatu manifestu provenance;
- narzędzia lub procedury zamiany odpowiedzi API w WebP 900×900;
- liczby wariantów na postać i limitu ponowień;
- pliku albo procedury QA sprawdzającej format, rozdzielczość, rozmiar i duplikaty;
- decyzji, czy dane pierwszej czwórki będą retconowane do 1973-1974;
- dokładnego testu E2E obejmującego cztery scenariusze, bo ogólne `npm run qa:e2e` nie gwarantuje tego zakresu.

### 3. Dopasowanie do architektury

Statyczne pliki pod `public/` i punktowe adresy `portraitUrl` pasują do architektury. Zachowanie starych assetów poprawnie chroni istniejące save'y.

Dokumentacja projektu jest częściowo nieaktualna: README deklaruje Next.js 14 i React 18, natomiast `package.json` runtime'u zawiera Next.js 16.2.4 i React 19.2.5. Nie blokuje to assetów, ale plan powinien opierać komendy i ścieżki na runtime `_tester/_base/.silnik/`, nie na opisach README.

### 4. Rabbit holes

Faza 0 ukrywa największą część pracy pod hasłem „przygotować prompty”. Bez ustalonego modelu, liczby kandydatów, limitu ponowień, eksportu i kryterium odrzucenia koszt oraz czas są nieograniczone.

### 5. Promise gaps

Fazy 1-4 mają naturalne końce po czterech zaakceptowanych assetach. Brakuje jednak jawnej bramki „4/4 zaakceptowane przez Jakuba” przed eksportem i przejściem do kolejnej epoki. Brakuje też procedury dla wyniku odrzuconego.

### 6. Strategia testowania

Końcowe komendy są konkretne. Weryfikacja każdej epoki pozostaje opisowa i nie ma maszynowego checkera. Test danych pojawia się dopiero po ukończeniu wszystkich 16 obrazów, więc błąd pierwszego pakietu może zostać wykryty za późno.

### 7. Zgodność z guardrails projektu

Plan chroni stare save'y i przewiduje osobne potwierdzenie kosztu. Nie zapisuje sekretów ani kluczy. Powinien dodatkowo jawnie wykluczyć:

- modyfikację aktualnych, niezwiązanych zmian w ekranie ręcznego startu;
- usuwanie starych assetów;
- generowanie bez zatwierdzonego payloadu i kosztu;
- użycie podobizn realnych osób i identyfikacji realnego programu.

### 8. Spec Quality Gate

SPEC CHECK: Feature Spec | 317w / 200w

1. Budget: 0/2 - OVER o 117 słów
2. Boundaries: 1/2 - ograniczenia są rozproszone, brak sekcji „Czego NIE budujemy”
3. Verification: 2/2 - co najmniej 3 mierzalne kryteria istnieją
4. Examples: 1/2 - jest przykład nazwy pliku, ale brak pełnego przykładu input/output
5. Focus: 2/2 - jeden feature

SCORE: 6/10 - WEAK

#### Budget (0/2)

Problem: sekcje opisujące feature mają 317 słów, powyżej limitu 200.

Before: „Tworzymy po jednym kanonicznym, fikcyjnym portrecie dla każdej postaci...” wraz z całą sekcją standardu.

After: „Dodajemy 16 fikcyjnych portretów WebP 900×900: po cztery dla PRL 1973-1974, lat 1995-1999, roku 1999 i roku 2001. Jakub wybiera finalny obraz każdej postaci. Zmieniamy wyłącznie `portraitUrl`, test kontraktu assetów, licznik paczki i dokumentację provenance. Stare portrety pozostają dla zgodności save'ów.”

#### Boundaries (1/2)

Problem: zakazy istnieją, ale nie tworzą jednoznacznej sekcji zakresu.

Before: „Stare pliki z `public/portraits/predefined/` pozostają bez zmian.”

After: „Czego NIE budujemy: nie usuwamy starych portretów, nie generujemy obrazów przy starcie gry, nie używamy realnych podobizn ani identyfikacji realnego programu, nie zmieniamy UI i nie dotykamy bieżących zmian Manual Setup.”

#### Examples (1/2)

Problem: nazwa `tomasz-nowicki.webp` nie pokazuje pełnego kontraktu wejście → wynik.

Before: „Nazwa: ASCII, lowercase, kebab-case, np. `tomasz-nowicki.webp`.”

After: „Input: `strefa11_tomasz_nowicki`, scenariusz `cien-nad-prabutami`, rok `1974`, zawód `dziennikarz śledczy`. Output: `/portraits/predefined/strefa11/tomasz-nowicki.webp`, WebP 900×900, URL HTTP 200, wpis manifestu z providerem, modelem i statusem `approved`.”

## Znalezione problemy

### Krytyczne

- Definicja problemu: portrety PRL będą sprzeczne z danymi pierwszej czwórki. Sugestia: przed assetami zatwierdzić punktowy retcon ich opisów albo świadomie pozostawić scenariusz w latach 90.
- Kompletność: brak wykonywalnego pipeline'u data URL → WebP oraz ścieżki manifestu. Sugestia: dodać konkretny skrypt/format, limit wariantów i etap walidacji per pakiet.
- Spec Quality Gate: 6/10. Sugestia: dodać krótką Feature Spec poniżej 200 słów z sekcją „Czego NIE budujemy” i pełnym przykładem input/output.

### Ostrzeżenia

- Testy: `npm run qa:e2e` nie dowodzi pokrycia czterech scenariuszy. Sugestia: wskazać konkretny test Playwright albo uczciwie oznaczyć czteroscenariuszowy test jako manualny.
- Promise gaps: brak jawnej bramki akceptacji 4/4 i procedury regeneracji odrzuconego obrazu.
- Dokumentacja: manifest provenance nie ma ścieżki i może nie trafić do paczki testera.
- Zakres: plan wymienia do edycji README i CHANGELOG, choć feature może jeszcze nie wejść do wydania. Powinny pozostać warunkowe i poza zakresem pierwszej implementacji.

### Obserwacje

- Traszyn sensownie przyjęto jako rok 1999, bo zdarzenie z 1983 roku jest przeszłością sprzed 16 lat. Plan powinien zapisać to jako jawne założenie.
- Zachowanie starych assetów to poprawna i wystarczająca strategia zgodności wstecznej dla istniejących save'ów.

## Rekomendacja

Poprawić plan i ponownie uruchomić `/dev-3-plan-review`. Nie przechodzić do `/dev-4-implement` ani do płatnego generowania obrazów przed usunięciem trzech krytycznych blokad.
