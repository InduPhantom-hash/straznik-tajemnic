# Stan implementacji: duet i czytelność interfejsu

- Data: 2026-07-17
- Gałąź: `codex/duet-catalog-integration`
- Silnik: `_tester/_base/.silnik/`
- Plan: zatwierdzony w rozmowie 2026-07-17

## Stan wyjściowy

- Drzewo robocze zawiera wyłącznie zastaną, nieśledzoną paczkę `_tester/dist/Straznik-Tajemnic-AI-0.9.0-beta-Win-Mac-2026-07-17.zip`.
- Testy `player-switcher` i `predefined-characters-selector`: PASS, 7/7.
- Istniejąca paczka ZIP pozostaje nietknięta do końcowej weryfikacji.

## Fazy

1. Blokery duetu: skład sesji, przełączanie gracza, deklaracje i grupy testów - zakończone.
2. Interfejs i dane: karta, biografia, wyposażenie, wspólny Dziennik Przygody - zakończone.
3. Weryfikacja końcowa i nowa paczka testowa - zakończone.

## Checkpoint fazy 1

- Skład sesji jest filtrowany do dwóch `characterId` z konfiguracji Hot Seat.
- Przełącznik na ekranie głównym zmienia aktywnego gracza; modale oglądają postać niezależnie.
- Niepełnej tury nie można wysłać; `Pasuję` jest pełnoprawną deklaracją; po Enter aktywuje się drugi gracz.
- Parser obsługuje adresowane tagi `[TEST:@Imię: ...]` i grupuje testy z jednej odpowiedzi.
- Pierwszy wynik grupy zostaje lokalnie, a komplet tworzy jedno żądanie do MG.
- Rzut, Szczęście, dziennik rzutu i oznaczenie rozwoju trafiają do postaci wskazanej przez test.
- Testy fazy 1: PASS 17/17.
- TypeScript: PASS.
- ESLint: 0 błędów; pozostały wcześniejsze ostrzeżenia hooków i starego sidebara.

## Stan wyjściowy fazy 2

- Data: 2026-07-17
- Commit bazowy: `ed34f83567961762f77aa5a65bac422a08976333`
- Drzewo robocze: wyłącznie zastana, nieśledzona paczka ZIP w `_tester/dist/`.
- Testy graniczne etapu 1 i katalogu postaci: PASS, 5 zestawów / 14 testów.
- `CLAUDE.md`: brak w repozytorium; komendy weryfikacyjne przyjęte z `package.json` i dotychczasowego pliku stanu.
- Zakres fazy: spójna biografia presetów, bogatszy ekwipunek z lokalnymi obrazami oraz wspólny Dziennik Przygody z migracją wpisów bez duplikatów.

## Checkpoint fazy 2

- Biografia: zweryfikowano renderowanie kanonicznego `background` wszystkich 26 presetów w istniejącej sekcji `Tło Postaci`.
- Ekwipunek: każdy gotowy badacz ma co najmniej 6 przedmiotów, uzupełnianych zestawem epoki i archetypu bez duplikatów nazw.
- Obrazy: każdy przedmiot presetu ma lokalny `imageUrl`; dodano 8 miniatur SVG kategorii w `public/equipment/predefined/`, bez wywołań API.
- Dziennik: duet widzi jeden scalony `Dziennik Przygody`; stare wpisy obu postaci są deduplikowane po `id` i sortowane od najnowszego.
- Edycja dziennika: dodawanie, zmiana i usuwanie wpisów synchronizuje wspólny stan obu uczestników, bez modyfikowania pozostałych kart w katalogu.
- Powiadomienia i eksport dziennika korzystają ze wspólnego licznika i nazw obojga graczy.
- Testy fazy 2 i regresji duetu: PASS, 9 zestawów / 20 testów.
- Testy powiązane ze zmienionymi modułami: PASS, 5 zestawów / 10 testów.
- TypeScript: PASS.
- ESLint zmienionych plików: 0 błędów, 12 wcześniejszych ostrzeżeń w `page.tsx` i `CthulhuSidebar.tsx`.
- Produkcyjny build, pełny playtest i nowa paczka pozostają zakresem fazy 3.

## Checkpoint fazy 3

- Pełny Jest: PASS, 17 zestawów / 39 testów.
- TypeScript: PASS.
- ESLint zmienionych plików: 0 błędów; pozostało 12 wcześniejszych ostrzeżeń w `page.tsx` i `CthulhuSidebar.tsx`.
- Produkcyjny build Next.js 16.2.6: PASS, 61 stron.
- Playtest Hot Seat na produkcyjnym `next start`: PASS, Chromium 1/1.
- Playtest potwierdził: przełączanie Aga/Jakub, dwie deklaracje w jednym żądaniu MG, wspólny Dziennik Przygody, deduplikację starych wpisów i 6 lokalnych miniatur aktywnej postaci.
- Skrypt paczki sprawdza teraz wymagania etapu 2: 8 miniatur SVG, helper wspólnego dziennika i nagłówek `DZIENNIK PRZYGODY`.
- Nowa paczka: `_tester/dist/Straznik-Tajemnic-AI-0.9.0-beta-Win-Mac-2026-07-17.zip`.
- Rozmiar paczki: 24 247 561 bajtów.
- SHA-256: `617afc8086fe5bafdf122f1e9c12204058e225cfc2be7742d8b48013b9e32d1d`.
- Audyt ZIP: PASS, 745 wpisów, integralność bez błędów, 26/26 portretów, 8/8 miniatur SVG, brak sekretów i danych runtime.
- Nienaprawione ostrzeżenia spoza zakresu: przestarzałe dane Browserslist oraz szeroki ślad NFT Turbopack przez dynamiczne operacje plikowe w lokalnym vector store.

## Checkpoint poprawek po review `dev-5`

- C1: modal rzutu zachowuje wynik po wydaniu Szczęścia i resetuje się dopiero po zmianie identyfikatora testu.
- W1: niedokończone deklaracje są czyszczone przy nowej przygodzie, wczytaniu zapisu i zmianie składu lub przebiegu Hot Seat.
- W2: wspólny dziennik ma identyfikator konkretnego przebiegu przygody; starsze wpisy są migrowane jednorazowo, a historia poprzednich przygód zostaje zachowana poza bieżącym widokiem.
- W3: konflikt wpisów o tym samym `id` rozstrzyga data ostatniej zmiany, a przy remisie nowsza napotkana kopia.
- Test helpera dziennika: PASS, 6/6.
- Pełny Jest: PASS, 17 zestawów / 39 testów.
- TypeScript, format i lint zmienionych plików: PASS, bez nowych błędów.
- Produkcyjny build: PASS, 61 stron.
- Playtest Hot Seat na `next start`: PASS, Chromium 1/1.
- Paczka testowa została przebudowana i przeszła kontrolę integralności, zawartości oraz danych runtime.

## Decyzje

- Skład rozpoczętej sesji pochodzi wyłącznie z `HotSeatConfig.players[].characterId`.
- Modale oglądają postać lokalnie i nie zmieniają aktywnego gracza.
- W duecie odpowiedź MG powstaje dopiero po dwóch deklaracjach albo komplecie wymaganych rzutów.
- Dziennik jest wspólny dla przygody, a stare wpisy postaci będą scalane bez duplikatów.
- Gotowe postacie korzystają z lokalnych obrazów wyposażenia bez API.
- Docelowy zakres produktu to gra solo lub w duecie. Tryb 3-4 graczy nie będzie rozwijany.

## Plan po review `dev-5`

- [x] W4: dodano test integracyjny dwóch adresowanych rzutów przez `ChatWindow` i `RollTestModal`; potwierdza Szczęście, właściwe dzienniki, oznaczenie rozwoju i dokładnie jedno żądanie do MG po drugim rzucie.
- [x] W5: dodano test mutacji wspólnego Dziennika Przygody; obejmuje dodanie, edycję i usunięcie wpisu, jednakowy zapis uczestników oraz brak zmian na trzeciej karcie spoza przygody.
- [ ] Następna sesja: ręczny test zmian przez użytkownika przed dalszym scalaniem lub publikacją.

## Checkpoint testów W4 i W5

- Testy graniczne W4/W5: PASS, 2 zestawy / 3 testy.
- Pełny Jest po dodaniu testów: PASS, 18 zestawów / 41 testów.
- TypeScript, ESLint zmienionych testów, Prettier i `git diff --check`: PASS.
- Implementacja testów nie wymagała zmian w kodzie produkcyjnym.
- Poprawki po review: asercje finalnych wyników 60/30, ciągłości `id` wpisu oraz wywołania i sprzątania `window.confirm` - zakończone.
