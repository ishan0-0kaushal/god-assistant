# Short 02 — Falling from every height

- **Channel:** Actually Animated
- **Target length:** ~30 s, 1080×1920, 30 fps
- **Build:** HyperFrames (`shorts/02-falling-hyperframes`)
- **Loop:** the camera dives from the orbit view back into blue sky with the stickman mid-fall and the needle on MAX, which is frame 0.

## Packaging

- **Title options:** "Falling from every height" / "After 450 m, falling higher doesn't hurt more"
- **Hashtags:** #whatif #physics #science #stickman #animation
- **No outro, no subscribe card.**

## On screen

- **Counter bar (top):** `DROP` (height fallen, m → km) and `SPEED` in km/h.
- **Speedometer:** 0–300 km/h dial with a red `MAX` line at 195 km/h (terminal velocity).
- **Survival chip:** early beats only.

## Script

| Real time | VO | On screen |
|---|---|---|
| 0.0–2.6 | "Past 450 meters, it doesn't matter how high you fall." | Stickman mid-fall in blue sky, needle pinned on MAX. |
| 2.6–3.5 | "One meter." | Steps off a box, lands, thumbs up. 16 km/h. |
| 3.5–4.5 | "Three." | Lands from a ledge, crack on the ankle. 28 km/h. |
| 4.5–6.4 | "Fifteen: that's a coin flip." | Five-floor drop, 62 km/h, coin flips: SURVIVAL ~50%. |
| 6.4–8.6 | "Then, at 450… the needle stops." | Long fall; needle climbs and hits MAX with a thunk at 450 m. |
| 8.6–11.4 | "Air pushes up as hard as gravity pulls down." | Gravity arrow down, drag arrow up, growing until equal. |
| 11.4–14.0 | "Ten kilometers? Same 200 kilometers an hour." | DROP races 450 m → 10 km, clouds whip past, needle frozen. |
| 14.0–17.0 | "In 1972, a flight attendant fell that far. And lived." | Piece of plane tail spinning down. "VESNA VULOVIĆ · 10,160 m · 1972" + WORLD RECORD stamp. |
| 17.0–21.4 | "At 39 kilometers, the air's so thin, Felix Baumgartner broke the sound barrier." | Sky turns black, Earth's curve below. Needle blows past the dial: 1,357 km/h · MACH 1.25. Sonic boom ring. |
| 21.4–23.8 | "Then thick air braked him back to 200." | Sky turns blue again, needle drops back to MAX. |
| 23.8–30.4 | "And at 400 kilometers? The Space Station is falling right now. Just sideways so fast it keeps missing the ground." | Pull out to the whole Earth. ISS orbits: a "FALLING" arrow down, a "27,600 km/h" arrow sideways, curved path. Camera dives back into the sky for the loop. |

~85 words of VO.

## Sound

- Wind that gets louder with speed; cuts out on landings.
- Landing thuds (soft, crack, heavy).
- Mechanical thunk when the needle hits MAX.
- Sonic boom at Mach 1.
- Low hum under the orbit beat.

## Facts and how they were checked

| Claim | Number | Basis |
|---|---|---|
| Impact speed, 1 / 3 / 15 m | 16 / 28 / 62 km/h | Computed: v = √(2gh), drag negligible at these heights |
| 50% survival height | ~15 m (4–5 floors) | Popular estimate (LD50 ≈ 48 ft): [Codidact thread](https://outdoors.codidact.com/posts/40115), [OffGrid](https://www.offgridweb.com/survival/falling-injuries-fatality-rates). Clinical data puts the mean fatal fall lower (6.6 m); on screen it's "~50%". |
| Terminal velocity | ~195 km/h belly-down | [Universe Today](https://www.universetoday.com/articles/terminal-velocity), [ScienceABC](https://www.scienceabc.com/eyeopeners/skydiving-how-fast-can-you-fall-through-the-air-terminal-velocity) |
| Reached at ~450 m | 12 s → 189 km/h (97.5%), 446 m fallen | Computed: v = vₜ·tanh(gt/vₜ), d = (vₜ²/g)·ln cosh(gt/vₜ), vₜ = 54 m/s. Matches the cited 50% at 3 s / 90% at 8 s / 99% at 15 s. |
| Vulović | 10,160 m, 26 Jan 1972, still the record | [Guinness](https://www.guinnessworldrecords.com/world-records/highest-fall-survived-without-parachute). A 2009 investigation disputed the altitude on circumstantial evidence; the line follows the official record. |
| Baumgartner | 38,969 m, 1,357.6 km/h, Mach 1.25 | [Red Bull mission data](https://www.redbull.com/us-en/red-bull-stratos-release-mission-data) |
| ISS | ~400 km up, ~27,600 km/h | Standard values |
