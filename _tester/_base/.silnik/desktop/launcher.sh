#!/bin/zsh
#
# Strażnik Tajemnic AI (wersja publiczna) - launcher aplikacji na biurku.
#
# Zadanie:
#   1. Zapewnić, że lokalny serwer gry (next start) działa na porcie 4050.
#   2. Otworzyć okno gry w trybie app (Chrome --app = bez paska adresu, wyglada natywnie).
#   3. Serwer "na zadanie": jesli to MY go odpalilismy, ubic go gdy zamkniesz okno gry.
#
# Placeholdery __APP_DIR__ i __NODE_BIN_DIR__ podmienia desktop/build-app.sh przy skladaniu .app.
# Skrypt dziala tez uruchomiony bezposrednio ze zrodla (fallbacki ponizej).

set -u
setopt NULL_GLOB   # niepasujacy glob (np. brak ~/.nvm) -> pusty zamiast bledu; bez tego zsh przerywa skrypt

APP_DIR="__APP_DIR__"
NODE_BIN_DIR="__NODE_BIN_DIR__"
PORT=4050
URL="http://localhost:${PORT}"

# --- Ustal APP_DIR ---
# build-app.sh zaszywa realny APP_DIR. Detekcja fallbacku przez ISTNIENIE package.json,
# NIE przez porownanie z literalem "__APP_DIR__": sed -g w build-app.sh podmienia kazde
# wystapienie placeholdera, wiec porownanie w warunku tez by sie podmienilo i fallback
# odpalalby sie zawsze (ladujac w bundlu .app zamiast w repo). Detekcja po pliku jest odporna.
if [ ! -f "$APP_DIR/package.json" ]; then
  APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi

# --- node/npm w PATH ---
# .app uruchamiany z Findera NIE dziedziczy shellowego PATH; trzeba wskazac node recznie.
# Detekcja po -x (istnienie node), nie po placeholderze - z tego samego powodu co wyzej.
if [ ! -x "$NODE_BIN_DIR/node" ]; then
  for d in /opt/homebrew/bin /usr/local/bin "$HOME/.nvm/versions/node"/*/bin "$HOME/.local/bin"; do
    if [ -x "$d/node" ]; then NODE_BIN_DIR="$d"; break; fi
  done
fi
export PATH="$NODE_BIN_DIR:/opt/homebrew/bin:/usr/local/bin:$PATH"

RUNTIME_DIR="$APP_DIR/.desktop"
PROFILE_DIR="$RUNTIME_DIR/chrome-profile"
PID_FILE="$RUNTIME_DIR/server.pid"
COLD_START_FLAG="$RUNTIME_DIR/cold-start-requested"
LOG="$HOME/Library/Logs/straznik-tajemnic-ai.log"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

mkdir -p "$RUNTIME_DIR" "$PROFILE_DIR"
cd "$APP_DIR" || { echo "$(date) BLAD: brak katalogu $APP_DIR" >>"$LOG"; exit 1; }
rm -f "$COLD_START_FLAG"

# Chrome nie ma pytać o zapisywanie haseł w profilu launchera.
CHROME_PREFS="$PROFILE_DIR/Default/Preferences"
node -e '
const fs = require("fs");
const path = process.argv[1];
let prefs = {};
try { prefs = JSON.parse(fs.readFileSync(path, "utf8")); } catch (_) {}
prefs.credentials_enable_service = false;
prefs.profile = { ...(prefs.profile || {}), password_manager_enabled: false };
fs.mkdirSync(require("path").dirname(path), { recursive: true });
fs.writeFileSync(path, JSON.stringify(prefs));
' "$CHROME_PREFS"

echo "=== $(date) launcher start (port $PORT) ===" >>"$LOG"

# --- 1. Zapewnij serwer ---
# Serwer uruchomiony starym launcherem nie ma flagi potrzebnej trasie API.
# Zastap go tutaj, zanim otworzymy okno gry.
if curl -sf "$URL" >/dev/null 2>&1 && ! curl -sf "$URL/api/desktop/cold-start" | grep -q '"available":true'; then
  echo "$(date) serwer bez mostu zimnego startu - zatrzymuje stary proces" >>"$LOG"
  lsof -ti :$PORT 2>/dev/null | xargs kill 2>/dev/null || true
  for _ in $(seq 1 20); do
    lsof -ti :$PORT >/dev/null 2>&1 || break
    sleep 0.25
  done
fi

STARTED_SERVER=0
if ! curl -sf "$URL" >/dev/null 2>&1; then
  if [ ! -f _tester/_base/.silnik/.next/BUILD_ID ]; then
    echo "$(date) brak buildu - buduje (to potrwa)..." >>"$LOG"
    PORT=$PORT npm run build >>"$LOG" 2>&1
  fi
  echo "$(date) startuje serwer (next start)..." >>"$LOG"
  STRAZNIK_DESKTOP_COLD_START=1 ZEW_APP_PORT=$PORT PORT=$PORT nohup npm start >>"$LOG" 2>&1 &
  echo $! >"$PID_FILE"
  STARTED_SERVER=1
  # health-check ~30 s
  for _ in $(seq 1 100); do
    curl -sf "$URL" >/dev/null 2>&1 && break
    sleep 0.3
  done
else
  echo "$(date) serwer juz dziala - tylko otwieram okno" >>"$LOG"
fi

# --- 2. Otworz okno gry w trybie app ---
if [ -x "$CHROME" ]; then
  open -na "Google Chrome" --args \
    --app="$URL" \
    --start-fullscreen \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run --no-default-browser-check >>"$LOG" 2>&1
else
  echo "$(date) brak Chrome - otwieram w domyslnej przegladarce" >>"$LOG"
  open "$URL"
fi

# --- 3. Obsluga zimnego startu + auto-shutdown ---
sleep 4
# Monitorujemy sygnal nawet gdy serwer istnial, bo poprzedni launcher mogl juz nie dzialac.
COLD_START_REQUESTED=0
while pgrep -f "user-data-dir=$PROFILE_DIR" >/dev/null 2>&1; do
  if [ -f "$COLD_START_FLAG" ]; then
    COLD_START_REQUESTED=1
    break
  fi
  sleep 0.5
done
if [ "$COLD_START_REQUESTED" = "1" ]; then
  rm -f "$COLD_START_FLAG"
  echo "$(date) UI zlecilo zimny start" >>"$LOG"
  exec env ZEW_APP_DIR="$APP_DIR" ZEW_APP_PORT="$PORT" bash "$APP_DIR/desktop/cold-start.sh" --play
fi

# Normalne zamkniecie ubija serwer tylko wtedy, gdy uruchomil go ten launcher.
if [ "$STARTED_SERVER" = "1" ]; then
  echo "$(date) okno zamkniete - zatrzymuje serwer" >>"$LOG"
  if [ -f "$PID_FILE" ]; then
    SRV_PID="$(cat "$PID_FILE")"
    pkill -P "$SRV_PID" 2>/dev/null
    kill "$SRV_PID" 2>/dev/null
    rm -f "$PID_FILE"
  fi
  # Dobij cokolwiek wciaz nasluchuje na porcie (next start forkuje proces dziecko).
  lsof -ti :$PORT 2>/dev/null | xargs kill 2>/dev/null
  echo "=== $(date) serwer zatrzymany ===" >>"$LOG"
fi
