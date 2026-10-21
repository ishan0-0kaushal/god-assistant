#!/usr/bin/env bash
# Tiles stills side by side at 1/3 size: ./scripts/sheet.sh out.png a.png b.png ...
set -euo pipefail
out=$1; shift
inputs=(); filters=""; i=0
for f in "$@"; do inputs+=(-i "$f"); filters+="[$i:v]scale=360:640[s$i];"; i=$((i+1)); done
stack=""; for j in $(seq 0 $((i-1))); do stack+="[s$j]"; done
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "${filters}${stack}hstack=inputs=$i" "$out"
