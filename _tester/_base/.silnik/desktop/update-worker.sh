#!/bin/bash
set -u

BUNDLE="" URL="" SHA256="" VERSION="" BUNDLE_ID="" EXPECTED_SIZE="" DATA_DIR="" PORT="4050" MINIMUM_MACOS=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --bundle) BUNDLE="$2"; shift 2;; --url) URL="$2"; shift 2;;
    --sha256) SHA256="$2"; shift 2;; --version) VERSION="$2"; shift 2;;
    --bundle-id) BUNDLE_ID="$2"; shift 2;; --size) EXPECTED_SIZE="$2"; shift 2;;
    --minimum-macos) MINIMUM_MACOS="$2"; shift 2;;
    --data-dir) DATA_DIR="$2"; shift 2;; --port) PORT="$2"; shift 2;; *) exit 2;;
  esac
done
[ -n "$BUNDLE" ] && [ -n "$URL" ] && [ -n "$SHA256" ] && [ -n "$VERSION" ] && [ -n "$BUNDLE_ID" ] && [ -n "$MINIMUM_MACOS" ] && [ -n "$DATA_DIR" ] || exit 2
UPDATES="$DATA_DIR/updates" STATUS="$DATA_DIR/updates/status.json" LOCK="$DATA_DIR/updates/update.lock" WORK="$DATA_DIR/updates/work-$VERSION-$$" BACKUP="$BUNDLE.rollback"
OPERATION_ID="$VERSION-$(date +%s)-$$"
SWAPPED=0
mkdir -p "$UPDATES"

write_status() {
  printf '{"id":"%s","state":"%s","version":"%s","message":"%s","updatedAt":"%s"}\n' "$OPERATION_ID" "$1" "$VERSION" "$2" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >"$STATUS.tmp"
  mv "$STATUS.tmp" "$STATUS"
}
cleanup() { rm -rf "$WORK"; rmdir "$LOCK" 2>/dev/null || true; }
rollback() {
  write_status "rolled_back" "$1"
  if [ -d "$BACKUP" ]; then [ -d "$BUNDLE" ] && mv "$BUNDLE" "$WORK.failed.app"; mv "$BACKUP" "$BUNDLE"; open "$BUNDLE" >/dev/null 2>&1 || true; fi
  cleanup; exit 1
}

version_at_least() {
  awk -v current="$1" -v required="$2" 'BEGIN {
    split(current, a, "."); split(required, b, ".");
    for (i = 1; i <= 3; i++) {
      ai = (a[i] == "" ? 0 : a[i]) + 0; bi = (b[i] == "" ? 0 : b[i]) + 0;
      if (ai > bi) exit 0; if (ai < bi) exit 1;
    }
    exit 0;
  }'
}

on_signal() {
  trap - HUP INT TERM
  if [ "$SWAPPED" = "1" ]; then rollback "update interrupted; previous version restored"; fi
  write_status "failed" "update interrupted"
  cleanup
  exit 130
}

if ! mkdir "$LOCK" 2>/dev/null; then echo "another update is already running" >&2; exit 1; fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT
trap 'on_signal' HUP INT TERM
mkdir -p "$WORK"; ARCHIVE="$WORK/update.zip"
SW_VERS_BIN="${SW_VERS_BIN:-/usr/bin/sw_vers}"
CURRENT_MACOS="$($SW_VERS_BIN -productVersion 2>/dev/null || true)"
[ -n "$CURRENT_MACOS" ] && version_at_least "$CURRENT_MACOS" "$MINIMUM_MACOS" || { write_status "failed" "minimum macOS version not met"; cleanup; exit 1; }
write_status "downloading" "downloading update"
if ! curl --fail --location --retry 3 --output "$ARCHIVE" "$URL"; then write_status "failed" "download failed"; cleanup; exit 1; fi
[ "$(stat -f %z "$ARCHIVE")" = "$EXPECTED_SIZE" ] || { write_status "failed" "package size mismatch"; cleanup; exit 1; }
[ "$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')" = "$SHA256" ] || { write_status "failed" "checksum mismatch"; cleanup; exit 1; }
write_status "verifying" "verifying bundle"
ditto -x -k "$ARCHIVE" "$WORK/unpacked" || { write_status "failed" "archive extraction failed"; cleanup; exit 1; }
NEW_BUNDLE="$(find "$WORK/unpacked" -maxdepth 1 -type d -name '*.app' -print -quit)"
[ -n "$NEW_BUNDLE" ] || { write_status "failed" "application bundle missing"; cleanup; exit 1; }
PLIST="$NEW_BUNDLE/Contents/Info.plist"; EXECUTABLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$PLIST" 2>/dev/null)"
[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST" 2>/dev/null)" = "$BUNDLE_ID" ] || { write_status "failed" "bundle id mismatch"; cleanup; exit 1; }
[ "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$PLIST" 2>/dev/null)" = "$VERSION" ] || { write_status "failed" "version mismatch"; cleanup; exit 1; }
[ -x "$NEW_BUNDLE/Contents/MacOS/$EXECUTABLE" ] || { write_status "failed" "executable missing"; cleanup; exit 1; }
write_status "installing" "installing update"
PROFILE="$DATA_DIR/desktop/chrome-profile"; pkill -f "user-data-dir=$PROFILE" 2>/dev/null || true
if [ -f "$DATA_DIR/desktop/server.pid" ]; then SERVER_PID="$(cat "$DATA_DIR/desktop/server.pid")"; pkill -P "$SERVER_PID" 2>/dev/null || true; kill "$SERVER_PID" 2>/dev/null || true; fi
lsof -ti :"$PORT" 2>/dev/null | xargs kill 2>/dev/null || true; sleep 2
rm -rf "$BACKUP"; mv "$BUNDLE" "$BACKUP" || { write_status "failed" "cannot preserve previous bundle"; cleanup; exit 1; }; SWAPPED=1; mv "$NEW_BUNDLE" "$BUNDLE" || rollback "cannot install new bundle"
write_status "restarting" "restarting application"; open "$BUNDLE" || rollback "cannot launch new bundle"
BUILD_ID_FILE="$BUNDLE/Contents/Resources/runtime/.next/BUILD_ID"
for _ in $(seq 1 100); do
  if [ -f "$BUILD_ID_FILE" ]; then BUILD_ID="$(cat "$BUILD_ID_FILE")"; if curl -fsS "http://localhost:$PORT/api/desktop/cold-start" 2>/dev/null | grep -q '"available":true' && curl -fsS "http://localhost:$PORT/_next/static/$BUILD_ID/_buildManifest.js" 2>/dev/null | grep -q 'self.__BUILD_MANIFEST'; then SWAPPED=0; write_status "succeeded" "update installed"; cleanup; exit 0; fi; fi
  sleep 0.3
done
rollback "health check failed"
