#!/bin/bash
set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER="$REPO_ROOT/_tester/_base/.silnik/desktop/update-worker.sh"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf "$TEST_ROOT"' EXIT
BIN="$TEST_ROOT/bin"
mkdir -p "$BIN"

cat >"$BIN/curl" <<'SH'
#!/bin/bash
if [ "${DOWNLOAD_FAIL:-0}" = "1" ]; then exit 22; fi
output=""
url=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output" ]; then output="$2"; shift 2; continue; fi
  url="$1"
  shift
done
if [ -n "$output" ]; then cp "$TEST_ARCHIVE" "$output"; exit 0; fi
if [ "${HEALTH_FAIL:-0}" = "1" ]; then exit 22; fi
if [[ "$url" == */api/desktop/cold-start ]]; then echo '{"available":true}'; exit 0; fi
echo 'self.__BUILD_MANIFEST = {}'
SH
cat >"$BIN/open" <<'SH'
#!/bin/bash
exit 0
SH
cat >"$BIN/pkill" <<'SH'
#!/bin/bash
exit 0
SH
cat >"$BIN/lsof" <<'SH'
#!/bin/bash
exit 1
SH
cat >"$BIN/sleep" <<'SH'
#!/bin/bash
exit 0
SH
cat >"$BIN/sw_vers" <<'SH'
#!/bin/bash
echo "${TEST_MACOS_VERSION:-14.0}"
SH
chmod +x "$BIN"/*

make_app() {
  local bundle="$1" version="$2" marker="$3"
  mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources/runtime/.next"
  plutil -create xml1 "$bundle/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c 'Add :CFBundleExecutable string launcher' "$bundle/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c 'Add :CFBundleIdentifier string com.aios.straznik-tajemnic-ai' "$bundle/Contents/Info.plist"
  /usr/libexec/PlistBuddy -c "Add :CFBundleShortVersionString string $version" "$bundle/Contents/Info.plist"
  printf '#!/bin/bash\n' >"$bundle/Contents/MacOS/launcher"
  chmod +x "$bundle/Contents/MacOS/launcher"
  printf '%s\n' "$marker" >"$bundle/marker"
  printf '%s\n' "build-$version" >"$bundle/Contents/Resources/runtime/.next/BUILD_ID"
}

prepare_case() {
  CASE_ROOT="$TEST_ROOT/$1"
  DATA_DIR="$CASE_ROOT/data"
  CURRENT="$CASE_ROOT/Straznik Tajemnic AI.app"
  PACKAGE_DIR="$CASE_ROOT/package"
  ARCHIVE="$CASE_ROOT/update.zip"
  mkdir -p "$DATA_DIR" "$PACKAGE_DIR"
  make_app "$CURRENT" "0.9.3" "old"
  make_app "$PACKAGE_DIR/Straznik Tajemnic AI.app" "${2:-0.9.4}" "new"
  ditto -c -k --sequesterRsrc --keepParent "$PACKAGE_DIR/Straznik Tajemnic AI.app" "$ARCHIVE"
  SIZE="$(stat -f %z "$ARCHIVE")"
  SHA="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
  export TEST_ARCHIVE="$ARCHIVE"
}

run_worker() {
  PATH="$BIN:$PATH" SW_VERS_BIN="$BIN/sw_vers" "$WORKER" --bundle "$CURRENT" --url https://example.invalid/update.zip --sha256 "$1" --version "${2:-0.9.4}" --bundle-id com.aios.straznik-tajemnic-ai --size "$SIZE" --minimum-macos 11.0 --data-dir "$DATA_DIR" --port 4050
}

prepare_case success
run_worker "$SHA"
grep -q '"state":"succeeded"' "$DATA_DIR/updates/status.json"
grep -q new "$CURRENT/marker"
grep -q old "$CURRENT.rollback/marker"

prepare_case checksum
if run_worker "$(printf '0%.0s' {1..64})"; then exit 1; fi
grep -q 'checksum mismatch' "$DATA_DIR/updates/status.json"
grep -q old "$CURRENT/marker"

prepare_case interrupted
if DOWNLOAD_FAIL=1 run_worker "$SHA"; then exit 1; fi
grep -q 'download failed' "$DATA_DIR/updates/status.json"
grep -q old "$CURRENT/marker"

prepare_case wrong-version 0.9.5
if run_worker "$SHA" 0.9.4; then exit 1; fi
grep -q 'version mismatch' "$DATA_DIR/updates/status.json"
grep -q old "$CURRENT/marker"

prepare_case locked
mkdir -p "$DATA_DIR/updates/update.lock"
printf '{"id":"active","state":"downloading"}\n' >"$DATA_DIR/updates/status.json"
if run_worker "$SHA"; then exit 1; fi
grep -q '"id":"active"' "$DATA_DIR/updates/status.json"
grep -q old "$CURRENT/marker"

prepare_case minimum-macos
if TEST_MACOS_VERSION=10.15 run_worker "$SHA"; then exit 1; fi
grep -q 'minimum macOS version not met' "$DATA_DIR/updates/status.json"
grep -q old "$CURRENT/marker"

prepare_case rollback
if HEALTH_FAIL=1 run_worker "$SHA"; then exit 1; fi
grep -q '"state":"rolled_back"' "$DATA_DIR/updates/status.json"
grep -q old "$CURRENT/marker"

echo "PASS: updater success, checksum, interrupted download, version, lock, minimum macOS and rollback"
