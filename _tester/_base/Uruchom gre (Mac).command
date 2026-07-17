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
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
mkdir -p "$ENGINE/.desktop"

# node w PATH (dwuklik .command nie dziedziczy shellowego PATH)
for d in /opt/homebrew/bin /usr/local/bin "$HOME/.nvm/versions/node"/*/bin "$HOME/.local/bin"; do
  if [ -x "$d/node" ]; then export PATH="$d:$PATH"; break; fi
done
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Najpierw zainstaluj Node.js (wersja LTS) z https://nodejs.org, a potem uruchom ponownie." buttons {"OK"} default button 1 with title "Mój Strażnik Tajemnic"' >/dev/null 2>&1
  echo "Brak Node.js. Zainstaluj z https://nodejs.org i uruchom ponownie."
  read -r _; exit 1
fi

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
PORT=$PORT nohup npm start >"$ENGINE/.desktop/server.log" 2>&1 &
SRV=$!; echo $SRV >"$ENGINE/.desktop/server.pid"
for _ in $(seq 1 200); do curl -sf "$URL" >/dev/null 2>&1 && break; sleep 0.3; done

osascript -e 'display notification "Gra gotowa - otwieram okno." with title "Mój Strażnik Tajemnic"' >/dev/null 2>&1
if [ -x "$CHROME" ]; then
  open -na "Google Chrome" --args --app="$URL" --user-data-dir="$PROFILE" --no-first-run --no-default-browser-check
else
  echo "(Brak Google Chrome - otwieram w domyślnej przeglądarce.)"
  open "$URL"
fi

echo ""; echo "Gra działa w osobnym oknie. To okno możesz zminimalizować."
echo "Zamknij okno gry, aby zakończyć."
sleep 4
if [ -x "$CHROME" ]; then
  while pgrep -f "user-data-dir=$PROFILE" >/dev/null 2>&1; do sleep 2; done
  kill "$SRV" 2>/dev/null
  lsof -ti :$PORT 2>/dev/null | xargs kill 2>/dev/null
fi
