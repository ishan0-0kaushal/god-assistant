"""Mix VO + sound bed, master to -14 LUFS / <= -1 dBTP, and mux with build/video.mp4.

VO sits at -16 LUFS with the bed ~15 LU under it and side-chain ducked. Without VO (estimate
mode) the bed alone is mastered to -18 LUFS and the file is named as an animatic.
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
OUT = ROOT / "out"
TARGET_LUFS = -14.0


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *args], check=True)


def loudness(path):
    res = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True, check=True).stderr
    summary = res[res.rindex("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary).group(1))
    tp = float(re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS", summary).group(1))
    return i, tp


def main():
    tl = json.loads((BUILD / "timeline.json").read_text())
    dur = tl["duration"]
    has_vo = tl["vo_mode"] == "elevenlabs"
    bed = BUILD / "sfx.wav"
    pre = BUILD / "mix_pre.wav"
    bed_i, _ = loudness(bed)

    if has_vo:
        stem = BUILD / "vo_stem.wav"
        inputs, chains = [], []
        for k, s in enumerate(tl["scenes"]):
            inputs += ["-i", str(ROOT / s["vo"]["file"])]
            ms = int(round(s["vo"]["at"] * 1000))
            chains.append(f"[{k}:a]atrim=start={s['vo']['trim']}:duration={s['vo']['len']},asetpts=PTS-STARTPTS,"
                          f"aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[v{k}]")
        n = len(tl["scenes"])
        graph = ";".join(chains) + ";" + "".join(f"[v{k}]" for k in range(n)) + \
            f"amix=inputs={n}:normalize=0,apad,atrim=duration={dur}[out]"
        ff(*inputs, "-filter_complex", graph, "-map", "[out]", "-ar", "48000", str(stem))
        vo_i, _ = loudness(stem)
        vo_gain, bed_gain = -16.0 - vo_i, -31.0 - bed_i
        graph = (f"[0:a]volume={vo_gain:.2f}dB,asplit=2[vo][key];"
                 f"[1:a]volume={bed_gain:.2f}dB[bed];"
                 "[bed][key]sidechaincompress=threshold=0.02:ratio=6:attack=10:release=350[duck];"
                 f"[vo][duck]amix=inputs=2:normalize=0,atrim=duration={dur}[out]")
        ff("-i", str(stem), "-i", str(bed), "-filter_complex", graph, "-map", "[out]", str(pre))
        target, name = TARGET_LUFS, "what-if-you-stopped-sleeping.mp4"
    else:
        ff("-i", str(bed), "-af", f"atrim=duration={dur}", str(pre))
        target, name = -18.0, "what-if-you-stopped-sleeping_ANIMATIC-no-vo.mp4"

    pre_i, _ = loudness(pre)
    final = BUILD / "mix.wav"
    # limit at 4x oversampling so inter-sample (true) peaks are caught, not just sample peaks
    ff("-i", str(pre), "-af", f"volume={target - pre_i:.2f}dB,aresample=192000,"
       "alimiter=limit=0.8:attack=2:release=60:level=0,aresample=48000", "-ar", "48000", str(final))
    fin_i, fin_tp = loudness(final)

    OUT.mkdir(exist_ok=True)
    out = OUT / name
    ff("-i", str(BUILD / "video.mp4"), "-i", str(final), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
       "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out))
    print(f"mix: {fin_i:.1f} LUFS integrated, true peak {fin_tp:.1f} dBTP")
    print(f"output: {out}")


if __name__ == "__main__":
    main()
