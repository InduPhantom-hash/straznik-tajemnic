#!/bin/bash
set -euo pipefail

CHUNKS=("chunk_aa" "chunk_ab" "chunk_ac" "chunk_ad")
IDX=1

for CHUNK in "${CHUNKS[@]}"; do
    echo "Creating workspace for $CHUNK..."
    RES=$(herdr workspace create --cwd "$PWD")
    ROOT_PANE=$(echo "$RES" | jq -r '.result.root_pane.pane_id')
    WORKSPACE_ID=$(echo "$RES" | jq -r '.result.workspace.workspace_id')
    
    PANE1=$ROOT_PANE
    RES2=$(herdr pane split --pane "$PANE1" --direction right --cwd "$PWD" --no-focus)
    PANE2=$(echo "$RES2" | jq -r '.result.pane.pane_id')
    RES3=$(herdr pane split --pane "$PANE2" --direction down --cwd "$PWD" --no-focus)
    PANE3=$(echo "$RES3" | jq -r '.result.pane.pane_id')
    RES4=$(herdr pane split --pane "$PANE3" --direction right --cwd "$PWD" --no-focus)
    PANE4=$(echo "$RES4" | jq -r '.result.pane.pane_id')
    RES5=$(herdr pane split --pane "$PANE4" --direction down --cwd "$PWD" --no-focus)
    PANE5=$(echo "$RES5" | jq -r '.result.pane.pane_id')

    PREFIX="tr${IDX}"
    
    echo "Starting agents for ${PREFIX}..."
    herdr agent start "${PREFIX}_architekt" --kind agy --pane "$PANE1"
    herdr agent start "${PREFIX}_recenzent" --kind codex --pane "$PANE2"
    herdr agent start "${PREFIX}_koder" --kind opencode --pane "$PANE3"
    herdr agent start "${PREFIX}_audytor" --kind codex --pane "$PANE4"
    # Fallback to agy kind for walidator if --model is not a native arg, but using what skill says:
    herdr agent start "${PREFIX}_walidator" --kind agy --pane "$PANE5" -- --model gemini-3.7-flash-med || true
    
    # Prompt the architect
    herdr agent prompt "${PREFIX}_architekt" "Zaimplementuj wymóg wielojęzyczności (PL/EN) wg Dev Loop dla plików z listy zapisanej w: ${CHUNK}. Przygotuj kontrakt dla tych plików i zażądaj zatwierdzenia od recenzenta." --wait --timeout 120000 &
    
    IDX=$((IDX + 1))
done
wait
echo "All workspaces created and agents prompted."
