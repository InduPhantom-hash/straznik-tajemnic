#!/bin/zsh
#
# Executable dla ikony "Reset i graj" (.app). Pyta o potwierdzenie, czysci dane
# testowej rozgrywki (z auto-backupem save'ow), potem uruchamia swieza gre.
#
# Placeholdery __APP_DIR__/__NODE_BIN_DIR__ podmienia desktop/build-app.sh.
# Loguje do ~/Library/Logs/straznik-tajemnic-reset.log (diagnostyka gdy reset zawodzi).

set -u

APP_DIR="__APP_DIR__"
NODE_BIN_DIR="__NODE_BIN_DIR__"

# Fallback APP_DIR po istnieniu package.json (nie po literale - patrz launcher.sh).
if [ ! -f "$APP_DIR/package.json" ]; then
  APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi

# node/npm w PATH (.app z Findera nie dziedziczy PATH).
if [ ! -x "$NODE_BIN_DIR/node" ]; then
  for d in /opt/homebrew/bin /usr/local/bin "$HOME/.local/bin"; do
    if [ -x "$d/node" ]; then NODE_BIN_DIR="$d"; break; fi
  done
fi
export PATH="$NODE_BIN_DIR:/opt/homebrew/bin:/usr/local/bin:$PATH"

LOG="$HOME/Library/Logs/straznik-tajemnic-reset.log"
rlog() { echo "$(date '+%Y-%m-%d %H:%M:%S') [reset-launcher] $*" >>"$LOG"; }
rlog "=== START (APP_DIR=$APP_DIR) ==="

# Dialog potwierdzenia (natywny macOS). Domyslny przycisk "Anuluj" = Enter bezpieczny.
CHOICE="$(osascript \
  -e 'try' \
  -e 'display dialog "Reset i graj?

Usuwa bieżącą sesję: postacie, czat, zapisane gry i ustawienia (kopia zapasowa robiona automatycznie).

Baza wiedzy (zasady, przygody, Mity) zostaje nietknięta." with title "Mój Strażnik Tajemnic" buttons {"Anuluj", "Reset i graj"} default button "Anuluj" with icon caution' \
  -e 'return button returned of result' \
  -e 'on error' \
  -e 'return "Anuluj"' \
  -e 'end try' 2>/dev/null)"

rlog "dialog -> '$CHOICE'"
if [ "$CHOICE" != "Reset i graj" ]; then
  rlog "anulowano przez uzytkownika - wyjscie"
  exit 0
fi

# Czyszczenie (jawny APP_DIR przez env - niezalezne od CWD/$0 w kontekscie .app).
ZEW_APP_DIR="$APP_DIR" bash "$APP_DIR/desktop/cold-start.sh"
rlog "cold-start zakonczony (exit=$?)"

# Feedback dla uzytkownika (banner; glownym sygnalem i tak jest czysty ekran gry).
osascript -e 'display notification "Gotowe - uruchamiam świeżą grę." with title "Reset Strażnika"' 2>/dev/null || true

rlog "uruchamiam launcher.sh"
exec bash "$APP_DIR/desktop/launcher.sh"
