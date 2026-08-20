# Research: dedykowane portrety postaci Strefy 11

Data: 2026-08-18
Status: rozpoznanie zakończone - decyzja produktowa wymagana przed planem wdrożenia.

## Mapowanie

### Źródło prawdy

- Dane 16 postaci: `_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts`.
- Agregacja do wspólnego katalogu postaci: `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts:2366-2374`.
- Szybka Przygoda dzieli 16 postaci na cztery zestawy po cztery: `_tester/_base/.silnik/src/components/ui/quick-setup-modal.tsx:35-43`.
- Rzeczywisty katalog aplikacji to `_tester/_base/.silnik/`; nie root repozytorium.

### Stan assetów

- Pewne: istnieje 16 postaci, 16 unikalnych `portraitUrl` i 16 istniejących plików WebP.
- Pewne: żadna z 16 ścieżek nie wskazuje jeszcze na dedykowany katalog Strefy 11.
- Pewne: katalog docelowy nie istnieje: `_tester/_base/.silnik/public/portraits/predefined/strefa11/`.
- Aktualne pliki używane przez Strefę 11 są kwadratowe, 900×900 px, WebP.
- Obecny test sprawdza format URL i fizyczną obecność pliku pod `public/`: `_tester/_base/.silnik/src/lib/immersion/predefined-characters.test.ts:42-58`.

## Obszar zmiany

Minimalna zmiana techniczna po zatwierdzeniu assetów:

1. Dodać 16 plików WebP do `_tester/_base/.silnik/public/portraits/predefined/strefa11/`.
2. Zmienić 16 wartości `portraitUrl` w `_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts`.
3. Zachować obecne pliki w katalogu nadrzędnym, aby stare zapisy kampanii nie wskazywały na 404.
4. Rozszerzyć test danych o warunek: dokładnie 16 postaci Strefy 11, unikalne URL-e, wymagany prefiks `strefa11/` i istniejący plik.
5. Uruchomić test danych, TypeScript, testy jednostkowe oraz build.

Zalecane nazwy plików: ASCII, lowercase, kebab-case, bez pseudonimów i tytułów, na przykład `tomasz-nowicki.webp`, `helena-krawczyk.webp`, `barbara-zawadzka.webp`.

## Istniejące narzędzia obrazów

- Generator portretów dla postaci ręcznych: `_tester/_base/.silnik/src/lib/character-portrait-generator.ts`.
- Wywołuje `/api/imagen` i otrzymuje data URL, a nie plik w `public/`.
- Nie istnieje batch-generator ani mechanizm eksportu data URL do publicznego WebP.
- Wniosek: pakiet 16 assetów wymaga osobnego, zatwierdzonego pipeline'u generowania, wyboru i eksportu.

## Blast Radius Analysis

### Konsumenci danych

Zmiana `portraitUrl` trafi do:

- Szybkiej Przygody i katalogu postaci.
- Sidebara, karty postaci, awatara czatu, narzędzi biurka i dokumentów diegetycznych.
- Dziennika: `entity-visual-resolver.ts` przekazuje URL portretu jako referencję obrazu.
- Eksportu sesji i pełnego zapisu gry.

### Persistencja i zgodność wsteczna

- Pewne: statyczne URL-e przechodzą przez zapis lokalny, pełny save oraz eksport sesji.
- Pewne: IndexedDB obsługuje wyłącznie `data:` URL-e, więc nie nadpisze statycznego portretu.
- Ryzyko wysokie: istniejące save'y zapisują literalną, starą ścieżkę portretu. Usunięcie obecnych plików złamie ich renderowanie.
- Mitigacja: nie usuwać starych plików w tym wdrożeniu. Migracja zapisów, jeśli w ogóle potrzebna, to osobny zakres.

### Testy akceptacyjne

- Test danych 16/16: unikalność, prefiks katalogu, istnienie WebP.
- Szybka Przygoda: każda z czterech przygód, widok czterech kart i start solo.
- Hot Seat: dwa różne portrety po przełączeniu aktywnego gracza.
- Save/load: statyczny URL pozostaje po odświeżeniu i po pełnym zapisie/wczytaniu.
- Kontrola wizualna: twarz w bezpiecznej strefie kadru, brak anachronizmów, czytelność w małym rozmiarze, brak podobieństwa do realnej osoby.

## Blokada decyzji: epoka i styl

Nie można bezpiecznie zatwierdzić jednego stylu „telewizja lat 90.” dla wszystkich 16 postaci.

- `Cień nad Prabutami`: PRL, 1973-1974 - `_tester/_base/.silnik/src/lib/adventures-data.ts:80-105`.
- Kowary: lata 90., 1995-1999 - `adventures-data.ts:107-131`.
- Traszyn: zakres 1983-1999 - `adventures-data.ts:134-158`.
- Głogów: przełom tysiącleci, 2001 - `adventures-data.ts:161-185`.

Pewne: pierwsza czwórka ma w opisach sprzęt i estetykę późniejszą niż deklarowana epoka PRL. To konflikt fabularno-wizualny.

Przed generowaniem trzeba zdecydować:

1. Czy pierwsza czwórka dostaje portrety PRL 1973-1974.
2. Czy retconujemy jej przygodę do lat 90.
3. Czy tworzymy dwa warianty portretu dla postaci podróżujących między epokami.

Kontra do rekomendacji jednego pakietu: jeżeli scenariusze mają różne daty, jeden styl lat 90. utrwali anachronizmy zamiast je usunąć.

## Prawa i provenance

- `NOTICE` nie opisuje dziś źródła ani licencji assetów portretowych.
- Przed publicznym ZIP-em potrzebny jest manifest na asset: autor/generator, provider i model, data, prompt lub hash promptu, licencja, źródła referencyjne i wynik sprawdzenia podobieństwa.
- Nie używać zdjęć realnych osób ani ich rozpoznawalnych podobizn bez prawa do wykorzystania.

## Dokumentacja po wdrożeniu

Wymagają aktualizacji:

- `state.md` i `zadania.md` - zamknięcie backlogu wraz z rzeczywistą ścieżką runtime.
- `spec-biografie-strefa11.md` - mapa postać → asset → epoka → wersja stylu/provenance.
- `docs/TESTING.md` - automatyczna walidacja assetów i ręczny visual QA.
- `NOTICE` - pochodzenie oraz licencjonowanie portretów.
- `README.md` i `CHANGELOG.md` - dopiero po wydaniu.

Dodatkowa uwaga techniczna:

- `scripts/build-tester-pack.sh:45-49` liczy tylko płaskie portrety w `predefined/`. Nie blokuje dodania podkatalogu, ale jego raport nie pokaże portretów Strefy 11. Ewentualną korektę licznika należy uwzględnić w planie wdrożenia.

## Rekomendowany następny krok

Przejść do `/dev-2-plan` po jednej decyzji produktowej: czy paczka obejmuje cztery różne epoki, czy świadomie ujednolicamy cały roster do lat 90. Rekomendacja techniczna: cztery epoki, po jednym kanonicznym portrecie na postać, statycznie w WebP, z zachowaniem starych assetów dla kompatybilności zapisów.
