#!/bin/zsh
#
# Zimny start "Moj Straznik Tajemnic" - czysci dane testowej rozgrywki do stanu dziewiczego.
#
# Czysci:   save'y (po auto-backupie), sesje, wyniki, profil Chrome (localStorage =
#           czat/postacie/ustawienia), licznik kosztow, pamiec NPC RAG (npcs + world-state).
# ZOSTAWIA: baze wiedzy RAG (rules/adventures/mythos ~400 MB), .env.local, build (.next), .app.
#
# WAZNE: KROK 0 ubija dzialajaca gre (serwer launchera + okno Chrome) PRZED czyszczeniem -
# inaczej Chrome trzyma localStorage w pamieci i odtwarza profil po rm (bug "reset nie czysci").
#
# APP_DIR: env ZEW_APP_DIR (od reset-launcher) > placeholder build-app.sh > fallback $0.
# Loguje do ~/Library/Logs/straznik-tajemnic-reset.log. Wolany przez bash, kod POSIX-safe.
#
# Uzycie: bash desktop/cold-start.sh [--play]
#   --play  po wyczyszczeniu uruchamia swieza gre (launcher.sh) - dla ikony "Reset i graj".

set -u

# --- APP_DIR: env > placeholder > fallback po $0 ---
APP_DIR="${ZEW_APP_DIR:-__APP_DIR__}"
if [ ! -f "$APP_DIR/package.json" ]; then
  APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi

LOG="$HOME/Library/Logs/straznik-tajemnic-reset.log"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [cold-start] $*" | tee -a "$LOG"; }

# Guard bezpieczenstwa: nigdy nie odpalaj rm poza repo aplikacji.
if [ ! -f "$APP_DIR/package.json" ] || [ ! -d "$APP_DIR/desktop" ]; then
  log "BLAD: '$APP_DIR' nie wyglada na repo aplikacji - przerywam (zaden plik nie ruszony)."
  exit 1
fi
cd "$APP_DIR" || exit 1

TS="$(date +%Y%m%d-%H%M%S)"
PROFILE_DIR="$APP_DIR/.desktop/chrome-profile"
APP_PORT="${ZEW_APP_PORT:-4040}"

log "=== START  APP_DIR=$APP_DIR  \$0=$0  CWD=$(pwd) ==="

# --- KROK 0: ubij dzialajaca gre PRZED czyszczeniem (sedno fixu) ---
SRV_PIDS="$(lsof -ti :$APP_PORT 2>/dev/null || true)"
if [ -n "$SRV_PIDS" ]; then
  log "KROK 0: serwer $APP_PORT dziala (PID: $(echo "$SRV_PIDS" | tr '\n' ' ')) - zatrzymuje"
  echo "$SRV_PIDS" | xargs kill 2>/dev/null || true
fi
if pgrep -f "user-data-dir=$PROFILE_DIR" >/dev/null 2>&1; then
  log "KROK 0: okno gry (Chrome) dziala - zamykam"
  pkill -f "user-data-dir=$PROFILE_DIR" 2>/dev/null || true
fi
# Czekaj az Chrome/serwer zwolnia pliki i pamiec (max ~10s).
for _ in $(seq 1 20); do
  if pgrep -f "user-data-dir=$PROFILE_DIR" >/dev/null 2>&1 || lsof -ti :$APP_PORT >/dev/null 2>&1; then
    sleep 0.5
  else
    break
  fi
done
# Dobij port gdyby wisial.
lsof -ti :$APP_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
log "KROK 0: gra zatrzymana (serwer + okno)"

# --- 1. Auto-backup save'ow (tylko gdy cos jest) ---
# Backup laduje w data/saves/_backups/ - rodzenstwo local/, endpoint GET go nie listuje.
if [ -d data/saves/local ] && [ -n "$(ls -A data/saves/local 2>/dev/null)" ]; then
  mkdir -p "data/saves/_backups/$TS"
  cp -R data/saves/local/. "data/saves/_backups/$TS/" 2>/dev/null || true
  log "backup save'ow -> data/saves/_backups/$TS"
else
  log "brak save'ow do backupu"
fi

# --- 2. Dane sesji gracza (dysk) ---
rm -rf data/saves/local data/sessions data/results public/game-saves data/usage 2>/dev/null || true
log "usunieto: save'y, sesje, wyniki, licznik kosztow"

# --- 3. Profil Chrome launchera (localStorage/IndexedDB: czat, postacie, ustawienia) ---
if [ -d "$PROFILE_DIR" ]; then
  log "profil PRZED rm: istnieje ($(find "$PROFILE_DIR" -type f 2>/dev/null | wc -l | tr -d ' ') plikow)"
else
  log "profil PRZED rm: nie istnieje"
fi
rm -rf "$PROFILE_DIR" 2>/dev/null || true
if [ -d "$PROFILE_DIR" ]; then
  log "profil wciaz istnieje po rm - druga proba za 1s"
  sleep 1
  rm -rf "$PROFILE_DIR" 2>/dev/null || true
fi
if [ -d "$PROFILE_DIR" ]; then
  log "rm profilu: FAIL (katalog nadal istnieje - sprawdz uprawnienia/TCC, patrz plan B)"
else
  log "rm profilu: OK (czat, postacie, ustawienia wyczyszczone)"
fi

# --- 4. Pamiec NPC RAG (ZOSTAW rules/adventures/mythos!) ---
rm -f data/rag/npcs.* data/rag/world-state.* 2>/dev/null || true
log "usunieto: pamiec NPC (RAG npcs + world-state)"
log "ZOSTAWIONO: baze wiedzy RAG (rules/adventures/mythos)"
log "=== GOTOWY ==="

# --- 5. Opcjonalnie: uruchom swieza gre ---
if [ "${1:-}" = "--play" ]; then
  log "uruchamiam swieza gre..."
  exec bash "$APP_DIR/desktop/launcher.sh"
fi
