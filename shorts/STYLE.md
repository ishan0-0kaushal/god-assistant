# Actually Animated — visual style

Measured from the channel's own short "What if the Earth stopped spinning" (1080×1920, 30 fps,
27.6 s, ~15 cuts). Every new short should match this.

## Look

- **Background:** near-black navy `#000008`, faint stars, a soft vignette. Danger beats tint the whole
  frame red/orange; "safe" beats go teal (aurora).
- **Glow on everything that matters:** big numbers, titles, rings and pills all carry a soft
  bloom in their own color. Nothing important is flat.
- **Earth is a dot-matrix globe:** land drawn as rows of small white dots (`#f0f8f8`, blue-tinted
  toward the limb) on a dark ocean sphere with a blue rim glow. The same globe, scaled up, becomes
  the "ground": a glowing horizon arc with big perspective dots.
- **Speed streaks:** thin horizontal white lines of varied length drifting across the background
  whenever something is moving.
- **Cinematic bars:** black letterbox bars (≈170 px) slide in on action shots.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| bg | `#000008` | background |
| cyan | `#40d8e8` | "WHAT IF", HUD labels, safe/OK states, cyan counters |
| red | `#f82838` | title accent, danger words, failed pills |
| coral | `#ff5060` | big danger counters (with glow; reads ≈`#b83848` through the bloom) |
| orange | `#ff9b45` | location/latitude accents, mid-danger counters |
| cream | `#d8c090` | character shout text ("MY COFFEE!!") |
| white | `#f8f8f8` | titles, captions, stickman |
| panel | `#101020` @ ~85% | pills and chips, 2 px border `rgba(255,255,255,.15)` |

## Type

- **Display** (titles, big numbers, shouts): heavy condensed sans — Anton. Big counters ≈260–300 px
  tall with the unit ("KM/H") in white at ≈40% of the number's size, bottom-aligned.
- **UI / captions:** Inter 800–900.

## Layout (1080×1920)

| Element | Position |
|---|---|
| Tracker label ("• SAFE ZONE?") | centered, y≈85, Inter 800 28 px, cyan |
| Tracker pills | centered row, y≈115–185, 68 px tall, 16 px gaps |
| Title ("WHAT IF / EARTH STOPPED?") | y≈250–470 |
| Hero visual (globe, stickman) | y≈300–1250 |
| Big counter | y≈900–1200 when the visual sits above it, otherwise ≈300–500 |
| Info pill ("≈ FASTER THAN THE SPEED OF SOUND") | x 90–990, y≈1280–1375 |
| Captions | baseline ≈1505, Inter 800 64 px |

## Components

- **Tracker pills:** pending = grey border + `?` badge; failed = red glowing border, greyed text,
  red `✕` badge; found = cyan border + check. Ticks off as the story answers the question.
- **Counter pill:** `• EARTH'S SPIN 1,672 KM/H`, dark pill with a cyan dot, Inter label, Anton number.
- **Chip:** small rounded rect, cyan micro-label over a white Anton value (`GROUND / 0 KM/H`).
- **Tag above a character:** `YOU / 1,260 KM/H` in a small red-bordered box with a pointer.
- **Rotated stamp:** `MACH 1.35`, white Anton on red, rotated ≈-6°, pops in with overshoot.
- **Info pill:** wide, red/blue-tinted border, icon on the left, one emphasized word in the accent color.
- **Comparison bars:** two labelled horizontal bars racing (`EARTH STOPS` vs `STRONGEST HURRICANE`).
- **Shouts:** cream Anton, slightly rotated, attached to the character ("MY COFFEE!!", "NOPE.").
  Bigger gags get a red pill ("WAS THAT A COW?!").
- **Location marker:** ring + dot + label pill, latitude drawn as a glowing ellipse with moving
  chevrons showing the spin direction.

## Captions

- Whole line is laid out centered, then revealed **one word at a time** in sync with the voice.
  Each word blurs in (≈4 frames).
- Key words are colored with the beat's accent (red danger, orange, cyan safe, blue oceans).

## Stickman

- White limbs ≈14 px, round caps, white head r≈35 with dot eyes; small red bowler hat.
- Always doing something: holding a coffee, flying, tumbling, turning on the spot.
- Speed = red afterimage trails behind limbs, hat flying off, props shedding particles.

## Motion and transitions

- **Nothing is static:** slow push-ins on holds, globe always rotating, streaks always drifting.
- **Camera moves inside shots:** zoom from the globe down to the ground, from the ground back out
  to the map, pans along a latitude line.
- **Transitions:** blur-through (scene blurs out ≈0.3 s while the HUD stays sharp), glitch slices
  with RGB split, red or white flash frames on impacts.
- **Number changes** roll with easing and a pop; impacts get a shake.
- **Average shot ≈1.8 s.**

## Do / don't

- Do keep the tracker HUD and captions sharp while scenes blur behind them.
- Do end on a frame that loops into the opening.
- Don't run a subscribe-card outro (the reference spends 7.6 s, 27% of the video, on one).
