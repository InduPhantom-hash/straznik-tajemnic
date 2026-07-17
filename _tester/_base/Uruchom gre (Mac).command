#!/bin/zsh
# Launcher Mac. Cała aplikacja jest w ukrytym folderze .silnik (obok tego pliku).
# Pierwsze uruchomienie: instaluje zależności + buduje (kilka minut).
set -u
setopt NULL_GLOB
DIR="$(cd "$(dirname "$0")" && pwd)"
ENGINE="$DIR/.silnik"
[ -d "$ENGINE" ] || { echo "Brak folderu .silnik obok launchera."; read -r _; exit 1; }
cd "$ENGINE"
PORT=4040; URL="http://localhost:$PORT"
PROFILE="$ENGINE/.desktop/chrome-profile"
COLD_START_FLAG="$ENGINE/.desktop/cold-start-requested"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$ENGINE/.desktop"
rm -f "$COLD_START_FLAG"

# node w PATH (dwuklik .command nie dziedziczy shellowego PATH)
for d in /opt/homebrew/bin /usr/local/bin "$HOME/.nvm/versions/node"/*/bin "$HOME/.local/bin"; do
  if [ -x "$d/node" ]; then export PATH="$d:$PATH"; break; fi
done
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Najpierw zainstaluj Node.js (wersja LTS) z https://nodejs.org, a potem uruchom ponownie." buttons {"OK"} default button 1 with title "Mój Strażnik Tajemnic"' >/dev/null 2>&1
  echo "Brak Node.js. Zainstaluj z https://nodejs.org i uruchom ponownie."
  read -r _; exit 1
fi

# Chrome nie ma pytać o zapisywanie haseł w profilu launchera.
CHROME_PREFS="$PROFILE/Default/Preferences"
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

clear
echo "==============================================="
echo "   Mój Strażnik Tajemnic - uruchamianie"
echo "==============================================="
osascript -e 'display notification "Przygotowuję grę..." with title "Mój Strażnik Tajemnic"' >/dev/null 2>&1

if [ ! -d node_modules ]; then
  echo ""; echo "[1/3] Pierwsze uruchomienie: instaluję zależności."
  echo "      To potrwa kilka minut. NIE zamykaj tego okna."; echo ""
  npm install || { echo ""; echo "Błąd instalacji - sprawdź internet i spróbuj ponownie."; read -r _; exit 1; }
else
  echo "[1/3] Zależności gotowe - pomijam."
fi

if [ ! -f .next/BUILD_ID ]; then
  echo ""; echo "[2/3] Buduję aplikację (jednorazowo, kilka minut)..."; echo ""
  npm run build || { echo ""; echo "Błąd budowania."; read -r _; exit 1; }
else
  echo "[2/3] Aplikacja zbudowana - pomijam."
fi

echo ""; echo "[3/3] Uruchamiam grę..."
STRAZNIK_DESKTOP_COLD_START=1 ZEW_APP_PORT=$PORT PORT=$PORT nohup npm start >"$ENGINE/.desktop/server.log" 2>&1 &
SRV=$!; echo $SRV >"$ENGINE/.desktop/server.pid"
for _ in $(seq 1 200); do curl -sf "$URL" >/dev/null 2>&1 && break; sleep 0.3; done

osascript -e 'display notification "Gra gotowa - otwieram okno." with title "Mój Strażnik Tajemnic"' >/dev/null 2>&1
if [ -x "$CHROME" ]; then
  open -na "Google Chrome" --args --app="$URL" --start-fullscreen --user-data-dir="$PROFILE" --no-first-run --no-default-browser-check
else
  echo "(Brak Google Chrome - otwieram w domyślnej przeglądarce.)"
  open "$URL"
fi

echo ""; echo "Gra działa w osobnym oknie. To okno możesz zminimalizować."
echo "Zamknij okno gry, aby zakończyć."
sleep 4
if [ -x "$CHROME" ]; then
  COLD_START_REQUESTED=0
  while pgrep -f "user-data-dir=$PROFILE" >/dev/null 2>&1; do
    if [ -f "$COLD_START_FLAG" ]; then
      COLD_START_REQUESTED=1
      break
    fi
    sleep 0.5
  done
  if [ "$COLD_START_REQUESTED" = "1" ]; then
    rm -f "$COLD_START_FLAG"
    ZEW_APP_DIR="$ENGINE" ZEW_APP_PORT="$PORT" bash "$ENGINE/desktop/cold-start.sh"
    exec "$DIR/Uruchom gre (Mac).command"
  fi
  kill "$SRV" 2>/dev/null
  lsof -ti :$PORT 2>/dev/null | xargs kill 2>/dev/null
fi
