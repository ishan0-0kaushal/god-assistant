# Short 02 — Falling from every height

- **Channel:** Actually Animated
- **Target length:** ~35 s, 1080×1920
- **Build:** HyperFrames
- **Loop:** the stickman falls in an arc around Earth (the ISS beat) and drops back into the opening frame: mid-fall, speed needle pinned at its max line.

## Packaging

- **Title options:** "Falling from every height" / "After 450 m, falling higher doesn't hurt more"
- **Hashtags:** #whatif #physics #science #stickman #animation
- **No outro, no subscribe card.**

## Counter bar (top of screen, persistent)

`HEIGHT` · `SPEED (km/h)` with a speedometer whose needle has a red `MAX` line at 195 km/h · a `SURVIVAL` chip on the early beats only.

The camera follows the stickman down through sky layers: ground, rooftops, clouds, airliner altitude, black stratosphere, then orbit.

## Script

| Real time | VO | Counter | Visual |
|---|---|---|---|
| 0.0–2.6 | "After 450 meters, falling higher won't make you hit any harder." | 450 m · 195 km/h, needle on MAX | Stickman mid-fall, needle pinned. |
| 2.6–3.8 | "One meter: fine." | 1 m · 16 km/h | Steps off a box, lands, thumbs up. |
| 3.8–5.4 | "Three: maybe a broken ankle." | 3 m · 28 km/h | Lands, crack icon on the ankle. |
| 5.4–7.2 | "Fifteen: about a coin flip." | 15 m · 62 km/h · SURVIVAL ~50% | Coin flips in the corner. |
| 7.2–13.4 | "Then, at 450 meters, you stop speeding up. The air pushes back as hard as gravity pulls." | 450 m · 189 → 195 km/h | Two arrows on the stickman: drag up, gravity down, growing until they're equal length. |
| 13.4–17.6 | "From here, or ten kilometers, you hit at about 200 kilometers an hour." | height races 450 → 10,000 m, speed frozen at 195 | Clouds whip past; needle doesn't move. |
| 17.6–20.4 | "Vesna Vulović fell ten kilometers. And lived." | 10,160 m · WORLD RECORD stamp | Piece of plane tail spinning down. |
| 20.4–27.6 | "At thirty-nine, the air's so thin Felix Baumgartner broke the sound barrier. Then thick air slowed him right back down." | 38,969 m · 1,357 km/h · MACH 1.25 → back to ~200 | Sky goes black, sonic-boom ring, then sky turns blue again and the needle drops. |
| 27.6–34.5 | "And at four hundred? The Space Station is falling right now. It's just moving sideways so fast, it keeps missing." | 400 km · 27,600 km/h | Pull out to the whole Earth; stickman's path curves around the planet and drops back into frame 0. |

~99 words of VO, about 35 s.

## Facts and how they were checked

| Claim | Number | Basis |
|---|---|---|
| Impact speed, 1 / 3 / 15 m | 16 / 28 / 62 km/h | Computed: v = √(2gh), drag negligible at these heights |
| 50% survival height | ~15 m (4–5 floors) | Popular estimate (LD50 ≈ 48 ft): [Codidact thread](https://outdoors.codidact.com/posts/40115), [OffGrid](https://www.offgridweb.com/survival/falling-injuries-fatality-rates). Clinical data puts the mean fatal fall lower (6.6 m), hence "about" in the VO. |
| Terminal velocity | ~195 km/h belly-down | [Universe Today](https://www.universetoday.com/articles/terminal-velocity), [ScienceABC](https://www.scienceabc.com/eyeopeners/skydiving-how-fast-can-you-fall-through-the-air-terminal-velocity) |
| Reached at ~450 m | 12 s → 189 km/h (97.5%), 446 m fallen | Computed: v = vₜ·tanh(gt/vₜ), d = (vₜ²/g)·ln cosh(gt/vₜ), vₜ = 54 m/s. Matches the cited 50% at 3 s / 90% at 8 s / 99% at 15 s. |
| Vulović | 10,160 m, 26 Jan 1972, still the record | [Guinness](https://www.guinnessworldrecords.com/world-records/highest-fall-survived-without-parachute). A 2009 investigation disputed the altitude on circumstantial evidence, so "fell ten kilometers" follows the official record. |
| Baumgartner | 38,969 m, 1,357.6 km/h, Mach 1.25 | [Red Bull mission data](https://www.redbull.com/us-en/red-bull-stratos-release-mission-data) |
| ISS | ~400 km up, ~27,600 km/h | Standard values |
