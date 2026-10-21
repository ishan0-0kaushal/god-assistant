// Camera, motion and HUD effects shared by every scene.
'use strict';

// ---------- VO word cues ----------
// Scene-local time of a spoken word, from the VO timestamps in timeline.json.
// cue(S, 'awake') -> word start; cue(S, 'awake', {edge: 'end', offset: 0.1, nth: 0}).
function cue(S, word, o = {}) {
  const key = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  const hits = S.words.filter((w) => w.w.toLowerCase().replace(/[^a-z0-9]/g, '') === key);
  const w = hits[o.nth || 0];
  if (!w) throw new Error(`${S.id}: word "${word}" not in VO line`);
  return (o.edge === 'end' ? w.t1 : w.t0) + (o.offset || 0);
}

// ---------- camera ----------
// cam: {cx, cy} world point shown at screen centre, zoom, rot (rad), ox/oy screen offset.
// The identity camera is {cx: 540, cy: 960, zoom: 1}.
function withCam(ctx, cam, fn) {
  ctx.save();
  ctx.translate(W / 2 + (cam.ox || 0), H / 2 + (cam.oy || 0));
  ctx.rotate(cam.rot || 0);
  ctx.scale(cam.zoom || 1, cam.zoom || 1);
  ctx.translate(-(cam.cx ?? W / 2), -(cam.cy ?? H / 2));
  fn();
  ctx.restore();
}
// Slow handheld drift: keeps every shot alive. amt 1 = subtle.
function handheld(ta, amt = 1) {
  return {
    ox: amt * (6 * noise1(ta * 0.6, 11) + 2 * noise1(ta * 2.1, 12)),
    oy: amt * (6 * noise1(ta * 0.5, 13) + 2 * noise1(ta * 1.9, 14)),
    rot: amt * 0.004 * noise1(ta * 0.45, 15),
  };
}
// Impact trauma: 1 at each hit time, decaying exponentially. hits are scene-local times.
function trauma(tl, hits, decay = 5) {
  let v = 0;
  for (const h of hits) if (tl >= h) v = Math.max(v, Math.exp(-(tl - h) * decay));
  return v;
}
// Camera shake from trauma (squared for a snappier falloff).
function shake(ta, tr, amp = 26) {
  const k = tr * tr;
  return { ox: amp * k * noise1(ta * 38, 21), oy: amp * k * noise1(ta * 41, 22), rot: 0.025 * k * noise1(ta * 33, 23) };
}
// Sum camera offsets: addCam(base, handheld(..), shake(..)).
function addCam(base, ...parts) {
  const out = Object.assign({ cx: W / 2, cy: H / 2, zoom: 1, rot: 0, ox: 0, oy: 0 }, base);
  for (const q of parts) {
    out.ox += q.ox || 0;
    out.oy += q.oy || 0;
    out.rot += q.rot || 0;
  }
  return out;
}

// ---------- overlays ----------
// Radial speed lines converging on (cx, cy); amount 0..1. Use on zooms and impacts.
function speedLines(ctx, cx, cy, amount, ta, color = COL.fg) {
  if (amount <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const n = 48, seed = Math.floor(ta * 30);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.05 * hash(i * 7 + seed);
    const r0 = 520 + 260 * (0.5 + 0.5 * hash(i * 13 + seed * 3));
    const len = (220 + 320 * (0.5 + 0.5 * hash(i * 17 + seed))) * amount;
    ctx.globalAlpha = 0.5 * amount * (0.4 + 0.6 * (0.5 + 0.5 * hash(i * 3 + seed)));
    ctx.lineWidth = 3 + 5 * (0.5 + 0.5 * hash(i * 5));
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * (r0 + len * 2.2), cy + Math.sin(a) * (r0 + len * 2.2));
    ctx.stroke();
  }
  ctx.restore();
}
function flash(ctx, alpha, color = '#FFFFFF') {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = color;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  ctx.restore();
}
// Drifting dust motes for depth. depth 0..1 scales size/speed; deterministic.
function dust(ctx, ta, n = 40, seed = 1, o = {}) {
  ctx.save();
  ctx.fillStyle = o.color || COL.fg;
  for (let i = 0; i < n; i++) {
    const d = 0.3 + 0.7 * (0.5 + 0.5 * hash(i * 31 + seed));
    const x = ((0.5 + 0.5 * hash(i * 7 + seed)) * W + ta * (o.vx ?? 12) * d + 30 * noise1(ta * 0.3 + i, seed)) % W;
    const y = ((0.5 + 0.5 * hash(i * 11 + seed)) * H - ta * (o.vy ?? 18) * d + H * 10) % H;
    ctx.globalAlpha = (o.alpha ?? 0.18) * d * (0.6 + 0.4 * Math.sin(ta * 2 + i));
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + 3 * d, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
// Horizontal slice displacement on whatever is already drawn (digital glitch).
let _glitchBuf = null;
function glitchSlices(ctx, amount, ta) {
  if (amount <= 0.01) return;
  if (!_glitchBuf) {
    _glitchBuf = document.createElement('canvas');
    _glitchBuf.width = W;
    _glitchBuf.height = H;
  }
  const g = _glitchBuf.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  g.drawImage(ctx.canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const seed = Math.floor(ta * 30);
  const n = 6 + Math.floor(10 * amount);
  for (let i = 0; i < n; i++) {
    const y = Math.floor((0.5 + 0.5 * hash(i * 13 + seed)) * H);
    const h = Math.floor(8 + 90 * (0.5 + 0.5 * hash(i * 17 + seed)) * amount);
    const dx = Math.round(120 * amount * hash(i * 19 + seed));
    ctx.drawImage(_glitchBuf, 0, y, W, h, dx, y, W, h);
    if (hash(i * 23 + seed) > 0.4) {
      ctx.globalAlpha = 0.35 * amount;
      ctx.fillStyle = COL.red;
      ctx.fillRect(dx < 0 ? W + dx : 0, y, Math.abs(dx), h);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}
// Simple line-art heart (for x-ray chests and ECG scenes).
function heartIcon(ctx, x, y, size, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.beginPath();
  ctx.moveTo(0, 35);
  ctx.bezierCurveTo(-60, -5, -50, -55, 0, -25);
  ctx.bezierCurveTo(50, -55, 60, -5, 0, 35);
  ctx.closePath();
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
  ctx.lineWidth = o.lineWidth || 9;
  ctx.strokeStyle = o.stroke || COL.red;
  if (o.glow) { ctx.shadowColor = 'rgba(255,43,43,0.9)'; ctx.shadowBlur = 30 * o.glow; }
  ctx.stroke();
  ctx.restore();
}

// ---------- HUD: hours-awake counter (the video's open loop) ----------
// hud: {hours, rate (hours per second, spins the clock), danger 0..1, glitch 0..1, alpha}
function drawHUD(ctx, hud, ta) {
  if (!hud || hud.alpha === 0) return;
  const y = 205, cx = W / 2;
  const danger = clamp(hud.danger || 0);
  const col = danger > 0.5 ? COL.red : COL.fg;
  let digits = String(Math.max(0, Math.floor(hud.hours))).padStart(3, '0');
  // glitch shakes, ghosts and dims the real number; it never shows a false one
  const gk = Math.floor(ta * 24);
  const glitching = hud.glitch > 0 && ta > 0.25 && hash(gk * 7 + 3) < hud.glitch * 0.9 - 0.15;
  if (hud.text) digits = hud.text;
  ctx.save();
  ctx.globalAlpha = hud.alpha ?? 1;
  ctx.font = `78px ${FONT.mono}`;
  const dw = ctx.measureText(digits).width;
  ctx.font = `38px ${FONT.bold}`;
  ctx.letterSpacing = '6px';
  const label = 'HRS AWAKE';
  const lw = ctx.measureText(label).width;
  const total = 64 + 18 + dw + 20 + lw;
  let x = cx - total / 2;
  // clock icon, spinning with the rate of time passing
  const r = 30, ccx = x + r, a = ta * Math.PI * 2 * (0.15 + (hud.rate || 0) * 0.08);
  ctx.strokeStyle = col;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(ccx, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ccx, y);
  ctx.lineTo(ccx + Math.sin(a) * r * 0.72, y - Math.cos(a) * r * 0.72);
  ctx.moveTo(ccx, y);
  ctx.lineTo(ccx + Math.sin(a / 12) * r * 0.45, y - Math.cos(a / 12) * r * 0.45);
  ctx.stroke();
  x += 64 + 18;
  ctx.fillStyle = col;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (danger > 0.5) { ctx.shadowColor = 'rgba(255,43,43,0.7)'; ctx.shadowBlur = 18; }
  ctx.letterSpacing = '0px';
  ctx.font = `78px ${FONT.mono}`;
  if (glitching) {
    const jx = 14 * hash(gk * 11), jy = 5 * hash(gk * 13);
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.fillStyle = COL.red;
    ctx.fillText(digits, x + jx + 9, y + 3 + jy);
    ctx.restore();
    ctx.globalAlpha *= 0.65;
    ctx.fillText(digits, x - jx * 0.5, y + 3);
    ctx.globalAlpha /= 0.65;
  } else {
    ctx.fillText(digits, x, y + 3);
  }
  ctx.shadowBlur = 0;
  x += dw + 20;
  ctx.font = `38px ${FONT.bold}`;
  ctx.letterSpacing = '6px';
  ctx.globalAlpha *= 0.85;
  ctx.fillText(label, x, y + 2);
  ctx.restore();
}

// Piecewise hours curve helper for scenes: keys [[t, hours], ...], eased between keys.
function hoursAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease.inOut(remap(t, keys[i - 1][0], keys[i][0])));
  }
  return keys[keys.length - 1][1];
}
function hoursRate(keys, t) {
  return Math.abs(hoursAt(keys, t + 1 / 60) - hoursAt(keys, t - 1 / 60)) * 30;
}

// Legacy helper: uniform zoom about the frame centre plus a screen offset.
function withCamScale(ctx, scale, sx, sy, fn) {
  withCam(ctx, { zoom: scale, ox: sx, oy: sy }, fn);
}
