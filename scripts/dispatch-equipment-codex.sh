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
  node "${SCRIPT_DIR}/generate-catalog-batch.mjs" --batch=1
fi

echo "--> Manifest gotowy: ${MANIFEST_FILE}"
TOTAL_ITEMS=$(grep -c '"filename":' "${MANIFEST_FILE}" || true)
echo "--> Liczba pozycji w partii: ${TOTAL_ITEMS}"

# 2. Informacja o trybach wykonania
echo ""
echo "Dostępne metody generowania kadrów:"
echo "  1) Native Antigravity / Gemini Solo: generowanie bezpośrednie z optymalizacją WebP"
echo "  2) Codex CLI: 'codex --yolo --model gpt-5.6-terra -c model_reasoning_effort=\"medium\"'"
echo "  3) Przegląd gotowych kadrów HTML: open '${AUDIT_DIR}/review-batch-1.html'"
echo ""

# 3. Odświeżenie widoku HTML
node "${SCRIPT_DIR}/generate-catalog-batch.mjs" --html-only

echo "=== Zakończono przygotowanie zlecenia ==="
