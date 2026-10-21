"""Generate one ElevenLabs voiceover clip per scene, with character timestamps.

Writes build/vo/<scene>.mp3 and build/vo/<scene>.align.json. Needs ELEVENLABS_API_KEY
and network access to api.elevenlabs.io. ELEVENLABS_VOICE_ID overrides the voice in
script.json. Existing clips are reused unless --force is passed (each call costs credits).
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
API = "https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128"


def tts(text, prev_text, next_text, voice_cfg, voice_id, key):
    body = {
        "text": text,
        "model_id": voice_cfg["model_id"],
        "voice_settings": voice_cfg["settings"],
        # Neighbouring lines keep prosody consistent across the separate requests.
        "previous_text": prev_text,
        "next_text": next_text,
    }
    req = urllib.request.Request(
        API.format(voice=voice_id),
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs returned {e.code}: {e.read().decode(errors='replace')[:500]}")
    except urllib.error.URLError as e:
        sys.exit(f"Could not reach api.elevenlabs.io: {e.reason}")


def main():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("ELEVENLABS_API_KEY is not set")
    force = "--force" in sys.argv
    script = json.loads((ROOT / "script.json").read_text())
    voice_cfg = script["voice"]
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", voice_cfg["voice_id"])
    out = ROOT / "build" / "vo"
    out.mkdir(parents=True, exist_ok=True)

    scenes = script["scenes"]
    for i, scene in enumerate(scenes):
        mp3 = out / f"{scene['id']}.mp3"
        align = out / f"{scene['id']}.align.json"
        if mp3.exists() and align.exists() and not force:
            print(f"{scene['id']}: cached")
            continue
        prev_text = scenes[i - 1]["vo"] if i > 0 else None
        next_text = scenes[i + 1]["vo"] if i + 1 < len(scenes) else None
        res = tts(scene["vo"], prev_text, next_text, voice_cfg, voice_id, key)
        mp3.write_bytes(base64.b64decode(res["audio_base64"]))
        align.write_text(json.dumps({"text": scene["vo"], "alignment": res["alignment"]}, indent=1))
        print(f"{scene['id']}: {len(scene['vo'])} chars -> {mp3.name}")


if __name__ == "__main__":
    main()
