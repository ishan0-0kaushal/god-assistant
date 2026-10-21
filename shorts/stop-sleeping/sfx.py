"""Synthesize the sound-design bed (build/sfx.wav) from build/timeline.json events.

Everything is generated, nothing is sampled. This file is the synth kit plus the global
layers (drone, heartbeats, cut impacts, whip whooshes, text pops, eye twitches); each scene
adds its own sounds in sfx_scenes/<scene id>.py via build(bed, S, tl, kit), where kit is this
module. The bed hard-mutes during micro-sleep blackouts and under the flatline.
"""
import importlib.util
import json
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
SR = 48000
rng = np.random.default_rng(7)


def bandpass(x, lo=None, hi=None):
    spec = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    gain = np.ones_like(f)
    if lo:
        gain *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4)
    if hi:
        gain *= 1 / (1 + (f / hi) ** 4)
    return np.fft.irfft(spec * gain, len(x))


def env(n, attack, tau):
    t = np.arange(n) / SR
    return (1 - np.exp(-t / max(attack, 1e-4))) * np.exp(-t / tau)


def sweep(f0, f1, length):
    n = int(length * SR)
    f = f0 * (f1 / f0) ** (np.arange(n) / n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


class Bed:
    def __init__(self, dur):
        self.n = int(np.ceil(dur * SR))
        self.buf = np.zeros((self.n, 2))

    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= self.n or i + len(sig) <= 0:
            return
        s = sig[max(0, -i): self.n - i] * gain
        i = max(0, i)
        left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.buf[i:i + len(s), 0] += s * left * 1.414
        self.buf[i:i + len(s), 1] += s * right * 1.414


def heartbeat():
    def thump(amp):
        n = int(0.22 * SR)
        body = sweep(95, 42, 0.22) * env(n, 0.003, 0.055)
        click = bandpass(rng.standard_normal(n), hi=900) * env(n, 0.001, 0.008) * 0.4
        return (body + 0.3 * sweep(190, 84, 0.22) * env(n, 0.003, 0.03) + click) * amp
    out = np.zeros(int(0.45 * SR))
    a, b = thump(1.0), thump(0.62)
    out[:len(a)] += a
    k = int(0.17 * SR)
    out[k:k + len(b)] += b
    return out


def impact():
    n = int(0.6 * SR)
    return sweep(70, 28, 0.6) * env(n, 0.002, 0.16) + bandpass(rng.standard_normal(n), hi=2200) * env(n, 0.001, 0.05) * 0.6


def tick(freq):
    n = int(0.03 * SR)
    return (np.sin(2 * np.pi * freq * np.arange(n) / SR) * env(n, 0.0005, 0.006)
            + bandpass(rng.standard_normal(n), lo=2500) * env(n, 0.0003, 0.003) * 0.5)


def glitch():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * 160 * t)) * (np.sin(2 * np.pi * 33 * t) > 0)
    return (sq * 0.6 + bandpass(rng.standard_normal(n), lo=1500, hi=7000) * 0.5) * env(n, 0.001, 0.04)


def beep(freq, length=0.09):
    n = int(length * SR)
    t = np.arange(n) / SR
    fade = np.minimum(1, np.minimum(t / 0.004, (length - t) / 0.006))
    return (np.sin(2 * np.pi * freq * t) + 0.15 * np.sin(4 * np.pi * freq * t)) * fade


def noise(n):
    return rng.standard_normal(n)


def whoosh(length=0.35, rising=False):
    """Air whoosh for whip pans and fast moves: band-passed noise with a swept centre."""
    n = int(length * SR)
    u = np.arange(n) / n
    out = np.zeros(n)
    bands = [(200, 600), (600, 1500), (1500, 4000)]
    for k, (lo, hi) in enumerate(bands):
        centre = u if rising else 1 - u
        weight = np.exp(-((centre - k / 2) ** 2) / 0.08)
        out += bandpass(noise(n), lo=lo, hi=hi) * weight
    shape = np.sin(np.pi * u) ** (0.7 if rising else 1.5)
    return out * shape


def thud(depth=1.0):
    """Body / object hitting the ground."""
    n = int(0.45 * SR)
    return (sweep(90 * depth, 35 * depth, 0.45) * env(n, 0.002, 0.09)
            + bandpass(noise(n), hi=600) * env(n, 0.001, 0.03) * 0.8)


def crack():
    """Sharp fracture: a click plus a crackle of broadband noise."""
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    crackle = bandpass(noise(n), lo=1800, hi=9000) * (np.abs(np.sin(2 * np.pi * 37 * t)) > 0.6)
    return bandpass(noise(n), lo=800) * env(n, 0.0005, 0.006) * 1.2 + crackle * env(n, 0.001, 0.06)


def load_scene_module(sid):
    path = ROOT / "sfx_scenes" / f"{sid}.py"
    if not path.exists():
        return None
    spec = importlib.util.spec_from_file_location(f"sfx_scene_{sid}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    tl = json.loads((BUILD / "timeline.json").read_text())
    dur, ev = tl["duration"], tl["events"]
    sc = {s["id"]: s for s in tl["scenes"]}
    bed = Bed(dur)
    t = np.arange(bed.n) / SR

    # --- drone: harmonic stack (audible on phone speakers) + dark noise; pitch climbs in s4
    level = np.zeros(bed.n)
    pitch = np.ones(bed.n)
    for sid, a, b in (("s1", 0.32, 0.36), ("s2", 0.26, 0.28), ("s3", 0.42, 0.5), ("s4", 0.3, 0.85), ("end", 0.36, 0.36)):
        s = sc[sid]
        m = (t >= s["start"]) & (t < s["end"])
        u = (t[m] - s["start"]) / (s["end"] - s["start"])
        level[m] = a + (b - a) * u
        if sid == "s4":
            pitch[m] = 1 + 0.5 * u ** 2
    phase = 2 * np.pi * np.cumsum(55 * pitch) / SR
    drone = sum(amp * np.sin(k * phase + 0.3 * np.sin(t * 0.7 * k)) for k, amp in ((1, 1.0), (2, 0.55), (3, 0.35), (4, 0.18), (6, 0.08)))
    drone += 2.0 * bandpass(rng.standard_normal(bed.n), lo=40, hi=500)
    drone *= level * (0.85 + 0.15 * np.sin(2 * np.pi * 0.23 * t)) * 0.16
    bed.add(drone, 0, 1.0)

    # --- events
    hb = heartbeat()
    for x in ev["heartbeats"]:
        bed.add(hb, x, 0.75)
    for x in ev["cuts"]:
        bed.add(impact(), x, 0.7)
    for x in ev.get("whips", []):
        bed.add(whoosh(0.32), x - 0.2, 0.55)
    for tw in ev["twitches"]:
        bed.add(glitch(), tw["t"], 0.16, rng.uniform(-0.4, 0.4))
    for x in ev["text_pops"]:
        bed.add(tick(1500), x, 0.12)

    # --- per-scene sound design
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    for S in tl["scenes"]:
        if only and S["id"] != only:
            continue
        mod = load_scene_module(S["id"])
        if mod:
            mod.build(bed, S, tl, sys.modules[__name__])

    # --- hard mutes: micro-sleeps, and everything but the flatline after "on purpose"
    flat0, flat1 = ev["flatline"]
    gate = np.ones(bed.n)
    for a, b in ev["blackouts"] + [[flat0, flat1]]:
        gate[(t >= a) & (t < b)] = 0
    k = int(0.004 * SR)
    gate = np.convolve(gate, np.ones(k) / k, mode="same")
    bed.buf *= gate[:, None]
    bed.add(beep(1000, flat1 - flat0), flat0, 0.16)

    peak = np.abs(bed.buf).max()
    pcm = (bed.buf / max(peak, 1e-9) * 0.7 * 32767).astype(np.int16)
    out = BUILD / (f"sfx_{only}.wav" if only else "sfx.wav")
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"sfx: {out} ({dur:.2f}s)")


if __name__ == "__main__":
    main()
