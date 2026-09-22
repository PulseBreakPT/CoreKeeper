#!/usr/bin/env bash
# Builds build/game-debug.apk. Run scripts/toolchain.sh first (or set GODOT_BIN).
set -euo pipefail
cd "$(dirname "$0")/.."

GODOT_BIN="${GODOT_BIN:-$HOME/.local/opt/godot/godot}"
OUT="${OUT:-build/game-debug.apk}"

if [ ! -x "$GODOT_BIN" ]; then
  echo "Godot not found at $GODOT_BIN — run scripts/toolchain.sh" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

echo "== Importing resources"
# First run builds .godot/ (imports, global class cache). Required before export.
"$GODOT_BIN" --headless --path . --editor --quit >/dev/null 2>&1 || true

echo "== Gameplay tests"
"$GODOT_BIN" --headless --path . res://tests/gameplay_test.tscn

echo "== Exporting $OUT"
"$GODOT_BIN" --headless --path . --export-debug "Android" "$OUT"

echo "== Done"
ls -la "$OUT"
