# Actually Animated — shorts

Code-built YouTube Shorts for the Actually Animated channel (stickman explainers, 1080×1920).

| # | Short | Script | Build | Status |
|---|---|---|---|---|
| 01 | What if Earth's gravity doubled every second? | [scripts/01-gravity-doubles.md](scripts/01-gravity-doubles.md) | Remotion | Script done |
| 02 | Falling from every height | [scripts/02-fall-from-every-height.md](scripts/02-fall-from-every-height.md) | HyperFrames | Script done |

## Format rules (from the vidIQ channel analysis)

- 35 s or less, one topic: forces and extremes on the body.
- One persistent counter bar at the top. Switch units when numbers get too big to picture.
- Open on the payoff (or a countdown), never on a title card.
- The last frame matches the first so the video loops. No subscribe outro.
- Hashtags: #whatif #physics #science #stickman. No borrowed meme-trend tags.

## Voiceover

Generated with ElevenLabs from the VO column of each script. Reads two environment variables:

- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

The cloud environment also needs `api.elevenlabs.io` under Allowed domains.
