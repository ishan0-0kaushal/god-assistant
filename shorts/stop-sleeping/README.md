# What if you stopped sleeping? — YouTube Short (1080x1920, 30 fps)

Code-built motion graphics: black background, white stickman, red for danger only.
The voiceover is the master clock: every scene length and animation cue is derived from
ElevenLabs' per-character timestamps, so changing a line in `script.json` re-times the video.

## Build

```sh
ELEVENLABS_API_KEY=... ./build.sh        # VO -> timeline -> sfx -> frames -> mix
./build.sh                               # no key: animatic on estimated timings, no VO
```

Output: `out/what-if-you-stopped-sleeping.mp4` (with VO, -14 LUFS) or
`out/what-if-you-stopped-sleeping_ANIMATIC-no-vo.mp4` (no key). VO clips are cached in
`build/vo/`; pass `--force` to `build.sh` to regenerate them (each call costs credits).
Needs Python 3 + numpy, ffmpeg, Node with Playwright and its Chromium, and network access to
`api.elevenlabs.io`.

## Files

| File | Role |
| --- | --- |
| `script.json` | VO lines, voice settings, word-anchored cues, on-screen text (`*word*` = red, max 5 words per beat, enforced) |
| `vo.py` | ElevenLabs `/with-timestamps` call per line (neighbouring lines passed for consistent prosody) |
| `timeline.py` | Scene boundaries, word timings, cues and shared visual/sound events -> `build/timeline.json` |
| `renderer/components.js` | `DrainBar` (reused in scenes 2 and 4), stickman, bloodshot eye, clock, shadows, thermometer, ECG, kinetic text |
| `renderer/scenes.js` | Per-scene choreography |
| `render.cjs` | Headless Chromium frame renderer -> `build/video.mp4`; `--stills 0,45` for QA frames |
| `sfx.py` | Synthesized sound bed (heartbeat, ticks, blackout drop-outs, ECG, riser, flatline) |
| `mix.py` | VO + ducked bed, mastered to -14 LUFS / <= -1 dBTP, muxed with the video |
