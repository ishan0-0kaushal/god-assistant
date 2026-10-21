# Scene authoring reference

Canvas 1080x1920 @ 30 fps, drawn by headless Chromium. Every frame must be a pure function of
time (no `Math.random`, no state carried between frames): frames render out of order on
several pages. Use `hash`, `noise1`, `mulberry32(seed)` for randomness.

## Scene module contract (`renderer/scenes/<id>.js`)

All scene files share one global scope (classic scripts). Wrap the file in
`(() => { ... })();` and expose only `SCENES.<id> = {...}`. `_eye.js` holds the shared
eye helpers (`eyeProps`, `twitchState`, `saccade`) used by s1 and end.

```js
SCENES.s2 = {
  textCy: 420,                         // centre y of the text beat (core draws the text)
  textCyFor(beat, S, tl) {},           // optional per-beat override
  hideText(S, tl, ta) {},              // optional: true to hide the text beat this frame
  init(S) {},                          // optional, once per render page (build DrainBars...)
  draw(ctx, S, tl, ta) {},             // draw the whole scene; ctx is pre-filled with COL.bg
  hud(S, tl, ta) { return { hours, rate, danger, glitch, alpha, text } }, // top counter
  glitch(S, tl, ta) { return 0 },      // optional 0..1 slice-glitch over the finished frame
};
```

`S` is this scene from `build/timeline.json`: `S.start` (abs s), `S.dur_f`, `S.cues`
(named cues from script.json, scene-local seconds), `S.words` (VO word timings), `S.text`.
`tl` = scene-local seconds, `ta` = absolute seconds, `sceneDur(S)` = scene length.
`cue(S, 'word', {edge: 'end', offset, nth})` gives any spoken word's time. Scene lengths change
when the real VO replaces the estimate, so anchor every beat to cues/words or to
`sceneDur(S)` fractions, never to hard-coded seconds.

`TL.events` (absolute seconds): `heartbeats`, `blackouts` ([a,b] black frames, drawn by core),
`twitches` ({t,dur,kind}), `systems` (s1 failures), `ticks` (s2), `ecg` ({t,glitch}),
`flatline` [a,b], `cuts`, `whips`. Sounds are keyed to the same events.

Transitions are handled by core: s2 and s4 whip in from the right (6 frames, motion smear),
s3 and end hard-cut in with a scale punch and flash, s1 starts on frame 0 with no intro.

## Layout (YouTube Shorts safe zones)

- y 150–260: HUD band (core draws the HRS AWAKE counter from `hud()`).
- y 270–640: text band (core draws the text beat at `textCy`; keep heroes out of it).
- y 650–1440: action zone: the hero and anything that must read.
- y > 1440 (bottom 25%) and x > 960 for y 900–1750: covered by YouTube UI. Backgrounds may
  extend there; never text, never key action.

## Style

Off-black `COL.bg`, off-white `COL.fg` line art, ONE accent `COL.red` reserved for danger.
No other hues (cold = white frost, not blue). Environment props are thin line art at
`COL.fg` alpha 0.08–0.35 so the stickman stays the hero. One hero + text + at most 1–2
supporting props on screen at once. Entrances decelerate (`ease.decel`), exits accelerate
(`ease.accel`). No bouncy text.

## Libraries

components.js: `clamp lerp remap ease.{decel,accel,std,inOut} hash noise1 mulberry32 mixColor
roundRect since pulseFrom`, `drawBigEye(ctx, props, VEINS)`, `DrainBar` (keys [[t,v]], `.draw(ctx,
tl)`, `.valueAt(t)`), `drawClock(ctx, cx, cy, r, t, revPerSec)`, `drawCreepers(ctx, ta, grow,
flicker)`, `drawThermometer(ctx, x, y, t, level, appear)`, `drawECG(ctx, x, y, w, h, ta, beats,
appear, glitchAtAbs)`, `COL`, `FONT.{black,bold,mono}`.

rig.js (use this, not the legacy `drawStickman`): `pose({...})`, `POSES.{stand, slump, hug,
recoil, sit, kneel, collapsed, clutch}`, `lerpPose(a, b, t)`, `walkLimbs(phase, amt)` →
`{legL, legR, armL, armR, bob}`, `rigJoints(p)`, `onGround(p, groundY)`, `drawRig(ctx, p)` →
joints `{hip, neck, shoulder, head, headR, elbowL/R, handL/R, kneeL/R, footL/R, chest, belly}`.
Pose fields: `x, y` (hip), `s`, `facing` (0 front, 1 right, -1 left), `torso, neck` (lean,
+ toward facing), `armL/armR/legL/legR: [a1, a2]` (a1 from straight down, + forward in side view
/ outward in front view; knees bend with negative a2), `eyes` ('open','tired','wide','closed',
'x'), `lid` 0..1, `mouth` ('flat','o','open','grit','frown','none'), `look` -1..1 (front view
gaze), `bags`, `color`, `alpha`, `glow` (red outline glow 0..1), `silhouette` (black figure with
red eyes; pass `color: '#000'`).

fx.js: `withCam(ctx, cam, fn)` with `cam = {cx, cy, zoom, rot, ox, oy}` (world point at screen
centre), `handheld(ta, amt)`, `trauma(tl, hits, decay)`, `shake(ta, trauma, amp)`, `addCam(base,
...offsets)`, `speedLines(ctx, cx, cy, amount, ta)`, `flash(ctx, alpha, color)`, `dust(ctx, ta, n,
seed, {alpha, vx, vy})`, `heartIcon(ctx, x, y, size, {fill, stroke, glow, lineWidth})`,
`hoursAt(keys, t)`, `hoursRate(keys, t)`.

## Checking your work

```sh
export NODE_PATH=$(npm root -g)
RENDER_PAGES=2 node render.cjs --scene s2 --every 4 --outdir build/stills_s2 --sheet
RENDER_PAGES=2 node render.cjs --stills 250,251,252 --outdir build/stills_s2
python3 sfx.py --only s2      # global layers + only your scene module -> build/sfx_s2.wav
```

Open `build/stills_<id>/sheet.png` (labelled frame / scene / local time) and full-size stills
with the Read tool and look at them. Do not run `timeline.py`, `build.sh` or a full render.

## Sound (`sfx_scenes/<id>.py`)

`build(bed, S, tl, kit)`: `bed.add(signal, abs_time, gain, pan)`; `kit` is sfx.py:
`SR np rng bandpass(x, lo, hi) env(n, attack, tau) sweep(f0, f1, len) noise(n) heartbeat() impact()
tick(freq) glitch() beep(freq, len) whoosh(len, rising) thud(depth) crack()`. Global layers
already exist (drone, heartbeats, cut impacts, whip whooshes, text pops, twitch glitches,
blackout/flatline mutes) — add only scene-specific sounds. Gains: hits 0.3–0.8, beds/ambience
0.03–0.2. Time sounds to the same cues your visuals use.
