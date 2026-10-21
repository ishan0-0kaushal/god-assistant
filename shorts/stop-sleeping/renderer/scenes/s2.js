// Scene 2: NIGHT DRIVE. Micro-sleeps at the wheel. A drowsy driver nods off three times; core
// draws the black frames of each micro-sleep and he jolts awake into oncoming headlights.
// The moon is a clock spinning fast (time racing); FOCUS / MEMORY / MOOD drain in a panel.
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const fgA = (a) => `rgba(242,240,235,${clamp(a).toFixed(3)})`;
  const whA = (a) => `rgba(255,255,255,${clamp(a).toFixed(3)})`;
  const rdA = (a) => `rgba(255,43,43,${clamp(a).toFixed(3)})`;
  const bgA = (a) => `rgba(11,11,12,${clamp(a).toFixed(3)})`;
  const h01 = (n) => 0.5 + 0.5 * hash(n);
  const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const win = (t, a, b, rin, rout) => (b <= a ? 0 : sm(remap(t, a, a + rin)) * (1 - sm(remap(t, b - rout, b))));

  // ---- layout: world = the car's depth plane; the identity camera is the wide shot ----
  const HORIZON = 1114, ROAD_FAR = 1120, ROAD_MID = 1268, ROAD_NEAR = 1446;
  const LANE_Y0 = 1362, LANE_DY = 94, FAR_LANE_Y = 1196;
  const CAR_X = 515, RS = 0.75, HIP = [40, -88], HEAD_REST = [36, -292];
  const WHEEL = { c: [176, -188], rx: 11, ry: 50, rot: -0.42 };
  const OC_K = 0.76, LAMP_D = 0.75, LAMP_SP = 840, LAMP_X0 = 300;
  const V0 = 1500, V1 = 1950;           // road speed, px/s at the car plane
  const FACE = [520, 1075];             // where his face lands on screen in close-ups
  const MOON = { x: 805, y: 772, r: 106, d: 0.05 };
  const PANEL = { x: 40, y: 660, w: 606, h: 214 };

  // ---------------- timing (all from cues / VO words / blackout events) ----------------
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const e = keys[i][2] || ease.inOut;
        return lerp(keys[i - 1][1], keys[i][1], e(remap(t, keys[i - 1][0], keys[i][0])));
      }
    }
    return keys[keys.length - 1][1];
  }
  function mono(keys) {
    for (let i = 1; i < keys.length; i++) if (keys[i][0] < keys[i - 1][0] + 0.02) keys[i][0] = keys[i - 1][0] + 0.02;
    return keys;
  }
  const memo = {};
  function T(S) {
    const key = `${S.start}:${S.dur_f}`;
    if (memo[key]) return memo[key];
    const c = S.cues, dur = sceneDur(S), E = ease;
    const bl = TL.events.blackouts.map(([a, b]) => [a - S.start, b - S.start])
      .filter(([a]) => a > -0.02 && a < dur + 0.02).sort((p, q) => p[0] - q[0]);
    const fb = (n, k) => [c[n], c[n] + ((S.blackout_frames || {})[n] || k) / TL.fps];
    const b1 = bl[0] || fb('blackout1', 5), b2 = bl[1] || fb('blackout2', 4), b3 = bl[2] || fb('blackout3', 8);
    const w = (word, o, dflt) => { try { return cue(S, word, o); } catch (e) { return dflt; } };
    const B = { dur, b1, b2, b3, micro: c.micro };
    B.day = w('day', {}, b1[0] * 0.21);
    B.brain = w('brain', {}, b1[0] * 0.46);
    B.starts = w('starts', {}, b1[0] * 0.58);
    B.forcing = w('forcing', {}, b1[0] * 0.71);
    B.t24 = B.brain + 0.08;
    B.microEnd = w('micro-sleeps', { edge: 'end' }, B.micro + 0.75);
    B.slap = Math.max(b1[1] + 0.7, B.microEnd - 0.2);
    B.youre = w("you're", {}, lerp(B.micro, b2[0], 0.6));
    B.brain2 = w('brain', { nth: 1 }, b3[0] - 0.7);
    B.isnt = w("isn't", {}, b3[0] - 0.35);
    B.ocPass = b1[1] + 0.42;            // oncoming car passes behind us
    B.trPass = b2[1] + 0.24;            // the truck: near miss
    B.dips = [B.day + 0.18, B.starts + 0.12];
    B.hoursK = mono([[0, 0], [B.t24, 24], [b1[0], 27], [b1[1], 33], [B.micro, 36], [b2[0], 40], [b2[1], 45], [dur, 48]]);
    B.dangerK = mono([[0, 0.15], [B.t24, 0.35], [b1[0], 0.45], [b1[1], 0.75], [b2[1], 1]]);
    B.laneK = mono([
      [0, 0.0], [B.t24, -0.06], [B.forcing, 0.06], [b1[0] - 0.3, 0.55], [b1[0], 0.8], [b1[1], 0.97],
      [b1[1] + 0.12, 1.0], [b1[1] + 0.5, -0.24, E.std], [b1[1] + 0.85, 0.1], [b1[1] + 1.2, 0.0],
      [B.youre, 0.05], [b2[0] - 0.3, 0.85], [b2[0], 1.15], [b2[1], 1.48], [b2[1] + 0.06, 1.5],
      [b2[1] + 0.45, -0.34, E.std], [b2[1] + 0.78, 0.14], [Math.max(b2[1] + 1.0, B.isnt), 0.0], [b3[0], 0.3], [dur + 0.5, 0.45],
    ]);
    B.lidK = mono([
      [0, 0.5], [B.t24, 0.62], [B.forcing, 0.62], [b1[0] - 0.36, 0.85], [b1[0], 1], [b1[1], 0],
      [b1[1] + 0.6, 0.1], [B.slap - 0.02, 0.62], [B.slap + 0.05, 0.0, E.decel], [B.youre, 0.3],
      [b2[0] - 0.36, 0.8], [b2[0], 1], [b2[1], 0], [B.brain2, 0.05], [B.isnt, 0.55], [b3[0], 1],
    ]);
    B.zoomK = mono([
      [0, 1.0], [B.brain, 1.08, E.std], [B.forcing, 1.1],
      [b1[0] - 0.36, 1.55], [b1[0], 2.25, E.accel], [b1[1], 2.1],
      [b1[1] + 0.1, 2.0, E.decel], [b1[1] + 0.4, 0.93, E.decel],
      [B.slap - 0.06, 1.0, E.std], [B.slap + 0.06, 1.42, E.decel], [B.youre + 0.1, 1.3, E.std],
      [b2[0] - 0.36, 1.5], [b2[0], 2.3, E.accel], [b2[1], 2.15],
      [b2[1] + 0.1, 2.0, E.decel], [b2[1] + 0.36, 0.9, E.decel],
      [B.isnt - 0.05, 1.12, E.std], [b3[0], 2.7, E.accel], [dur + 0.5, 2.8],
    ]);
    B.focusK = mono([
      [0, 0], [B.brain, 0.2], [B.forcing, 0.25], [b1[0] - 0.36, 0.85], [b1[0], 1, E.accel],
      [b1[1] + 0.1, 1], [b1[1] + 0.4, 0, E.decel],
      [B.slap - 0.06, 0.1], [B.slap + 0.06, 0.75, E.decel], [B.youre + 0.1, 0.6, E.std],
      [b2[0] - 0.36, 0.85], [b2[0], 1, E.accel], [b2[1] + 0.1, 1], [b2[1] + 0.36, 0, E.decel],
      [B.isnt - 0.05, 0.3, E.std], [b3[0], 1, E.accel], [dur + 0.5, 1],
    ]);
    memo[key] = B;
    return B;
  }

  // ---------------- motion ----------------
  function speedAt(t, B) {
    let v = lerp(V0, V1, clamp(t / B.dur));
    for (const j of [B.b1[1], B.b2[1]]) {
      const d = t - j;
      if (d > 0) v *= 1 - 0.38 * Math.exp(-d * 2.6) * clamp(d * 10);
    }
    return v;
  }
  function distAt(t, B) {
    if (t <= 0) return t * V0;
    const n = Math.ceil(t * 60), h = t / n;
    let s = 0;
    for (let i = 0; i < n; i++) s += speedAt((i + 0.5) * h, B);
    return s * h;
  }
  function laneAt(t, B) {
    let l = track(B.laneK, t) + 0.035 * Math.sin(t * 2.2);
    for (const d0 of B.dips) {
      const u = (t - d0) / 0.5;
      if (u > 0 && u < 1) l -= 0.13 * Math.sin(Math.PI * Math.pow(u, 0.6)) * (1 - u);
    }
    return l;
  }
  function carState(t, B) {
    const lane = laneAt(t, B);
    const lv = (laneAt(t + 0.03, B) - laneAt(t - 0.03, B)) / 0.06;
    let brake = 0;
    for (const [j, k] of [[B.b1[1], 0.8], [B.b2[1], 1.0]]) {
      const d = t - j;
      if (d >= 0) brake = Math.max(brake, k * Math.exp(-d * 2.4) * clamp(d * 20 + 0.3));
    }
    const rumble = clamp(1 - Math.abs(lane - 1) / 0.16) + clamp((-0.2 - lane) / 0.08);
    const fr = Math.floor(t * 30);
    let y = LANE_Y0 - LANE_DY * lane + 1.6 * noise1(t * 9, 41) + rumble * 4 * hash(fr * 3 + 1);
    for (const j of [B.b1[1], B.b2[1]]) {
      const d = t - j;
      if (d >= 0 && d < 1.2) y -= 11 * Math.exp(-d * 6) * Math.abs(Math.sin(d * 18));
    }
    return {
      lane, lv, brake, rumble, y,
      k: 1 - 0.055 * lane,
      x: CAR_X - 55 * brake,
      tilt: 0.035 * brake - 0.016 * clamp(lv, -4, 4) + 0.006 * noise1(t * 3, 42) + rumble * 0.006 * hash(fr * 5 + 2),
    };
  }
  const carToWorld = (car, p) => {
    const c = Math.cos(car.tilt), s = Math.sin(car.tilt);
    return [car.x + car.k * (p[0] * c - p[1] * s), car.y + car.k * (p[0] * s + p[1] * c)];
  };

  // two-bone IK for a side-view arm facing right (angles from straight down, + forward)
  function ikArm(sh, tg, L1, L2) {
    const dx = tg[0] - sh[0], dy = tg[1] - sh[1];
    const d0 = Math.hypot(dx, dy) || 1, D = clamp(d0, Math.abs(L1 - L2) + 1, (L1 + L2) * 0.999);
    const th = Math.atan2(dx, dy);
    const a1 = th - Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
    const ex = sh[0] + Math.sin(a1) * L1, ey = sh[1] + Math.cos(a1) * L1;
    const tx = sh[0] + (dx / d0) * D, ty = sh[1] + (dy / d0) * D;
    return [a1, Math.atan2(tx - ex, ty - ey) - a1];
  }
  function wheelPt(th) {
    const lx = WHEEL.rx * Math.sin(th), ly = -WHEEL.ry * Math.cos(th);
    const c = Math.cos(WHEEL.rot), s = Math.sin(WHEEL.rot);
    return [WHEEL.c[0] + lx * c - ly * s, WHEEL.c[1] + lx * s + ly * c];
  }

  function driver(t, B, car) {
    const [b1a, b1b] = B.b1, [b2a, b2b] = B.b2;
    let nod = 0;
    for (const [a, b] of [B.b1, B.b2, B.b3]) if (t < b) nod = Math.max(nod, ease.accel(remap(t, a - 0.36, a)));
    let jolt = 0;
    for (const b of [b1b, b2b]) if (t >= b) jolt = Math.max(jolt, Math.exp(-(t - b) * 5));
    let dip = 0, caught = 0;
    for (const d0 of B.dips) {
      if (t < d0) dip = Math.max(dip, ease.accel(remap(t, d0 - 0.45, d0)));
      else caught = Math.max(caught, Math.exp(-(t - d0) * 7));
    }
    const sl = t - B.slap;
    const reach = sl < 0 ? ease.accel(remap(sl, -0.16, 0)) : 1 - ease.decel(remap(sl, 0.06, 0.32));
    const slapHit = sl >= 0 ? Math.exp(-sl * 9) : 0;
    const yawn = win(t, B.slap + 0.4, Math.min(B.slap + 1.0, b2a - 0.3), 0.2, 0.22);
    const scared1 = t >= b1b && t < B.slap - 0.25;
    const scared2 = t >= b2b && t < B.brain2;
    let lid = track(B.lidK, t);
    let torso = -0.08 + 0.02 * Math.sin(t * 2.3);
    let neck = 0.06 + 0.3 * lid + 0.62 * dip - 0.3 * caught - 0.38 * yawn + 0.05 * noise1(t * 1.7, 43);
    torso += 0.06 * dip - 0.05 * yawn;
    const tense = Math.max(win(t, b1b + 0.15, B.slap - 0.12, 0.3, 0.25), win(t, b2b + 0.3, B.isnt + 0.1, 0.3, 0.3));
    torso += 0.14 * tense;
    neck -= 0.12 * tense;
    torso = lerp(torso, 0.1, nod);
    neck = lerp(neck, 0.62, nod);
    torso -= 0.2 * jolt;
    neck -= 0.5 * jolt;
    neck -= 0.35 * slapHit;
    torso -= 0.06 * slapHit;
    if (scared2) torso += 0.025 * Math.sin((t - b2b) * 17);
    lid = Math.max(lid, nod);
    if (caught > 0.3) lid = Math.min(lid, 0.15);
    let eyes = 'tired', mouth = 'flat';
    if (nod > 0.55 || lid > 0.92) { eyes = 'closed'; mouth = nod > 0.7 ? 'o' : 'flat'; }
    else if (scared1 || scared2 || slapHit > 0.3 || caught > 0.45) eyes = 'wide';
    if (jolt > 0.3 && t < B.b3[0] - 0.4) mouth = 'open';
    else if (scared2 || (scared1 && t > b1b + 0.4)) mouth = 'grit';
    else if (slapHit > 0.2) mouth = 'o';
    if (yawn > 0.35) { mouth = 'none'; eyes = 'closed'; }

    const p = pose(Object.assign({}, POSES.sit, {
      x: HIP[0], y: HIP[1], s: RS, facing: 1, torso, neck, eyes, lid, mouth,
    }));
    const j = rigJoints(p);
    const steer = clamp(-car.lv * 0.3, -0.9, 0.9) + 0.06 * Math.sin(t * 1.3);
    const gripN = wheelPt(-0.15 + steer), gripF = wheelPt(0.25 + steer);
    const L1 = RIG.upper * RS, L2 = RIG.fore * RS;
    let tgt = gripN;
    if (reach > 0) {
      const cheek = [j.head[0] + 0.2 * j.headR, j.head[1] + 0.3 * j.headR];
      tgt = [lerp(gripN[0], cheek[0], reach), lerp(gripN[1], cheek[1], reach) - 30 * Math.sin(Math.PI * reach)];
    }
    p.armR = ikArm(j.shoulder, tgt, L1, L2);
    p.armL = ikArm(j.shoulder, [gripF[0] - 6, gripF[1] - 4], L1, L2);
    return { p, nod, jolt, dip, slapHit, yawn, scared: scared1 || scared2 };
  }

  // ---------------- camera ----------------
  function layerCam(cam, d) {
    return { cx: lerp(W / 2, cam.cx, d), cy: lerp(H / 2, cam.cy, d), zoom: 1 + (cam.zoom - 1) * d, rot: cam.rot, ox: cam.ox, oy: cam.oy };
  }
  function toScreen(cam, d, x, y) {
    const c = layerCam(cam, d);
    const px = (x - c.cx) * c.zoom, py = (y - c.cy) * c.zoom;
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    return [W / 2 + c.ox + px * cs - py * sn, H / 2 + c.oy + px * sn + py * cs];
  }
  function camera(t, ta, B, car) {
    let z = track(B.zoomK, t);
    const f = track(B.focusK, t);
    for (const d0 of B.dips) if (t > d0) z *= 1 + 0.07 * (1 - Math.exp(-(t - d0) * 22)) * Math.exp(-(t - d0) * 2.2);
    const head = carToWorld(car, HEAD_REST);
    const fx = head[0] - (FACE[0] - W / 2) / z, fy = head[1] - (FACE[1] - H / 2) / z;
    const settle = 1 - ease.decel(remap(t, 0, 0.55));
    const tr = Math.max(trauma(t, [B.b1[1]], 4), 1.35 * trauma(t, [B.b2[1]], 3), 0.55 * trauma(t, [B.slap], 9), 0.5 * trauma(t, B.dips, 7), 0.32 * car.rumble);
    const sh = shake(ta, Math.min(1.4, tr), 30);
    const cam = addCam({ cx: lerp(W / 2, fx, f), cy: lerp(H / 2, fy, f), zoom: z, rot: 0.3 * car.tilt, ox: 70 * settle }, handheld(ta, 1.4), sh);
    cam.shake = sh;
    return cam;
  }

  // ---------------- environment ----------------
  let SKY = null;
  function skylinePattern() {
    const out = [];
    let x = 0;
    for (let i = 0; i < 22; i++) {
      const w = 60 + 80 * h01(i * 3 + 1), h = 40 + 150 * Math.pow(h01(i * 5 + 2), 1.5);
      const wins = [];
      for (let yy = 18; yy < h - 14; yy += 24) for (let xx = 12; xx < w - 10; xx += 20) if (h01(i * 97 + yy * 13 + xx * 7) > 0.84) wins.push([xx, yy]);
      out.push({ x, w, h, wins });
      x += w + 6 + 30 * h01(i * 7 + 3);
    }
    return { b: out, P: x };
  }
  function drawSky(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0B0B0C');
    g.addColorStop(0.5, '#0E0E10');
    g.addColorStop(0.6, '#141417');
    g.addColorStop(1, '#0B0B0C');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  function drawStars(ctx, ta, dist) {
    ctx.fillStyle = COL.fg;
    for (let i = 0; i < 48; i++) {
      const x = ((h01(i * 11 + 3) * 1500 - dist * 0.02) % 1500 + 1500) % 1500 - 210;
      const y = 280 + h01(i * 17 + 5) * 820;
      const tw = 0.6 + 0.4 * Math.sin(ta * (2 + 3 * h01(i)) + i);
      ctx.globalAlpha = (y < 650 ? 0.12 : 0.28) * tw * (0.5 + 0.5 * h01(i * 5));
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + 2 * h01(i * 23), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function drawMoonClock(ctx, revs, rate) {
    const { x, y, r } = MOON;
    const g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 2.6);
    g.addColorStop(0, fgA(0.11));
    g.addColorStop(1, fgA(0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 2.6, y - r * 2.6, r * 5.2, r * 5.2);
    ctx.fillStyle = '#121214';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    const face = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    face.addColorStop(0, fgA(0.24));
    face.addColorStop(1, fgA(0.1));
    ctx.fillStyle = face;
    ctx.fill();
    ctx.strokeStyle = fgA(0.1);
    ctx.lineWidth = 3;
    for (const [cx, cy, cr] of [[-0.42, 0.34, 0.15], [0.45, -0.3, 0.1], [0.3, 0.5, 0.08], [-0.2, -0.55, 0.07]]) {
      ctx.beginPath();
      ctx.arc(x + cx * r, y + cy * r, cr * r, 0, TAU);
      ctx.stroke();
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = fgA(0.85);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, big = i % 3 === 0, l = big ? 0.2 : 0.1;
      ctx.lineWidth = big ? 6 : 4;
      ctx.strokeStyle = fgA(big ? 0.8 : 0.45);
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(a) * r * (0.86 - l), y - Math.cos(a) * r * (0.86 - l));
      ctx.lineTo(x + Math.sin(a) * r * 0.86, y - Math.cos(a) * r * 0.86);
      ctx.stroke();
    }
    const am = revs * TAU, ah = am / 12, sweep = Math.min(2.2, (rate * TAU) / 30 * 1.6);
    ctx.fillStyle = fgA(0.2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r * 0.8, am - sweep - Math.PI / 2, am - Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    const hand = (a, len, lw) => {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len);
      ctx.stroke();
    };
    ctx.strokeStyle = fgA(0.95);
    hand(am, r * 0.8, 6);
    hand(ah, r * 0.5, 10);
    ctx.fillStyle = COL.fg;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, TAU);
    ctx.fill();
  }
  function drawSkyline(ctx, dist) {
    const off = dist * 0.12, { b, P } = SKY;
    const o = ((off % P) + P) % P;
    ctx.lineWidth = 3;
    for (let r = -1; r <= 2; r++) {
      for (const bd of b) {
        const x = r * P + bd.x - o - 300;
        if (x > 1500 || x + bd.w < -420) continue;
        const top = HORIZON - bd.h;
        ctx.fillStyle = '#101012';
        ctx.fillRect(x, top, bd.w, bd.h);
        ctx.strokeStyle = fgA(0.12);
        ctx.strokeRect(x, top, bd.w, bd.h);
        ctx.fillStyle = fgA(0.2);
        for (const [wx, wy] of bd.wins) ctx.fillRect(x + wx, top + wy, 7, 9);
      }
    }
  }
  function drawTrees(ctx, dist) {
    const off = dist * 0.3;
    const hAt = (x) => Math.max(6, 26 + 26 * noise1((x + off) / 70, 5) + 16 * noise1((x + off) / 23, 6));
    ctx.beginPath();
    ctx.moveTo(-500, HORIZON + 4);
    for (let x = -500; x <= 1600; x += 22) ctx.lineTo(x, HORIZON - hAt(x));
    ctx.lineTo(1600, HORIZON + 4);
    ctx.closePath();
    ctx.fillStyle = '#0D0D0F';
    ctx.fill();
    ctx.strokeStyle = fgA(0.14);
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  function lampXs(dist) {
    const off = dist * LAMP_D, out = [];
    const i0 = Math.floor((off - 700 - LAMP_X0) / LAMP_SP);
    for (let i = i0; i < i0 + 5; i++) {
      const x = LAMP_X0 + i * LAMP_SP - off;
      if (x > -600 && x < 1800) out.push(x);
    }
    return out;
  }
  function lampLight(lamps, x) {
    let s = 0;
    for (const lx of lamps) s += Math.exp(-Math.pow((lx + 66 - x) / 190, 2));
    return clamp(s);
  }
  function drawLamps(ctx, lamps) {
    for (const x of lamps) {
      const hx = x + 66, hy = 905;
      const g = ctx.createLinearGradient(0, hy, 0, ROAD_NEAR + 40);
      g.addColorStop(0, whA(0.14));
      g.addColorStop(1, whA(0.015));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(hx - 18, hy + 8);
      ctx.lineTo(hx + 18, hy + 8);
      ctx.lineTo(hx + 250, ROAD_NEAR + 40);
      ctx.lineTo(hx - 250, ROAD_NEAR + 40);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = whA(0.05);
      ctx.beginPath();
      ctx.ellipse(hx, 1300, 240, 70, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = fgA(0.3);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, ROAD_FAR - 4);
      ctx.lineTo(x, hy + 30);
      ctx.quadraticCurveTo(x, hy - 6, x + 40, hy - 4);
      ctx.lineTo(hx + 22, hy - 2);
      ctx.stroke();
      const gl = ctx.createRadialGradient(hx, hy + 4, 2, hx, hy + 4, 60);
      gl.addColorStop(0, whA(0.6));
      gl.addColorStop(1, whA(0));
      ctx.fillStyle = gl;
      ctx.fillRect(hx - 60, hy - 56, 120, 120);
      ctx.fillStyle = whA(0.9);
      roundRect(ctx, hx - 20, hy - 3, 40, 10, 5);
      ctx.fill();
    }
  }
  function drawRoad(ctx, dist, v) {
    ctx.fillStyle = '#0F0F11';
    ctx.fillRect(-700, ROAD_FAR, 2500, 1400);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = fgA(0.22);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-700, ROAD_FAR);
    ctx.lineTo(1800, ROAD_FAR);
    ctx.stroke();
    ctx.strokeStyle = fgA(0.3);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-700, ROAD_NEAR);
    ctx.lineTo(1800, ROAD_NEAR);
    ctx.stroke();
    // texture streaks, faster nearer the camera
    for (let i = 0; i < 46; i++) {
      const u = h01(i * 7 + 1), y = ROAD_FAR + 14 + (ROAD_NEAR - ROAD_FAR - 28) * u;
      const dep = lerp(0.86, 1.1, u);
      const x = ((h01(i * 13 + 5) * 2600 - dist * dep) % 2600 + 2600) % 2600 - 600;
      ctx.fillStyle = fgA(0.06 + 0.04 * h01(i * 3));
      ctx.fillRect(x, y, 14 + v * dep * 0.018, 3);
    }
    // centre line dashes streaming left
    const P = 260, o = ((dist * 0.95) % P + P) % P, blur = v * 0.95 / 30 * 0.5;
    for (let x = -700 - o; x < 1800; x += P) {
      ctx.fillStyle = fgA(0.5);
      ctx.fillRect(x, ROAD_MID - 4, 120, 8);
      ctx.fillStyle = fgA(0.18);
      ctx.fillRect(x + 120, ROAD_MID - 4, blur, 8);
    }
  }
  function drawPosts(ctx, dist, v) {
    const P = 720, o = ((dist * 1.22) % P + P) % P, blur = v * 1.22 / 30 * 0.6;
    for (let x = -700 - o + 300; x < 1900; x += P) {
      ctx.fillStyle = fgA(0.1);
      ctx.fillRect(x, 1480, 16 + blur, 110);
      ctx.fillStyle = fgA(0.34);
      ctx.fillRect(x, 1480, 16, 110);
      ctx.fillStyle = whA(0.6);
      ctx.fillRect(x + 2, 1490, 12, 14);
    }
  }

  // ---------------- vehicles ----------------
  function bodySub(ctx) {
    ctx.moveTo(-366, -62);
    ctx.lineTo(-318, -62);
    ctx.arc(-248, -62, 70, Math.PI, TAU);
    ctx.lineTo(174, -62);
    ctx.arc(244, -62, 70, Math.PI, TAU);
    ctx.lineTo(362, -62);
    ctx.quadraticCurveTo(388, -64, 388, -92);
    ctx.lineTo(386, -140);
    ctx.quadraticCurveTo(382, -178, 340, -184);
    ctx.lineTo(232, -192);
    ctx.lineTo(128, -340);
    ctx.quadraticCurveTo(110, -362, 76, -364);
    ctx.lineTo(-112, -364);
    ctx.quadraticCurveTo(-150, -362, -172, -338);
    ctx.lineTo(-258, -190);
    ctx.lineTo(-342, -182);
    ctx.quadraticCurveTo(-380, -176, -382, -140);
    ctx.lineTo(-384, -96);
    ctx.quadraticCurveTo(-384, -64, -366, -62);
    ctx.closePath();
  }
  function glassSub(ctx) {
    ctx.moveTo(-240, -188);
    ctx.lineTo(-164, -326);
    ctx.quadraticCurveTo(-146, -348, -112, -349);
    ctx.lineTo(70, -349);
    ctx.quadraticCurveTo(98, -348, 114, -330);
    ctx.lineTo(212, -190);
    ctx.closePath();
  }
  function tyre(ctx, x, y, r, ang, a = 1) {
    ctx.fillStyle = '#0D0D0F';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = fgA(0.78 * a);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = fgA(0.35 * a);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.58, 0, TAU);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    [0.65, 0.28, 0.12].forEach((al, g) => {
      ctx.strokeStyle = fgA(al * a);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const q = ang - g * 0.17 + (i * TAU) / 5;
        ctx.moveTo(x + Math.cos(q) * r * 0.16, y + Math.sin(q) * r * 0.16);
        ctx.lineTo(x + Math.cos(q) * r * 0.55, y + Math.sin(q) * r * 0.55);
      }
      ctx.stroke();
    });
    ctx.fillStyle = fgA(0.7 * a);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, TAU);
    ctx.fill();
  }
  function glow(ctx, x, y, r, col) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function drawCar(ctx, car, drv, t, dist, lamps, glare) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.tilt);
    ctx.scale(car.k, car.k);
    const lx = (lampsX) => lampsX.map((x) => (x - car.x) / car.k);
    const L = lx(lamps);
    // headlight beam on the road ahead
    const bg = ctx.createLinearGradient(386, 0, 1150, 0);
    bg.addColorStop(0, whA(0.16));
    bg.addColorStop(1, whA(0));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(386, -150);
    ctx.lineTo(1150, -290);
    ctx.lineTo(1150, 30);
    ctx.lineTo(386, -126);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 410, 18, 0, 0, TAU);
    ctx.fill();
    // brake glow on the road behind
    const br = car.brake;
    glow(ctx, -400, -10, 170 + 260 * br, rdA(0.1 + 0.3 * br));

    // interior, seen through the glass
    ctx.fillStyle = bgA(0.45 + 0.4 * glare);
    ctx.beginPath();
    glassSub(ctx);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    glassSub(ctx);
    ctx.clip();
    for (const x of L) {
      const cx = x + 66;
      if (cx < -500 || cx > 500) continue;
      const g = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0);
      g.addColorStop(0, whA(0));
      g.addColorStop(0.5, whA(0.13));
      g.addColorStop(1, whA(0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - 200, -360, 400, 180);
    }
    const hl = lampLight(lamps, carToWorld(car, HEAD_REST)[0]);
    if (hl > 0.02) glow(ctx, HEAD_REST[0], HEAD_REST[1], 110, whA(0.22 * hl));
    // seat + headrest
    ctx.strokeStyle = fgA(0.26);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, -80);
    ctx.lineTo(-20, -246);
    ctx.stroke();
    ctx.save();
    ctx.translate(-32, -276);
    ctx.rotate(-0.19);
    roundRect(ctx, -17, -24, 34, 48, 12);
    ctx.fillStyle = '#141416';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // steering wheel
    ctx.save();
    ctx.translate(WHEEL.c[0], WHEEL.c[1]);
    ctx.rotate(WHEEL.rot);
    ctx.strokeStyle = fgA(0.7);
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, WHEEL.rx, WHEEL.ry, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    const jj = drawRig(ctx, drv.p);
    if (drv.yawn > 0.35) {
      const q = drv.p, r = jj.headR, a = q.torso + q.neck, k = remap(drv.yawn, 0.35, 0.8);
      ctx.save();
      ctx.translate(jj.head[0], jj.head[1]);
      ctx.rotate(a);
      ctx.fillStyle = COL.fg;
      ctx.beginPath();
      ctx.ellipse(r * 0.36, r * 0.42, r * 0.22, r * (0.12 + 0.26 * k), 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (drv.slapHit > 0.25) {
      const cx = jj.head[0] + jj.headR * 0.55, cy = jj.head[1] + jj.headR * 0.2, k = drv.slapHit;
      ctx.strokeStyle = fgA(k);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -1.1 + i * 0.55;
        ctx.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34);
        ctx.lineTo(cx + Math.cos(a) * (40 + 30 * k), cy + Math.sin(a) * (40 + 30 * k));
      }
      ctx.stroke();
    }
    ctx.restore();

    // body (with the greenhouse cut out) + B-pillar
    ctx.fillStyle = '#121215';
    ctx.beginPath();
    bodySub(ctx);
    glassSub(ctx);
    ctx.fill('evenodd');
    ctx.fillRect(-114, -350, 18, 164);
    // streetlight sweeping across the paintwork
    ctx.save();
    ctx.beginPath();
    bodySub(ctx);
    glassSub(ctx);
    ctx.clip('evenodd');
    for (const x of L) {
      const cx = x + 66;
      if (cx < -650 || cx > 650) continue;
      const g = ctx.createLinearGradient(cx - 170, 0, cx + 170, 0);
      g.addColorStop(0, whA(0));
      g.addColorStop(0.5, whA(0.1));
      g.addColorStop(1, whA(0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - 170, -370, 340, 320);
    }
    ctx.restore();
    // line work
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = fgA(0.72);
    ctx.lineWidth = 6;
    ctx.beginPath();
    bodySub(ctx);
    ctx.stroke();
    // roof catches the passing light
    for (const x of L) {
      const cx = x + 66;
      if (cx < -500 || cx > 500) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - 140, -400, 280, 220);
      ctx.clip();
      ctx.strokeStyle = whA(0.5 * Math.exp(-Math.pow(cx / 600, 2)));
      ctx.lineWidth = 6;
      ctx.beginPath();
      bodySub(ctx);
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = fgA(0.45);
    ctx.lineWidth = 4;
    ctx.beginPath();
    glassSub(ctx);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-114, -350);
    ctx.lineTo(-114, -186);
    ctx.moveTo(-96, -350);
    ctx.lineTo(-96, -70);
    ctx.moveTo(212, -190);
    ctx.quadraticCurveTo(224, -130, 196, -72);
    ctx.moveTo(-246, -186);
    ctx.lineTo(-296, -72);
    ctx.moveTo(-372, -120);
    ctx.lineTo(380, -120);
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-76, -160);
    ctx.lineTo(-44, -160);
    ctx.moveTo(-232, -160);
    ctx.lineTo(-202, -160);
    ctx.stroke();
    // side mirror
    ctx.fillStyle = '#121215';
    ctx.beginPath();
    ctx.moveTo(204, -198);
    ctx.lineTo(234, -222);
    ctx.lineTo(244, -202);
    ctx.lineTo(220, -182);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // wheels
    const wa = dist * 0.0085;
    tyre(ctx, -248, -56, 56, wa);
    tyre(ctx, 244, -56, 56, wa + 0.7);
    // lights
    glow(ctx, 384, -139, 70, whA(0.55));
    ctx.fillStyle = whA(0.95);
    roundRect(ctx, 376, -152, 12, 26, 5);
    ctx.fill();
    // tail light + brake flare + light trails streaming behind
    const tlx = -386, tly = -142;
    if (br > 0.02) {
      const len = 90 + 620 * br;
      const g = ctx.createLinearGradient(tlx, 0, tlx - len, 0);
      g.addColorStop(0, rdA(0.75 * br));
      g.addColorStop(1, rdA(0));
      ctx.fillStyle = g;
      ctx.fillRect(tlx - len, tly - 9, len, 18);
    }
    glow(ctx, tlx, tly, 60 + 120 * br, rdA(0.45 + 0.45 * br));
    ctx.fillStyle = COL.red;
    roundRect(ctx, tlx - 2, -166, 12, 48, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawOncoming(ctx, xf, k, dist) {
    ctx.save();
    ctx.translate(xf + 388 * k, FAR_LANE_Y);
    ctx.scale(-k, k);
    ctx.fillStyle = '#101012';
    ctx.beginPath();
    bodySub(ctx);
    ctx.fill();
    ctx.fillStyle = bgA(0.7);
    ctx.beginPath();
    glassSub(ctx);
    ctx.fill();
    ctx.strokeStyle = fgA(0.42);
    ctx.lineWidth = 6;
    ctx.beginPath();
    bodySub(ctx);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath();
    glassSub(ctx);
    ctx.stroke();
    tyre(ctx, -248, -56, 56, -dist * 0.01, 0.6);
    tyre(ctx, 244, -56, 56, -dist * 0.01 + 1, 0.6);
    ctx.fillStyle = whA(1);
    roundRect(ctx, 374, -154, 14, 28, 5);
    ctx.fill();
    ctx.restore();
  }
  function truckSub(ctx) {
    ctx.moveTo(0, -60);
    ctx.lineTo(0, -300);
    ctx.lineTo(30, -380);
    ctx.lineTo(220, -390);
    ctx.lineTo(220, -60);
    ctx.closePath();
    ctx.moveTo(236, -70);
    ctx.lineTo(236, -480);
    ctx.lineTo(1320, -480);
    ctx.lineTo(1320, -70);
    ctx.closePath();
  }
  function drawTruck(ctx, xf, k, v) {
    ctx.save();
    ctx.translate(xf, FAR_LANE_Y);
    ctx.scale(k, k);
    // motion smear trailing behind (to the right: it is moving left)
    for (const [dx, a] of [[90, 0.12], [45, 0.22]]) {
      ctx.strokeStyle = fgA(a);
      ctx.lineWidth = 8;
      ctx.save();
      ctx.translate(dx * v, 0);
      ctx.beginPath();
      truckSub(ctx);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#101012';
    ctx.beginPath();
    truckSub(ctx);
    ctx.fill();
    ctx.strokeStyle = fgA(0.5);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = fgA(0.18);
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 300; x < 1320; x += 70) {
      ctx.moveTo(x, -460);
      ctx.lineTo(x, -90);
    }
    ctx.moveTo(40, -360);
    ctx.lineTo(40, -250);
    ctx.lineTo(200, -250);
    ctx.stroke();
    for (const wx of [120, 1060, 1180]) tyre(ctx, wx, -50, 50, 0, 0.6);
    ctx.fillStyle = COL.red;
    ctx.fillRect(1310, -150, 12, 34);
    ctx.fillStyle = whA(1);
    roundRect(ctx, -6, -140, 16, 44, 6);
    ctx.fill();
    roundRect(ctx, -6, -196, 16, 30, 6);
    ctx.fill();
    ctx.restore();
  }

  // glare from an oncoming vehicle: strong behind our car (backlit), a wash over the top
  function glareAt(xf) {
    return clamp(1 - (xf - 1000) / 1500) * clamp((xf - 150) / 700);
  }
  function drawGlare(ctx, sx, sy, I, big) {
    if (I <= 0.01) return;
    // beam thrown ahead of the oncoming vehicle (toward -x): our car is backlit by it
    const bl = big ? 1500 : 1100, spread = big ? 420 : 260;
    const bg = ctx.createLinearGradient(sx, 0, sx - bl, 0);
    bg.addColorStop(0, whA(0.4 * I));
    bg.addColorStop(1, whA(0));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(sx, sy - 30);
    ctx.lineTo(sx - bl, sy - spread);
    ctx.lineTo(sx - bl, sy + spread * 0.8);
    ctx.lineTo(sx, sy + 30);
    ctx.closePath();
    ctx.fill();
    const r = (big ? 420 : 160) + (big ? 1250 : 420) * I;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, whA(I));
    g.addColorStop(big ? 0.18 : 0.1, whA(0.85 * I));
    g.addColorStop(big ? 0.5 : 0.35, whA((big ? 0.35 : 0.2) * I));
    g.addColorStop(1, whA(0));
    ctx.fillStyle = g;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  function drawStreak(ctx, sx, sy, I) {
    if (I <= 0.01) return;
    const len = 500 + 900 * I;
    const g = ctx.createLinearGradient(sx - len, 0, sx + len, 0);
    g.addColorStop(0, whA(0));
    g.addColorStop(0.5, whA(0.55 * I));
    g.addColorStop(1, whA(0));
    ctx.fillStyle = g;
    ctx.fillRect(sx - len, sy - 3 - 4 * I, len * 2, 6 + 8 * I);
  }

  function windStreaks(ctx, ta, amt) {
    if (amt <= 0.01) return;
    for (let i = 0; i < 16; i++) {
      const v = 2400 * (0.6 + 0.4 * h01(i * 5));
      const x = 1400 - (((ta * v + h01(i * 7) * 2600) % 2600) + 2600) % 2600;
      const y = 660 + h01(i * 3 + 1) * 820;
      const len = 160 + 260 * h01(i * 9);
      const g = ctx.createLinearGradient(x, 0, x + len, 0);
      g.addColorStop(0, fgA(0.22 * amt));
      g.addColorStop(1, fgA(0));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, len, 3);
    }
  }
  // the viewer's own eyelids closing into each micro-sleep
  function povLids(ctx, a) {
    if (a <= 0.003) return;
    const top = lerp(-100, 640, a), bot = lerp(2020, 1330, a);
    ctx.save();
    for (const [pad, al] of [[60, 0.45], [0, 1]]) {
      ctx.fillStyle = `rgba(0,0,0,${al})`;
      ctx.beginPath();
      ctx.moveTo(-20, -20);
      ctx.lineTo(W + 20, -20);
      ctx.lineTo(W + 20, top - 120 + pad);
      ctx.quadraticCurveTo(W / 2, top + 140 + pad, -20, top - 120 + pad);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-20, H + 20);
      ctx.lineTo(W + 20, H + 20);
      ctx.lineTo(W + 20, bot + 120 - pad);
      ctx.quadraticCurveTo(W / 2, bot - 140 - pad, -20, bot + 120 - pad);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = `rgba(0,0,0,${(0.3 * a).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function moonRevs(t, B) {
    return 1.15 * t + (0.55 * t * t) / B.dur + 0.4 * sm(remap(t, B.b1[0], B.b1[1])) + 0.6 * sm(remap(t, B.b2[0], B.b2[1]));
  }

  SCENES.s2 = {
    textCy: 452,
    init(S) {
      SKY = skylinePattern();
      const B = T(S), dur = B.dur, [b1a, b1b] = B.b1, [b2a, b2b] = B.b2, b3a = B.b3[0];
      const bar = (y, label, keys) => new DrainBar({
        x: 268, y, w: 346, h: 36, label, keys: mono(keys), labelPos: 'left', labelSize: 34, showPct: false, segments: 8, trailLag: 0.45,
      });
      this.bars = [
        bar(688, 'FOCUS', [[0, 1], [0.15, 1], [B.t24, 0.07], [b1a, 0.05], [b1b + 0.2, 0], [dur, 0]]),
        bar(752, 'MEMORY', [[0, 0.94], [b1b, 0.9], [b1b + 0.28, 0.62], [b2b, 0.6], [b2b + 0.28, 0.3], [b3a - 0.25, 0.28], [b3a, 0.16]]),
        bar(816, 'MOOD', Array.from({ length: 9 }, (_, i) => [(dur * i) / 8, 0.9 - (0.6 * i) / 8])),
      ];
    },
    draw(ctx, S, tl, ta) {
      const B = T(S), t = tl;
      const dist = distAt(t, B), v = speedAt(t, B);
      const car = carState(t, B);
      const drv = driver(t, B, car);
      const cam = camera(t, ta, B, car);
      const lamps = lampXs(dist);
      const [b1a, b1b] = B.b1, [b2a, b2b] = B.b2;

      // oncoming traffic
      const ocX = 540 + (B.ocPass - t) * 3600;
      const trX = 540 + (B.trPass - t) * 3300;
      const ocOn = ocX < 1500 && ocX > -900;
      const ocGlare = t >= b1b - 0.01 && ocX > -300;
      const trOn = trX < 1600 && trX > -1500;
      let gl = 0, glS = null, big = false;
      if (ocGlare) {
        // headlights blast in the instant he opens his eyes, then track the passing car
        gl = Math.max(glareAt(ocX), 0.8 * Math.exp(-(t - b1b) * 3.5));
        glS = toScreen(cam, 0.92, Math.min(ocX, 1500), FAR_LANE_Y - 140 * OC_K);
      }
      if (trOn) {
        const flood = t >= b2b ? Math.exp(-(t - b2b) * 5) : 0;
        const g2 = Math.max(glareAt(trX), flood);
        if (g2 > gl) { gl = g2; glS = toScreen(cam, 0.92, Math.max(trX, 300), FAR_LANE_Y - 140 * 0.92); big = true; }
      }
      // headlights far ahead as he drifts toward the centre line
      const pre = Math.max(remap(t, b1a - 1.0, b1a) * (t < b1b ? 1 : 0), remap(t, b2a - 1.1, b2a) * (t < b2b ? 1 : 0));

      drawSky(ctx);
      withCam(ctx, layerCam(cam, 0.02), () => drawStars(ctx, ta, dist));
      withCam(ctx, layerCam(cam, 0.12), () => drawSkyline(ctx, dist));
      withCam(ctx, layerCam(cam, 0.3), () => drawTrees(ctx, dist));
      withCam(ctx, layerCam(cam, 1), () => drawRoad(ctx, dist, v));
      withCam(ctx, layerCam(cam, LAMP_D), () => drawLamps(ctx, lamps));
      // drawn after the lamps so a lamp rising past it on a push-in slips behind the moon
      withCam(ctx, layerCam(cam, MOON.d), () => drawMoonClock(ctx, moonRevs(t, B), 1.15 + 1.1 * t / B.dur));
      withCam(ctx, layerCam(cam, 0.92), () => {
        if (ocOn) drawOncoming(ctx, ocX, OC_K, dist);
        if (trOn) drawTruck(ctx, trX, 0.92, clamp(1 - Math.abs(trX - 540) / 1600));
      });
      // an offscreen source still blasts in from the right edge
      if (glS) glS = [Math.min(glS[0], W + 30), clamp(glS[1], 760, 1400)];
      if (pre > 0) drawGlare(ctx, W + 30, clamp(toScreen(cam, 0.92, 1100, FAR_LANE_Y - 120)[1], 760, 1400), 0.35 * pre, false);
      if (glS) drawGlare(ctx, glS[0], glS[1], gl, big);
      withCam(ctx, layerCam(cam, 1), () => drawCar(ctx, car, drv, t, dist, lamps, Math.max(gl, 0.6 * pre)));
      withCam(ctx, layerCam(cam, 1.22), () => drawPosts(ctx, dist, v));

      // lens streak over everything when the headlights hit; one hard white flash on the near miss
      if (gl > 0.01) drawStreak(ctx, glS[0], glS[1], gl);
      if (t >= b2b) {
        const fl = 0.45 * Math.exp(-(t - b2b) * 15);
        if (fl > 0.01) { ctx.fillStyle = whA(fl); ctx.fillRect(0, 0, W, H); }
      }
      const excite = Math.max(trauma(t, [b1b], 2.5), trauma(t, [b2b], 2), 0.25);
      windStreaks(ctx, ta, excite);
      // whip-zoom speed lines when the camera snaps back out after each jolt
      for (const b of [b1b, b2b]) {
        const u = remap(t, b + 0.08, b + 0.4);
        if (u > 0 && u < 1) speedLines(ctx, W / 2, 1040, 0.65 * Math.sin(Math.PI * u), ta);
      }
      let lids = 0;
      for (const [a, b] of [B.b1, B.b2, B.b3]) if (t < b) lids = Math.max(lids, ease.accel(remap(t, a - 0.42, a)));
      lids = Math.max(lids, 0.32 * drv.dip);
      povLids(ctx, lids);

      // FOCUS / MEMORY / MOOD panel
      ctx.save();
      ctx.translate(0.5 * (cam.shake.ox || 0), 0.5 * (cam.shake.oy || 0));
      roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 22);
      ctx.fillStyle = bgA(0.8);
      ctx.fill();
      ctx.strokeStyle = fgA(0.12);
      ctx.lineWidth = 2;
      ctx.stroke();
      this.bars.forEach((b) => b.draw(ctx, t));
      ctx.restore();
    },
    hud(S, tl) {
      const B = T(S);
      let glitch = 0;
      for (const b of [B.b1[1], B.b2[1]]) if (tl >= b) glitch = Math.max(glitch, Math.exp(-(tl - b) * 4));
      return { hours: hoursAt(B.hoursK, tl), rate: hoursRate(B.hoursK, tl), danger: track(B.dangerK, tl), glitch };
    },
    glitch(S, tl) {
      const B = T(S);
      let g = 0;
      for (const [b, k] of [[B.b1[1], 0.45], [B.b2[1], 0.7]]) {
        const d = tl - b;
        if (d >= 0 && d < 0.14) g = Math.max(g, k * (1 - d / 0.14));
      }
      return g;
    },
  };
})();
