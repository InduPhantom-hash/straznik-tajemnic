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
ALT_PORT=4050
ZEW_DATA_ROOT="${ZEW_DATA_DIR:-$HOME/Library/Application Support/ZewCthulhu}"
ZEW_PROFILE_DIR="$ZEW_DATA_ROOT/desktop/chrome-profile"

log "=== START  APP_DIR=$APP_DIR  \$0=$0  CWD=$(pwd) ==="

# --- KROK 0: ubij dzialajaca gre PRZED czyszczeniem (sedno fixu) ---
SRV_PIDS="$(lsof -ti :$APP_PORT :$ALT_PORT 2>/dev/null || true)"
if [ -n "$SRV_PIDS" ]; then
  log "KROK 0: serwery gier ($APP_PORT, $ALT_PORT) dzialaja (PID: $(echo "$SRV_PIDS" | tr '\n' ' ')) - zatrzymuje"
  echo "$SRV_PIDS" | xargs kill 2>/dev/null || true
fi
CHROME_PIDS="$(pgrep -fl "user-data-dir=.*(chrome-profile|ZewCthulhu)" 2>/dev/null | awk '{print $1}' || true)"
if [ -n "$CHROME_PIDS" ]; then
  log "KROK 0: okno gry (Chrome) dziala (PID: $(echo "$CHROME_PIDS" | tr '\n' ' ')) - zamykam"
  echo "$CHROME_PIDS" | xargs kill 2>/dev/null || true
fi
pkill -f "user-data-dir=.*chrome-profile" 2>/dev/null || true
pkill -f "user-data-dir=.*ZewCthulhu" 2>/dev/null || true

# Czekaj az Chrome/serwer zwolnia pliki i pamiec (max ~10s).
for _ in $(seq 1 20); do
  if pgrep -fl "user-data-dir=.*(chrome-profile|ZewCthulhu)" >/dev/null 2>&1 || lsof -ti :$APP_PORT :$ALT_PORT >/dev/null 2>&1; then
    sleep 0.5
  else
    break
  fi
done
# Dobij procesy i porty gdyby wisialy.
pgrep -fl "user-data-dir=.*(chrome-profile|ZewCthulhu)" 2>/dev/null | awk '{print $1}' | xargs kill -9 2>/dev/null || true
lsof -ti :$APP_PORT :$ALT_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
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

# --- 2. Dane sesji gracza (dysk + Application Support) ---
rm -rf data/saves/local data/sessions data/results public/game-saves data/usage data/pricing 2>/dev/null || true
rm -rf _tester/_base/.silnik/data/saves/local _tester/_base/.silnik/data/sessions _tester/_base/.silnik/data/results _tester/_base/.silnik/data/usage _tester/_base/.silnik/data/pricing 2>/dev/null || true
rm -rf "$ZEW_DATA_ROOT/saves" "$ZEW_DATA_ROOT/sessions" "$ZEW_DATA_ROOT/results" "$ZEW_DATA_ROOT/usage" "$ZEW_DATA_ROOT/pricing" "$ZEW_DATA_ROOT/campaigns" 2>/dev/null || true
log "usunieto: save'y, sesje, wyniki, licznik kosztow (repo + $ZEW_DATA_ROOT)"

# --- 3. Profil Chrome launchera (localStorage/IndexedDB: czat, postacie, ustawienia) ---
rm -rf "$PROFILE_DIR" "$ZEW_PROFILE_DIR" "$APP_DIR/.desktop/chrome-profile" "$APP_DIR/_tester/_base/.silnik/.desktop/chrome-profile" 2>/dev/null || true
sleep 0.5
rm -rf "$PROFILE_DIR" "$ZEW_PROFILE_DIR" "$APP_DIR/.desktop/chrome-profile" "$APP_DIR/_tester/_base/.silnik/.desktop/chrome-profile" 2>/dev/null || true
log "rm profilu: OK (czat, postacie, ustawienia wyczyszczone we wszystkich lokalizacjach)"

# --- 4. Baza podręcznika zasad i pamięć RAG (czyste BYOB) ---
# Usuwamy zaindeksowane zasady i kampanie, aby po resecie gra wymagała wgrania własnego PDF
rm -f data/rag/rules.* data/rag/rules-profile.json data/rag/capabilities.json data/rag/campaigns__* data/rag/npcs.* data/rag/world-state.* 2>/dev/null || true
rm -f _tester/_base/.silnik/data/rag/rules.* _tester/_base/.silnik/data/rag/rules-profile.json _tester/_base/.silnik/data/rag/capabilities.json _tester/_base/.silnik/data/rag/campaigns__* _tester/_base/.silnik/data/rag/npcs.* _tester/_base/.silnik/data/rag/world-state.* 2>/dev/null || true
rm -f "$ZEW_DATA_ROOT/rag/rules.*" "$ZEW_DATA_ROOT/rag/rules-profile.json" "$ZEW_DATA_ROOT/rag/capabilities.json" "$ZEW_DATA_ROOT/rag/campaigns__*" "$ZEW_DATA_ROOT/rag/npcs.*" "$ZEW_DATA_ROOT/rag/world-state.*" 2>/dev/null || true
log "usunieto: baze zasad BYOB (rules.*, profile), kampanie i pamiec NPC"
log "ZOSTAWIONO: oficjalne bazy wiedzy scenariuszy i mitow (adventures/mythos)"

# --- 5. Auto-rebuild silnika (gwarancja aktualnego kodu) ---
SILNIK_DIR="$APP_DIR/_tester/_base/.silnik"
if [ -f "$SILNIK_DIR/package.json" ]; then
  log "budowanie aktualnej wersji silnika..."
  if (cd "$SILNIK_DIR" && npm run build 2>&1 | tail -5 | tee -a "$LOG"); then
    log "build: OK"
  else
    log "build: FAIL (uruchomienie moze uzyc starego kodu)"
  fi
else
  log "UWAGA: katalog silnika ($SILNIK_DIR) nie znaleziony - pomijam build"
fi

log "=== GOTOWY ==="

# --- 6. Opcjonalnie: uruchom swieza gre ---
if [ "${1:-}" = "--play" ]; then
  log "uruchamiam swieza gre..."
  exec bash "$APP_DIR/desktop/launcher.sh"
fi
