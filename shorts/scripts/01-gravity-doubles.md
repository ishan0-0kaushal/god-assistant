# Short 01 — What if Earth's gravity doubled every second?

- **Channel:** Actually Animated
- **Target length:** ~31 s, 1080×1920
- **Build:** Remotion
- **Loop:** the last frame (Earth as a black dot, counter at 1,073,741,824 G) is the first frame.

## Packaging

- **Title options:** "What if Earth's gravity doubled every second?" / "Earth's gravity doubles every second (30 s later...)"
- **Hashtags:** #whatif #physics #science #stickman #animation
- **No outro, no subscribe card.** The video ends on its first frame.

## Counter bar (top of screen, persistent)

`SIM CLOCK` · `GRAVITY (G)` · `YOU WEIGH` · `ESCAPE SPEED → LIGHT` progress bar.

The sim clock shows simulated seconds, not real playback time. Early beats run slower than real time so the VO can land; the middle (seconds 11–19) spins the counter fast.

The escape-speed bar is linear in km/s, so it barely moves until second ~25 and then rushes to full. That rush is the payoff.

## Script

| Real time | Sim clock | VO | Counter | Visual |
|---|---|---|---|---|
| 0.0–2.2 | 30 s | "In thirty seconds, Earth becomes a black hole." | 1,073,741,824 G · bar full | Opens on the final frame: black dot where Earth was. Rewind SFX, scrub back to 1 G. |
| 2.2–4.0 | 0 s | "Here's how. Every second, gravity doubles." | 1 G · 70 kg · 11 km/s | Stickman standing on Earth's curve, waves. Clock starts. |
| 4.0–6.0 | 1 s | "Two G. Every step, you carry a second you." | 2 G · 140 kg | Stickman crouches; ghost copy of himself on his back. |
| 6.0–8.0 | 3 s | "Eight G. You black out." | 8 G · 560 kg | Vignette to black for ~0.3 s, stickman drops flat. |
| 8.0–10.5 | 5 s | "Thirty-two G. Heavier than standing on the Sun." | 32 G · 2.2 t | "SUN: 28 G" badge pops and gets passed. |
| 10.5–14.0 | 10 s | "A thousand G. The air presses like ten kilometers under the ocean." | 1,024 G · 72 t · AIR 1,024 atm | Atmosphere ring around Earth squeezes to a thin line. |
| 14.0–18.0 | 20 s | "A million G. What's left of you weighs more than the Titanic." | 1,048,576 G · 73,400 t | Scale: pancaked stickman vs Titanic silhouette. |
| 18.0–22.0 | 21→27 s | "Mountains flatten. The planet starts crushing itself." | counter spins | Mountain silhouettes sink; Earth ring pulses inward with cracks. |
| 22.0–28.5 | 27→29.4 s | "Second twenty-nine. Escape speed hits the speed of light." | bar rushes 21% → 100% | Light rays leaving the surface curve back down. |
| 28.5–31.0 | 30 s | "Not even light gets out." | 1,073,741,824 G | Earth collapses to a black dot. Matches frame 0, loops. |

~75 words of VO. At ~2.6 words/s that's about 29 s of speech, plus SFX gaps.

## Facts and how they were checked

| Claim | Number | Basis |
|---|---|---|
| Untrained people black out | 4–6 G sustained (8 G is safely past it) | [G-LOC](https://en.wikipedia.org/wiki/G-LOC) |
| Sun's surface gravity | 274 m/s² = 27.9 G | Standard value; 32 G > 27.9 G |
| Air pressure scales with gravity | Same air mass × 1,024 G = 1,024 atm ≈ 10.3 km of seawater | Computed (P = air mass × g / area); trench floor is ~1,086 bar per [UCL](https://www.ucl.ac.uk/engage/case-studies/2021/apr/how-much-pressure-builds-deepest-point-ocean) |
| 70 kg person at 2²⁰ G | 73,400 t | Computed; Titanic displaced 52,310 long tons ≈ 53,150 t per [Wikipedia](https://en.wikipedia.org/wiki/Titanic) |
| Higher gravity compresses atmospheres and flattens terrain | Qualitative | Scale height H = kT/(Mg), per [U. Arizona lecture](https://www.lpl.arizona.edu/~shane/PTYS_206/lectures/PTYS_206_terrestrial_planet_atmospheres.pdf) |
| Earth becomes a black hole | Escape speed 11.186 km/s × √(2ᵗ) = c at t = log₂((c / 11.186 km/s)²) = 29.42 s | Computed at fixed radius. Compression would make it sooner, so "by second 30" is safe. |
