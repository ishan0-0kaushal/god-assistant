"""Scene end sound design. build() adds sounds to the shared bed; kit is sfx.py.

Timed to the same cues as renderer/scenes/end.js:
  cut -> question   low swell (sub + dark noise) under "so..." (the global cut impact lands the cut)
  question          sharp hit as the eye snaps wide: impact + crack + bright transient
  "breaks"          a small crack under the lower-lid flutter
  after question    faint tinnitus ring that fades out before the loop point
"""


def _word(S, w, edge="t0"):
    key = "".join(c for c in w.lower() if c.isalnum())
    for x in S["words"]:
        if "".join(c for c in x["w"].lower() if c.isalnum()) == key:
            return x[edge]
    raise KeyError(w)


def build(bed, S, tl, kit):
    np = kit.np
    SR = kit.SR
    t0, t1 = S["start"], S["end"]
    q = t0 + S["cues"]["question"]

    # low swell into the question, cut on the hit
    L = q - t0
    n = int(L * SR)
    t = np.arange(n) / SR
    u = t / L
    sub = np.sin(2 * np.pi * np.cumsum(42 + 14 * u) / SR)
    dark = kit.bandpass(kit.noise(n), lo=40, hi=420)
    swell = (sub * 0.9 + dark * 1.2) * u ** 1.8
    swell[-int(0.005 * SR):] *= np.linspace(1, 0, int(0.005 * SR))
    bed.add(swell, t0, 0.32)
    bed.add(kit.whoosh(0.3, rising=True), q - 0.28, 0.3)

    # the sharp hit on the question
    bed.add(kit.impact(), q, 0.75)
    bed.add(kit.crack(), q, 0.4)
    m = int(0.18 * SR)
    bed.add(kit.bandpass(kit.noise(m), lo=2500) * kit.env(m, 0.0004, 0.035), q, 0.35)

    # crack under the lid flutter on "breaks"
    bed.add(kit.crack(), t0 + _word(S, "breaks"), 0.2, 0.2)

    # tinnitus ring after the question, gone before the loop restarts
    a, b = q + 0.15, t1 - 0.35
    if b > a:
        n = int((b - a) * SR)
        t = np.arange(n) / SR
        env = np.sin(np.pi * t / (b - a)) ** 2
        ring = (np.sin(2 * np.pi * 4100 * t) + 0.4 * np.sin(2 * np.pi * 4123 * t)) * env
        bed.add(ring, a, 0.012)
