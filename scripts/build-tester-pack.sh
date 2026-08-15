#!/bin/zsh

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="$REPO_ROOT/_tester/_base"
DIST_DIR="$REPO_ROOT/_tester/dist"
ARCHIVE="$DIST_DIR/Straznik-Tajemnic-AI-0.9.3-Win-Mac.zip"
STAGING_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/straznik-package.XXXXXX")"
STAGING_DIR="$STAGING_ROOT/package"
TEMP_ARCHIVE="$STAGING_ROOT/package.zip"

cleanup() {
  rm -rf "$STAGING_ROOT"
}
trap cleanup EXIT

mkdir -p "$STAGING_DIR" "$DIST_DIR"

rsync -a \
  --exclude '.DS_Store' \
  --exclude '.env.local' \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude '.desktop' \
  --exclude 'coverage' \
  --exclude 'playwright-report' \
  --exclude 'test-results' \
  --exclude '.playtest-results' \
  --exclude 'data/saves' \
  --exclude 'data/sessions' \
  --exclude 'data/results' \
  --exclude 'data/rag' \
  --exclude 'data/usage' \
  --exclude 'public/game-saves' \
  "$SOURCE_DIR/" "$STAGING_DIR/"

(
  cd "$STAGING_DIR"
  zip -qry "$TEMP_ARCHIVE" .
)

mv -f "$TEMP_ARCHIVE" "$ARCHIVE"

portrait_count="$({ unzip -Z1 "$ARCHIVE" || true; } | grep -Ec '^\.silnik/public/portraits/predefined/[^/]+\.webp$')"
if [ "$portrait_count" -lt 26 ]; then
  echo "FAIL: paczka zawiera $portrait_count portretów WebP (oczekiwano >= 26)"
  exit 1
fi

equipment_image_count="$({ unzip -Z1 "$ARCHIVE" || true; } | grep -Ec '^\.silnik/public/equipment/predefined/[^/]+\.svg$')"
if [ "$equipment_image_count" -ne 8 ]; then
  echo "FAIL: paczka zawiera $equipment_image_count/8 lokalnych miniatur ekwipunku SVG"
  exit 1
fi

if unzip -Z1 "$ARCHIVE" | grep -Eq '(^|/)(\.env\.local|node_modules|\.next|data/saves|test-results|playwright-report)(/|$)'; then
  echo 'FAIL: paczka zawiera dane lokalne albo artefakty runtime'
  exit 1
fi

if ! unzip -p "$ARCHIVE" '.silnik/src/hooks/useFullSave.ts' | grep -Fq 'restoreHotSeatConfig'; then
  echo 'FAIL: paczka nie zawiera aktualnego kodu przypisań duetu'
  exit 1
fi

if ! unzip -p "$ARCHIVE" '.silnik/src/lib/journal/shared-adventure-journal.ts' | grep -Fq 'mergeAdventureJournalEntries'; then
  echo 'FAIL: paczka nie zawiera scalania wspólnego Dziennika Przygody'
  exit 1
fi

if ! unzip -p "$ARCHIVE" '.silnik/src/components/ui/session-journal.tsx' | grep -Fq 'DZIENNIK SESJI'; then
  echo 'FAIL: paczka nie zawiera interfejsu wspólnego Dziennika Sesji'
  exit 1
fi

echo "PASS: $ARCHIVE"
echo "Portrety WebP: $portrait_count/26"
echo "Miniatury ekwipunku SVG: $equipment_image_count/8"
du -h "$ARCHIVE"
