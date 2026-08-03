## Plan: Czyszczenie i naprawa launchera (BUILD_ID)
Data: 2026-08-03
Złożoność: Średnia

### Problem
Aplikacja desktopowa ignoruje nowe kompilacje (buildy) jeśli serwer Next.js już działa. Dodatkowo poprzednia sesja debugowania zaśmieciła repozytorium nieśledzonymi plikami tymczasowymi oraz redundantnymi duplikatami w `src/`.

### Rozwiązanie
Najpierw wyczyszczenie repozytorium do stanu zgodnego z HEAD (usunięcie śmieci i duplikatów, zachowanie tylko poprawnych zmian biografii). Następnie wdrożenie do `desktop/launcher.sh` weryfikacji zgodności `.next/BUILD_ID` (lokalny dysk vs działający serwer) zanim launcher zadecyduje o otwarciu okna na istniejącym procesie. 

### Pliki do modyfikacji
| plik | zmiana | ryzyko |
|------|--------|--------|
| `_tester/_base/.silnik/*.png`, `*.js`, `patch_wizard.sh` itp. | Usunięcie 17 plików śmieciowych | Niskie |
| `src/components/ui/character-wizard.tsx` i 4 inne pliki w `src/` | Usunięcie/cofnięcie duplikatów z głównego `src/` | Niskie |
| `desktop/launcher.sh` | Dodanie weryfikacji `BUILD_ID` (linie 76-78) przed warunkiem `if ! curl -sf "$URL"` | Średnie |
| `desktop/test-launcher-regressions.sh` | Dodanie testu weryfikującego reakcję na zmianę `BUILD_ID` | Niskie |

### Mapa Zadań (Fazy implementacji)

**Faza 1: Czyszczenie środowiska**
- [ ] Usunięcie 17 plików śmieciowych (skrypty i PNG) z `_tester/_base/.silnik/`. `(Blokuje: Faza 2)`
- [ ] Usunięcie 5 zduplikowanych plików z głównego katalogu `src/`.
- [ ] Ubicie wiszącego serwera na porcie 4050.
- Weryfikacja: Czyste `git status` (poza plikami biografii) oraz brak serwera w `lsof -ti :4050`.

**Faza 2: Naprawa mechanizmu restartu w launcher.sh**
- [ ] Odczyt `.next/BUILD_ID` z dysku w `desktop/launcher.sh`. `(Zablokowane przez: Faza 1)`
- [ ] Odpytanie działającego serwera o `BUILD_ID` (np. przez `/__NEXT_DATA__` lub test pliku statycznego).
- [ ] Zabicie procesu serwera w przypadku niezgodności ID.
- [ ] Rozszerzenie testów w `desktop/test-launcher-regressions.sh`.
- [ ] Przebudowa paczki przez `desktop/build-app.sh`.
- Weryfikacja: Po restarcie aplikacja serwuje nowy kod.

### Weryfikacja końcowa
- Wykonanie `bash desktop/test-launcher-regressions.sh`
- Uruchomienie aplikacji `Strażnik Tajemnic AI.app` z nowym kodem.

### Co może się zepsuć
- Błędna logika w bashu `launcher.sh` może sprawić, że aplikacja wejdzie w pętlę ciągłych restartów serwera (wysokie ryzyko). Wymagane staranne obsłużenie zmiennych.
