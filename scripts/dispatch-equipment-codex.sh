#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# dispatch-equipment-codex.sh
# Dyspozytor zlecenia wsadowego dla Issue #64 (Katalog Ekwipunku CoC 7e RAW)
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
AUDIT_DIR="${REPO_ROOT}/docs/audits/equipment"
MANIFEST_FILE="${AUDIT_DIR}/catalog-manifest-batch-1.json"

echo "=== Strażnik Tajemnic AI: Dyspozytor Katalogu Ekwipunku ==="
echo "Repo root: ${REPO_ROOT}"

# 1. Sprawdzenie/generowanie manifestu
if [ ! -f "${MANIFEST_FILE}" ]; then
  echo "--> Generowanie manifestu Partii 1..."
  node --experimental-strip-types "${SCRIPT_DIR}/generate-catalog-batch.ts" --batch=1
fi

echo "--> Manifest gotowy: ${MANIFEST_FILE}"
TOTAL_ITEMS=$(grep -c '"filename":' "${MANIFEST_FILE}" || true)
echo "--> Liczba pozycji w partii: ${TOTAL_ITEMS}"

# 2. Analiza brakujących plików WebP
MISSING_COUNT=0
MISSING_PROMPTS=""
while read -r filename; do
  clean_name=$(echo "$filename" | tr -d '", ')
  if [ ! -f "${REPO_ROOT}/public/equipment/catalog/${clean_name}" ]; then
    MISSING_COUNT=$((MISSING_COUNT + 1))
    echo "  [BRAK] ${clean_name}"
  fi
done < <(grep '"filename":' "${MANIFEST_FILE}" | awk '{print $2}')

READY_COUNT=$((TOTAL_ITEMS - MISSING_COUNT))
echo "--> Stan kadrów: ${READY_COUNT}/${TOTAL_ITEMS} gotowych (512x512 WebP < 250 KB)"

# 3. Odświeżenie widoku HTML
node --experimental-strip-types "${SCRIPT_DIR}/generate-catalog-batch.ts" --html-only

# 4. Informacja o trybach wykonania
echo ""
echo "=============================================================================="
echo "Dostępne metody wykonania dla brakujących (${MISSING_COUNT}) kadrów:"
echo "  1) Native Antigravity / Gemini Solo: czeka na odnowienie limitu API"
echo "  2) Codex CLI w Twoim terminalu:"
echo "     codex --yolo --model gpt-5.6-terra -c model_reasoning_effort=\"medium\" \\"
echo "       \"Przeczytaj docs/audits/equipment/catalog-manifest-batch-1.json, zidentyfikuj brakujące pliki w public/equipment/catalog/ i wygeneruj je jako obrazy WebP 512x512\""
echo "  3) Przegląd gotowych kadrów HTML:"
echo "     open '${AUDIT_DIR}/review-batch-1.html'"
echo "=============================================================================="
echo ""
echo "=== Zakończono przygotowanie zlecenia ==="

