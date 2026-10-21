"""Scene s3 sound design: DAY 3, the hallway. build() adds sounds to the shared bed; kit is sfx.py.

Every time below is derived exactly like renderer/scenes/s3.js derives it (cues, VO words,
the bulb outage list, the backward-walk integration, TL.events.ecg), so sounds land on the
frames they belong to:
  bulb        mains buzz gated by the bulb's light level, a zap on every outage edge
  walk        soft backward footsteps on each foot plant of the walk cycle
  noises      door creak + head-snap whoosh on "you", a growl as eyes open on "seeing",
              a dark hiss as the creepers lunge on "things"
  phantom     the bulb dies, a reverse swell into "aren't", stinger (impact + screech) as the
              figure appears, whoosh on the snap-zoom and the whip back out, a tape-stop glitch
              as it tears away
  cold        wind hiss from "core", teeth chatter synced to the chattering mouth, breath
              exhales on each puff, frost crackle on "temperature" and "drops"
  heart       heavy thumps on the ECG beats, stumbling glitched thumps after "glitches",
              ECG beeps on each R wave
"""
import re

import numpy as np

STEP = 0.22  # metres per step (renderer: STEP)


def _norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def _cue(S, word, default, nth=0):
    hits = [w for w in S["words"] if _norm(w["w"]) == _norm(word)]
    return hits[nth]["t0"] if len(hits) > nth else default


def _sm(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def _remap(x, a, b):
    return np.clip((x - a) / (b - a), 0, 1)


def _win(t, a, b, rin, rout):
    if b <= a:
        return np.zeros_like(np.asarray(t, float))
    return _sm(_remap(t, a, a + rin)) * (1 - _sm(_remap(t, b - rout, b)))


def _timing(S, tl):
    dur = S["dur_f"] / tl["fps"]
    c = S["cues"]
    B = {"dur": dur}
    B["P"] = c.get("phantom", dur * 0.36)
    B["TP"] = c.get("temp", dur * 0.58)
    B["HT"] = c.get("heart", dur * 0.81)
    B["GL"] = c.get("glitch", dur * 0.9)
    B["three"] = _cue(S, "three", B["P"] * 0.17)
    B["you"] = _cue(S, "you", B["P"] * 0.39)
    B["seeing"] = _cue(S, "seeing", B["P"] * 0.6)
    B["things"] = _cue(S, "things", B["P"] * 0.75)
    B["that"] = _cue(S, "that", B["P"] * 0.9)
    B["there"] = _cue(S, "there", B["P"] + 0.41)
    B["core"] = _cue(S, "core", B["TP"] - 0.3)
    B["drops"] = _cue(S, "drops", B["TP"] + 0.7)
    B["your2"] = _cue(S, "your", B["HT"] - 0.3, nth=1)
    ecg = [(e["t"] - S["start"], bool(e.get("glitch"))) for e in tl["events"]["ecg"]]
    B["ecg"] = sorted(e for e in ecg if -1 < e[0] < dur + 1)
    B["gbeats"] = [t for t, g in B["ecg"] if g] or [x for x in (B["GL"] + 0.23, B["GL"] + 0.45, B["GL"] + 0.63) if x < dur]
    B["glance0"] = B["three"] + 0.1
    B["glance1"] = min(B["glance0"] + 0.34, B["you"] - 0.1)
    B["dark0"] = max(B["seeing"] + 0.3, min(B["that"] + 0.03, B["P"] - 0.24))
    B["spin"] = B["P"] + 0.27
    B["van"] = max(B["there"] + 0.05, B["P"] + 0.47)
    # keep in sync with B.offs in renderer/scenes/s3.js
    B["offs"] = [
        (0.034, 0.1, 0.08), (0.167, 0.2, 0.3),
        (B["dark0"], B["dark0"] + 0.1, 0.05), (B["dark0"] + 0.135, B["P"], 0.02),
        (B["van"], B["van"] + 0.067, 0.12), (B["van"] + 0.1, B["van"] + 0.134, 0.35),
    ] + [(g, g + 0.067, 0.35) for g in B["gbeats"]]
    return B


def _speed(t, B):
    slow = 0.5 * _win(t, -1, B["you"] + 0.02, 0.01, 0.14) * (1 - 0.92 * _win(t, B["glance0"], B["glance1"], 0.07, 0.1))
    fast = 0.85 * _win(t, B["seeing"] - 0.02, B["dark0"] + 0.06, 0.12, 0.18)
    return slow + fast


def _light(t, B):
    L = np.ones_like(t)
    for a, b, lv in B["offs"]:
        m = (t >= a) & (t < b)
        L[m] = np.minimum(L[m], lv)
    base = 1 - 0.2 * _sm(_remap(t, B["core"], B["TP"] + 0.4)) - 0.32 * _sm(_remap(t, B["HT"] - 0.25, B["HT"] + 0.25))
    over = np.where((t >= B["P"]) & (L >= 1), 0.6 * np.exp(-(t - B["P"]) * 5), 0)
    return L * base + over


def _creak(kit, length=0.5, f0=170.0):
    """Door hinge creak: a jittery sawtooth whose pitch wanders, through a resonant band."""
    n = int(length * kit.SR)
    t = np.arange(n) / kit.SR
    f = f0 * (1 + 0.35 * np.sin(2 * np.pi * 2.3 * t) + 0.12 * np.sin(2 * np.pi * 17 * t))
    ph = np.cumsum(f) / kit.SR
    saw = 2 * (ph % 1) - 1
    stick = (np.sin(2 * np.pi * 31 * t + 4 * np.sin(2 * np.pi * 3 * t)) > -0.2).astype(float)
    sig = kit.bandpass(saw * stick, lo=500, hi=3200)
    shape = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 0.6
    return sig * shape / (np.abs(sig).max() + 1e-9)


def _footstep(kit, k):
    n = int(0.22 * kit.SR)
    body = kit.sweep(120, 55, 0.22) * kit.env(n, 0.002, 0.035)
    scuff = kit.bandpass(kit.noise(n), lo=300, hi=2500) * kit.env(n, 0.004, 0.05)
    return body * 0.9 + scuff * (0.35 + 0.15 * (k % 2))


def _zap(kit):
    n = int(0.05 * kit.SR)
    t = np.arange(n) / kit.SR
    buzz = np.sign(np.sin(2 * np.pi * 100 * t)) * 0.5
    return (kit.bandpass(kit.noise(n), lo=1500, hi=9000) + buzz) * kit.env(n, 0.0005, 0.012)


def _screech(kit, length=0.9):
    """Dissonant high cluster with vibrato: the shadow figure's shriek."""
    n = int(length * kit.SR)
    t = np.arange(n) / kit.SR
    out = np.zeros(n)
    for f, d in ((1870, 0.0), (1983, 1.3), (2655, 2.1), (3120, 0.7)):
        vib = 1 + 0.012 * np.sin(2 * np.pi * (6.5 + d) * t + d)
        out += np.sin(2 * np.pi * np.cumsum(f * vib) / kit.SR)
    out += 0.6 * kit.bandpass(kit.noise(n), lo=2500, hi=7000)
    return out * kit.env(n, 0.004, length * 0.3) / 4


def _tape_stop(kit, length=0.28):
    n = int(length * kit.SR)
    u = np.arange(n) / n
    f = 900 * (60 / 900) ** u
    ph = np.cumsum(f) / kit.SR
    tone = np.sign(np.sin(2 * np.pi * ph)) * 0.5 + np.sin(2 * np.pi * ph * 0.5)
    tone = tone[(np.arange(n) // 6) * 6]
    return tone * (1 - u) ** 1.5


def _thump(kit, depth=1.0, length=0.32):
    n = int(length * kit.SR)
    body = kit.sweep(80 * depth, 34 * depth, length) * kit.env(n, 0.003, 0.08)
    knock = kit.bandpass(kit.noise(n), hi=700) * kit.env(n, 0.001, 0.012) * 0.6
    return body + 0.4 * kit.sweep(160 * depth, 70 * depth, length) * kit.env(n, 0.003, 0.03) + knock


def build(bed, S, tl, kit):
    B = _timing(S, tl)
    t0, dur, SR = S["start"], B["dur"], kit.SR
    n = int(dur * SR)
    t = np.arange(n) / SR

    # ---- bulb: mains buzz gated by the light level, a zap on each outage edge
    L = np.clip(_light(t, B), 0, 1.6)
    k = int(0.003 * SR)
    L = np.convolve(L, np.ones(k) / k, mode="same")
    hum = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((100, 1.0), (200, 0.5), (300, 0.35), (500, 0.18)))
    hum = hum + 0.25 * np.sign(np.sin(2 * np.pi * 100 * t)) * 0.4
    sizzle = kit.bandpass(kit.noise(n), lo=3000, hi=9000) * (0.5 + 0.5 * (kit.noise(n) > 1.6))
    bed.add((hum * 0.8 + sizzle * 0.25) * L, t0, 0.05, 0.15)
    for a, b, _ in B["offs"]:
        bed.add(_zap(kit), t0 + a, 0.22, 0.15)
        if b < dur:
            bed.add(_zap(kit), t0 + b, 0.16, 0.15)

    # ---- whispers: build through the first act, peak in the dark, cut by the stinger
    knots = np.arange(0, dur + 0.25, 0.12)
    swell = np.clip(np.interp(t, knots, kit.rng.random(len(knots))) * 1.6 - 0.6, 0, 1)
    wenv = (0.35 + 0.65 * _remap(t, 0, B["P"])) * (1 - 0.85 * _sm(_remap(t, B["P"], B["P"] + 0.1)))
    wenv = wenv + 0.45 * _sm(_remap(t, B["GL"], dur))
    wenv = wenv + 0.6 * _win(t, B["dark0"], B["P"], 0.08, 0.02)
    for pan in (-0.75, 0.75):
        whisper = kit.bandpass(kit.rng.standard_normal(n), lo=1400, hi=5000) * swell
        bed.add(whisper * wenv * (0.6 + 0.4 * np.sin(t * 1.3 + pan * 2)), t0, 0.08, pan)
    bed.add((np.sin(2 * np.pi * 1318 * t) + np.sin(2 * np.pi * 1331 * t)) * np.minimum(1, t / 1.5), t0, 0.008)

    # ---- soft backward footsteps on every foot plant of the walk cycle
    dt = 1 / 1000
    ts = np.arange(0, dur, dt)
    sp = _speed(ts, B)
    dist = np.cumsum(sp) * dt
    ph = 0.6 - dist / STEP * np.pi
    idx = np.floor((ph - np.pi / 2) / np.pi)
    plants = np.nonzero(np.diff(idx) != 0)[0]
    for i, j in enumerate(plants):
        amt = min(1.0, sp[j] / 0.62)
        if amt > 0.15:
            bed.add(_footstep(kit, i), t0 + ts[j], 0.2 + 0.15 * amt, -0.25 + 0.1 * (i % 2))

    # ---- noises that snap his head around
    bed.add(kit.whoosh(0.16), t0 + B["glance0"] - 0.08, 0.12, -0.3)
    bed.add(_creak(kit, 0.55, 165), t0 + B["you"] - 0.32, 0.22, -0.65)
    bed.add(kit.whoosh(0.14), t0 + B["you"] - 0.07, 0.18, -0.4)
    growl_n = int(0.9 * SR)
    growl = kit.bandpass(kit.noise(growl_n), lo=50, hi=260) * kit.env(growl_n, 0.15, 0.35)
    bed.add(growl, t0 + B["seeing"] - 0.05, 0.4, 0.3)
    bed.add(kit.whoosh(0.14), t0 + B["seeing"] - 0.07, 0.18, 0.3)
    hiss_n = int(0.5 * SR)
    hiss = kit.bandpass(kit.noise(hiss_n), lo=900, hi=6000) * np.sin(np.pi * np.arange(hiss_n) / hiss_n) ** 2
    bed.add(hiss, t0 + B["things"] - 0.15, 0.2, -0.6)
    bed.add(hiss, t0 + B["things"] - 0.12, 0.2, 0.6)

    # ---- the phantom
    P = t0 + B["P"]
    rise_len = max(0.25, B["P"] - B["dark0"] + 0.05)
    rn = int(rise_len * SR)
    rise = kit.bandpass(kit.rng.standard_normal(rn), lo=200, hi=3500) * (np.arange(rn) / rn) ** 3
    bed.add(rise, P - rise_len, 0.5, -0.4)
    bed.add(kit.impact(), P, 0.75, -0.3)
    bed.add(_screech(kit), P + 0.01, 0.32, -0.45)
    bed.add(kit.whoosh(0.18, rising=True), P - 0.06, 0.4, -0.3)
    bed.add(kit.whoosh(0.26), t0 + B["spin"] - 0.04, 0.42, 0.2)
    bed.add(kit.glitch(), t0 + B["van"], 0.4, -0.4)
    bed.add(_tape_stop(kit), t0 + B["van"] + 0.02, 0.3, -0.4)

    # ---- the cold
    wind_on = _sm(_remap(t, B["core"] - 0.1, B["TP"] + 0.3)) * (1 - 0.7 * _sm(_remap(t, B["HT"] - 0.2, B["HT"] + 0.3)))
    for pan, seed in ((-0.6, 0.0), (0.6, 1.7)):
        gust = 0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t + seed) * np.sin(2 * np.pi * 0.31 * t + seed * 2)
        wind = kit.bandpass(kit.noise(n), lo=700, hi=4500)
        bed.add(wind * wind_on * gust, t0, 0.14, pan)
    # teeth chatter: one click per mouth flip (the mouth alternates grit/flat at 15 Hz)
    a0, a1 = B["TP"] - 0.08, B["HT"] - 0.1
    f = int(np.ceil((t0 + a0) * 15))
    while f / 15 < t0 + a1:
        x = f / 15
        click = kit.tick(2400 + 600 * kit.rng.random())
        bed.add(click, x + 0.004 * kit.rng.random(), 0.08 + 0.06 * kit.rng.random(), 0.05)
        f += 1
    # breath exhales on each puff (renderer: one puff every 0.62 s from "core")
    per = 0.62
    m = int(np.ceil((B["core"] - 0.1) / per))
    while m * per < B["HT"] + 0.3:
        bn = int(0.5 * SR)
        breath = kit.bandpass(kit.noise(bn), lo=400, hi=2200) * kit.env(bn, 0.04, 0.16)
        bed.add(breath, t0 + m * per, 0.07, 0.0)
        m += 1
    bed.add(kit.crack(), t0 + B["TP"] + 0.05, 0.22, -0.7)
    bed.add(kit.crack(), t0 + B["TP"] + 0.12, 0.18, 0.7)
    bed.add(kit.crack(), t0 + B["drops"], 0.35, 0.0)
    bed.add(kit.thud(0.8), t0 + B["drops"], 0.3, 0.0)
    for i in range(10):
        x = B["core"] + (B["drops"] + 0.4 - B["core"]) * (i + kit.rng.random()) / 10
        ping = kit.beep(3200 + 2500 * kit.rng.random(), 0.04) * kit.env(int(0.04 * SR), 0.0005, 0.012)
        bed.add(ping, t0 + x, 0.03, kit.rng.uniform(-0.8, 0.8))

    # ---- the heart: heavy thumps on the ECG beats, stumbling after "glitches"
    bed.add(kit.thud(0.6), t0 + B["HT"], 0.3)
    for bt, glitched in B["ecg"]:
        if bt > dur:
            continue
        x = t0 + bt
        if glitched:
            bed.add(_thump(kit, 0.85), x, 0.85)
            bed.add(_thump(kit, 0.7, 0.25), x + 0.055 + 0.03 * kit.rng.random(), 0.45)
            bed.add(kit.glitch(), x, 0.22, kit.rng.uniform(-0.3, 0.3))
            fq = 1000 * (1 + 0.25 * kit.rng.uniform(-1, 1))
            for j in range(3):
                bed.add(kit.beep(fq, 0.025), x + 0.13 + j * 0.035, 0.12)
        else:
            bed.add(kit.heartbeat(), x, 0.8)
            bed.add(kit.beep(1000), x + 0.13, 0.12)
    bed.add(kit.glitch(), t0 + B["GL"], 0.25)
