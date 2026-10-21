// Shared by s1 and end: the giant bloodshot eye. A local fork of drawBigEye (same geometry
// and line work) that adds heartbeat-pulsing veins, a second crawling vein set, pupil
// size, irritation level and red lid waterlines, plus the helpers both scenes animate it
// with and the "loop seam" state that s1's frame 0 starts from and end's last frame returns
// to. Exposed as SCENES._eye (core only looks up the timeline's scene ids).
(() => {
  'use strict';

  // s1 frame 0 == end's last frame. Eye clock tau: s1 uses tau = tl, end uses tau = tl - dur,
  // so every noise-driven term (handheld, lid wobble, tremor) is continuous across the loop.
  const FRAME0 = { look: [0.04, -0.06], droop: 0.26, pupil: 0.47, veins: 0.92, extra: 0.5, red: 0.4, zoom: 1, hand: 1.3 };

  let EXTRA = null;
  function extraVeins() {
    if (!EXTRA) {
      const a = buildVeins(2718, EYE.cx, EYE.cy, EYE.w, EYE.h);
      const b = buildVeins(3141, EYE.cx, EYE.cy, EYE.w * 0.97, EYE.h * 0.94);
      EXTRA = [...a, ...b].map((v, i) => ({ pts: v.pts.map(([x, y, w]) => [x, y, w * 0.62]), order: i }));
    }
    return EXTRA;
  }

  // Twitch events (absolute time): the lower lid flutters ("lid") or the whole eye jerks.
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

  // Pupil darts: keys [[t, x, y, moveDur?], ...] (scene-local, sorted). Holds the latest
  // target and gets there fast (decelerating), like a saccade.
  function dart(keys, t) {
    let i = -1;
    for (let k = 0; k < keys.length; k++) if (keys[k][0] <= t) i = k;
    if (i < 0) return [keys[0][1], keys[0][2]];
    const a = keys[Math.max(0, i - 1)], b = keys[i];
    const u = ease.decel(remap(t, b[0], b[0] + (b[3] || 0.07)));
    return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  }
  // Micro tremor of the iris (nystagmus) and the lid's tug-of-war wobble, on the eye clock.
  const tremor = (tau, amt) => [amt * (0.03 * noise1(tau * 23, 51) + 0.012 * noise1(tau * 61, 53)), amt * 0.025 * noise1(tau * 19, 52)];
  const lidWobble = (tau) => 0.03 * noise1(tau * 3.1, 41) + 0.015 * noise1(tau * 8.3, 42);

  // Camera that zooms about the eye while keeping its centre at screen (540, EYE.cy).
  function eyeCam(tau, zoom, hand, ...extra) {
    return addCam({ cx: EYE.cx, cy: EYE.cy - (EYE.cy - H / 2) / zoom, zoom }, handheld(tau, hand), ...extra);
  }

  function almond(ctx, cx, cy, w, up, lo) {
    const L = cx - w / 2, R = cx + w / 2;
    ctx.beginPath();
    ctx.moveTo(L, cy);
    ctx.bezierCurveTo(cx - w * 0.22, cy - up / 0.75, cx + w * 0.22, cy - up / 0.75, R, cy);
    ctx.bezierCurveTo(cx + w * 0.22, cy + lo / 0.75, cx - w * 0.22, cy + lo / 0.75, L, cy);
    ctx.closePath();
  }
  function lidCurve(ctx, cx, cy, w, y) {
    ctx.moveTo(cx - w / 2, cy);
    ctx.bezierCurveTo(cx - w * 0.22, y + (y - cy) / 3, cx + w * 0.22, y + (y - cy) / 3, cx + w / 2, cy);
  }
  // Veins batched by quantised width into one path per width (keeps the frame fast).
  function strokeVeins(ctx, set, reveal, wmul) {
    const buckets = new Map();
    for (const v of set) {
      const n = Math.floor(v.pts.length * clamp(reveal * 1.6 - (v.order / set.length) * 0.6));
      for (let i = 1; i < n; i++) {
        const [x0, y0] = v.pts[i - 1], [x1, y1, wd] = v.pts[i];
        const key = Math.max(1, Math.round(wd * wmul * 2));
        let p = buckets.get(key);
        if (!p) buckets.set(key, (p = new Path2D()));
        p.moveTo(x0, y0);
        p.lineTo(x1, y1);
      }
    }
    for (const [key, p] of buckets) {
      ctx.lineWidth = key / 2;
      ctx.stroke(p);
    }
  }

  // Static layers rendered once per page: vein networks (normal and swollen) at the frame-0
  // reveal and fully grown, and the eye's red glow. Stroking ~2.5k vein segments every
  // frame cost ~25 ms; drawing these costs a few.
  const SPR_SCALE = 1.25;
  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    const pad = 30;
    const bx = EYE.cx - EYE.w / 2 - pad, by = EYE.cy - EYE.h * 0.5 - pad, bw = EYE.w + pad * 2, bh = EYE.h * 0.92 + pad * 2;
    const mk = (rect, scale, fn) => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(rect[2] * scale);
      c.height = Math.ceil(rect[3] * scale);
      const g = c.getContext('2d');
      g.scale(scale, scale);
      g.translate(-rect[0], -rect[1]);
      g.lineCap = 'round';
      fn(g);
      return c;
    };
    const rect = [bx, by, bw, bh];
    const veins = (base, extra, wmul) => (g) => {
      g.strokeStyle = 'rgba(214,22,28,0.88)';
      strokeVeins(g, VEINS, base, wmul);
      g.strokeStyle = 'rgba(205,18,24,0.8)';
      strokeVeins(g, extraVeins(), extra, wmul);
    };
    const gp = 240, grect = [bx - gp, by - gp, bw + gp * 2, bh + gp * 2];
    SPR = {
      rect, grect,
      lo: mk(rect, SPR_SCALE, veins(FRAME0.veins, FRAME0.extra, 1)),
      hi: mk(rect, SPR_SCALE, veins(1, 1, 1)),
      thickLo: mk(rect, SPR_SCALE, veins(FRAME0.veins, FRAME0.extra, 1.7)),
      thickHi: mk(rect, SPR_SCALE, veins(1, 1, 1.7)),
      glow: mk(grect, 0.5, (g) => {
        // only the shadow lands on the sprite: the shape itself is drawn far off-canvas
        g.shadowColor = 'rgba(255,43,43,1)';
        g.shadowBlur = 50; // in sprite pixels (x0.5) -> ~100 px on screen
        g.shadowOffsetX = 10000 * 0.5;
        almond(g, EYE.cx - 10000, EYE.cy, EYE.w, EYE.h * 0.5, EYE.h * 0.42);
        g.fillStyle = '#000';
        g.fill();
      }),
    };
    return SPR;
  }

  // o: t, look [x,y], droop 0..1, lower 0..1, jerk 0..1, pulse 0..1, pupil (radius / iris),
  //    extra FRAME0.extra..1 (how much of the full vein network shows), red 0..1 (irritation)
  function drawEye(ctx, o) {
    const { w, h } = EYE, cx = EYE.cx, cy = EYE.cy;
    const jerk = o.jerk || 0, pulse = o.pulse || 0, red = clamp(o.red ?? 0.35);
    const jx = jerk * 22 * noise1(o.t * 60, 1), jy = jerk * 14 * noise1(o.t * 60, 2);
    const up = h * 0.5, lo = h * 0.42, ir = h * 0.34;
    const look = o.look || [0, 0];
    const ix = cx + look[0] * w * 0.16, iy = cy + look[1] * h * 0.08 + h * 0.02;

    const spr = sprites();
    ctx.save();
    ctx.translate(jx, jy);
    // outer red glow (cached sprite), swelling with each heartbeat
    const [gx, gy, gw, gh] = spr.grect, gs = 1 + 0.06 * pulse;
    ctx.globalAlpha = clamp(0.22 + 0.25 * red + 0.4 * pulse);
    ctx.drawImage(spr.glow, cx + (gx - cx) * gs, cy + (gy - cy) * gs, gw * gs, gh * gs);
    ctx.globalAlpha = 1;
    almond(ctx, cx, cy, w, up, lo);
    ctx.fillStyle = COL.sclera;
    ctx.fill();

    ctx.save();
    almond(ctx, cx, cy, w, up, lo);
    ctx.clip();
    const g = ctx.createRadialGradient(ix, iy, ir * 0.9, cx, cy, w * 0.55);
    g.addColorStop(0, 'rgba(255,60,60,0)');
    g.addColorStop(0.55, `rgba(255,60,60,${(0.12 + 0.16 * red + 0.08 * pulse).toFixed(3)})`);
    g.addColorStop(1, `rgba(200,20,25,${(0.62 + 0.33 * red).toFixed(3)})`);
    ctx.fillStyle = g;
    almond(ctx, cx, cy, w, up, lo);
    ctx.fill();
    // veins: cached layers. The extra network fades in with `extra`; on each heartbeat a
    // thicker copy swells over them.
    const [bx, by, bw, bh] = spr.rect;
    const m = clamp(((o.extra ?? FRAME0.extra) - FRAME0.extra) / (1 - FRAME0.extra));
    ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(spr.lo, bx, by, bw, bh);
    if (m > 0.01) {
      ctx.globalAlpha = m;
      ctx.drawImage(spr.hi, bx, by, bw, bh);
    }
    if (pulse > 0.02) {
      ctx.globalAlpha = clamp(0.75 * pulse);
      ctx.drawImage(m > 0.5 ? spr.thickHi : spr.thickLo, bx, by, bw, bh);
    }
    ctx.globalAlpha = 1;
    // iris + pupil
    const ig = ctx.createRadialGradient(ix, iy, ir * 0.2, ix, iy, ir);
    ig.addColorStop(0, '#2A2A2D');
    ig.addColorStop(0.85, COL.iris);
    ig.addColorStop(1, '#050505');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(ix, iy, ir, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      ctx.moveTo(ix + Math.cos(a) * ir * 0.5, iy + Math.sin(a) * ir * 0.5);
      ctx.lineTo(ix + Math.cos(a) * ir * 0.92, iy + Math.sin(a) * ir * 0.92);
    }
    ctx.stroke();
    const pr = ir * clamp((o.pupil ?? 0.5) + 0.05 * pulse, 0.2, 0.8);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(ix, iy, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(ix - ir * 0.32, iy - ir * 0.34, ir * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ix + ir * 0.22, iy + ir * 0.26, ir * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // lids: black shapes; their edges get a raw red waterline
    const droopY = lerp(cy - up, cy + lo * 0.6, clamp(o.droop || 0));
    const lowY = lerp(cy + lo, cy - up * 0.25, clamp(o.lower || 0));
    ctx.fillStyle = COL.bg;
    ctx.beginPath();
    ctx.moveTo(cx - w, cy - h);
    ctx.lineTo(cx + w, cy - h);
    ctx.lineTo(cx + w / 2, cy);
    ctx.bezierCurveTo(cx + w * 0.22, droopY + (droopY - cy) / 3, cx - w * 0.22, droopY + (droopY - cy) / 3, cx - w / 2, cy);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - w, cy + h);
    ctx.lineTo(cx + w, cy + h);
    ctx.lineTo(cx + w / 2, cy);
    ctx.bezierCurveTo(cx + w * 0.22, lowY + (lowY - cy) / 3, cx - w * 0.22, lowY + (lowY - cy) / 3, cx - w / 2, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `rgba(214,22,28,${(0.5 + 0.3 * red).toFixed(3)})`;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.save();
    ctx.translate(0, 13);
    lidCurve(ctx, cx, cy, w, droopY);
    ctx.restore();
    ctx.stroke();
    ctx.beginPath();
    ctx.save();
    ctx.translate(0, -12);
    lidCurve(ctx, cx, cy, w, lowY);
    ctx.restore();
    ctx.stroke();
    ctx.restore();

    // line work: lid rims, crease and bags
    ctx.strokeStyle = COL.fg;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 18;
    ctx.beginPath();
    lidCurve(ctx, cx, cy, w, droopY);
    ctx.stroke();
    ctx.beginPath();
    lidCurve(ctx, cx, cy, w, lowY);
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.beginPath();
    const crease = up * (1.55 - 0.25 * clamp(o.droop || 0));
    ctx.moveTo(cx - w * 0.44, cy - up * 0.55);
    ctx.bezierCurveTo(cx - w * 0.2, cy - crease, cx + w * 0.2, cy - crease, cx + w * 0.44, cy - up * 0.55);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242,240,235,0.55)';
    ctx.lineWidth = 9;
    for (const k of [1.32, 1.62]) {
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.3, cy + lo * (k - 0.35));
      ctx.quadraticCurveTo(cx, cy + lo * k * 1.18, cx + w * 0.3, cy + lo * (k - 0.35));
      ctx.stroke();
    }
    ctx.restore();
  }

  // Faint shock rings behind the eye on each heartbeat: keeps the black around it alive.
  // Short-lived, so nothing is left over at the loop seam.
  function pulseRings(ctx, ta) {
    ctx.save();
    ctx.strokeStyle = COL.fg;
    for (const hb of TL.events.heartbeats) {
      const d = ta - hb;
      if (d < 0 || d > 0.5) continue;
      for (const [lag, k] of [[0, 1], [0.17, 0.6]]) {
        const u = (d - lag) / 0.42;
        if (u <= 0 || u >= 1) continue;
        ctx.globalAlpha = 0.11 * k * (1 - u);
        ctx.lineWidth = 10 * (1 - u) + 2;
        ctx.beginPath();
        ctx.ellipse(EYE.cx, EYE.cy, EYE.w * (0.56 + 0.32 * ease.decel(u)), EYE.h * (0.62 + 0.55 * ease.decel(u)), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  SCENES._eye = { FRAME0, twitchState, dart, tremor, lidWobble, eyeCam, drawEye, extraVeins, pulseRings };
})();
