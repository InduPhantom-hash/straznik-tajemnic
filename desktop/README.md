# Strażnik Tajemnic - aplikacja na biurku (launcher)

Lekki launcher, który zamienia lokalny serwer Next.js w aplikację uruchamianą klikiem ikony na Macu - bez terminala. Interfejs gry zostaje ten sam (Next.js), zmienia się tylko sposób odpalania.

## Jak to działa

```
[ikona Strażnik Tajemnic]  <- dwuklik
   |
   1. launcher budzi lokalny serwer gry (next start) na porcie 4040
   2. otwiera okno Chrome --app (bez paska adresu = wygląda jak natywna apka)
   3. gdy zamkniesz okno gry -> serwer jest ubijany (serwer "na żądanie")
```

- **Port 4050** - osobny od prywatnej aplikacji (4040), więc obie mogą działać obok siebie.
- **Serwer na żądanie** - nic nie chodzi w tle, gdy nie grasz.
- **Logi**: `~/Library/Logs/straznik-tajemnic.log`.

## Instalacja / przebudowa

### macOS (aplikacja .app):
```bash
bash desktop/build-app.sh            # zbuduj + zainstaluj do ~/Applications + kopia na biurku
bash desktop/build-app.sh --rebuild  # to samo, ale wymuś świeży production build
```

### Windows (samowystarczalna paczka ZIP Zero-Setup):
Budowanie paczki Windows odbywa się automatycznie w GitHub Actions na runnerze `windows-latest` (kompilacja natywnych modułów C++ `win32-x64` takich jak `better-sqlite3`). Aby wygenerować paczkę ręcznie lub w środowisku CI:
```bash
node desktop/build-windows.mjs --output dist
```
Skrypt pobiera oficjalne środowisko portable Node.js, pakuje skompilowaną aplikację oraz dołącza launcher `Graj - Strażnik Tajemnic.cmd` i instrukcję.

## Uruchamianie

- **macOS**: Dwuklik ikony na biurku (`~/Desktop/Straznik Tajemnic AI.app`) lub w `~/Applications`.
- **Windows**: Wypakuj archiwum `straznik-tajemnic-windows.zip` i kliknij dwukrotnie `Graj - Strażnik Tajemnic.cmd`.

## Rozwój (hot reload)

Pakowanie niczego nie zmienia w codziennym rozwoju:

```bash
npm run dev    # http://localhost:3000, hot reload - jak dotychczas
```

Launcher służy do **grania** (production, szybkie); `npm run dev` do **rozwoju** (od razu widać zmiany). Po skończonym rozwoju na macOS przebuduj apkę: `bash desktop/build-app.sh --rebuild`.

## Wymóg do grania: klucz API

Do generowania narracji MG i dialogów wymagany jest bezpłatny klucz `GEMINI_API_KEY`:
- W trybie deweloperskim: w pliku `.env.local`.
- W wydaniu dla graczy: wprowadzany bezpośrednio w grze w oknie Ustawień (model BYOK: https://aistudio.google.com/).

## Pliki

| Plik                     | Rola                                                                        |
| ------------------------ | --------------------------------------------------------------------------- |
| `supervisor.mjs`         | Desktop Process Supervisor w Node.js: tree-kill zombie, porty, Single Instance |
| `launcher.sh`            | launcher powłoki macOS: deleguje nadzór do supervisora                      |
| `launcher.cmd`           | launcher wsadowy dla Windows (obsługuje portable Node.js oraz fallback systemowy) |
| `graj-windows.cmd`       | szablon głównego pliku startowego umieszczanego w korzeniu paczki Windows   |
| `INSTRUKCJA-WINDOWS.txt` | zwięzła instrukcja startowa dla graczy systemu Windows                      |
| `build-windows.mjs`      | generator samowystarczalnej paczki `straznik-tajemnic-windows.zip`           |
| `build-app.sh`           | generator `.app` + instalacja do `~/Applications` + kopia na biurku         |
| `make-icon.sh`           | ikona `.icns` (ciemne tło + emerald macka), Chrome headless + sips/iconutil |
| `README.md`              | ten plik                                                                    |

Wygenerowane artefakty (`icon.icns`, `icon.png`, `../.desktop/`, `../dist/`) są w `.gitignore` - w repo wersjonujemy tylko źródła.

## Rozwiązywanie problemów

- **macOS: Okno się nie otwiera / „nie działa"**: zajrzyj do `~/Library/Logs/straznik-tajemnic-ai.log`.
- **Windows: Okno się nie otwiera**: sprawdź plik logów w `%APPDATA%\ZewCthulhu\logs\straznik-tajemnic-ai.log`.
- **„command not found: npm"** w logu: launcher nie znalazł node. Przebuduj (`build-app.sh` zaszywa ścieżkę node z `command -v node`).
- **Zajęty port**: supervisor automatycznie szuka wolnego portu od 4050 w górę. W razie potrzeby ręcznego czyszczenia na macOS: `lsof -ti :4050 | xargs kill`.
