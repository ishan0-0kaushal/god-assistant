#!/usr/bin/env bash
# Full pipeline: VO (if ELEVENLABS_API_KEY is set) -> timeline -> sfx -> frames -> mix.
set -euo pipefail
cd "$(dirname "$0")"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"

if [[ -n "${ELEVENLABS_API_KEY:-}" ]]; then
  python3 vo.py "$@"
else
  echo "ELEVENLABS_API_KEY not set: building a no-VO animatic on estimated timings"
fi
python3 timeline.py
python3 sfx.py
node render.cjs
python3 mix.py
