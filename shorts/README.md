# Actually Animated — shorts

Code-built YouTube Shorts for the Actually Animated channel (stickman explainers, 1080×1920).

| # | Short | Script | Build | Status |
|---|---|---|---|---|
| 01 | What if Earth's gravity doubled every second? | [scripts/01-gravity-doubles.md](scripts/01-gravity-doubles.md) | [studio](studio) (`src/gravity.*`) | Draft rendered in the channel style, placeholder SFX, no VO |
| 02 | Falling from every height | [scripts/02-fall-from-every-height.md](scripts/02-fall-from-every-height.md) | [studio](studio) (`src/falling.*`) | Draft rendered in the channel style, placeholder SFX, no VO |

The visual style is written down in [STYLE.md](STYLE.md), measured from the channel's own
"What if the Earth stopped spinning" short. [`01-gravity-remotion`](01-gravity-remotion) and
[`02-falling-hyperframes`](02-falling-hyperframes) are the first drafts, kept for reference and
superseded by `studio`.

## Format rules (from the vidIQ channel analysis)

- 35 s or less, one topic: forces and extremes on the body.
- One persistent counter bar at the top. Switch units when numbers get too big to picture.
- Open on the payoff (or a countdown), never on a title card.
- The last frame matches the first so the video loops. No subscribe outro.
- Hashtags: #whatif #physics #science #stickman. No borrowed meme-trend tags.

## Voiceover (next step)

Generated with ElevenLabs from the caption lines in each timing file. Reads two environment
variables, `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`, and the cloud environment needs
`api.elevenlabs.io` under Allowed domains. The steps are in [studio/README.md](studio/README.md).
The sound effects are ffmpeg placeholders and can be swapped for ElevenLabs sound effects with the
same key.

## Remotion vs HyperFrames, from building one short in each

- **Retiming:** the first HyperFrames draft had times spread across HTML attributes and script.
  The studio fixes that with a build step: everything reads one timing JSON per short.
- **Reuse:** the Remotion stickman, counter bar and captions are components with props, ready to
  become a template. In HyperFrames the same things are copy-paste HTML/JS.
- **Tooling:** HyperFrames' lint caught audio that would have rendered silent, and its `snapshot`
  contact sheets made review fast. Its defaults load GSAP from a CDN, which had to be vendored here.
- **Quality:** the same. Both draw frames in headless Chrome and encode with x264. With matched
  settings (lossless frames, CRF 15, slow preset, BT.709) a test card scored SSIM 0.989 (Remotion)
  vs 0.987 (HyperFrames) against a lossless reference at the same bitrate: a tie. Both can render
  at 2x density for a 4K upload (`--scale=2` / `--resolution portrait-4k`).
- **Speed at matched quality:** ~1m40s (Remotion) vs ~1m20s (HyperFrames) for a 30 s render on 4 cores.
- **Pick for the daily template:** HyperFrames (`studio`), to match how the channel's existing
  shorts are built.
