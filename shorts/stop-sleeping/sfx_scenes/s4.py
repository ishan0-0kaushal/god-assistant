"""Scene s4 sound design: X-ray collapse in a hospital corridor. kit is sfx.py.

Mirrors the timing in renderer/scenes/s4.js (same cue words, offsets and stagger phase):
  bed        riser + sub swelling into the flatline, faint fluorescent hum (stutters on hits)
  start      scanner sweep, panned right -> left with the beam
  walk       staggering footsteps / shuffles on every foot plant of the stagger cycle
  days       stumble: hard scuff, cloth whoosh, catch step
  failures   organs / begin / fail / No / survived: crack + glitch + impact on each, plus a
             gasp (lungs), a heavy sub hit (heart), a glitch burst (brain)
  kneel      two knee thuds;  fall: falling whoosh, body thud + impact, floor scuff
  down       weak breath on "longer", head knock on "on", monitor beeps on the heartbeats
  purpose    nothing here: core mutes everything but the flatline tone
"""
import re

import numpy as np


def _norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def _cue(S, word, default, edge="t0"):
    for w in S["words"]:
        if _norm(w["w"]) == _norm(word):
            return w[edge]
    return default


def _clamp(x, a, b):
    return min(b, max(a, x))


def _times(S, tl):
    """Same beats as times() in renderer/scenes/s4.js (scene-local seconds)."""
    c = S["cues"]
    dur = S["dur_f"] / tl["fps"]
    org, fail, no, pur = c["organs"], c["fail"], c["no_one"], c["purpose"]
    lerp = lambda a, b, t: a + (b - a) * t
    T = dict(dur=dur, org=org, fail=fail, no=no, pur=pur)
    T["surv"] = _clamp(_cue(S, "survived", lerp(no, pur, 0.22)), no + 0.3, pur - 1.0)
    T["begin"] = _clamp(_cue(S, "begin", lerp(org, fail, 0.45)), org + 0.2, fail - 0.2)
    T["scan0"] = 0.08
    T["scan1"] = _clamp(_cue(S, "eleven", org * 0.35), 0.4, org - 0.6)
    T["days"] = _clamp(_cue(S, "days", org * 0.56), 0.5, org - 0.4)
    T["fails"] = [org, T["begin"], fail, no, T["surv"]]
    T["kneelLand"] = no + min(0.36, 0.55 * (T["surv"] - no))
    T["fallStart"] = T["surv"] + min(0.22, 0.15 * (pur - T["surv"]))
    T["fallLand"] = T["fallStart"] + min(0.42, 0.3 * (pur - T["surv"]))
    T["longer"] = _clamp(_cue(S, "longer", lerp(T["fallLand"], pur, 0.25)), T["fallLand"] + 0.15, pur - 0.6)
    T["on"] = _clamp(_cue(S, "on", pur - 0.6), T["longer"] + 0.35, pur - 0.15)
    return T


def _phase(t):
    # keep in sync with phaseAt() in renderer/scenes/s4.js
    return 2 * np.pi * (0.92 * t - 0.03 * t * t) + 0.5 * np.sin(1.9 * t + 0.4) + 0.6


def _steps(T):
    """Foot plants of the stagger: walkLimbs lifts a leg while sin(phase + 1.9) > 0 (other leg
    half a cycle later), so a foot lands whenever (phase + 1.9) / pi crosses an integer."""
    t = np.arange(0, T["no"] + 0.2, 1 / 600)
    k = np.floor((_phase(t) + 1.9) / np.pi)
    idx = np.nonzero(np.diff(k) > 0)[0]
    return [float(t[i + 1]) for i in idx]


def _seg(kit, sig, fade=0.004):
    n = int(fade * kit.SR)
    if len(sig) > 2 * n:
        sig[:n] *= np.linspace(0, 1, n)
        sig[-n:] *= np.linspace(1, 0, n)
    return sig


def _scuff(kit, length=0.16, lo=500, hi=4500):
    n = int(length * kit.SR)
    return kit.bandpass(kit.noise(n), lo=lo, hi=hi) * kit.env(n, 0.01, length * 0.35)


def _gasp(kit, length=0.42):
    n = int(length * kit.SR)
    u = np.arange(n) / n
    air = kit.bandpass(kit.noise(n), lo=700, hi=3200)
    shape = np.sin(np.pi * np.minimum(1, u * 1.6)) ** 1.5 * (1 - u) ** 0.5
    return air * shape


def _sub(kit, f0=55, f1=24, length=0.9):
    n = int(length * kit.SR)
    return kit.sweep(f0, f1, length) * kit.env(n, 0.003, length * 0.35)


def _power_down(kit, f0, length):
    n = int(length * kit.SR)
    t = np.arange(n) / kit.SR
    f = f0 * (40.0 / f0) ** ((t / length) ** 0.6)
    ph = 2 * np.pi * np.cumsum(f) / kit.SR
    return (0.6 * np.sign(np.sin(ph)) + 0.4 * np.sin(ph)) * kit.env(n, 0.002, length * 0.4)


def build(bed, S, tl, kit):
    SR = kit.SR
    T = _times(S, tl)
    t0 = S["start"]
    ev = tl["events"]
    flat0 = ev["flatline"][0]
    F = T["fails"]

    # --- riser and sub swell into the flatline (kept from the first cut)
    length = flat0 - t0
    n = int(length * SR)
    u = np.arange(n) / n
    riser = kit.sweep(160, 700, length) * u ** 2 * 0.5 + kit.bandpass(kit.noise(n), lo=2000) * u ** 3 * 0.35
    sub = np.sin(2 * np.pi * 41 * np.arange(n) / SR) * u ** 1.5
    bed.add(riser, t0, 0.18)
    bed.add(sub, t0, 0.36)

    # --- corridor: fluorescent hum that stutters when the lights flicker on each failure
    n = int(T["dur"] * SR)
    t = np.arange(n) / SR
    hum = sum(np.sin(2 * np.pi * 100 * k * t) / k for k in (1, 2, 3, 5)) + 0.4 * kit.bandpass(kit.noise(n), lo=3000, hi=7000)
    gate = np.ones(n)
    for f in F:
        for q in range(4):
            a = f + q * 0.05
            gate[(t >= a) & (t < a + 0.025)] = 0.15
    gate[t >= T["pur"]] = 0.1
    gate = np.convolve(gate, np.ones(96) / 96, mode="same")
    bed.add(_seg(kit, hum * gate * np.minimum(1, t / 0.2)), t0, 0.018, -0.2)

    # --- scanner beam: buzzing sweep panned right -> left with the beam
    a, b = T["scan0"], T["scan1"]
    L = b - a + 0.12
    n = int(L * SR)
    tt = np.arange(n) / SR
    f = 260 * (2400 / 260) ** (tt / L)
    ph = 2 * np.pi * np.cumsum(f) / SR
    scan = (0.5 * np.sign(np.sin(ph)) + 0.5 * np.sin(2 * ph)) * (0.6 + 0.4 * np.sin(2 * np.pi * 60 * tt))
    scan = kit.bandpass(scan, lo=300, hi=6000) * np.sin(np.pi * np.minimum(1, tt / L)) ** 0.8
    chunks = 8
    for i in range(chunks):
        s0, s1 = i * n // chunks, (i + 1) * n // chunks
        bed.add(_seg(kit, scan[s0:s1].copy(), 0.002), t0 + a + s0 / SR, 0.11, 0.7 - 1.4 * (i + 0.5) / chunks)
    bed.add(kit.tick(3200), t0 + a + 0.5 * (b - a), 0.18)

    # --- staggering footsteps / shuffles
    for i, st in enumerate(_steps(T)):
        g = 0.9 + 0.25 * np.sin(i * 2.3)
        pan = 0.12 if i % 2 else -0.12
        bed.add(kit.thud(1.6), t0 + st, 0.16 * g, pan)
        bed.add(_scuff(kit, 0.12 + 0.06 * (i % 3) / 2), t0 + st - 0.03, 0.09 * g, pan)

    # --- stumble on "days": hard scuff, cloth whoosh, the catch step lands
    d0 = T["days"] - 0.06
    bed.add(kit.whoosh(0.3, rising=True), t0 + d0 - 0.05, 0.22)
    bed.add(_scuff(kit, 0.3, 300, 3500), t0 + d0, 0.3, 0.15)
    bed.add(kit.thud(1.2), t0 + d0 + 0.17, 0.4, 0.1)

    # --- organ failures: crack + glitch + impact; each a little lower and heavier
    pans = [-0.15, 0.1, -0.05, 0.0, 0.1]
    for i, f in enumerate(F):
        at = t0 + f
        bed.add(kit.crack(), at, 0.5 + 0.04 * i, pans[i])
        bed.add(kit.glitch(), at, 0.32, -pans[i])
        bed.add(kit.impact(), at, 0.42 + 0.06 * i)
        bed.add(_power_down(kit, 1300 - 180 * i, 0.32), at + 0.02, 0.12, pans[i])
        bed.add(kit.crack() * 0.5, at + 0.06, 0.12, 0.6 if i % 2 else -0.6)   # the lights crackle
    bed.add(_gasp(kit), t0 + F[2] + 0.02, 0.28)                            # lungs: a gasp
    bed.add(_sub(kit, 60, 22, 1.1), t0 + F[3], 0.6)                         # heart: heavy sub hit
    bed.add(kit.impact(), t0 + F[3] + 0.01, 0.35)
    for q in range(3):                                                    # brain: glitch burst
        bed.add(kit.glitch(), t0 + F[4] + 0.05 + q * 0.07, 0.26, (-0.4, 0.4, 0.0)[q])
    bed.add(kit.beep(2600, 0.12) * np.linspace(1, 0, int(0.12 * SR)), t0 + F[4], 0.05)

    # --- knees hit the floor (two knees), then the body falls face down
    bed.add(kit.thud(0.9), t0 + T["kneelLand"], 0.62, -0.05)
    bed.add(kit.thud(1.0), t0 + T["kneelLand"] + 0.07, 0.45, 0.05)
    bed.add(_scuff(kit, 0.22, 200, 2500), t0 + T["kneelLand"] + 0.02, 0.16)
    fl = T["fallLand"] - T["fallStart"]
    bed.add(kit.whoosh(fl + 0.08, rising=True), t0 + T["fallStart"], 0.3)
    bed.add(kit.thud(0.7), t0 + T["fallLand"], 0.9)
    bed.add(kit.impact(), t0 + T["fallLand"], 0.5)
    bed.add(_scuff(kit, 0.4, 150, 2000), t0 + T["fallLand"] + 0.02, 0.24)

    # --- last effort: a weak breath as the head lifts, a knock when it drops
    bed.add(_gasp(kit, 0.5), t0 + T["longer"], 0.13)
    bed.add(kit.thud(1.4), t0 + T["on"] + 0.12, 0.3)

    # --- monitor beeps on the heartbeats once he is down (the flatline tone is 1000 Hz too)
    for hb in ev["heartbeats"]:
        if t0 + T["fallLand"] - 0.05 <= hb < t0 + T["pur"]:
            bed.add(kit.beep(1000, 0.07), hb + 0.13, 0.06)
