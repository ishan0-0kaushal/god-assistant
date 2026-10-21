#!/usr/bin/env bash
# Generates the placeholder sound effects into public/sfx with ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/.."
out=public/sfx
mkdir -p "$out"
gen() { ffmpeg -loglevel error -y -f lavfi -i "$1" -ac 1 -ar 48000 "$out/$2"; }

for n in $(seq 0 30); do
  f=$(awk -v n="$n" 'BEGIN{printf "%.1f", 700*2^(n/24)}')
  gen "aevalsrc=sin(2*PI*${f}*t)*exp(-t*55)*0.55:d=0.08" "tick_${n}.wav"
done
gen "aevalsrc=sin(2*PI*(55*t+4*(1-exp(-t*20))))*exp(-t*4)*0.9:d=0.9" boom.wav
gen "aevalsrc=sin(2*PI*(40*t+6*(1-exp(-t*10))))*exp(-t*1.8)*0.9+(random(0)*2-1)*exp(-t*6)*0.25:d=2.2" boom_big.wav
gen "aevalsrc=sin(2*PI*(90*t+3*(1-exp(-t*40))))*exp(-t*14)*0.9+(random(0)*2-1)*exp(-t*50)*0.4:d=0.35" thud.wav
gen "aevalsrc=sin(2*PI*(1400*t-1100*t*t))*(0.6+0.4*sin(2*PI*30*t))*0.4:d=0.5" rewind.wav
gen "aevalsrc=sin(2*PI*(55*t+12.5*t*t))*0.5*(0.3+0.7*t/4)+sin(2*PI*(110*t+25*t*t))*0.25*(t/4):d=4" drone.wav
gen "aevalsrc=(random(0)*2-1)*pow(t/0.8\,2)*0.5+sin(2*PI*(200*t-100*t*t))*0.4*(t/0.8):d=0.8" collapse.wav
ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=d=0.5:color=pink:amplitude=0.6" \
  -af "highpass=f=400,lowpass=f=3500,afade=t=in:d=0.2,afade=t=out:st=0.25:d=0.25" -ac 1 -ar 48000 "$out/whoosh.wav"
