"""Synthesize the sound-design bed (build/sfx.wav) from build/timeline.json events.

Everything is generated here, nothing is sampled: drone, heartbeat, clock ticks, glitches,
ECG beeps, riser and flatline. The bed hard-mutes during micro-sleep blackouts.
"""
import json
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

    # --- s3: whisper swells, eerie beating high pair, phantom swell
    s3 = sc["s3"]
    m = (t >= s3["start"]) & (t < s3["end"])
    n3 = int(m.sum())
    t3 = np.arange(n3) / SR
    knots = np.arange(0, t3[-1] + 0.25, 0.12)
    swell = np.clip(np.interp(t3, knots, rng.random(len(knots))) * 1.6 - 0.6, 0, 1)
    whisper = bandpass(rng.standard_normal(n3), lo=1400, hi=5000) * swell
    ramp = np.minimum(1, t3 / 1.5)
    for pan in (-0.7, 0.7):
        bed.add(whisper * ramp * (0.6 + 0.4 * np.sin(t3 * 1.3 + pan * 2)), s3["start"], 0.07, pan)
    bed.add((np.sin(2 * np.pi * 1318 * t3) + np.sin(2 * np.pi * 1331 * t3)) * ramp, s3["start"], 0.01)
    ph = s3["start"] + s3["cues"]["phantom"]
    n = int(0.6 * SR)
    rise = bandpass(rng.standard_normal(n), lo=300, hi=3000) * (np.arange(n) / n) ** 3
    bed.add(rise, ph - 0.45, 0.45, 0.5)
    bed.add(impact(), ph + 0.12, 0.35, 0.5)

    # --- s4: riser and sub swell into the flatline
    s4 = sc["s4"]
    flat0, flat1 = ev["flatline"]
    length = flat0 - s4["start"]
    n = int(length * SR)
    u = np.arange(n) / n
    riser = sweep(160, 700, length) * u ** 2 * 0.5 + bandpass(rng.standard_normal(n), lo=2000) * u ** 3 * 0.35
    sub = np.sin(2 * np.pi * 41 * np.arange(n) / SR) * u ** 1.5
    bed.add(riser, s4["start"], 0.2)
    bed.add(sub, s4["start"], 0.4)
    bed.add(impact(), s4["start"] + s4["cues"]["fail"], 0.8)

    # --- events
    hb = heartbeat()
    for x in ev["heartbeats"]:
        bed.add(hb, x, 0.75)
    for x in ev["cuts"]:
        bed.add(impact(), x, 0.7)
    for tw in ev["twitches"]:
        bed.add(glitch(), tw["t"], 0.16, rng.uniform(-0.4, 0.4))
    for i, x in enumerate(ev["ticks"]):
        bed.add(tick(2600 if i % 2 else 2000), x, 0.11, 0.35)
    for x in ev["text_pops"]:
        bed.add(tick(1500), x, 0.12)
    for x in ev["systems"]:
        n = int(0.16 * SR)
        bed.add(sweep(900, 240, 0.16) * env(n, 0.002, 0.08), x, 0.12)
    for b in ev["ecg"]:
        if b["glitch"]:
            f = 1000 * (1 + 0.25 * rng.uniform(-1, 1))
            for k in range(3):
                bed.add(beep(f, 0.025), b["t"] + 0.13 + k * 0.035, 0.13)
        else:
            bed.add(beep(1000), b["t"] + 0.13, 0.13)

    # --- hard mutes: micro-sleeps, and everything but the flatline after "on purpose"
    gate = np.ones(bed.n)
    for a, b in ev["blackouts"] + [[flat0, flat1]]:
        gate[(t >= a) & (t < b)] = 0
    k = int(0.004 * SR)
    gate = np.convolve(gate, np.ones(k) / k, mode="same")
    bed.buf *= gate[:, None]
    bed.add(beep(1000, flat1 - flat0), flat0, 0.16)

    peak = np.abs(bed.buf).max()
    pcm = (bed.buf / max(peak, 1e-9) * 0.7 * 32767).astype(np.int16)
    with wave.open(str(BUILD / "sfx.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"sfx: {BUILD / 'sfx.wav'} ({dur:.2f}s)")


if __name__ == "__main__":
    main()
