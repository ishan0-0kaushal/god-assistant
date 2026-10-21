#!/usr/bin/env bash
# Generates the placeholder sound effects into assets/sfx with ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/.."
out=assets/sfx
mkdir -p "$out"
gen() { ffmpeg -loglevel error -y -f lavfi -i "$1" -ac 1 -ar 48000 "$out/$2"; }
noise() { ffmpeg -loglevel error -y -f lavfi -i "anoisesrc=d=$1:color=$2:amplitude=$3" -af "$4" -ac 1 -ar 48000 "$out/$5"; }

gen "aevalsrc=sin(2*PI*(70*t+3*(1-exp(-t*40))))*exp(-t*16)*0.8+(random(0)*2-1)*exp(-t*60)*0.3:d=0.3" thud_soft.wav
gen "aevalsrc=sin(2*PI*(55*t+4*(1-exp(-t*30))))*exp(-t*7)*0.95+(random(0)*2-1)*exp(-t*25)*0.45:d=0.8" thud_heavy.wav
gen "aevalsrc=(random(0)*2-1)*exp(-t*90)*0.8+sin(2*PI*2400*t)*exp(-t*120)*0.3:d=0.12" crack.wav
gen "aevalsrc=sin(2*PI*(160*t+2*(1-exp(-t*50))))*exp(-t*25)*0.9+(random(0)*2-1)*exp(-t*80)*0.35:d=0.3" thunk.wav
gen "aevalsrc=sin(2*PI*(38*t+8*(1-exp(-t*8))))*exp(-t*2)*0.95+(random(0)*2-1)*exp(-t*5)*0.4:d=2.2" boom.wav
gen "aevalsrc=(sin(2*PI*1320*t)+0.5*sin(2*PI*1980*t))*exp(-t*9)*0.35:d=0.6" ding.wav
gen "aevalsrc=sin(2*PI*(90*t+3*(1-exp(-t*30))))*exp(-t*12)*0.7+(random(0)*2-1)*exp(-t*40)*0.25:d=0.35" stamp.wav
gen "aevalsrc=(sin(2*PI*58*t)+0.6*sin(2*PI*87*t)+0.3*sin(2*PI*116*t))*0.22*(0.8+0.2*sin(2*PI*0.5*t)):d=7" hum.wav
noise 0.5 pink 0.6 "highpass=f=400,lowpass=f=3500,afade=t=in:d=0.2,afade=t=out:st=0.25:d=0.25" whoosh.wav
noise 8 brown 0.5 "highpass=f=150,lowpass=f=1800,afade=t=in:d=0.4,afade=t=out:st=7.5:d=0.5" wind.wav
