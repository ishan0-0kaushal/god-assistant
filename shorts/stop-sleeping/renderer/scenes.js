// Scene choreography. Each scene draws from (scene-local time tl, absolute time ta) and the
// cue/event times in timeline.json, so re-timing the VO re-times every animation.
'use strict';

let TL = null, VEINS = null, GRAIN = [], BARS = {};
const EYE = { cx: 540, cy: 1010, w: 940, h: 540 };

function sceneDur(S) { return S.dur_f / TL.fps; }

function withCamera(ctx, scale, sx, sy, fn) {
  ctx.save();
  ctx.translate(W / 2 + sx, H / 2 + sy);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -H / 2);
  fn();
  ctx.restore();
}

// Twitches: the lower lid flutters ("lid") or the whole eye jerks ("jerk").
function twitchState(ta) {
  const out = { lower: 0, jerk: 0 };
  for (const tw of TL.events.twitches) {
    if (ta < tw.t || ta > tw.t + tw.dur) continue;
    const u = (ta - tw.t) / tw.dur, env = Math.sin(Math.PI * u);
    if (tw.kind === 'lid') out.lower = env * 0.32 * (0.55 + 0.45 * Math.sin(2 * Math.PI * 7.5 * (ta - tw.t)));
    else out.jerk = env;
  }
  return out;
}
function saccade(ta) {
  const seg = Math.floor(ta * 0.9), u = ease.decel(remap(ta * 0.9 - seg, 0, 0.09));
  const at = (k) => [0.55 * hash(k * 3 + 1), 0.45 * hash(k * 5 + 2)];
  const a = at(seg - 1), b = at(seg);
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
}
function eyeProps(ta, veins) {
  const tw = twitchState(ta);
  const fight = 0.5 + 0.5 * noise1(ta * 0.9, 4);
  return {
    t: ta, ...EYE, veins, look: saccade(ta), lowerTwitch: tw.lower, jerk: tw.jerk,
    droop: tw.jerk > 0 ? 0.05 : 0.12 + 0.24 * fight,
    pulse: pulseFrom(TL.events.heartbeats, ta, 6),
  };
}

function drawSystems(ctx, ta) {
  const n = 6, pw = 104, ph = 34, gap = 24;
  const x0 = W / 2 - (n * pw + (n - 1) * gap) / 2, y = 1384;
  TL.events.systems.forEach((tf, i) => {
    const x = x0 + i * (pw + gap);
    const d = ta - tf;
    const flick = d >= 0 && d < 0.14 && Math.floor(d * 30) % 2 === 0;
    const failed = d >= 0 && !flick;
    ctx.save();
    roundRect(ctx, x, y, pw, ph, ph / 2);
    if (failed) {
      ctx.fillStyle = COL.redDim;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = COL.red;
      ctx.shadowColor = 'rgba(255,43,43,0.8)';
      ctx.shadowBlur = 16;
      ctx.stroke();
    } else {
      ctx.fillStyle = flick ? '#FFFFFF' : 'rgba(242,240,235,0.88)';
      ctx.fill();
    }
    ctx.restore();
  });
}

function makeBars(S) {
  const c = S.cues, dur = sceneDur(S);
  if (S.id === 's2') {
    const row = (y, label, keys) => new DrainBar({ x: 380, y, w: 550, h: 50, label, keys, labelPos: 'left', labelSize: 48, showPct: false, segments: 8 });
    return [
      row(1218, 'FOCUS', [[0, 1], [0.2, 1], [1.5, 0.06], [dur, 0.04]]),
      row(1298, 'MEMORY', [[0, 0.96], [c.blackout1, 0.9], [c.blackout1 + 0.35, 0.64], [c.blackout2, 0.6], [c.blackout2 + 0.35, 0.42], [c.blackout3, 0.38], [Math.min(c.blackout3 + 0.2, dur), 0.3]]),
      row(1378, 'MOOD', [[0, 0.92], [dur, 0.4]]),
    ];
  }
  if (S.id === 's4') {
    return [new DrainBar({
      x: 110, y: 1215, w: 820, h: 120, label: 'BODY INTEGRITY', labelSize: 50, pctSize: 76, warn: 0.4, segments: 12,
      keys: [[0, 1], [0.25, 0.98], [c.organs, 0.82], [c.fail, 0.55], [c.no_one, 0.32], [Math.max(c.purpose - 0.5, c.no_one + 0.1), 0.1], [c.purpose, 0]],
    })];
  }
  return [];
}

const SCENES = {
  s1: { textCy: 470, draw(ctx, S, tl, ta) {
    const p = tl / sceneDur(S);
    withCamera(ctx, 1 + 0.04 * ease.std(p), 0, 0, () => drawBigEye(ctx, eyeProps(ta, lerp(0.72, 1, p)), VEINS));
    drawSystems(ctx, ta);
  } },

  s2: { textCy: 400, draw(ctx, S, tl, ta) {
    const p = tl / sceneDur(S);
    // micro-sleep choreography: eyes sink and head drops into each blackout, then it jolts awake
    let pre = 0, jolt = 0;
    for (const [a, b] of TL.events.blackouts) {
      if (ta < a) pre = Math.max(pre, remap(ta, a - 0.4, a));
      else if (ta >= b) jolt = Math.max(jolt, Math.exp(-(ta - b) * 9));
    }
    const wide = jolt > 0.25;
    withCamera(ctx, 1 + 0.03 * ease.std(p), 0, jolt * 8 * noise1(ta * 50, 5), () => {
      drawClock(ctx, 790, 820, 135, tl, 1.45);
      drawStickman(ctx, {
        t: ta, x: 400, ground: 1150, s: 0.9, lean: 0.03 * Math.sin(ta * 1.1),
        headTilt: 0.5 * ease.accel(pre) - 0.12 * jolt + 0.06 * Math.sin(ta * 0.8),
        lid: wide ? 0 : lerp(0.45, 1, pre), eyes: wide ? 'wide' : 'tired',
        arms: { l: [0.18, 0.05], r: [0.18, 0.05] },
      });
    });
    BARS[S.id].forEach((b) => b.draw(ctx, tl));
  } },

  s3: { textCy: 410, draw(ctx, S, tl, ta) {
    const dur = sceneDur(S), p = tl / dur, c = S.cues;
    const g = ctx.createRadialGradient(540, 880, 40, 540, 900, 1050);
    g.addColorStop(0, COL.roomLit);
    g.addColorStop(0.55, COL.room);
    g.addColorStop(1, '#0E0E10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const phantomT = tl - c.phantom;
    const phantomOn = phantomT > -0.05 && phantomT < 0.8 && !(phantomT > 0.5 && Math.floor(phantomT * 30) % 3 === 0);
    // the figure looks around, snaps to the phantom, and it is gone
    let turn = 0.8 * Math.sin(ta * 2.2) * (0.6 + 0.4 * noise1(ta, 8));
    if (phantomT > 0.15 && phantomT < 1.2) turn = lerp(turn, 1, clamp((phantomT - 0.15) * 6) * clamp((1.2 - phantomT) * 3));
    withCamera(ctx, 1 + 0.035 * ease.std(p), 0, 0, () => {
      drawCreepers(ctx, ta, 0.15 + 0.85 * ease.inOut(remap(tl, 0, dur * 0.92)), phantomT > -0.1 && phantomT < 0.4);
      if (phantomOn) {
        ctx.save();
        ctx.globalAlpha = clamp((phantomT + 0.05) * 8) * 0.95;
        drawStickman(ctx, { t: ta, x: 870, ground: 1190, s: 1.18, color: '#000', silhouette: true, arms: { l: [0.08, 0], r: [0.08, 0] } });
        ctx.restore();
      }
      drawStickman(ctx, {
        t: ta, x: 540, ground: 1170, s: 0.9, eyes: 'wide', tremor: 5, headTurn: turn,
        lean: -0.04 * turn, arms: { l: [0.55, 0.9], r: [0.55, 0.9] },
      });
      drawThermometer(ctx, 175, 1080, tl, lerp(0.72, 0.2, ease.inOut(remap(tl, c.temp, c.temp + 1.4))), ease.decel(remap(tl, c.temp - 0.1, c.temp + 0.25)));
    });
    drawECG(ctx, 110, 1335, 820, 150, ta, TL.events.ecg, ease.decel(remap(tl, c.heart - 0.15, c.heart + 0.3)), S.start + c.glitch);
  } },

  s4: { textCy: 400, draw(ctx, S, tl, ta) {
    const dur = sceneDur(S), p = tl / dur, c = S.cues;
    const bar = BARS[S.id][0];
    const v = bar.valueAt(tl);
    const dead = tl >= c.purpose;
    const hit = Math.max(Math.exp(-Math.max(0, tl - c.fail) * 8) * (tl >= c.fail ? 1 : 0),
                         dead ? Math.exp(-(tl - c.purpose) * 6) : 0);
    const pulse = pulseFrom(TL.events.heartbeats, ta, 7);
    withCamera(ctx, 1 + 0.04 * ease.std(p), hit * 18 * noise1(ta * 55, 1), hit * 14 * noise1(ta * 55, 2), () => {
      const kneel = ease.inOut(remap(v, 0.3, 0.0));
      drawStickman(ctx, {
        t: ta, x: 540, ground: 1080, s: 0.85, cracks: remap(v, 0.86, 0.08), kneel,
        headTilt: 0.25 * (1 - v) + kneel * 0.55, lid: 1 - v, eyes: v < 0.2 ? 'closed' : 'tired',
        tremor: (1 - v) * 6, arms: { l: [0.12 + kneel * 0.3, 0.1], r: [0.12 + kneel * 0.3, 0.1] },
      });
    });
    bar.draw(ctx, tl);
    // danger wash: red closes in as integrity drops, throbbing with the heart
    const a = (1 - v) * 0.55 + pulse * 0.18 * (1 - v);
    const rg = ctx.createRadialGradient(540, 960, 380, 540, 960, 1150);
    rg.addColorStop(0, 'rgba(255,43,43,0)');
    rg.addColorStop(1, `rgba(200,10,15,${a.toFixed(3)})`);
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    if (dead) {
      ctx.fillStyle = `rgba(255,43,43,${(0.55 * Math.exp(-(tl - c.purpose) * 10)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  } },

  end: { textCy: 470, draw(ctx, S, tl, ta) {
    // eases back to frame 1's exact framing so the loop seam is invisible
    const p = tl / sceneDur(S);
    withCamera(ctx, 1 + 0.035 * (1 - ease.inOut(p)), 0, 0, () => drawBigEye(ctx, eyeProps(ta, 1), VEINS));
  } },
};
SCENES.end.textCyFor = (beat) => (beat.at === 'question' ? 440 : 470);

function makeGrain() {
  const rnd = mulberry32(5);
  return [0, 1, 2].map(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 384;
    const g = c.getContext('2d');
    const img = g.createImageData(384, 384);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(rnd() * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  });
}

function overlays(ctx, f) {
  const vg = ctx.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.48, H * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // coarse grain that changes every other frame: visible texture without wrecking the bitrate
  const g = f >> 1, tile = GRAIN[g % 3];
  ctx.save();
  ctx.globalAlpha = 0.028;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat');
  ctx.scale(2, 2);
  ctx.translate(-((g * 97) % 384), -((g * 61) % 384));
  ctx.fillRect(0, 0, W / 2 + 384, H / 2 + 384);
  ctx.restore();
}

function renderFrame(ctx, f) {
  const ta = f / TL.fps;
  const S = TL.scenes.find((s) => f >= s.start_f && f < s.start_f + s.dur_f) || TL.scenes[TL.scenes.length - 1];
  const tl = (f - S.start_f) / TL.fps;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (TL.events.blackouts.some(([a, b]) => ta >= a && ta < b)) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);
  const scene = SCENES[S.id];
  // hard cuts land with a small scale punch (not on frame 1: no intro motion there)
  const punch = S.id === 's1' ? 0 : 1 - ease.decel(remap(tl, 0, 0.22));
  ctx.save();
  if (punch > 0) {
    ctx.translate(W / 2, H / 2);
    ctx.scale(1 + 0.05 * punch, 1 + 0.05 * punch);
    ctx.translate(-W / 2, -H / 2);
  }
  scene.draw(ctx, S, tl, ta);
  ctx.restore();
  const beats = S.text.filter((b) => b.at_s <= tl + 1e-6);
  const beat = beats[beats.length - 1];
  if (beat) {
    const cy = scene.textCyFor ? scene.textCyFor(beat) : scene.textCy;
    drawTextBeat(ctx, beat, tl - beat.at_s, { cx: W / 2, cy, maxW: 920 });
  }
  overlays(ctx, f);
}
