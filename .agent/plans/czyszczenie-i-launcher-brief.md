## Brief: Czyszczenie i naprawa launchera
**Co**: Posprzątanie repozytorium po błędnej sesji oraz naprawienie `desktop/launcher.sh` tak, by restartował serwer po nowym buildzie.
**Jak**: Usunięcie untracked files i ubicie portu 4050, a następnie dodanie logiki porównującej plik `.next/BUILD_ID` z wersją `buildId` zrzuconą w HTML przez aktywny serwer.
**Pliki**: `desktop/launcher.sh`, `desktop/test-launcher-regressions.sh` oraz lista 22 plików do skasowania.
**Test**: Uruchomienie `test-launcher-regressions.sh` i weryfikacja startu aplikacji na nowym kodzie.
**Ryzyko**: Średnie (ingerencja w główny skrypt startowy basha może skutkować infinite loopem, jeśli nie zabezpieczy się poprawnie weryfikacji HTTP).
