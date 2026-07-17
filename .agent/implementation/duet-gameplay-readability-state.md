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
2. Interfejs i dane: karta, biografia, wyposażenie, wspólny Dziennik Przygody - oczekuje na checkpoint.
3. Weryfikacja końcowa i nowa paczka testowa - oczekuje.

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

## Decyzje

- Skład rozpoczętej sesji pochodzi wyłącznie z `HotSeatConfig.players[].characterId`.
- Modale oglądają postać lokalnie i nie zmieniają aktywnego gracza.
- W duecie odpowiedź MG powstaje dopiero po dwóch deklaracjach albo komplecie wymaganych rzutów.
- Dziennik jest wspólny dla przygody, a stare wpisy postaci będą scalane bez duplikatów.
- Gotowe postacie korzystają z lokalnych obrazów wyposażenia bez API.
