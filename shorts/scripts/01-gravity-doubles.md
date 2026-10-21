# Short 01 — What if Earth's gravity doubled every second?

- **Channel:** Actually Animated
- **Target length:** ~30 s, 1080×1920, 30 fps
- **Build:** Remotion (`shorts/01-gravity-remotion`)
- **Loop:** the last frame (Earth collapsed to a black hole, counter at 1,073,741,824 G) is the first frame. The last line ("Nothing gets out.") runs straight into the first.

## Packaging

- **Title options:** "What if Earth's gravity doubled every second?" / "Earth's gravity doubles every second (30 s later...)"
- **Hashtags:** #whatif #physics #science #stickman #animation
- **No outro, no subscribe card.**

## On screen

- **Counter bar (top):** gravity in G (big), sim clock, "YOUR BODY WEIGHS".
- **Light bar (lower third):** "SPEED NEEDED TO LEAVE EARTH", filling toward light speed. Linear in km/s, so it barely moves until the last few seconds, then rushes to full.
- **Balance scale:** from the elephant onward, the stickman's flattened body sits on one pan; each comparison object drops onto the other pan and gets launched.
- **Ghost:** the stickman blacks out at 8 G; his ghost pops out and reacts for the rest of the video.

The sim clock shows simulated seconds. It jumps to each milestone as the VO line starts, then holds.

## Script

| Real time | Sim clock | VO | On screen |
|---|---|---|---|
| 0.0–2.4 | 30 s | "In thirty seconds, Earth becomes a black hole." | Black hole where Earth was. Rewind effect at the end scrubs everything back to 1 G. |
| 2.4–4.0 | 0 s | "Gravity doubles every second." | Stickman (red bowler hat) on the ground, waves. Tick each sim second, pitch rising. |
| 4.0–6.6 | 1 s | "Two G: every step, you carry a second you." | 2 G · 140 kg. A copy of himself rides on his back; he crouches. |
| 6.6–8.4 | 3 s | "Eight: you black out." | 8 G · 560 kg. Screen dims, eyes go X, he drops flat. Ghost rises out. |
| 8.4–10.6 | 5 s | "Thirty-two: heavier than standing on the Sun." | 32 G. "SUN'S SURFACE: 28 G" badge gets passed. |
| 10.6–12.8 | 7 s | "Your body now outweighs an elephant." | 128 G · 9 t. Scale appears; elephant (~6 t) launched. |
| 12.8–16.0 | 10 s | "A thousand G: the air presses like ten kilometers under the sea." | 1,024 G · 72 t. Atmosphere band squashed to a line; "AIR: 1,024 atm" chip. |
| 16.0–17.4 | 14 s | "A jumbo jet." | 16,384 G · 1,147 t. Loaded A380 (575 t) launched. |
| 17.4–18.9 | 18 s | "The Eiffel Tower." | 18,350 t vs 10,100 t |
| 18.9–20.4 | 20 s | "The Titanic." | 73,400 t vs ~53,150 t |
| 20.4–22.0 | 23 s | "The Empire State Building." | 587,000 t vs ~331,000 t |
| 22.0–23.6 | 27 s | "The Great Pyramid." | 9.4 million t vs ~5.9 million t |
| 23.6–27.6 | 27 → 29.4 s | "Now, to leave Earth, you'd have to move faster than light." | Zoom out to the whole planet. Light bar rushes from 43% to 100%. |
| 27.6–30.0 | 29.4 → 30 s | "Nothing gets out." | Earth collapses into a black hole. Matches frame 0. |

~76 words of VO.

## Sound

- Tick on every sim second, pitch rising across the video.
- Bass hit on each milestone; a thud each time an object lands on the scale, a whoosh when it's launched.
- Rewind whirr at 2.0 s.
- Low drone under the zoom-out, rising with the light bar.
- Half a second of silence before "Nothing gets out."

## Facts and how they were checked

| Claim | Number | Basis |
|---|---|---|
| Untrained people black out | 4–6 G sustained (8 G is well past it) | [G-LOC](https://en.wikipedia.org/wiki/G-LOC) |
| Sun's surface gravity | 274 m/s² = 27.9 G | Standard value |
| Air pressure scales with gravity | Same air mass × 1,024 G = 1,024 atm ≈ 10.3 km of seawater | Computed (P = air mass × g / area). Trench floor is ~1,086 bar per [UCL](https://www.ucl.ac.uk/engage/case-studies/2021/apr/how-much-pressure-builds-deepest-point-ocean). |
| Body weight | 70 kg × 2ᵗ | Computed |
| Elephant | ~6 t (adult male bush elephant) | [Wikipedia](https://en.wikipedia.org/wiki/African_bush_elephant) |
| A380, fully loaded | 575 t max takeoff weight | [Airbus](https://www.airbus.com/sites/g/files/jlcbta136/files/2022-01/EN-Airbus-A380-Facts-and-Figures-January-2022.pdf), [Guinness](https://www.guinnessworldrecords.com/world-records/72449-largest-aircraft-by-weight-in-production-present-day) |
| Eiffel Tower | 10,100 t | [Official key figures](https://www.toureiffel.paris/en/the-monument/key-figures) |
| Titanic | 52,310 long tons ≈ 53,150 t displacement | [Wikipedia](https://en.wikipedia.org/wiki/Titanic) |
| Empire State Building | 365,000 short tons ≈ 331,000 t | [ESB fact sheet](https://esbnyc.com/sites/default/files/esb_fact_sheet_final.pdf) |
| Great Pyramid | ~5.9 million t | [New World Encyclopedia](https://www.newworldencyclopedia.org/entry/Great_Pyramid_of_Giza) |
| Earth becomes a black hole | Escape speed 11.186 km/s × √(2ᵗ) = c at t = log₂((c / 11.186)²) = 29.42 s | Computed at fixed radius. Compression would make it sooner, so "by second 30" is safe. |
