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

- **Port 4040** - osobny od Zew-App-4.0 (3000), więc oba mogą stać obok siebie.
- **Serwer na żądanie** - nic nie chodzi w tle, gdy nie grasz.
- **Logi**: `~/Library/Logs/straznik-tajemnic.log`.

## Instalacja / przebudowa

```bash
bash desktop/build-app.sh            # zbuduj + zainstaluj do ~/Applications + alias na biurku
bash desktop/build-app.sh --rebuild  # to samo, ale wymuś świeży production build
```

Po zmianie kodu, która ma trafić do wersji "Graj", uruchom `build-app.sh --rebuild`.

## Uruchamianie

- Dwuklik ikony na biurku (`~/Desktop/Straznik Tajemnic`) lub w `~/Applications`.
- Albo z terminala: `open ~/Applications/"Straznik Tajemnic.app"`.
- Chcesz w Docku na stałe? Przeciągnij ikonę z `~/Applications` na Dock.

## Rozwój (hot reload)

Pakowanie niczego nie zmienia w codziennym rozwoju:

```bash
npm run dev    # http://localhost:3000, hot reload - jak dotychczas
```

Launcher `.app` służy do **grania** (production, szybkie); `npm run dev` do **rozwoju** (od razu widać zmiany). Po skończonym rozwoju przebuduj apkę: `bash desktop/build-app.sh --rebuild`.

## Wymóg do grania: klucz API

Narracja / RAG / TTS potrzebują ważnego `GEMINI_API_KEY` w `.env.local` (serwerowy fallback dla trybu lokalnego już jest). Launcher, build i ekran startowy działają bez klucza - ale sama gra nie ruszy, dopóki klucz nie będzie ważny.

## Pliki

| Plik           | Rola                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `launcher.sh`  | serce: zapewnia serwer → otwiera okno → pilnuje zamknięcia → ubija serwer   |
| `build-app.sh` | generator `.app` + instalacja do `~/Applications` + alias na biurku         |
| `make-icon.sh` | ikona `.icns` (ciemne tło + emerald macka), Chrome headless + sips/iconutil |
| `README.md`    | ten plik                                                                    |

Wygenerowane artefakty (`icon.icns`, `icon.png`, `../.desktop/`) są w `.gitignore` - w repo wersjonujemy tylko źródła.

## Rozwiązywanie problemów

- **Okno się nie otwiera / „nie działa"**: zajrzyj do `~/Library/Logs/straznik-tajemnic.log`.
- **„command not found: npm"** w logu: launcher nie znalazł node. Przebuduj (`build-app.sh` zaszywa ścieżkę node z `command -v node`).
- **Serwer został po zamknięciu**: `lsof -ti :4040 | xargs kill`.
- **Port zajęty**: sprawdź, czy nie chodzi inna instancja (`lsof -i :4040`).
