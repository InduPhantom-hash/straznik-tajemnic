# Specyfikacja: Rozszerzenie Biografii Strefy 11 & Single Source of Truth

## Cel
Wdrożenie pełnych, 200-300 słownych, klimatycznych życiorysów fabularnych (`backstory`) dla wszystkich 16 postaci ze Strefy 11 (4 scenariusze) oraz unifikacja źródeł prawdy tak, aby silnik `_tester/_base/.silnik/` był jedynym miejscem prawdy dla kodu i danych gry.

## 1. Postacie do aktualizacji (16 badaczy)
- **Scenariusz 1: Cień nad Prabutami / Sygnały Nieznanego (4 postacie)**
  1. Tomasz Nowicki (`strefa11_tomasz_nowicki`) - Dziennikarz Śledczy / Prowadzący
  2. Helena Krawczyk (`strefa11_helena_krawczyk`) - Producentka Telewizyjna
  3. dr Barbara Zawadzka (`strefa11_barbara_zawadzka`) - Etnograf / Parapsycholog
  4. Ryszard "Klucznik" Kaczmarek (`strefa11_ryszard_klucznik`) - B. Oficer SB / Technik Ochrony
- **Scenariusz 2: Tajemnica Pędnika: Kowary (4 postacie)**
  5. Inż. Marek Kamiński (`pednik_inzynier`) - Inżynier Mechanik
  6. Tomasz "Ryzykant" Wójcik (`pednik_kierowca`) - Kierowca Testowy
  7. Anna Dąbrowska (`pednik_dziennikarka`) - Dziennikarka Śledcza
  8. Dr Ewa Wiśniewska (`pednik_fizyk`) - Fizyk Teoretyk
- **Scenariusz 3: Tajemnica Dzieci z Traszyna (4 postacie)**
  9. Ksiądz Jan Kaczmarek (`traszyn_egzorcysta`) - Ksiądz Egzorcysta
  10. Andrzej "Aura" Zalewski (`traszyn_terapeuta`) - Bioenergoterapeuta
  11. Marta Kamińska (`traszyn_psycholog`) - Psycholog Dziecięcy
  12. Zofia "Zosia" Sadowska (`traszyn_etnografka`) - Lokalna Etnografka / Bibliotekarka
- **Scenariusz 4: Przybysz z Matriksa: Głogów (4 postacie)**
  13. Artur "Stary" Majchrzak (`glogow_detektyw`) - Prywatny Detektyw
  14. Piotr "Kabel" Wójcicki (`glogow_haker`) - Programista / Haker
  15. Dr Krystyna Zawada (`glogow_psychiatra`) - Psychiatra
  16. Karolina "Luna" Maj (`glogow_ufolog`) - UFOlog / Badaczka Anomalii

## 2. Architektura Single Source of Truth
- `_tester/_base/.silnik/src/lib/immersion/strefa-11-characters.ts` zawiera kompletną tablicę 16 postaci.
- `_tester/_base/.silnik/src/lib/immersion/predefined-characters.ts` importuje `STREFA_11_CHARACTERS` z `./strefa-11-characters` zamiast definiować zduplikowaną tablicę o innych identyfikatorach.
- Zdublowany, niekompletny katalog `src/` z roota zostaje usunięty, co eliminuje błędy synchronizacji i gwarantuje jedno źródło prawdy.
- Przebudowa `.app` przez `desktop/build-app.sh --rebuild` gwarantuje natychmiastową widoczność zmian w aplikacji na biurku użytkownika.

## 3. Bramki weryfikacji maszynowej (Checker)
- `npx tsc --noEmit` w `_tester/_base/.silnik` -> PASS
- `npm run lint` -> PASS
- `npm test` -> PASS
- `npm run build` -> PASS
- `bash desktop/build-app.sh --rebuild` -> PASS
