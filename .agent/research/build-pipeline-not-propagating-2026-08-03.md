## Research: Zmiany w kodzie nie widoczne w aplikacji desktopowej

Data: 2026-08-03

### Mapowanie (Wiedza z RAG + Drzewo Plików)

**Pipeline budowania i uruchamiania:**
1. Kod źródłowy: `_tester/_base/.silnik/src/`
2. Build: `npm run build` -> zapisuje do `_tester/_base/.silnik/.next/`
3. Root `package.json` deleguje `start` i `build` do `cd _tester/_base/.silnik && npm run ...`
4. `desktop/build-app.sh` składa `.app` bundle (launcher + ikona) i kopiuje na biurko
5. Launcher w `.app` wskazuje `APP_DIR="/Volumes/Karta/Developer/straznik-tajemnic"` i uruchamia `npm start` z tego katalogu
6. Serwer Next.js (`next start`) czyta pliki z `.next/` i serwuje na porcie 4050
7. Chrome `--app` otwiera `http://localhost:4050`

**Kluczowy problem (ROOT CAUSE):**
Launcher NIE restartuje serwera jeśli stary serwer jeszcze działa na porcie 4050.
Logika w `launcher.sh` linia 79: `if ! curl -sf "$URL" > /dev/null 2>&1; then` - jeśli serwer odpowiada, launcher POMIJA start nowego serwera i jedynie otwiera okno Chrome.

**Sekwencja zdarzeń z dzisiejszej sesji:**
- 14:50:15 - serwer wystartował ze STARYM buildem
- 14:54:18 - agent zakończył nowy build (`.next/` na dysku zaktualizowany)
- 14:55:15 - użytkownik uruchomił apkę -> launcher zobaczył działający serwer -> NIE restartował -> otworzył okno z STARYM kodem
- 14:56:13 - użytkownik zamknął apkę, serwer zatrzymany

**Dodatkowy problem:** Next.js `next start` w trybie production keszuje chunki JS w pamięci. Nawet gdyby pliki `.next/` się zmieniły na dysku, serwer który już je wczytał serwuje stare wersje.

### Obszar problemu

| Plik | Rola |
|------|------|
| desktop/launcher.sh | ROOT CAUSE - nie restartuje serwera gdy nowy build jest dostępny |
| _tester/_base/.silnik/.next/BUILD_ID | Identyfikator buildu - można użyć do detekcji zmiany |
| sheet-biography.tsx | Komponent biografii - zmiany poprawne w źródle |
| predefined-characters-selector.tsx | Modal postaci - zmiany poprawne w źródle |
| character-wizard.tsx | Kreator - zmiany poprawne w źródle |

### Rekomendowany następny krok

Natychmiastowa poprawka (nie wymaga /dev-2-plan):
1. Zabić serwer na porcie 4050: lsof -ti :4050 | xargs kill -9
2. Uruchomić apkę ponownie z biurka
3. TRWAŁA poprawka: dodać do launcher.sh detekcję zmiany BUILD_ID
