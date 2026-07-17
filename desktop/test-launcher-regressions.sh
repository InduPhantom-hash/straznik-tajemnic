#!/bin/zsh

set -eu

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

assert_contains() {
  local file="$1"
  local pattern="$2"
  local description="$3"

  if ! grep -Fq -- "$pattern" "$REPO_ROOT/$file"; then
    echo "FAIL: $description ($file)"
    exit 1
  fi
}

FULLSCREEN_LAUNCHERS=(
  "desktop/launcher.sh"
  "_tester/_base/.silnik/desktop/launcher.sh"
  "_tester/_base/Uruchom gre (Mac).command"
  "_tester/_base/Uruchom gre (Windows).bat"
)

for file in "${FULLSCREEN_LAUNCHERS[@]}"; do
  assert_contains "$file" "--start-fullscreen" "launcher nie wymusza pełnego ekranu"
done

PASSWORD_PROFILE_LAUNCHERS=(
  "desktop/launcher.sh"
  "_tester/_base/.silnik/desktop/launcher.sh"
  "_tester/_base/Uruchom gre (Mac).command"
  "_tester/_base/Uruchom gre (Windows).bat"
)

for file in "${PASSWORD_PROFILE_LAUNCHERS[@]}"; do
  assert_contains "$file" "credentials_enable_service" "launcher nie wyłącza usługi zapisywania haseł"
  assert_contains "$file" "password_manager_enabled" "launcher nie wyłącza menedżera haseł"
done

API_KEY_INPUTS=(
  "_tester/_base/.silnik/src/components/onboarding/steps/step-gemini-key.tsx"
  "_tester/_base/.silnik/src/components/dialogs/ApiKeysModal.tsx"
  "_tester/_base/.silnik/src/components/settings/gemini-sections/header.tsx"
  "_tester/_base/.silnik/src/components/settings/replicate-settings.tsx"
)

for file in "${API_KEY_INPUTS[@]}"; do
  assert_contains "$file" 'autoComplete="new-password"' "pole klucza API może uruchomić pytanie o zapis hasła"
done

zsh -n \
  "$REPO_ROOT/desktop/launcher.sh" \
  "$REPO_ROOT/_tester/_base/.silnik/desktop/launcher.sh" \
  "$REPO_ROOT/_tester/_base/Uruchom gre (Mac).command"

echo "PASS: pełny ekran i blokada zapisywania haseł są zabezpieczone we wszystkich launcherach"
