#!/usr/bin/env bash
# Renders review stills: ./scripts/stills.sh 0 75 150 ...
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/stills
for fr in "$@"; do
  npx remotion still Gravity "out/stills/f$(printf %04d "$fr").png" --frame="$fr" --log=error
done
