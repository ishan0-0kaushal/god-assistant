"""Scene s2 sound design: night drive, micro-sleeps at the wheel.

Mirrors the timing in renderer/scenes/s2.js (blackouts, VO words, lane drift, road speed and
streetlight spacing) so every sound lands on the frame it belongs to. kit is sfx.py.
"""
import re

import numpy as np

# keep in sync with renderer/scenes/s2.js
V0, V1 = 1500.0, 1950.0
LAMP_D, LAMP_SP, LAMP_X0, LAMP_HEAD = 0.75, 840.0, 300.0, 66.0
DRIVER_X = 551.0


def _norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def _cue(S, word, default, nth=0, edge="start"):
    hits = [w for w in S["words"] if _norm(w["w"]) == _norm(word)]
    if len(hits) <= nth:
        return default
    return hits[nth]["t1" if edge == "end" else "t0"]


def _bezier(x1, y1, x2, y2):
    def f(x):
        x = np.clip(np.asarray(x, float), 0, 1)
        lo, hi = np.zeros_like(x), np.ones_like(x)
        bx = lambda t: 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3
        by = lambda t: 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3
        t = x
        for _ in range(24):
            t = (lo + hi) / 2
            m = bx(t) < x
            lo = np.where(m, t, lo)
            hi = np.where(m, hi, t)
        return by(t)
    return f


DECEL = _bezier(0.05, 0.7, 0.1, 1)
ACCEL = _bezier(0.3, 0, 0.8, 0.15)
STD = _bezier(0.2, 0, 0, 1)


def INOUT(t):
    t = np.clip(t, 0, 1)
    return np.where(t < 0.5, 4 * t ** 3, 1 - (-2 * t + 2) ** 3 / 2)


def _mono(keys):
    for i in range(1, len(keys)):
        if keys[i][0] < keys[i - 1][0] + 0.02:
            keys[i][0] = keys[i - 1][0] + 0.02
    return keys


def _track(keys, t):
    t = np.asarray(t, float)
    out = np.full_like(t, keys[0][1])
    for i in range(1, len(keys)):
        a, b = keys[i - 1], keys[i]
        e = b[2] if len(b) > 2 else INOUT
        m = (t > a[0]) & (t <= b[0])
        u = (t[m] - a[0]) / (b[0] - a[0])
        out[m] = a[1] + (b[1] - a[1]) * e(u)
    out[t > keys[-1][0]] = keys[-1][1]
    return out


def _timing(S, tl):
    fps = tl["fps"]
    dur = S["dur_f"] / fps
    c = S["cues"]
    bl = sorted([a - S["start"], b - S["start"]] for a, b in tl["events"]["blackouts"]
                if -0.02 < a - S["start"] < dur + 0.02)
    bf = S.get("blackout_frames", {})

    def fb(n, k):
        return [c[n], c[n] + bf.get(n, k) / fps]

    b1 = bl[0] if len(bl) > 0 else fb("blackout1", 5)
    b2 = bl[1] if len(bl) > 1 else fb("blackout2", 4)
    b3 = bl[2] if len(bl) > 2 else fb("blackout3", 8)
    B = dict(dur=dur, b1=b1, b2=b2, b3=b3, micro=c["micro"])
    B["brain"] = _cue(S, "brain", b1[0] * 0.46)
    B["forcing"] = _cue(S, "forcing", b1[0] * 0.71)
    B["t24"] = B["brain"] + 0.08
    B["microEnd"] = _cue(S, "micro-sleeps", B["micro"] + 0.75, edge="end")
    B["slap"] = max(b1[1] + 0.7, B["microEnd"] - 0.2)
    B["youre"] = _cue(S, "you're", B["micro"] + (b2[0] - B["micro"]) * 0.6)
    B["isnt"] = _cue(S, "isn't", b3[0] - 0.35)
    B["ocPass"] = b1[1] + 0.42
    B["trPass"] = b2[1] + 0.24
    B["laneK"] = _mono([
        [0, 0.0], [B["t24"], -0.06], [B["forcing"], 0.06], [b1[0] - 0.3, 0.55], [b1[0], 0.8], [b1[1], 0.97],
        [b1[1] + 0.12, 1.0], [b1[1] + 0.5, -0.24, STD], [b1[1] + 0.85, 0.1], [b1[1] + 1.2, 0.0],
        [B["youre"], 0.05], [b2[0] - 0.3, 0.85], [b2[0], 1.15], [b2[1], 1.48], [b2[1] + 0.06, 1.5],
        [b2[1] + 0.45, -0.34, STD], [b2[1] + 0.78, 0.14], [max(b2[1] + 1.0, B["isnt"]), 0.0], [b3[0], 0.3], [dur + 0.5, 0.45],
    ])
    return B


def _speed(t, B):
    v = V0 + (V1 - V0) * np.clip(t / B["dur"], 0, 1)
    for j in (B["b1"][1], B["b2"][1]):
        d = t - j
        v = v * np.where(d > 0, 1 - 0.38 * np.exp(-np.maximum(d, 0) * 2.6) * np.clip(d * 10, 0, 1), 1)
    return v


def build(bed, S, tl, kit):
    np_ = kit.np
    SR = kit.SR
    B = _timing(S, tl)
    t0, dur = S["start"], B["dur"]
    b1a, b1b = B["b1"]
    b2a, b2b = B["b2"]
    b3a = B["b3"][0]

    # the spinning moon-clock keeps ticking
    for i, x in enumerate(tl["events"]["ticks"]):
        if t0 - 0.01 <= x < t0 + dur:
            bed.add(kit.tick(2600 if i % 2 else 2000), x, 0.08, 0.35)

    n = int((dur + 0.4) * SR)
    t = np_.arange(n) / SR
    v = _speed(t, B)
    speed = v / V0

    # drifting off: everything sinks a little as his eyes close, then slams back
    duck = np_.ones(n)
    for a, b in (B["b1"], B["b2"], B["b3"]):
        u = np_.clip((t - (a - 0.45)) / 0.45, 0, 1)
        duck = np_.minimum(duck, np_.where(t < b, 1 - 0.55 * u ** 2, 1))
    fade = np_.minimum(1, t / 0.25) * np_.clip((dur + 0.35 - t) / 0.3, 0, 1)

    # engine: saw-ish stack whose pitch follows road speed and climbs through the scene
    f = 52 * speed * (1 + 0.25 * t / dur) * (1 + 0.012 * np_.sin(2 * np_.pi * 5.3 * t))
    ph = 2 * np_.pi * np_.cumsum(f) / SR
    eng = sum(np_.sin(k * ph) / k for k in range(1, 9))
    eng *= 0.75 + 0.25 * np_.sin(ph * 0.5) ** 2
    eng = kit.bandpass(eng, lo=35, hi=700)
    bed.add(eng * duck * fade, t0, 0.09, 0.0)

    # road roar + tyre hiss
    road = kit.bandpass(kit.noise(n), lo=50, hi=900) * (0.7 + 0.3 * speed)
    hiss = kit.bandpass(kit.noise(n), lo=2500, hi=7000)
    bed.add(road * duck * fade, t0, 0.05, 0.0)
    bed.add(hiss * duck * fade, t0, 0.012, 0.0)

    # a streetlight whooshes past every time its light crosses the driver
    tg = np_.arange(0, dur, 1 / 600)
    dist = np_.cumsum(_speed(tg, B)) / 600
    for i in range(0, 40):
        x = LAMP_X0 + i * LAMP_SP + LAMP_HEAD - dist * LAMP_D
        cross = np_.nonzero((x[:-1] > DRIVER_X) & (x[1:] <= DRIVER_X))[0]
        for k in cross:
            tp = tg[k]
            bed.add(kit.whoosh(0.42), t0 + tp - 0.24, 0.11, 0.25 if i % 2 else -0.25)

    # rumble strip whenever the tyres ride the centre line or the edge line
    lane = _track(B["laneK"], t)
    rum = np_.clip(1 - np_.abs(lane - 1) / 0.16, 0, 1) + np_.clip((-0.2 - lane) / 0.08, 0, 1)
    rum = np_.convolve(np_.clip(rum, 0, 1), np_.ones(480) / 480, mode="same")
    brr = kit.bandpass(kit.noise(n), lo=60, hi=500) * (0.55 + 0.45 * np_.sign(np_.sin(2 * np_.pi * 31 * t)))
    bed.add(brr * rum, t0, 0.38, 0.0)

    # tinnitus whine creeping in as each micro-sleep takes him
    for a, _ in (B["b1"], B["b2"], B["b3"]):
        m = int(0.7 * SR)
        u = np_.arange(m) / m
        bed.add(np_.sin(2 * np_.pi * 4200 * np_.arange(m) / SR) * u ** 2, t0 + a - 0.7, 0.03, 0.0)

    def horn(freqs, length, bend_at=None):
        m = int(length * SR)
        tt = np_.arange(m) / SR
        bend = np_.ones(m) if bend_at is None else 1.05 - 0.13 / (1 + np_.exp(-(tt - bend_at) * 18))
        out = np_.zeros(m)
        for fr in freqs:
            p = 2 * np_.pi * np_.cumsum(fr * bend) / SR
            out += sum(np_.sin(k * p) / k for k in range(1, 7))
        env = np_.minimum(1, tt / 0.015) * np_.minimum(1, (length - tt) / 0.06)
        return kit.bandpass(out * env, lo=120, hi=3500) / len(freqs)

    def screech(length):
        m = int(length * SR)
        tt = np_.arange(m) / SR
        fq = 2300 + 160 * np_.sin(2 * np_.pi * 27 * tt) - 400 * tt / length
        tone = np_.sin(2 * np_.pi * np_.cumsum(fq) / SR)
        grit = kit.bandpass(kit.noise(m), lo=1800, hi=6500)
        env = np_.minimum(1, tt / 0.03) * np_.exp(-tt / (length * 0.6))
        return (0.6 * tone + 0.8 * grit) * env

    def gasp():
        m = int(0.22 * SR)
        return kit.bandpass(kit.noise(m), lo=700, hi=3200) * kit.env(m, 0.01, 0.07)

    # --- micro-sleep 1: snaps awake on the centre line, headlights coming
    bed.add(kit.impact(), t0 + b1b, 0.45, 0.0)
    bed.add(gasp(), t0 + b1b + 0.02, 0.25, 0.0)
    bed.add(horn([392, 494], 0.16), t0 + b1b + 0.06, 0.22, 0.45)
    bed.add(horn([392, 494], 0.26, bend_at=B["ocPass"] - (b1b + 0.3)), t0 + b1b + 0.3, 0.24, 0.2)
    bed.add(screech(0.45), t0 + b1b + 0.1, 0.14, -0.2)
    bed.add(kit.whoosh(0.5), t0 + B["ocPass"] - 0.28, 0.32, 0.0)

    # slapping himself awake
    m = int(0.12 * SR)
    slap = kit.bandpass(kit.noise(m), lo=900, hi=7000) * kit.env(m, 0.0004, 0.018) + 0.6 * kit.thud(1.4)[:m]
    bed.add(slap, t0 + B["slap"], 0.42, 0.1)

    # --- micro-sleep 2: the near miss. Air horn bending down as the truck passes, tyres scream
    bed.add(kit.impact(), t0 + b2b, 0.7, 0.0)
    bed.add(gasp(), t0 + b2b + 0.02, 0.3, 0.0)
    bed.add(horn([185, 233, 277], 0.8, bend_at=B["trPass"] - b2b), t0 + b2b, 0.55, 0.3)
    bed.add(screech(0.75), t0 + b2b + 0.05, 0.3, -0.15)
    bed.add(kit.whoosh(0.8, rising=False), t0 + B["trPass"] - 0.35, 0.6, 0.0)
    m = int(0.9 * SR)
    swell = kit.bandpass(kit.noise(m), lo=30, hi=220) * np_.sin(np_.pi * np_.arange(m) / m) ** 2
    bed.add(swell, t0 + B["trPass"] - 0.45, 0.5, 0.0)
