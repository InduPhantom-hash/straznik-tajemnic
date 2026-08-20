# Plan: dedykowane portrety Strefy 11 dla czterech epok

Data: 2026-08-18
Złożoność: Duża

## Problem

Szesnaście postaci Strefy 11 korzysta z działających, ale niededykowanych portretów, a ich cztery scenariusze są osadzone w różnych epokach.

## Rozwiązanie

Tworzymy po jednym kanonicznym, fikcyjnym portrecie dla każdej postaci w estetyce jej scenariusza: PRL 1973-1974, lata 90., 1999 i 2001. Finalne, zaakceptowane ręcznie pliki zapisujemy lokalnie jako WebP, zmieniamy 16 adresów `portraitUrl`, zachowujemy stare assety dla zgodności zapisów oraz weryfikujemy dane, build i kluczowe ścieżki UI.

Generowanie obrazów jest osobnym checkpointem kosztowym: przed każdym wsadem pokażemy provider, liczbę wariantów, prompty oraz szacowany koszt. Do repo trafią wyłącznie wskazane przez Jakuba finalne WebP, nigdy automatycznie wybrane wyniki.

## Pliki do modyfikacji

| plik | zmiana | ryzyko |
|---|---|---|
| `_tester/_base/.silnik/public/portraits/predefined/strefa11/*.webp` | 16 nowych, zatwierdzonych assetów: cztery na epokę | Średnie |
| `_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts` | 16 adresów `portraitUrl` do nowych statycznych plików | Średnie |
| `_tester/_base/.silnik/src/lib/immersion/predefined-characters.test.ts` | Kontrakt 16 postaci, unikalne URL-e, prefiks `strefa11/` i fizyczna obecność pliku | Niskie |
| `scripts/build-tester-pack.sh` | Liczenie WebP także z podkatalogów `predefined/` | Niskie |
| `spec-biografie-strefa11.md` | Tabela postać → asset → epoka → wersja stylu/provenance | Niskie |
| `docs/TESTING.md` | Test kontraktu assetów i checklist visual QA | Niskie |
| `NOTICE` | Pochodzenie/licencja portretów i odnośnik do manifestu | Średnie |
| `state.md`, `zadania.md` | Zamknięcie backlogu po pełnym QA | Niskie |
| `README.md`, `CHANGELOG.md` | Wpis o pakiecie assetów dopiero przy wydaniu | Niskie |

## Standard dla wszystkich czterech pakietów

- Portret przedstawia wyłącznie fikcyjną postać, bez podobieństwa do realnej osoby lub programu.
- Format: WebP, 900×900 px, twarz w górnej bezpiecznej strefie kadru, aby współpracować z `object-cover object-top`.
- Nazwa: ASCII, lowercase, kebab-case, bez tytułów i pseudonimów, np. `tomasz-nowicki.webp`.
- Katalog: `_tester/_base/.silnik/public/portraits/predefined/strefa11/`.
- Każdy asset dostaje wpis provenance: postać, scenariusz, rok, styl, provider/model, data, prompt lub hash promptu, licencja i wynik kontroli podobieństwa.
- Stare pliki z `public/portraits/predefined/` pozostają bez zmian. Chroni to istniejące save'y przechowujące stare adresy.

## Mapa Zadań

### Faza 0: Kontrakt assetów i bramka generowania

- [ ] Utworzyć manifest 16 pozycji z nazwą pliku, postacią, scenariuszem, rokiem i kryteriami kadru. `(Blokuje: Faza 1, Faza 2, Faza 3, Faza 4)`
- [ ] Przygotować cztery zestawy promptów z zakazami anachronizmów oraz bez podobieństwa do realnych osób. `(Blokuje: Faza 1, Faza 2, Faza 3, Faza 4)`
- [ ] Pokazać Jakubowi payload generowania dla pierwszej epoki i czekać na osobne `tak` przed kosztem API. `(Blokuje: Faza 1)`
- Weryfikacja: manifest zawiera 16 pozycji, a prompt każdej pozycji wskazuje rok, garderobę, rekwizyt i zakazy.

### Faza 1: PRL 1973-1974 - Cień nad Prabutami

- [ ] Wygenerować warianty dla Tomasza Nowickiego, Heleny Krawczyk, Barbary Zawadzkiej i Ryszarda Kaczmarka. `(Zablokowane przez: Faza 0; Blokuje: Faza 5)`
- [ ] Wybrać ręcznie po jednym portrecie dla każdej z czterech postaci.
- [ ] Wyeksportować zatwierdzone obrazy do docelowego katalogu jako WebP 900×900.
- [ ] Zapisać provenance i przeprowadzić visual QA: PRL, brak telefonu komórkowego, brak elementów po 1974 roku, twarz nieucięta.
- Weryfikacja: cztery pliki działają pod docelowymi URL-ami i przechodzą kontrolę manualną.

### Faza 2: Lata 90. 1995-1999 - Kowary

- [ ] Wygenerować warianty dla Marka Kamińskiego, Tomasza Wójcika, Anny Dąbrowskiej i Ewy Wiśniewskiej. `(Zablokowane przez: Faza 0; Blokuje: Faza 5)`
- [ ] Wybrać ręcznie po jednym portrecie dla każdej z czterech postaci.
- [ ] Wyeksportować zatwierdzone obrazy do docelowego katalogu jako WebP 900×900.
- [ ] Zapisać provenance i przeprowadzić visual QA: Polska lat 90., analogowa fotografia, brak smartfonów i elementów po 2000 roku.
- Weryfikacja: cztery pliki działają pod docelowymi URL-ami i przechodzą kontrolę manualną.

### Faza 3: Rok 1999 - Traszyn

- [ ] Wygenerować warianty dla Jana Kaczmarka, Andrzeja Zalewskiego, Marty Kamińskiej i Zofii Sadowskiej. `(Zablokowane przez: Faza 0; Blokuje: Faza 5)`
- [ ] Wybrać ręcznie po jednym portrecie dla każdej z czterech postaci.
- [ ] Wyeksportować zatwierdzone obrazy do docelowego katalogu jako WebP 900×900.
- [ ] Zapisać provenance i przeprowadzić visual QA: rok 1999, lokalna wieś i małe miasto, brak technologii późniejszej niż 1999.
- Weryfikacja: cztery pliki działają pod docelowymi URL-ami i przechodzą kontrolę manualną.

### Faza 4: Rok 2001 - Głogów

- [ ] Wygenerować warianty dla Artura Majchrzaka, Piotra Wójcickiego, Krystyny Zawady i Karoliny Maj. `(Zablokowane przez: Faza 0; Blokuje: Faza 5)`
- [ ] Wybrać ręcznie po jednym portrecie dla każdej z czterech postaci.
- [ ] Wyeksportować zatwierdzone obrazy do docelowego katalogu jako WebP 900×900.
- [ ] Zapisać provenance i przeprowadzić visual QA: Polska 2001, CRT/VHS i wczesny internet są dozwolone, bez współczesnych smartfonów i mediów społecznościowych.
- Weryfikacja: cztery pliki działają pod docelowymi URL-ami i przechodzą kontrolę manualną.

### Faza 5: Integracja, kompatybilność i testy

- [ ] Podmienić wyłącznie 16 `portraitUrl` w `strefa-11-characters.ts`. `(Zablokowane przez: Faza 1, Faza 2, Faza 3, Faza 4; Blokuje: Faza 6)`
- [ ] Rozszerzyć test `predefined-characters.test.ts` o kontrakt dedykowanego pakietu Strefy 11.
- [ ] Poprawić licznik w `build-tester-pack.sh`, aby obejmował podkatalog `strefa11/`.
- [ ] Sprawdzić Quick Setup dla czterech scenariuszy, solo oraz Hot Seat.
- [ ] Sprawdzić zapis/wczytanie z nowymi URL-ami i render w sidebarze, karcie postaci oraz Dzienniku.
- Weryfikacja: nowe adresy zwracają 200, stare assety nadal istnieją, a save/load nie pokazuje placeholdera.

### Faza 6: Dokumentacja i paczka wydaniowa

- [ ] Uzupełnić specyfikację, dokumentację testów, `NOTICE`, `state.md` i `zadania.md`. `(Zablokowane przez: Faza 5)`
- [ ] Uzupełnić README oraz CHANGELOG tylko wtedy, gdy pakiet wchodzi do wydania.
- [ ] Zbudować pakiet testera i potwierdzić, że zawiera 16 nowych assetów oraz nie zawiera danych lokalnych.
- Weryfikacja: dokumentacja zawiera manifest i wynik QA, a build testera przechodzi.

## Weryfikacja końcowa

Uruchamiane w `_tester/_base/.silnik/`:

```bash
npm test -- --runInBand src/lib/immersion/predefined-characters.test.ts
npx tsc --noEmit
npm test
npm run lint
npm run build
npm run qa:e2e
```

Ręcznie:

- otworzyć Szybką Przygodę dla każdego scenariusza;
- sprawdzić cztery karty w każdym zestawie;
- uruchomić solo i Hot Seat;
- sprawdzić portret po odświeżeniu, zapisie i wczytaniu;
- porównać każdy asset z checklistą epoki oraz brakiem podobieństwa do realnej osoby.

## Co może się zepsuć

- Wysokie: usunięcie starego assetu daje placeholder w starym save'ie. Nie usuwamy starych plików.
- Średnie: błędny URL, format albo brak WebP łamie wybór postaci i część UI. Zabezpiecza go test kontraktu assetów.
- Średnie: technicznie poprawny obraz może mieć złą epokę lub twarz poza kadrem. Zabezpiecza go ręczny visual QA.
- Średnie: cache może utrzymać poprzedni obraz przy nadpisaniu pliku. Używamy nowych nazw w nowym katalogu.
- Niskie: obecny skrypt pakowania nie raportuje assetów z podkatalogu. Poprawiamy jego regex w Fazie 5.
- Niepotwierdzone: warunki licencyjne providera dla użycia w publicznym ZIP-ie. Przed generowaniem zapisujemy provider, model i licencję w manifeście.

## Brief: dedykowane portrety Strefy 11

**Co**: 16 lokalnych portretów fikcyjnych postaci, po cztery dla każdej epoki czterech scenariuszy.
**Jak**: generacja wariantów po osobnym zatwierdzeniu kosztu, ręczny wybór, WebP 900×900, potem punktowa podmiana 16 URL-i.
**Pliki**: assety `strefa11/`, dane postaci, test kontraktu, pakowanie i dokumentacja provenance.
**Test**: Jest, TypeScript, lint, build, e2e oraz ręczna kontrola Quick Setup, Hot Seat i save/load.
**Ryzyko**: kompatybilność starych save'ów, anachronizmy i brak prawa do podobizny - stare assety zostają, a każdy nowy obraz przechodzi ręczne QA.
