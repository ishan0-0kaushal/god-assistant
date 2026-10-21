"""Scene s3 sound design. build() adds sounds to the shared bed; kit is sfx.py."""


def build(bed, S, tl, kit):
    ev = tl["events"]
    t = kit.np.arange(bed.n) / kit.SR
    s3 = S
    # whisper swells, eerie beating high pair, phantom swell
    m = (t >= s3["start"]) & (t < s3["end"])
    n3 = int(m.sum())
    t3 = kit.np.arange(n3) / kit.SR
    knots = kit.np.arange(0, t3[-1] + 0.25, 0.12)
    swell = kit.np.clip(kit.np.interp(t3, knots, kit.rng.random(len(knots))) * 1.6 - 0.6, 0, 1)
    whisper = kit.bandpass(kit.rng.standard_normal(n3), lo=1400, hi=5000) * swell
    ramp = kit.np.minimum(1, t3 / 1.5)
    for pan in (-0.7, 0.7):
        bed.add(whisper * ramp * (0.6 + 0.4 * kit.np.sin(t3 * 1.3 + pan * 2)), s3["start"], 0.07, pan)
    bed.add((kit.np.sin(2 * kit.np.pi * 1318 * t3) + kit.np.sin(2 * kit.np.pi * 1331 * t3)) * ramp, s3["start"], 0.01)
    ph = s3["start"] + s3["cues"]["phantom"]
    n = int(0.6 * kit.SR)
    rise = kit.bandpass(kit.rng.standard_normal(n), lo=300, hi=3000) * (kit.np.arange(n) / n) ** 3
    bed.add(rise, ph - 0.45, 0.45, 0.5)
    bed.add(kit.impact(), ph + 0.12, 0.35, 0.5)

    for b in ev["ecg"]:
        if b["glitch"]:
            f = 1000 * (1 + 0.25 * kit.rng.uniform(-1, 1))
            for k in range(3):
                bed.add(kit.beep(f, 0.025), b["t"] + 0.13 + k * 0.035, 0.13)
        else:
            bed.add(kit.beep(1000), b["t"] + 0.13, 0.13)
