// Drawing primitives and reusable components. Every draw is a pure function of time,
// so any frame can be rendered on its own (lets render.cjs split frames across pages).
'use strict';

const W = 1080, H = 1920;
const COL = {
  bg: '#0B0B0C', fg: '#F2F0EB', red: '#FF2B2B', redDim: '#5A0F10',
  sclera: '#EEE8E1', iris: '#161617', grey: '#6E6E73', room: '#17171A', roomLit: '#2C2C32',
};
const FONT = { black: 'InterBlack', bold: 'InterXBold', mono: 'JBMono' };

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const remap = (x, a, b) => clamp((x - a) / (b - a));

function cubicBezier(x1, y1, x2, y2) {
  const bx = (t) => 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
  const by = (t) => 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) {
      t = (lo + hi) / 2;
      if (bx(t) < x) lo = t; else hi = t;
    }
    return by(t);
  };
}
const ease = {
  decel: cubicBezier(0.05, 0.7, 0.1, 1),
  accel: cubicBezier(0.3, 0, 0.8, 0.15),
  std: cubicBezier(0.2, 0, 0, 1),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

function hash(n) {
  n = (n << 13) ^ n;
  return 1 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824;
}
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 1013), hash(i + 1 + seed * 1013), u);
}
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixColor(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(t)))).join(',')})`;
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
// Time since the most recent event at or before t (Infinity if none).
function since(times, t) {
  let best = Infinity;
  for (const e of times) if (e <= t) best = t - e; else break;
  return best;
}
function pulseFrom(times, t, decay = 7) {
  const d = since(times, t);
  return d === Infinity ? 0 : Math.exp(-d * decay);
}

// ---------- kinetic text ----------
// "*word*" spans render in the accent colour. Words pop in with a short stagger.
function parseLine(line) {
  const out = [];
  line.split('*').forEach((seg, i) => {
    seg.split(' ').filter(Boolean).forEach((w) => out.push({ w, red: i % 2 === 1 }));
  });
  return out;
}

function drawTextBeat(ctx, beat, t, o) {
  const size0 = beat.size || 128, maxW = o.maxW || 920;
  const lines = beat.lines.map(parseLine);
  const setFont = (s) => {
    ctx.font = `${s}px ${FONT.black}`;
    ctx.letterSpacing = `${(-0.025 * s).toFixed(1)}px`;
  };
  setFont(size0);
  const space = () => ctx.measureText(' ').width;
  const widthOf = (toks) => toks.reduce((a, k) => a + ctx.measureText(k.w).width, 0) + space() * (toks.length - 1);
  const widest = Math.max(...lines.map(widthOf));
  const size = widest > maxW ? Math.floor(size0 * maxW / widest) : size0;
  setFont(size);
  const lh = size * 1.0;
  const top = o.cy - (lh * lines.length) / 2;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let k = 0;
  lines.forEach((toks, li) => {
    const lw = widthOf(toks);
    let x = o.cx - lw / 2;
    const y = top + lh * (li + 0.5);
    for (const tok of toks) {
      const ww = ctx.measureText(tok.w).width;
      const p = beat.hold_from_frame0 ? 1 : ease.decel(remap(t - k * 0.06, 0, 0.28));
      if (p > 0) {
        ctx.save();
        ctx.globalAlpha = clamp(p * 1.6);
        const s = lerp(1.22, 1, p);
        ctx.translate(x + ww / 2, y + (1 - p) * 18);
        ctx.scale(s, s);
        if (tok.red) {
          ctx.shadowColor = 'rgba(255,43,43,0.55)';
          ctx.shadowBlur = size * 0.35;
          ctx.fillStyle = COL.red;
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = size * 0.2;
          ctx.fillStyle = COL.fg;
        }
        ctx.fillText(tok.w, -ww / 2, 0);
        ctx.restore();
      }
      x += ww + space();
      k++;
    }
  });
  ctx.letterSpacing = '0px';
}

// ---------- DrainBar (reusable; scenes 2 and 4) ----------
// keys: [[t, value], ...] in scene-local seconds. Values ease between keys. A lagging
// red "damage trail" shows what was just lost; the fill shifts white -> red below `warn`.
class DrainBar {
  constructor(o) {
    Object.assign(this, {
      label: '', keys: [[0, 1]], warn: 0.35, trailLag: 0.35, segments: 10,
      labelPos: 'top', labelSize: 44, showPct: true, pctSize: 64,
    }, o);
  }
  valueAt(t) {
    const k = this.keys;
    if (t <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i][0]) {
        const p = ease.inOut(remap(t, k[i - 1][0], k[i][0]));
        return lerp(k[i - 1][1], k[i][1], p);
      }
    }
    return k[k.length - 1][1];
  }
  draw(ctx, t) {
    const { x, y, w, h } = this;
    const v = clamp(this.valueAt(t));
    const trail = clamp(Math.max(v, this.valueAt(t - this.trailLag)));
    const danger = remap(v, this.warn + 0.05, this.warn);
    const empty = v <= 0.003;
    const blink = empty ? (Math.floor(t * 6) % 2 === 0 ? 1 : 0.35) : 1;
    const lw = Math.max(5, h * 0.09);
    const pad = lw + Math.max(3, h * 0.07);

    ctx.save();
    // label + percentage
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${this.labelSize}px ${FONT.bold}`;
    ctx.letterSpacing = `${(this.labelSize * 0.12).toFixed(1)}px`;
    ctx.fillStyle = danger > 0.5 ? COL.red : COL.fg;
    if (this.labelPos === 'left') {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, x - 28, y + h / 2 + 2);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(this.label, x, y - 22);
    }
    ctx.letterSpacing = '0px';
    if (this.showPct) {
      ctx.font = `${this.pctSize}px ${FONT.mono}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = danger > 0.5 ? COL.red : COL.fg;
      ctx.globalAlpha = blink;
      ctx.fillText(`${Math.round(v * 100)}%`, x + w, y - 18);
      ctx.globalAlpha = 1;
    }

    // track
    roundRect(ctx, x, y, w, h, h * 0.22);
    ctx.lineWidth = lw;
    ctx.strokeStyle = empty ? COL.red : mixColor(COL.fg, COL.red, danger);
    ctx.globalAlpha = blink;
    if (danger > 0) {
      ctx.shadowColor = 'rgba(255,43,43,0.8)';
      ctx.shadowBlur = 30 * danger * (0.7 + 0.3 * Math.sin(t * 14));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    const ix = x + pad, iy = y + pad, iw = w - pad * 2, ih = h - pad * 2, ir = ih * 0.18;
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, ir);
    ctx.clip();
    // damage trail
    if (trail > v + 0.002) {
      ctx.fillStyle = 'rgba(255,43,43,0.45)';
      ctx.fillRect(ix + iw * v, iy, iw * (trail - v), ih);
    }
    // fill
    if (v > 0) {
      const fw = iw * v;
      ctx.fillStyle = mixColor(COL.fg, COL.red, danger);
      ctx.fillRect(ix, iy, fw, ih);
      // leading edge flicker as it drains
      const draining = this.valueAt(t - 1 / 30) - v > 0.0005;
      if (draining) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(ix + fw - Math.max(4, ih * 0.12), iy, Math.max(4, ih * 0.12), ih);
      }
      // cell gaps
      ctx.fillStyle = COL.bg;
      const gap = Math.max(3, ih * 0.09);
      for (let i = 1; i < this.segments; i++) ctx.fillRect(ix + (iw * i) / this.segments - gap / 2, iy, gap, ih);
    }
    ctx.restore();
    ctx.restore();
    return v;
  }
}

// ---------- stickman ----------
function ik(hip, foot, L1, L2, bendSign) {
  const dx = foot[0] - hip[0], dy = foot[1] - hip[1];
  const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01);
  const a = Math.atan2(dy, dx);
  const cosA = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1);
  const ang = a + bendSign * Math.acos(cosA);
  return [hip[0] + Math.cos(ang) * L1, hip[1] + Math.sin(ang) * L1];
}

// o: x, ground, s, lean, headTilt, headTurn, eyes ('tired'|'wide'|'closed'), lid (0 open..1 shut),
//    kneel (0..1), arms {l:[a1,a2], r:[a1,a2]}, tremor, cracks (0..1), t
function drawStickman(ctx, o) {
  const s = o.s || 1, t = o.t || 0;
  const tr = (o.tremor || 0) * s;
  const jx = tr * noise1(t * 30, 3), jy = tr * noise1(t * 30, 7);
  const kneel = o.kneel || 0;
  const thigh = 118 * s, shin = 118 * s, torso = 205 * s, headR = 60 * s;
  const footL = [o.x - 52 * s, o.ground], footR = [o.x + 52 * s, o.ground];
  const hipY = o.ground - (thigh + shin) * lerp(0.995, 0.5, kneel);
  const hip = [o.x + jx + kneel * 18 * s, hipY + jy];
  const lean = (o.lean || 0) + kneel * 0.32;
  const dir = (a) => [Math.sin(a), -Math.cos(a)];
  const td = dir(lean);
  const neck = [hip[0] + td[0] * torso, hip[1] + td[1] * torso];
  const shoulder = [hip[0] + td[0] * torso * 0.86, hip[1] + td[1] * torso * 0.86];
  const hd = dir(lean + (o.headTilt || 0));
  const head = [neck[0] + hd[0] * (headR + 10 * s), neck[1] + hd[1] * (headR + 10 * s)];

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = o.color || COL.fg;
  ctx.fillStyle = o.color || COL.fg;
  ctx.lineWidth = 15 * s;
  const line = (pts) => { ctx.beginPath(); ctx.moveTo(...pts[0]); pts.slice(1).forEach((p) => ctx.lineTo(...p)); ctx.stroke(); };

  // legs (kneeling folds the shins back)
  const kneeL = ik(hip, footL, thigh, shin, kneel > 0 ? -1 : 1);
  const kneeR = ik(hip, footR, thigh, shin, -1);
  line([hip, kneeL, footL]);
  line([hip, kneeR, footR]);
  line([hip, neck]);
  // arms: angles from straight down, positive swings outward
  const arms = o.arms || { l: [0.35, 0.15], r: [0.35, 0.15] };
  for (const [side, sign] of [['l', -1], ['r', 1]]) {
    const [a1, a2] = arms[side];
    const u = 100 * s, f = 96 * s;
    const e = [shoulder[0] + Math.sin(lean + sign * a1) * u, shoulder[1] + Math.cos(lean + sign * a1) * u];
    const hnd = [e[0] + Math.sin(lean + sign * (a1 + a2)) * f, e[1] + Math.cos(lean + sign * (a1 + a2)) * f];
    line([shoulder, e, hnd]);
  }
  // head
  ctx.beginPath();
  ctx.arc(head[0], head[1], headR, 0, Math.PI * 2);
  ctx.fillStyle = o.silhouette ? o.color : COL.bg;
  ctx.fill();
  ctx.stroke();
  if (o.silhouette) {
    // shadow figure: no face, just two red eyes
    ctx.fillStyle = COL.red;
    ctx.shadowColor = 'rgba(255,43,43,0.9)';
    ctx.shadowBlur = 22 * s;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(head[0] + sx * headR * 0.36, head[1] - headR * 0.05, 9 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return { head, headR, neck, hip };
  }

  // face
  ctx.save();
  ctx.translate(head[0], head[1]);
  ctx.rotate(lean + (o.headTilt || 0));
  const fx = (o.headTurn || 0) * headR * 0.38;
  const ex = headR * 0.34, ey = -headR * 0.06;
  const lid = clamp(o.lid || 0);
  for (const sx of [-1, 1]) {
    const cx = fx + sx * ex;
    // under-eye bags
    ctx.strokeStyle = COL.grey;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.arc(cx, ey + 6 * s, 13 * s, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
    ctx.strokeStyle = COL.fg;
    ctx.fillStyle = COL.fg;
    if (o.eyes === 'wide') {
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.arc(cx, ey - 4 * s, 13 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + (o.headTurn || 0) * 5 * s, ey - 4 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (lid > 0.92 || o.eyes === 'closed') {
      ctx.lineWidth = 6 * s;
      line([[cx - 11 * s, ey], [cx + 11 * s, ey]]);
    } else {
      ctx.beginPath();
      ctx.arc(cx, ey, 8.5 * s, 0, Math.PI * 2);
      ctx.fill();
      // heavy lid
      ctx.fillStyle = COL.bg;
      ctx.fillRect(cx - 12 * s, ey - 12 * s, 24 * s, 12 * s * (0.55 + lid * 0.9));
      ctx.lineWidth = 5 * s;
      const ly = ey - 9 * s + 12 * s * (0.55 + lid * 0.9) - 3 * s;
      line([[cx - 12 * s, ly], [cx + 12 * s, ly]]);
    }
  }
  ctx.strokeStyle = COL.fg;
  ctx.lineWidth = 5 * s;
  if (o.eyes === 'wide') {
    ctx.beginPath();
    ctx.ellipse(fx, headR * 0.45, 9 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    line([[fx - 15 * s, headR * 0.47], [fx + 15 * s, headR * 0.42]]);
  }
  ctx.restore();

  // cracks: red fractures spreading over the body
  const cracks = clamp(o.cracks || 0);
  if (cracks > 0) {
    const rnd = mulberry32(77);
    const segs = [[hip, neck], [hip, kneeL], [hip, kneeR], [kneeL, footL], [kneeR, footR]];
    ctx.strokeStyle = COL.red;
    ctx.shadowColor = 'rgba(255,43,43,0.9)';
    ctx.shadowBlur = 18 * s;
    ctx.lineWidth = 5 * s;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const seg = segs[i % segs.length];
      const u0 = rnd(), len = 0.12 + rnd() * 0.18, side = rnd() < 0.5 ? -1 : 1;
      const show = remap(cracks, i / n * 0.8, i / n * 0.8 + 0.2);
      if (show <= 0) continue;
      const P = (u) => [lerp(seg[0][0], seg[1][0], u), lerp(seg[0][1], seg[1][1], u)];
      const a = P(u0), b = P(clamp(u0 + len * show));
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1;
      ctx.beginPath();
      ctx.moveTo(...a);
      for (let j = 1; j <= 4; j++) {
        const u = j / 4, z = (j % 2 ? 1 : -1) * side * 11 * s;
        ctx.lineTo(lerp(a[0], b[0], u) + (nx / nl) * z, lerp(a[1], b[1], u) + (ny / nl) * z);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
  return { head, headR, neck, hip };
}

// ---------- spinning clock ----------
function drawClock(ctx, cx, cy, r, t, revPerSec) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = COL.fg;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, l = i % 3 === 0 ? 0.22 : 0.12;
    ctx.lineWidth = i % 3 === 0 ? 8 : 5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.sin(a) * r * (0.86 - l), cy - Math.cos(a) * r * (0.86 - l));
    ctx.lineTo(cx + Math.sin(a) * r * 0.86, cy - Math.cos(a) * r * 0.86);
    ctx.stroke();
  }
  const hand = (a, len, w) => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
    ctx.stroke();
  };
  const am = t * revPerSec * Math.PI * 2, ah = am / 12;
  const sweep = (revPerSec * Math.PI * 2) / 30;
  // motion smear for the fast hand
  ctx.fillStyle = 'rgba(242,240,235,0.22)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r * 0.78, am - sweep - Math.PI / 2, am - Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  hand(am, r * 0.78, 9);
  hand(ah, r * 0.5, 13);
  ctx.fillStyle = COL.red;
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- the big bloodshot eye ----------
function buildVeins(seed, cx, cy, w, h) {
  const rnd = mulberry32(seed);
  const veins = [];
  const grow = (x, y, ang, width, len, depth) => {
    const pts = [[x, y, width]];
    for (let i = 0; i < len; i++) {
      ang += (rnd() - 0.5) * 0.75;
      x += Math.cos(ang) * 16;
      y += Math.sin(ang) * 16;
      width *= 0.93;
      pts.push([x, y, width]);
      if (depth < 2 && rnd() < 0.16) grow(x, y, ang + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6), width * 0.8, Math.floor(len * 0.55), depth + 1);
    }
    veins.push({ pts, order: veins.length });
  };
  for (let i = 0; i < 34; i++) {
    // start on the almond's rim, biased toward the two corners, pointing inward
    const side = i % 2 ? 1 : -1;
    const u = Math.pow(rnd(), 0.8);
    const x = cx + side * (w / 2) * (1 - u * 0.75);
    const up = rnd() < 0.5 ? -1 : 1;
    const rim = h * 0.5 * Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / (w / 2), 2))) * 0.96;
    const y = cy + up * rim;
    const ang = Math.atan2(cy - y, cx - x) + (rnd() - 0.5) * 0.7;
    grow(x, y, ang, 5.5 + rnd() * 4.5, 8 + Math.floor(rnd() * 12), 0);
  }
  return veins;
}

function almond(ctx, cx, cy, w, h, upper, lower) {
  const L = cx - w / 2, R = cx + w / 2;
  ctx.beginPath();
  ctx.moveTo(L, cy);
  ctx.bezierCurveTo(cx - w * 0.22, cy - upper / 0.75, cx + w * 0.22, cy - upper / 0.75, R, cy);
  ctx.bezierCurveTo(cx + w * 0.22, cy + lower / 0.75, cx - w * 0.22, cy + lower / 0.75, L, cy);
  ctx.closePath();
}

// o: cx, cy, w, h, veins (0..1), droop (0..1 upper lid), lowerTwitch (0..1), look [x,y] in -1..1,
//    pulse (0..1 heartbeat), jerk (0..1)
function drawBigEye(ctx, o, veinSet) {
  const { w, h } = o;
  const cx = o.cx + (o.jerk || 0) * 16 * noise1(o.t * 60, 1);
  const cy = o.cy + (o.jerk || 0) * 10 * noise1(o.t * 60, 2);
  const up = h * 0.5, lo = h * 0.42;
  const ir = h * 0.34;
  const ix = cx + (o.look ? o.look[0] : 0) * w * 0.16;
  const iy = cy + (o.look ? o.look[1] : 0) * h * 0.08 + h * 0.02;

  ctx.save();
  // outer red glow, beats with the heart
  ctx.shadowColor = `rgba(255,43,43,${0.25 + 0.35 * (o.pulse || 0)})`;
  ctx.shadowBlur = 90;
  almond(ctx, cx, cy, w, h, up, lo);
  ctx.fillStyle = COL.sclera;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  almond(ctx, cx, cy, w, h, up, lo);
  ctx.clip();
  // irritated pink edges
  const g = ctx.createRadialGradient(ix, iy, ir * 0.9, cx, cy, w * 0.55);
  g.addColorStop(0, 'rgba(255,60,60,0)');
  g.addColorStop(0.55, 'rgba(255,60,60,0.18)');
  g.addColorStop(1, 'rgba(200,20,25,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - w, cy - h, w * 2, h * 2);
  // veins
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(214,22,28,0.92)';
  const reveal = clamp(o.veins);
  for (const v of veinSet) {
    const n = Math.floor(v.pts.length * clamp(reveal * 1.6 - (v.order / veinSet.length) * 0.6));
    for (let i = 1; i < n; i++) {
      const [x0, y0] = v.pts[i - 1], [x1, y1, wd] = v.pts[i];
      ctx.lineWidth = wd;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
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
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(ix + Math.cos(a) * ir * 0.5, iy + Math.sin(a) * ir * 0.5);
    ctx.lineTo(ix + Math.cos(a) * ir * 0.92, iy + Math.sin(a) * ir * 0.92);
    ctx.stroke();
  }
  const pr = ir * (0.5 + 0.05 * (o.pulse || 0));
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

  // upper lid (heavy, drooping) and lower lid (twitching): black shapes with a white rim
  const droopY = lerp(cy - up, cy + lo * 0.6, clamp(o.droop || 0));
  const lowY = lerp(cy + lo, cy - up * 0.25, clamp(o.lowerTwitch || 0));
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
  ctx.restore();

  // line work: lid rims, outline, crease and bags
  ctx.strokeStyle = COL.fg;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.bezierCurveTo(cx - w * 0.22, droopY + (droopY - cy) / 3, cx + w * 0.22, droopY + (droopY - cy) / 3, cx + w / 2, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.bezierCurveTo(cx - w * 0.22, lowY + (lowY - cy) / 3, cx + w * 0.22, lowY + (lowY - cy) / 3, cx + w / 2, cy);
  ctx.stroke();
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.44, cy - up * 0.55);
  ctx.bezierCurveTo(cx - w * 0.2, cy - up * 1.55, cx + w * 0.2, cy - up * 1.55, cx + w * 0.44, cy - up * 0.55);
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

// ---------- scene 3: creeping shadows ----------
function drawCreepers(ctx, t, grow, flicker) {
  const corners = [[0, 0], [W, 0], [0, H], [W, H], [0, H * 0.52], [W, H * 0.47]];
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 70;
  corners.forEach(([x, y], ci) => {
    if (flicker && hash(ci * 31 + Math.floor(t * 30)) > 0.55) return;
    const side = ci >= 4;
    const R = (side ? lerp(90, 250, grow) : lerp(220, 500, grow)) * (1 + 0.06 * Math.sin(t * 2.3 + ci));
    ctx.beginPath();
    const N = 64;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = R * (1 + 0.3 * noise1(a * 4.5 + t * 0.8, ci) + 0.14 * noise1(a * 6 - t * 1.6, ci + 9) + 0.05 * noise1(a * 17 + t * 3, ci + 3));
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.fill();
    // tapered fingers reaching toward the centre
    const toC = Math.atan2(H * 0.5 - y, W * 0.5 - x);
    for (let k = 0; k < 5; k++) {
      const a0 = toC + (k - 2) * 0.3 + 0.15 * noise1(t * 0.7 + k, ci + 20);
      const len = R * (0.45 + 0.55 * grow) * (0.75 + 0.35 * hash(ci * 7 + k));
      let px = x + Math.cos(a0) * R * 0.92, py = y + Math.sin(a0) * R * 0.92;
      const steps = 18;
      for (let j = 1; j <= steps; j++) {
        const u = j / steps;
        const a = a0 + 0.7 * noise1(u * 2.5 + t * 1.1, ci * 5 + k);
        const nx = px + Math.cos(a) * len / steps, ny = py + Math.sin(a) * len / steps;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.lineWidth = 4 + 46 * Math.pow(1 - u, 0.8);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.stroke();
        px = nx; py = ny;
      }
    }
    // red eyes open inside some of the shapes
    if (ci % 2 === 0 && grow > 0.25) {
      const open = clamp((grow - 0.25) * 4) * (hash(ci + Math.floor(t * 1.7)) > -0.6 ? 1 : 0.1);
      const ex = x + Math.cos(toC) * R * 0.55, ey = y + Math.sin(toC) * R * 0.55;
      ctx.save();
      ctx.shadowColor = 'rgba(255,43,43,0.9)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = COL.red;
      for (const dx of [-26, 26]) {
        ctx.beginPath();
        ctx.ellipse(ex + dx * 1.3, ey, 16, 12 * open + 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  });
  ctx.restore();
}

// ---------- scene 3: thermometer ----------
function drawThermometer(ctx, x, y, t, level, appear) {
  if (appear <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(lerp(0.6, 1, appear), lerp(0.6, 1, appear));
  ctx.globalAlpha = clamp(appear * 2);
  const tubeH = 300, tubeW = 46, bulbR = 44;
  ctx.lineWidth = 11;
  ctx.strokeStyle = COL.fg;
  ctx.fillStyle = COL.bg;
  roundRect(ctx, -tubeW / 2, -tubeH, tubeW, tubeH, tubeW / 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, bulbR * 0.6, bulbR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COL.fg;
  ctx.beginPath();
  ctx.arc(0, bulbR * 0.6, bulbR - 14, 0, Math.PI * 2);
  ctx.fill();
  const top = -tubeH * 0.92 * clamp(level);
  ctx.fillRect(-tubeW / 2 + 13, top, tubeW - 26, -top + 12);
  for (let i = 1; i <= 5; i++) {
    ctx.fillRect(tubeW / 2 + 10, -tubeH * (i / 6), 22, 6);
  }
  // falling chevrons
  ctx.strokeStyle = COL.red;
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,43,43,0.8)';
  ctx.shadowBlur = 16;
  for (let k = 0; k < 2; k++) {
    const p = (t * 1.4 + k * 0.5) % 1;
    const cy = lerp(-tubeH * 0.8, -tubeH * 0.25, p);
    ctx.globalAlpha = clamp(appear * 2) * Math.sin(p * Math.PI);
    ctx.beginPath();
    ctx.moveTo(-tubeW / 2 - 70, cy - 18);
    ctx.lineTo(-tubeW / 2 - 46, cy + 6);
    ctx.lineTo(-tubeW / 2 - 22, cy - 18);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- scene 3: ECG strip ----------
function ecgWave(dt, amp) {
  const g = (mu, sg, a) => a * Math.exp(-((dt - mu) ** 2) / (2 * sg * sg));
  return g(0.04, 0.018, 0.12) + g(0.105, 0.008, -0.14) + g(0.13, 0.009, 1.0 * amp) + g(0.152, 0.009, -0.32) + g(0.32, 0.04, 0.24);
}
function drawECG(ctx, x, y, w, h, tAbs, beats, appear, glitchAt) {
  if (appear <= 0) return;
  const span = 2.2;
  ctx.save();
  ctx.globalAlpha = clamp(appear * 2);
  const reveal = clamp(appear * 1.4);
  const sig = (tau) => {
    let v = 0;
    for (const b of beats) {
      const dt = tau - b.t;
      if (dt < -0.05 || dt > 0.6) continue;
      const amp = b.glitch ? 0.45 + 1.1 * (0.5 + 0.5 * hash(Math.round(b.t * 1000))) : 1;
      v += ecgWave(dt, b.glitch && hash(Math.round(b.t * 777)) > 0.3 ? -amp : amp);
    }
    if (tau >= glitchAt) v += 0.12 * hash(Math.floor(tau * 240));
    return v;
  };
  const N = Math.floor(w / 3);
  const pts = [];
  for (let i = 0; i <= N * reveal; i++) {
    const u = i / N;
    const tau = tAbs - span * (1 - u);
    let px = x + u * w;
    if (tau >= glitchAt && hash(Math.floor(tau * 20)) > 0.7) px += 14 * hash(i);
    pts.push([px, y - sig(tau) * h * 0.5, tau >= glitchAt]);
  }
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  for (let i = 1; i < pts.length; i++) {
    ctx.strokeStyle = pts[i][2] ? COL.red : COL.fg;
    ctx.shadowColor = pts[i][2] ? 'rgba(255,43,43,0.8)' : 'rgba(0,0,0,0)';
    ctx.shadowBlur = pts[i][2] ? 14 : 0;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1][0], pts[i - 1][1]);
    ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  const last = pts[pts.length - 1];
  if (last) {
    ctx.fillStyle = last[2] ? COL.red : COL.fg;
    ctx.shadowColor = last[2] ? 'rgba(255,43,43,1)' : 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(last[0], last[1], 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
