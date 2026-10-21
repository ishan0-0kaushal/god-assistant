"""Scene s4 sound design. build() adds sounds to the shared bed; kit is sfx.py."""


def build(bed, S, tl, kit):
    ev = tl["events"]
    s4 = S
    # riser and sub swell into the flatline
    flat0, flat1 = ev["flatline"]
    length = flat0 - s4["start"]
    n = int(length * kit.SR)
    u = kit.np.arange(n) / n
    riser = kit.sweep(160, 700, length) * u ** 2 * 0.5 + kit.bandpass(kit.rng.standard_normal(n), lo=2000) * u ** 3 * 0.35
    sub = kit.np.sin(2 * kit.np.pi * 41 * kit.np.arange(n) / kit.SR) * u ** 1.5
    bed.add(riser, s4["start"], 0.2)
    bed.add(sub, s4["start"], 0.4)
    bed.add(kit.impact(), s4["start"] + s4["cues"]["fail"], 0.8)

