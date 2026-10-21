"""Scene s1 sound design. build() adds sounds to the shared bed; kit is sfx.py.

Timed to the same cues as renderer/scenes/s1.js:
  eye phase   tension riser into "awake" (the global layer already has heartbeats + twitches)
  awake       rising whoosh pre-lap -> impact + flash crack -> falling whoosh (whip-zoom out)
  bedroom     room tone, the alarm clock's electrical buzz (left, where the clock is), which
              cuts out with a crackle on every failure, like the clock on screen
  systems     one power-down glitch hit per TL.events.systems time, each a little lower/heavier
  scene end   reverse swell that stops dead into the whip to s2
"""


def _word(S, w, edge="t0"):
    key = "".join(c for c in w.lower() if c.isalnum())
    for x in S["words"]:
        if "".join(c for c in x["w"].lower() if c.isalnum()) == key:
            return x[edge]
    raise KeyError(w)


def _crush(np, x, k):
    """Sample-and-hold bit-crusher (k samples per step)."""
    return x[(np.arange(len(x)) // k) * k]


def _power_down(kit, f0, length, crush):
    np = kit.np
    n = int(length * kit.SR)
    t = np.arange(n) / kit.SR
    f = f0 * (38.0 / f0) ** ((t / length) ** 0.55)
    ph = 2 * np.pi * np.cumsum(f) / kit.SR
    tone = 0.55 * np.sign(np.sin(ph)) + 0.45 * np.sin(ph)
    tone = _crush(np, tone, crush) * kit.env(n, 0.002, length * 0.42)
    sub = kit.sweep(85, 30, length) * kit.env(n, 0.002, 0.09)
    hiss = kit.bandpass(kit.noise(n), lo=2500, hi=9000) * kit.env(n, 0.0005, 0.03)
    return tone * 0.6 + sub * 0.9 + hiss * 0.5


def build(bed, S, tl, kit):
    np = kit.np
    SR = kit.SR
    ev = tl["events"]
    t0, t1 = S["start"], S["end"]
    tA = t0 + S["cues"]["awake"]
    tHis = t0 + _word(S, "His")
    wz = min(max(0.9 * (tHis - tA), 0.22), 0.38)
    systems = [x for x in ev["systems"] if t0 <= x < t1]
    twitches = [x["t"] for x in ev["twitches"] if t0 <= x["t"] < tA - 0.25]

    # --- eye phase: a thin tension riser from the second lid snap into "awake"
    a = twitches[1] if len(twitches) > 1 else t0 + 0.6 * (tA - t0)
    L = tA - a
    n = int(L * SR)
    u = np.arange(n) / n
    riser = kit.sweep(180, 720, L) * u ** 2.2 + kit.bandpass(kit.noise(n), lo=1200, hi=6000) * u ** 3 * 0.6
    bed.add(riser, a, 0.13)

    # --- the reveal on "awake"
    bed.add(kit.whoosh(0.32, rising=True), tA - 0.3, 0.5)
    bed.add(kit.impact(), tA, 0.8)
    bed.add(kit.crack(), tA, 0.35)
    flash = kit.bandpass(kit.noise(int(0.25 * SR)), lo=3000) * kit.env(int(0.25 * SR), 0.0005, 0.05)
    bed.add(flash, tA, 0.3)
    bed.add(kit.whoosh(wz + 0.12, rising=False), tA + 0.02, 0.45)

    # --- bedroom: room tone + clock buzz (gated with the clock's flicker)
    rs = tA + 0.05
    n = int((t1 - rs) * SR)
    t = np.arange(n) / SR
    fade = np.minimum(1, t / 0.25)
    room = kit.bandpass(kit.noise(n), lo=60, hi=320) * 1.6 + kit.bandpass(kit.noise(n), lo=3000, hi=8000) * 0.15
    bed.add(room * fade, rs, 0.06)
    buzz = sum(np.sin(2 * np.pi * 120 * k * t) / k for k in range(1, 12)) * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t))
    buzz = kit.bandpass(buzz, lo=150, hi=3500)
    gate = np.ones(n)
    for x in systems:
        gate[(t >= x - rs) & (t < x - rs + 0.1)] = 0.0
    k = int(0.003 * SR)
    gate = np.convolve(gate, np.ones(k) / k, mode="same")
    bed.add(buzz * gate * fade, rs, 0.022, -0.5)
    for x in systems:  # the clock crackles back on
        bed.add(kit.crack() * 0.6, x + 0.1, 0.12, -0.5)

    # --- six power-down glitch hits, each lower and heavier than the last
    pans = [0.0, 0.1, 0.25, -0.2, 0.3, 0.0]
    for i, x in enumerate(systems):
        f0 = 1500 - 170 * i
        length = 0.3 + 0.03 * i
        bed.add(_power_down(kit, f0, length, 5 + i), x, 0.42 + 0.03 * i, pans[i % len(pans)])
        bed.add(kit.glitch(), x, 0.3, -pans[i % len(pans)])
        bed.add(kit.tick(2600), x, 0.25)
        if i == len(systems) - 1:
            bed.add(kit.impact(), x, 0.55)
            bed.add(kit.thud(0.8), x + 0.03, 0.4)

    # --- reverse swell that stops dead at the cut into s2
    a = (systems[-1] if systems else t1 - 0.5) - 0.25
    L = t1 - a
    n = int(L * SR)
    u = np.arange(n) / n
    swell = (kit.bandpass(kit.noise(n), lo=300, hi=5000) * 0.8 + kit.sweep(90, 260, L) * 0.6) * u ** 3
    swell[-int(0.004 * SR):] *= np.linspace(1, 0, int(0.004 * SR))
    bed.add(swell, a, 0.3)
