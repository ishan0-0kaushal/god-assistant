"""Build build/timeline.json: scene boundaries, word timings, cues and sound/visual events.

The VO is the master clock. With build/vo/<scene>.align.json present (from vo.py), every
scene length and cue comes from ElevenLabs' character timestamps. Without it, timings are
estimated from character counts so the animatic can be reviewed; the output says which.
"""
import json
import random
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
MAX_WORDS = 5


def norm(word):
    return re.sub(r"[^a-z0-9]", "", word.lower())


def probe_duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def estimate_alignment(text, cps):
    """Fake character timestamps: constant rate plus pauses after punctuation."""
    pauses = {",": 0.18, ".": 0.34, "—": 0.16, "…": 0.3, "?": 0.34}
    t, starts, ends = 0.05, [], []
    for i, ch in enumerate(text):
        starts.append(t)
        t += 1.0 / cps
        ends.append(t)
        if ch in pauses and i < len(text) - 1:
            t += pauses[ch]
    return {"characters": list(text), "character_start_times_seconds": starts,
            "character_end_times_seconds": ends}, t + 0.1


def words_from_alignment(al):
    chars, t0s, t1s = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    words, cur = [], None
    for ch, a, b in zip(chars, t0s, t1s):
        if ch.isspace():
            if cur:
                words.append(cur)
            cur = None
            continue
        if cur is None:
            cur = {"w": "", "t0": a, "t1": b}
        cur["w"] += ch
        cur["t1"] = b
    if cur:
        words.append(cur)
    return [w for w in words if norm(w["w"])]


def resolve_cue(cue, words, scene_id, name):
    key = norm(cue["word"])
    hits = [w for w in words if norm(w["w"]) == key]
    if not hits:
        sys.exit(f"{scene_id}: cue '{name}' word '{cue['word']}' not found in VO line")
    w = hits[cue.get("nth", 0)]
    return (w["t1"] if cue.get("edge") == "end" else w["t0"]) + cue.get("offset", 0.0)


def count_words(line):
    return len([tok for tok in line.replace("*", "").split() if re.search(r"[A-Za-z0-9]", tok)])


def main():
    script = json.loads((ROOT / "script.json").read_text())
    fps, pacing = script["fps"], script["pacing"]
    rng = random.Random(11)
    vo_dir = BUILD / "vo"

    scenes, mode = [], None
    cursor_f = 0
    for i, sc in enumerate(script["scenes"]):
        for beat in sc["text"]:
            n = sum(count_words(line) for line in beat["lines"])
            if n > MAX_WORDS:
                sys.exit(f"{sc['id']}: text beat {beat['lines']} has {n} words (max {MAX_WORDS})")

        mp3, align_path = vo_dir / f"{sc['id']}.mp3", vo_dir / f"{sc['id']}.align.json"
        if mp3.exists() and align_path.exists():
            al = json.loads(align_path.read_text())["alignment"]
            clip_dur = probe_duration(mp3)
            scene_mode, vo_file = "elevenlabs", str(mp3.relative_to(ROOT))
        else:
            al, clip_dur = estimate_alignment(sc["vo"], pacing["estimate_chars_per_s"])
            scene_mode, vo_file = "estimate", None
        if mode not in (None, scene_mode):
            sys.exit("some scenes have VO and some do not; run vo.py for all scenes")
        mode = scene_mode

        words = words_from_alignment(al)
        speech_start, speech_end = words[0]["t0"], words[-1]["t1"]
        trim = max(0.0, speech_start - 0.03)
        lead = pacing["lead_s"] if i == 0 else pacing["next_lead_s"]
        last = i == len(script["scenes"]) - 1
        tail = pacing["end_hold_s"] if last else sc.get("tail_s", pacing["tail_s"])
        shift = lead - trim  # clip time -> scene time
        dur_f = round((shift + speech_end + tail) * fps)

        local_words = [{"w": w["w"], "t0": round(w["t0"] + shift, 4), "t1": round(w["t1"] + shift, 4)} for w in words]
        cues = {"start": 0.0, "end": dur_f / fps}
        blackout_frames = {}
        for name, cue in sc.get("cues", {}).items():
            cues[name] = round(min(resolve_cue(cue, local_words, sc["id"], name), dur_f / fps), 4)
            if "frames" in cue:
                blackout_frames[name] = cue["frames"]

        scenes.append({
            "id": sc["id"], "transition": sc.get("transition_in", "cut"), "start_f": cursor_f, "dur_f": dur_f,
            "start": cursor_f / fps, "end": (cursor_f + dur_f) / fps,
            "vo": {"file": vo_file, "trim": round(trim, 4), "at": round(cursor_f / fps + lead, 4),
                   "len": round(min(clip_dur, speech_end + 0.25) - trim, 4)},
            "words": local_words, "cues": cues, "blackout_frames": blackout_frames,
            "text": [dict(b, at_s=cues[b["at"]]) for b in sc["text"]],
        })
        cursor_f += dur_f

    total_f = cursor_f
    by_id = {s["id"]: s for s in scenes}
    ev = {"cuts": [s["start"] for s in scenes[1:] if s["transition"] == "cut"],
          "whips": [s["start"] for s in scenes[1:] if s["transition"] == "whip"], "blackouts": [], "heartbeats": [], "twitches": [],
          "ticks": [], "ecg": [], "text_pops": [], "systems": [], "flatline": None}

    for s in scenes:
        for b in s["text"]:
            if not b.get("hold_from_frame0"):
                ev["text_pops"].append(round(s["start"] + b["at_s"], 4))
        for name, frames in s["blackout_frames"].items():
            t0 = s["start"] + s["cues"][name]
            ev["blackouts"].append([round(t0, 4), round(min(t0 + frames / fps, s["end"]), 4)])

    # Eye scenes: stressed resting heartbeat and irregular twitches.
    for sid in ("s1", "end"):
        s = by_id[sid]
        t = s["start"] + 0.1
        while t < s["end"] - 0.1:
            ev["heartbeats"].append(round(t, 4))
            t += 60 / 96
        t = s["start"] + 0.55
        while t < s["end"] - 0.25:
            ev["twitches"].append({"t": round(t, 4), "dur": round(rng.uniform(0.22, 0.38), 4),
                                   "kind": rng.choice(["lid", "lid", "jerk"])})
            t += rng.uniform(0.7, 1.5)

    # Scene 1: a hard jerk lands on "awake".
    s1 = by_id["s1"]
    jerk = s1["start"] + s1["cues"]["awake"]
    ev["twitches"] = [tw for tw in ev["twitches"] if abs(tw["t"] - jerk) > 0.5]
    ev["twitches"].append({"t": round(jerk, 4), "dur": 0.32, "kind": "jerk"})
    ev["twitches"].sort(key=lambda tw: tw["t"])

    # Scene 1: the row of "systems" fails one at a time across the second sentence.
    a, b = s1["cues"]["systems_start"], s1["cues"]["systems_end"]
    ev["systems"] = [round(s1["start"] + a + (b - a) * k / 5, 4) for k in range(6)]

    # Scene 2: the spinning clock ticks fast.
    s2 = by_id["s2"]
    t = s2["start"] + 0.05
    while t < s2["end"]:
        ev["ticks"].append(round(t, 4))
        t += 1 / 8

    # Scene 3: ECG starts on "heart", goes irregular on "glitches".
    s3 = by_id["s3"]
    t, glitch_at = s3["start"] + s3["cues"]["heart"], s3["start"] + s3["cues"]["glitch"]
    while t < s3["end"]:
        glitchy = t >= glitch_at
        ev["ecg"].append({"t": round(t, 4), "glitch": glitchy})
        t += rng.choice([0.18, 0.62, 0.3, 0.85, 0.22]) if glitchy else 0.5

    # Scene 4: heart rate climbs as the bar drains, then flatlines.
    s4 = by_id["s4"]
    flat = s4["start"] + s4["cues"]["purpose"]
    t = s4["start"] + 0.1
    while t < flat - 0.15:
        p = (t - s4["start"]) / max(flat - s4["start"], 0.01)
        ev["heartbeats"].append(round(t, 4))
        t += 60 / (100 + 70 * p)
    ev["flatline"] = [round(flat, 4), s4["end"]]
    ev["heartbeats"].sort()

    timeline = {"title": script["title"], "fps": fps, "width": script["width"], "height": script["height"],
                "frames": total_f, "duration": total_f / fps, "vo_mode": mode, "scenes": scenes, "events": ev}
    BUILD.mkdir(exist_ok=True)
    (BUILD / "timeline.json").write_text(json.dumps(timeline, indent=1))
    print(f"timeline: {mode}, {total_f} frames = {total_f / fps:.2f}s")
    for s in scenes:
        print(f"  {s['id']:>4}  {s['start']:6.2f} -> {s['end']:6.2f}  ({s['dur_f'] / fps:.2f}s)")


if __name__ == "__main__":
    main()
