# Audyt Cyklu Życia Aplikacji Desktopowej, Launchera i Procesów Systemowych (Issue #74)

Data audytu: 2026-09-23  
Status: Zrealizowany (PoC supervisora wdrożony)  
Projekt: Strażnik Tajemnic AI (d100 Weird Fiction)  
Autor: Inżynier Snajper / Antigravity AIOS  

---

## 1. Cel i Wprowadzenie

Celem audytu jest kompleksowa analiza warstwy uruchomieniowej aplikacji Strażnik Tajemnic AI (Desktop Runtime & Process Supervision), zmapowanie cyklu życia procesów, identyfikacja punktów awarii (procesy osierocone, kolizje portów, wycieki pamięci, brak reakcji na sygnały OS) oraz wdrożenie bezpiecznego i międzyplatformowego mechanizmu nadzoru procesów (macOS oraz Windows).

Aplikacja opiera się na lokalnym serwerze Node.js (Next.js 16) serwującym interfejs React 19, lokalnej bazie SQLite (WAL), trasach API (Gemini, RAG, TTS, Ingest) oraz dedykowanym oknie aplikacji bez pasków nawigacyjnych (Chrome/Edge w trybie `--app`).

---

## 2. Zmapowane Drzewo Procesów (Process Hierarchy)

### A. Stan Dotychczasowy (Naiwny Launcher Bashowy - macOS)

```
[User / Finder]
       │ (dwuklik w "Strażnik Tajemnic AI.app")
       ▼
[applet / MacOS binary wrapper]
       │
       ▼
[desktop/launcher.sh (zsh)]
       │
       ├─► curl -sf http://localhost:4050 (probowanie portu)
       ├─► nohup npm start &  ──► [npm CLI]
       │                               │
       │                               ▼
       │                        [node next start]
       │                               │ (fork)
       │                               ▼
       │                        [next-server (worker)]
       │
       └─► open -na "Google Chrome" --args --app=... ──► [Google Chrome]
                                                             │
                                                  (proces niezależny od shella)
```

#### Punkty awarii stanu dotychczasowego:
1. **Osierocone procesy (Zombie / Orphaned processes):** `launcher.sh` uruchamiał `nohup npm start &`. Proces `npm` tworzy podproces `node`, a ten z kolei forkuje faktyczny proces `next-server`. Użycie `pkill -P $SRV_PID` lub `kill $SRV_PID` zabijało wyłącznie proces nadrzędny (`npm`), pozostawiając proces potomny `next-server` nasłuchujący na porcie 4050 w nieskończoność.
2. **Kolizje portów:** Port 4050 był zdefiniowany na sztywno. W przypadku awarii lub pozostawienia wiszącego procesu, ponowne uruchomienie aplikacji nie potrafiło zaalokować alternatywnego portu.
3. **Pętla odpytywania `pgrep`:** Launcher monitorował okno w prymitywnej pętli `while pgrep -f ... sleep 0.5`, co generowało niepotrzebne wybudzenia procesora i było podatne na fałszywe dopasowania ciągów w tablicy procesów systemowych.
4. **Brak wsparcia dla Windows:** `launcher.sh` korzystał ze składni powłoki Zsh (`setopt NULL_GLOB`), uniemożliwiając uruchomienie aplikacji w środowisku Windows bez emulatorów.

---

### B. Nowa Architektura Nadzoru (Cross-Platform Node.js Supervisor)

```
[User / Finder / Explorer / Terminal]
       │
       ▼
[desktop/launcher.sh (macOS) / desktop/launcher.cmd (Windows)]
       │
       ▼
[desktop/supervisor.mjs (Proces nadrzędny - PID główny)]
       │
       ├─► [1. Port & Instance Probe]
       │        ├── Sprawdzenie portu bazowego (4050)
       │        ├── Single Instance Check: Jeśli nasza gra już działa -> Aktywuj okno (Focus) i EXIT 0
       │        └── Jeśli obcy proces zajmuje port -> Dynamiczny przydział wolnego portu (4051+)
       │
       ├─► [2. Process Group Spawning]
       │        └── Uruchomienie serwera Next.js z osobną grupą procesów (Process Group / detached: true)
       │            PID serwera: PGID = child.pid
       │
       ├─► [3. Window Lifecycle Monitor]
       │        ├── macOS: Google Chrome --app=... (fallback: open URL)
       │        └── Windows: msedge.exe / chrome.exe --app=... (fallback: start URL)
       │
       └─► [4. Centralna Pętla Zdarzeń & Cleanup Trap]
                ├── Przechwytywanie sygnałów: SIGINT, SIGTERM, SIGHUP, exit
                ├── Monitorowanie stanu procesu okna (exit listener)
                └── Kaskadowe czyszczenie (Tree Kill):
                    • POSIX: process.kill(-PGID, 'SIGTERM') / 'SIGKILL'
                    • Windows: taskkill /pid PID /T /F
```

---

## 3. Szczegółowa Analiza Podatności i Rozwiązania

| Obszar | Podatność w architekturze bashowej | Rozwiązanie w supervisorze Node.js |
|---|---|---|
| **Eliminacja procesów zombie** | Zabicie PID skryptu lub `npm` pozostawiało forki `next-server`. | Utworzenie grupy procesów (`detached: true`) i kaskadowe wysłanie sygnału do ujemnego PID (`-child.pid`) na POSIX lub `taskkill /T` na Windows. |
| **Konflikty portów** | Sztywny port 4050; błąd `EADDRINUSE` przy kolizji. | Skaner portów (`net.createServer`) z automatycznym przeskokiem na kolejny wolny port (4050 -> 4051 -> 4052...). |
| **Wielokrotne instancje (Single Instance)** | Drugie kliknięcie odpalało kolejny proces i kolidowało na porcie. | Szybki preflight HTTP pod port 4050: weryfikacja trasy `/api/desktop/cold-start` lub `BUILD_ID`. Jeśli to nasza gra, przywrócenie okna i bezpieczne zakończenie. |
| **Sygnały OS** | Skrypt bashowy nie reagował deterministycznie na `SIGTERM` / `SIGINT` wysyłane przez system (np. zamykanie sesji macOS/Windows). | Rejestracja synchronicznych i asynchronicznych handlerów `process.on('SIGINT')`, `process.on('SIGTERM')`, `process.on('SIGHUP')` ze sprzątaniem w bloku `finally`. |
| **Izolacja danych** | Ryzyko zapisu sesji, logów i profili przeglądarki wewnątrz katalogu git repo. | Wymuszenie `ZEW_DATA_DIR`: na macOS `~/Library/Application Support/ZewCthulhu`, na Windows `%APPDATA%\ZewCthulhu`. Logi w `Library/Logs` lub `%LOCALAPPDATA%\ZewCthulhu\Logs`. |

---

## 4. Ewaluacja Technologii Docelowych (Kierunek v2)

W ramach zgłoszenia #74 przeprowadzono badanie alternatywnych technologii okienkowych w celu zastąpienia uruchamiania przeglądarki flagą `--app`:

### 1. Tauri v2 (Rust + Natywne Webview + Sidecar Node.js)
- **Zalety:**
  - Bardzo mały rozmiar binarki launchera (< 10 MB).
  - Wykorzystuje systemowe silniki renderowania (WebKit na macOS, WebView2 na Windows) – brak narzutu pamięciowego Chromium.
  - Wbudowana obsługa zasobnika systemowego (System Tray), menu natywnego, globalnych skrótów klawiszowych i autoupdatera.
- **Wady i ograniczenia:**
  - Next.js 16 wymaga środowiska serwerowego Node.js dla tras API (`/api/chat`, lokalne osadzanie wektorowe, SQLite z WAL, audio streaming). W Tauri serwer ten musiałby działać jako binarny `sidecar` lub wbudowany proces Node/Bun.
  - Złożoność łańcucha budowania (wymaga zainstalowanego kompilatora Rust, Cargo, bibliotek systemowych per platforma).
- **Ocena:** Doskonały kandydat na pełne wydanie produkcyjne v2, wymagający przygotowania samodzielnego bundla serwera (Next.js standalone output).

### 2. .NET Photino (C# / Photino.NET)
- **Zalety:**
  - Ekstremalnie lekki wrapper natywnego Webview dla .NET (dostępny na macOS, Linux, Windows).
  - Prosty model programowania w C#.
- **Wady i ograniczenia:**
  - Wymaga środowiska uruchomieniowego .NET lub kompilacji Native AOT (duży narzut konfiguracji).
  - Mniejsza społeczność i mniej dojrzały ekosystem niż Tauri.
  - Podobnie jak Tauri, wymaga osobnego zarządzania procesem serwera Node.js.
- **Ocena:** Mniej optymalny niż Tauri pod kątem przenośności i wsparcia.

### 3. Microsoft WebView2 Wrapper (C++ / Node / C#)
- **Zalety:**
  - Wbudowany standard w Windows 10 i 11, pełna kontrola nad oknem i pamięcią podręczną.
- **Wady i ograniczenia:**
  - Rozwiązanie specyficzne dla Windows; na macOS wymagałoby całkowicie osobnej implementacji opartej o WKWebView (brak wspólnego API).
- **Ocena:** Zwiększa fragmentację kodu zamiast ją zmniejszać.

### 4. Lekki Node.js Supervisor (Wdrożony w PoC)
- **Zalety:**
  - **Zero dodatkowych zależności:** Korzysta wyłącznie ze standardowej biblioteki Node.js (`node:child_process`, `node:net`, `node:fs`, `node:os`, `node:http`).
  - **100% spójności technologicznej:** Użytkownik i deweloper mają już zainstalowane Node.js, które jest niezbędne do uruchomienia Next.js.
  - **Prawdziwy cross-platform:** Ten sam skrypt `supervisor.mjs` działa identycznie na macOS, Windows i Linux.
  - **Precyzyjna kontrola procesów:** Kaskadowy tree-kill, obsługa sygnałów IPC, obsługa restartów "zimnego startu".
- **Ocena:** **Rekomendowane rozwiązanie bieżące (v1.x)**, zapewniające natychmiastową stabilność produkcyjną bez narzutu kompilatorów Rust czy .NET.

---

## 5. Podsumowanie Wdrożenia i Rekomendacja Architektoniczna

1. **Wdrożono `desktop/supervisor.mjs`:** Centralny, odporny zarządca procesów odpowiadający za automatyczną alokację portów, politykę Single Instance, nadzór nad oknem i gwarancję eliminacji procesów zombie.
2. **Wdrożono `desktop/launcher.cmd`:** Natywny skrypt startowy dla systemu Windows, dopełniający `launcher.sh` na macOS.
3. **Zapewniono wsteczną zgodność:** Skrypt `launcher.sh` deleguje nadzór do `supervisor.mjs`, zachowując kompatybilność z generatorami `.app` (`build-app.sh`).
4. **Kolejny krok w roadmapie (v2):** Po ustabilizowaniu warstwy supervisora, rekomenduje się ewaluację pakietowania Tauri v2 w trybie `standalone` dla Next.js jako finalnego instalatora okienkowego.
