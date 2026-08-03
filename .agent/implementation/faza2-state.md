## ✅ Faza 2 zakończona: Naprawa mechanizmu restartu w launcher.sh

**Zmiany:**
- `desktop/launcher.sh`: Dodano sprawdzanie na żywo manifestu używanego buildu (`_buildManifest.js`). Jeśli launcher wykryje HTTP 404 (stary proces serwera Next.js nie posiada plików z nowego buildu leżącego na dysku), agresywnie go ubije (`lsof -ti :$PORT | xargs kill -9`) i przejdzie do standardowej procedury startowej nowej instancji.
- `_tester/_base/.silnik/desktop/launcher.sh`: Zsynchronizowano zmiany z plikiem źródłowym.
- `desktop/test-launcher-regressions.sh`: Dodano asercje weryfikujące, czy zabezpieczenie wariantu BUILD_ID jest obecne we wszystkich zdefiniowanych launcherach uniksowych.
- Przebudowano paczkę `.app` aplikacji na Biurku przy pomocy skryptu `desktop/build-app.sh`. Aplikacja otrzymała zaktualizowany i bezpieczny kod uruchomieniowy.

**Weryfikacja:**
- Testy: PASS (Skrypt `desktop/test-launcher-regressions.sh` zwrócił PASS: pełny ekran, blokada haseł i weryfikacja BUILD_ID są zabezpieczone we wszystkich launcherach).
- TypeScript: N/A (Skrypty bashowe).
- Lint: N/A (`zsh -n` PASS).

**Stan kontekstu:** Niski
**Następna faza:** Zakończenie implementacji i commit — kontynuujemy?
