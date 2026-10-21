// Scene 1, the hook.
//   0 -> "awake": a bloodshot eye fights sleep. The lid sinks and snaps open on each twitch,
//     the pupil darts and rolls up, veins pulse on heartbeats, the camera pushes in.
//   "awake": jerk, white flash, whip-zoom OUT: the eye belongs to a stickman sitting bolt
//     upright in bed at 3:47 am, gripping the blanket and rocking.
//   "His body was shutting down one system at a time": the camera pushes in and follows six
//     failures across his body (brain, eyes, heart, gut, hands, legs), one per
//     TL.events.systems time, each with an x-ray highlight, a glitch and a physical reaction.
(() => {
  'use strict';
  const EK = () => SCENES._eye;
  const SYS = [
    { name: 'BRAIN', side: -1 }, { name: 'EYES', side: 1 }, { name: 'HEART', side: 1 },
    { name: 'GUT', side: -1 }, { name: 'HANDS', side: 1 }, { name: 'LEGS', side: -1 },
  ];
  const HIP = [540, 1300], SC = 1.25, BT = 1300; // hero hip, hero scale, blanket top edge
  const Z0 = 35; // big-eye width / stickman-eye width; the jump hides inside flash + blur
  const KNEE_Y = 1450, FOOT_Y = 1650;

  // ---------- timing: everything hangs off cues and timeline events ----------
  let T = null;
  function times(S) {
    const loc = (t) => t - S.start;
    const dur = sceneDur(S);
    const tA = S.cues.awake;
    const tw = TL.events.twitches.map((x) => ({ kind: x.kind, t: loc(x.t) })).filter((x) => x.t >= 0 && x.t < dur);
    const snaps = tw.filter((x) => x.t > 0.15 && x.t < tA - 0.25).map((x) => x.t);
    if (snaps.length < 1) snaps.push(tA * 0.2);
    if (snaps.length < 2) snaps.push(tA * 0.65);
    const tHis = cue(S, 'His');
    const wz = clamp(0.9 * (tHis - tA), 0.22, 0.38);
    const twitch = [cue(S, 'body'), ...tw.filter((x) => x.t > tA + wz).map((x) => x.t)];
    // one failure per body system; the six systems are drawn in this order
    const sys = TL.events.systems.map(loc).filter((x) => x >= 0 && x < dur).slice(0, SYS.length);
    if (!sys.length) for (let i = 0; i < SYS.length; i++) sys.push(lerp(cue(S, 'shutting'), S.cues.systems_end, i / (SYS.length - 1)));
    return {
      dur, tA, snaps: snaps.slice(0, 3), tHis, wz, twitch, sys,
      w: (word, o) => cue(S, word, o),
    };
  }

  // ---------- small helpers ----------
  function mix(a, b, t) {
    const o = {};
    for (const k of Object.keys(a)) {
      const x = a[k], y = b[k] === undefined ? x : b[k];
      if (typeof x === 'number') o[k] = lerp(x, y, t);
      else if (Array.isArray(x)) o[k] = [lerp(x[0], y[0], t), lerp(x[1], y[1], t)];
      else o[k] = t < 0.5 ? x : y;
    }
    return o;
  }
  function seg(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  function layerCam(c, d, hand, shk) {
    const z = 1 + (c.z - 1) * d;
    return {
      cx: c.ax - (c.px - W / 2) / z, cy: c.ay - (c.py - H / 2) / z, zoom: z,
      rot: hand.rot * d + shk.rot, ox: hand.ox * d + shk.ox, oy: hand.oy * d + shk.oy,
    };
  }
  function toScreen(c, x, y) {
    const dx = (x - c.cx) * c.zoom, dy = (y - c.cy) * c.zoom, cr = Math.cos(c.rot), sr = Math.sin(c.rot);
    return [W / 2 + c.ox + dx * cr - dy * sr, H / 2 + c.oy + dx * sr + dy * cr];
  }
  let _buf = null;
  function buf() {
    if (!_buf) {
      _buf = document.createElement('canvas');
      _buf.width = W;
      _buf.height = H;
    }
    const b = _buf.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1;
    b.shadowBlur = 0;
    b.fillStyle = COL.bg;
    b.fillRect(0, 0, W, H);
    return b;
  }
  // Zoom blur: the frame plus enlarged ghosts of itself around (px, py) (it was bigger a moment ago).
  function zoomBlur(ctx, src, px, py, amt) {
    ctx.drawImage(src, 0, 0);
    const n = 3;
    for (let k = 1; k <= n; k++) {
      const s = 1 + k * 0.13 * amt;
      ctx.globalAlpha = 0.34 * amt * (1 - (k - 1) / n);
      ctx.setTransform(s, 0, 0, s, px * (1 - s), py * (1 - s));
      ctx.drawImage(src, 0, 0);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  // =====================================================================================
  // Part 1: the eye
  // =====================================================================================
  function eyeState(S, tl) {
    const E = EK(), F = E.FRAME0, { tA, snaps } = T;
    const ta = S.start + tl;
    const tw = E.twitchState(ta);
    const pulse = pulseFrom(TL.events.heartbeats, ta, 6);
    // lid: sinks between snaps (heavier each time), snaps open on each twitch, then is
    // forced wide open in the run-up to "awake"
    const bounds = [0, ...snaps];
    let si = 0;
    for (let i = 0; i < bounds.length; i++) if (tl >= bounds[i]) si = i;
    const sink = (i) => (i === 0 ? [F.droop, 0.5] : [0.03, i === 1 ? 0.8 : 0.6]);
    let droop;
    if (si < snaps.length) {
      const [d0, d1] = sink(si);
      droop = lerp(d0, d1, Math.pow(remap(tl, bounds[si], bounds[si + 1]), 1.5));
    } else {
      droop = 0.015 + 0.03 * (0.5 + 0.5 * noise1(tl * 9, 44));
    }
    if (si > 0) droop = lerp(sink(si - 1)[1], droop, ease.decel(remap(tl, bounds[si], bounds[si] + 0.07)));
    droop = clamp(droop + E.lidWobble(tl), 0, 0.95);

    const s1 = snaps[0], s2 = snaps[1];
    const keys = [
      [0, F.look[0], F.look[1]],
      [T.w('is'), -0.42, 0.06],
      [s1, 0.34, -0.3, 0.05],
      [T.w('longest', { offset: 0.14 }), -0.14, 0.2],
      [Math.max(s1 + 0.35, T.w('human')), 0.08, -1.25, 0.45],
      [s2, 0, 0.04, 0.05],
      [T.w('stayed'), -0.4, 0.08],
      [T.w('stayed', { edge: 'end' }), 0.38, -0.08],
      [T.w('awake'), 0.0, -0.02],
    ].sort((a, b) => a[0] - b[0]);
    const lk = E.dart(keys, tl), tr = E.tremor(tl, 1 + 1.5 * remap(tl, s2, tA));
    const pupil = tl < s2 ? lerp(F.pupil, 0.58, remap(tl, s1 + 0.2, s2)) : lerp(0.58, 0.32, ease.decel(remap(tl, s2, s2 + 0.5)));
    return {
      t: ta, look: [lk[0] + tr[0], lk[1] + tr[1]], droop, lower: tw.lower, jerk: tw.jerk, pulse,
      pupil, veins: lerp(F.veins, 1, remap(tl, 0, s2)),
      extra: lerp(F.extra, 1, ease.inOut(remap(tl, 0.25, tA))) ,
      red: lerp(F.red, 0.95, remap(tl, 0, tA)),
    };
  }
  function eyeZoom(tl) {
    const { tA, snaps } = T;
    let z = 1 + 0.075 * ease.inOut(remap(tl, 0, tA - 0.4)) + 0.13 * ease.accel(remap(tl, tA - 0.4, tA));
    for (const s of snaps) if (tl >= s) z += 0.03 * Math.exp(-(tl - s) * 9) * ease.decel(remap(tl, s, s + 0.05));
    return z;
  }
  function drawEyePhase(ctx, S, tl, ta) {
    const E = EK(), { tA, snaps } = T;
    const cam = E.eyeCam(tl, eyeZoom(tl), E.FRAME0.hand,
      shake(ta, trauma(tl, snaps, 6), 26),
      shake(ta + 5, remap(tl, tA - 0.6, tA) * 0.75, 16));
    withCam(ctx, cam, () => {
      E.pulseRings(ctx, ta);
      E.drawEye(ctx, eyeState(S, tl));
    });
  }

  // =====================================================================================
  // Part 2: the bedroom
  // =====================================================================================
  // front-view arm angles (see rig.js): fists holding the blanket up at the chest, a hand
  // clutching the heart (elbow out), a hand on the belly
  const GRIP = [1.34, -1.98], CLUTCH = [1.485, -2.585], BELLY = [0.99, -2.14];
  const STAGE0 = { torso: 0, neck: 0, look: 0, eyes: 'wide', lid: 0, mouth: 'grit', armL: GRIP, armR: GRIP, gripL: 1, gripR: 1, dy: 0, trem: 0.25 };
  const ST = [
    STAGE0,
    { neck: 0.34, torso: 0.05, look: 0.55, mouth: 'o', dy: 4, trem: 0.3 },                                                   // brain: head lolls
    { neck: 0.16, torso: 0.02, look: -0.2, eyes: 'tired', lid: 0.6, mouth: 'o', dy: 6, trem: 0.35 },                         // eyes: lids drop
    { neck: 0.08, torso: -0.06, look: 0.1, mouth: 'open', armR: CLUTCH, gripR: 0, dy: 14, trem: 0.4 },                       // heart: clutches chest
    { neck: 0.3, torso: 0.03, look: 0.3, eyes: 'tired', lid: 0.4, mouth: 'frown', armL: BELLY, armR: CLUTCH, gripL: 0, gripR: 0, dy: 30, trem: 0.45 }, // gut: hunches
    { neck: 0.18, torso: 0, look: 0, mouth: 'grit', armL: [0.6, 2.0], armR: [0.6, 2.0], gripL: 0, gripR: 0, dy: 18, trem: 1.0 }, // hands: raised, shaking
    { neck: -0.1, torso: -0.04, look: 0, mouth: 'open', armL: [1.3, 0.55], armR: [1.3, 0.55], gripL: 0, gripR: 0, dy: 4, trem: 0.85 }, // legs: spasm
  ].map((s) => Object.assign({}, STAGE0, s));
  const JOLT = { dy: [-14, -10, -18, 12, -8, -30], neck: [0.3, -0.24, 0.16, 0.22, -0.12, -0.3], torso: [0.06, -0.05, -0.08, 0.05, 0.03, -0.08] };

  function hero(tl, ta) {
    const { tA, sys } = T;
    let st = ST[0];
    sys.forEach((tf, k) => { if (tl >= tf) st = mix(st, ST[k + 1], ease.decel(remap(tl, tf, tf + 0.11))); });
    // compulsive rocking (bob into the mattress + sway), damped once the failures start
    const rock = remap(tl, tA + 0.15, tA + 0.5) * (1 - 0.6 * remap(tl, sys[0], sys[0] + 0.25));
    const ph = 2 * Math.PI * 1.5 * (tl - tA);
    let dy = st.dy + rock * 11 * (0.5 + 0.5 * Math.sin(ph));
    let torso = st.torso + rock * 0.04 * Math.sin(ph * 0.5 + 0.6);
    let neck = st.neck + rock * 0.06 * Math.sin(ph + 1.2);
    // startle on the reveal: he jolts upright, then settles
    if (tl >= tA) dy -= 30 * Math.exp(-(tl - tA) * 5);
    sys.forEach((tf, k) => {
      if (tl < tf) return;
      const j = Math.exp(-(tl - tf) * 13);
      dy += JOLT.dy[k] * j;
      neck += JOLT.neck[k] * j;
      torso += JOLT.torso[k] * j;
    });
    for (const tt of T.twitch) if (tl >= tt) { const j = Math.exp(-(tl - tt) * 18); neck += 0.2 * j; torso -= 0.05 * j; dy -= 6 * j; }
    const tr = st.trem;
    const n = (seed, f) => noise1(ta * f, seed);
    const armL = [st.armL[0] + tr * 0.08 * n(61, 37), st.armL[1] + tr * 0.16 * n(62, 43)];
    const armR = [st.armR[0] + tr * 0.08 * n(63, 39), st.armR[1] + tr * 0.16 * n(64, 41)];
    neck += tr * 0.03 * n(65, 27);
    // darting eyes (held dead centre through the whip so the stare matches the big eye)
    const settled = remap(tl, tA + T.wz, tA + T.wz + 0.1);
    const look = clamp(st.look + settled * 0.4 * hash(Math.floor(tl * 3.3) * 7 + 3), -1, 1);
    const lid = st.eyes === 'tired' ? clamp(st.lid + 0.25 * noise1(ta * 6, 66)) : 0;
    let glow = 0;
    sys.forEach((tf) => { if (tl >= tf) glow = Math.max(glow, 0.8 * Math.exp(-(tl - tf) * 7)); });
    const last = sys[sys.length - 1];
    glow = Math.max(glow, 0.5 * remap(tl, last + 0.04, last + 0.18));
    const p = pose({
      x: HIP[0], y: HIP[1] + dy, s: SC, facing: 0, torso, neck, armL, armR, legL: [0.05, 0], legR: [0.05, 0],
      eyes: st.eyes, lid, mouth: st.mouth, look, glow,
    });
    const kick = sys.length === SYS.length && tl >= last ? Math.exp(-(tl - last) * 4) * Math.abs(Math.sin((tl - last) * 26)) : 0;
    return { p, kick, tr, grip: [st.gripL, st.gripR] };
  }
  // the stickman's (viewer-left) eye in world space: the whip-zoom's anchor
  function eyeWorld(p) {
    const j = rigJoints(p), r = j.headR, a = p.torso + p.neck;
    const ex = -r * 0.34 + p.look * r * 0.3, ey = -r * 0.08 - 4 * p.s;
    return [j.head[0] + ex * Math.cos(a) - ey * Math.sin(a), j.head[1] + ex * Math.sin(a) + ey * Math.cos(a)];
  }
  function partAt(k, j, p) {
    const r = j.headR, a = p.torso + p.neck;
    const rot = (x, y) => [j.head[0] + x * Math.cos(a) - y * Math.sin(a), j.head[1] + x * Math.sin(a) + y * Math.cos(a)];
    if (k === 0) return rot(0, -r * 0.56);
    if (k === 1) return rot(p.look * r * 0.3, -r * 0.12);
    if (k === 2) return [lerp(j.hip[0], j.neck[0], 0.62) + 0.3 * r, lerp(j.hip[1], j.neck[1], 0.62)];
    if (k === 3) return [lerp(j.hip[0], j.neck[0], 0.4) - 0.05 * r, lerp(j.hip[1], j.neck[1], 0.4)];
    if (k === 4) return j.handR;
    return [j.hip[0], KNEE_Y];
  }

  // ---------- camera ----------
  const WIDE = { ax: 540, ay: 1040, px: 540, py: 1040, z: 1 };
  const PUSH = { ax: 540, ay: 1100, px: 540, py: 1040, z: 1.18 };
  const FOLLOW = [
    { ax: 540, ay: 960, px: 540, py: 930, z: 1.45 },   // brain
    { ax: 535, ay: 955, px: 540, py: 950, z: 1.65 },   // eyes
    { ax: 560, ay: 1110, px: 540, py: 1020, z: 1.45 }, // heart
    { ax: 540, ay: 1200, px: 540, py: 1080, z: 1.35 }, // gut
    { ax: 540, ay: 1130, px: 540, py: 1030, z: 1.25 }, // hands
    { ax: 540, ay: 1330, px: 540, py: 1085, z: 0.95 }, // legs
  ];
  function camAt(tl) {
    let c = WIDE;
    c = mix(c, PUSH, ease.inOut(remap(tl, T.tHis, T.sys[0])));
    T.sys.forEach((tf, k) => { c = mix(c, FOLLOW[k], ease.decel(remap(tl, tf, tf + 0.2))); });
    // exit: start the move the core's whip continues (content heading left)
    const ex = ease.accel(remap(tl, T.dur - 0.22, T.dur));
    return Object.assign({}, c, { px: c.px - 140 * ex, z: c.z * (1 + 0.06 * ex) });
  }
  function camShake(tl, ta) {
    return addCam({}, shake(ta, trauma(tl, [T.tA], 4.5), 44), shake(ta + 3.1, trauma(tl, T.sys, 8), 26), shake(ta + 7.3, trauma(tl, T.twitch, 12) * 0.6, 16));
  }
  // power-down: the whole room browns out for two frames on each failure
  function envAt(tl) {
    let e = 1;
    for (const tf of T.sys) if (tl >= tf && tl < tf + 0.07) e = 0.3;
    return e;
  }

  // ---------- environment ----------
  const LQ = [[290, 718], [742, 678], [680, 1330], [196, 1360]]; // blinds light patch
  function lightPatch(ctx, ta, a) {
    ctx.save();
    ctx.beginPath();
    LQ.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = COL.fg;
    ctx.globalAlpha = a * 0.25;
    ctx.fillRect(150, 650, 650, 720);
    ctx.globalAlpha = a;
    const drift = 5 * Math.sin(ta * 0.5);
    for (let y0 = 690 + drift; y0 < 1400; y0 += 46) {
      ctx.beginPath();
      ctx.moveTo(180, y0 + 0.095 * 0);
      ctx.lineTo(780, y0 - 0.095 * 600);
      ctx.lineTo(780, y0 - 0.095 * 600 + 21);
      ctx.lineTo(180, y0 + 21);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  function drawFar(ctx, tl, ta, env) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COL.fg;
    const L = 50, R = 1030, TOP = 585, FL = 1345, VP = [540, 1030];
    // room box in one-point perspective
    ctx.globalAlpha = 0.12 * env;
    ctx.lineWidth = 5;
    ctx.strokeRect(L, TOP, R - L, FL - TOP);
    for (const [x, y] of [[L, TOP], [R, TOP], [L, FL], [R, FL]]) seg(ctx, [[x, y], [x + (x - VP[0]) * 3, y + (y - VP[1]) * 3]]);
    ctx.globalAlpha = 0.06 * env;
    ctx.lineWidth = 4;
    for (let i = -7; i <= 7; i++) {
      const x = 540 + i * 70;
      seg(ctx, [[x, FL], [x + (x - VP[0]) * 4, FL + (FL - VP[1]) * 4]]);
    }
    // light from the blinds on the back wall, and dust drifting in it
    lightPatch(ctx, ta, 0.05 * env);
    ctx.save();
    ctx.beginPath();
    LQ.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.clip();
    dust(ctx, ta, 34, 9, { alpha: 0.2 * env, vx: -7, vy: 9 });
    ctx.restore();
    // window with blinds
    const wx = 700, wy = 680, ww = 250, wh = 270;
    ctx.globalAlpha = 0.08 * env;
    ctx.fillStyle = COL.fg;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.globalAlpha = 0.3 * env;
    ctx.lineWidth = 6;
    for (let y = wy + 14; y < wy + wh * 0.76; y += 19) seg(ctx, [[wx + 8, y], [wx + ww - 8, y + 3]]);
    ctx.globalAlpha = 0.18 * env;
    seg(ctx, [[wx + ww / 2, wy + wh * 0.78], [wx + ww / 2, wy + wh]]);
    seg(ctx, [[wx + ww - 30, wy + 10], [wx + ww - 30, wy + wh * 0.92]]);
    ctx.globalAlpha = 0.38 * env;
    ctx.lineWidth = 8;
    ctx.strokeRect(wx, wy, ww, wh);
    seg(ctx, [[wx - 16, wy + wh + 10], [wx + ww + 16, wy + wh + 10]]);
    // nightstand + alarm clock (3:47, red, flickering)
    const nx = 88, ny = 1205, nw = 196, nh = 140;
    ctx.globalAlpha = 0.3 * env;
    ctx.lineWidth = 6;
    ctx.fillStyle = COL.bg;
    ctx.fillRect(nx, ny, nw, nh);
    ctx.strokeRect(nx, ny, nw, nh);
    seg(ctx, [[nx + 14, ny + 58], [nx + nw - 14, ny + 58]]);
    ctx.beginPath();
    ctx.arc(nx + nw / 2, ny + 30, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    drawClock347(ctx, tl, ta, env);
  }
  function drawClock347(ctx, tl, ta, env) {
    const x = 108, y = 1124, w = 154, h = 78;
    const f = Math.floor(ta * 30);
    let on = 1;
    if (hash(f * 13 + 5) > 0.9) on = 0.35;                 // brown-out flicker
    for (const tf of T.sys) if (tl >= tf && tl < tf + 0.1) on = 0.08; // dies with each failure
    if (env < 1) on = Math.min(on, 0.15);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 6;
    ctx.strokeStyle = COL.fg;
    ctx.fillStyle = COL.bg;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    // red spill on the nightstand
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 10, x + w / 2, y + h / 2, 150);
    g.addColorStop(0, `rgba(255,43,43,${(0.16 * on).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,43,43,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(x - 120, y - 110, w + 240, h + 230);
    ctx.font = `50px ${FONT.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COL.red;
    ctx.shadowColor = 'rgba(255,43,43,0.9)';
    ctx.shadowBlur = 16 * on;
    ctx.globalAlpha = on;
    const colon = Math.floor(ta * 2) % 2 === 0 ? ':' : ' ';
    ctx.fillText(`3${colon}47`, x + w / 2, y + h / 2 + 3);
    ctx.restore();
  }
  function drawBedBack(ctx, env) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COL.fg;
    ctx.fillStyle = COL.bg;
    // headboard with posts
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(300, 1345);
    ctx.lineTo(300, 1130);
    ctx.quadraticCurveTo(540, 1062, 780, 1130);
    ctx.lineTo(780, 1345);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.32 * env;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.lineWidth = 12;
    for (const x of [300, 780]) {
      seg(ctx, [[x, 1345], [x, 1088]]);
      ctx.beginPath();
      ctx.arc(x, 1070, 17, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.16 * env;
    seg(ctx, [[330, 1152], [750, 1152]]);
    // mattress (runs toward the camera, off the bottom of the frame)
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(285, 1262);
    ctx.lineTo(795, 1262);
    ctx.lineTo(1040, 1990);
    ctx.lineTo(40, 1990);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.3 * env;
    ctx.lineWidth = 6;
    ctx.stroke();
    // pillow behind his back
    ctx.globalAlpha = 1;
    roundRect(ctx, 350, 1172, 380, 96, 44);
    ctx.fill();
    ctx.globalAlpha = 0.3 * env;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }
  function drawBlanket(ctx, j, hd, env) {
    const hands = [j.handL, j.handR], grip = hd.grip, kick = hd.kick;
    // the top edge is pulled up into a tent by each gripping fist
    const top = (x) => {
      let y = BT + 5 * Math.sin(x * 0.031);
      hands.forEach((h, i) => {
        const lift = Math.max(0, y - (h[1] + 8));
        y -= grip[i] * lift * Math.exp(-(((x - h[0]) / 58) ** 2));
      });
      return y;
    };
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(262, top(262) + 8);
    for (let x = 274; x <= 806; x += 8) ctx.lineTo(x, top(x));
    ctx.lineTo(818, top(806) + 8);
    ctx.lineTo(1060, 1990);
    ctx.lineTo(20, 1990);
    ctx.closePath();
    ctx.fillStyle = COL.room;
    ctx.fill();
    ctx.strokeStyle = COL.fg;
    ctx.globalAlpha = 0.55 * env;
    ctx.lineWidth = 7;
    ctx.stroke();
    // turned-down hem
    ctx.globalAlpha = 0.24 * env;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 280; x <= 800; x += 10) {
      const y = top(x) + 40 + 4 * Math.sin(x * 0.05);
      if (x === 280) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // legs under the blanket: two long ridges with knees; they kick on the leg spasm
    ctx.globalAlpha = 0.22 * env;
    ctx.lineWidth = 6;
    const kk = 50 * kick;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(540 + sd * 34, BT + 70);
      ctx.bezierCurveTo(540 + sd * 74, KNEE_Y - 46 - kk, 540 + sd * 98, KNEE_Y - 34 - kk, 540 + sd * 112, KNEE_Y + 30);
      ctx.quadraticCurveTo(540 + sd * 148, FOOT_Y - 20, 540 + sd * 160, FOOT_Y + 140);
      ctx.stroke();
    }
    // folds dragged up toward the fists
    ctx.lineWidth = 5;
    hands.forEach((h, i) => {
      if (grip[i] < 0.05) return;
      const sd = h[0] < 540 ? -1 : 1;
      for (const [dx, len] of [[-34, 150], [6, 210], [40, 140]]) {
        ctx.globalAlpha = 0.28 * env * grip[i];
        ctx.beginPath();
        ctx.moveTo(h[0] + dx * 0.25, h[1] + 20);
        ctx.quadraticCurveTo(h[0] + dx * 0.9 + sd * 12, h[1] + len * 0.5, h[0] + dx * 1.6 + sd * 34, h[1] + len);
        ctx.stroke();
      }
    });
    // fists on top of the blanket
    ctx.globalAlpha = 1;
    ctx.fillStyle = COL.fg;
    hands.forEach((h, i) => {
      if (grip[i] < 0.5) return;
      ctx.beginPath();
      ctx.arc(h[0], h[1] + 2, 14 * SC, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
  // keeps the far layer from cluttering the text band when the camera pushes in
  function dimTextBand(ctx) {
    const g = ctx.createLinearGradient(0, 250, 0, 760);
    g.addColorStop(0, 'rgba(11,11,12,0.94)');
    g.addColorStop(0.62, 'rgba(11,11,12,0.86)');
    g.addColorStop(1, 'rgba(11,11,12,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 740);
  }
  function drawNear(ctx, env) {
    // foot-of-bed posts, close to the lens
    ctx.save();
    ctx.strokeStyle = COL.fg;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.28 * env;
    ctx.lineWidth = 26;
    for (const x of [120, 960]) {
      seg(ctx, [[x, 1600], [x, 2100]]);
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(x, 1568, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 26;
    }
    ctx.restore();
  }

  // ---------- failures: x-ray highlights on the body ----------
  function brainIcon(ctx, x, y, sz, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.scale(sz / 60, sz / 60);
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const th = (i / 72) * Math.PI * 2, rr = 1 + 0.07 * Math.cos(9 * th);
      const px = 30 * Math.cos(th) * rr, py = 18 * Math.sin(th) * rr * (Math.sin(th) > 0 ? 0.85 : 1);
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(-6, -8, 6, 2, 0, 14);
    ctx.moveTo(-19, -7);
    ctx.quadraticCurveTo(-10, -1, -17, 7);
    ctx.moveTo(19, -7);
    ctx.quadraticCurveTo(10, -1, 17, 7);
    ctx.stroke();
    ctx.restore();
  }
  function gutIcon(ctx, x, y, sz) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sz / 60, sz / 60);
    ctx.beginPath();
    ctx.moveTo(-8, -30);
    ctx.bezierCurveTo(-6, -16, 22, -24, 27, -2);
    ctx.bezierCurveTo(31, 22, 2, 31, -16, 22);
    ctx.bezierCurveTo(-30, 14, -24, 2, -13, 6);
    ctx.bezierCurveTo(-3, 9, -15, -12, -18, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function drawFailures(ctx, tl, ta, j, p) {
    const r = j.headR, a = p.torso + p.neck, f = Math.floor(ta * 30);
    const rot = (x, y) => [j.head[0] + x * Math.cos(a) - y * Math.sin(a), j.head[1] + x * Math.sin(a) + y * Math.cos(a)];
    T.sys.forEach((tf, k) => {
      const d = tl - tf;
      if (d < 0) return;
      const hit = Math.exp(-d * 6);
      const flick = d > 0.15 && hash(f * 3 + k * 17) > 0.88 ? 0.35 : 1;
      const lvl = (0.6 + 0.4 * hit) * flick;
      const jx = d < 0.1 ? 9 * hash(f * 5 + k) : 0, jy = d < 0.1 ? 5 * hash(f * 7 + k) : 0;
      const [ax, ay] = partAt(k, j, p);
      ctx.save();
      ctx.translate(jx, jy);
      // x-ray bloom + shockwave at the failing part
      const spots = k === 4 ? [j.handL, j.handR] : [[ax, ay]];
      const br = (k === 5 ? 80 : k === 4 ? 70 : 115) * SC;
      for (const [bx, by] of spots) {
        if (hit > 0.05) {
          const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
          g.addColorStop(0, `rgba(255,43,43,${(0.42 * hit).toFixed(3)})`);
          g.addColorStop(1, 'rgba(255,43,43,0)');
          ctx.fillStyle = g;
          ctx.fillRect(bx - br, by - br, br * 2, br * 2);
        }
        if (d < 0.35) {
          ctx.globalAlpha = 1 - d / 0.35;
          ctx.strokeStyle = COL.red;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(bx, by, 24 + (k === 4 ? 90 : 150) * ease.decel(d / 0.35), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      ctx.globalAlpha = lvl;
      ctx.strokeStyle = COL.red;
      ctx.fillStyle = COL.bg;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255,43,43,0.9)';
      ctx.shadowBlur = hit > 0.15 ? 30 * hit : 0;
      ctx.lineWidth = 6;
      if (k === 0) {
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(j.head[0], j.head[1], r, 0, Math.PI * 2);
        ctx.globalAlpha = lvl * (0.35 + 0.65 * hit);
        ctx.stroke();
        ctx.globalAlpha = lvl;
        ctx.lineWidth = 5;
        brainIcon(ctx, ax, ay, r * 0.8, a);
      } else if (k === 1) {
        ctx.lineWidth = 7;
        for (const sx of [-1, 1]) {
          const [ex, ey] = rot(sx * r * 0.34 + p.look * r * 0.3, -r * 0.08 - 2 * SC);
          ctx.beginPath();
          ctx.arc(ex, ey, 21 * SC, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,43,43,${(0.22 + 0.3 * hit).toFixed(3)})`;
          ctx.fill();
          ctx.stroke();
        }
      } else if (k === 2) {
        const beat = Math.pow(Math.max(0, Math.sin(ta * 21 + 2.2 * Math.sin(ta * 6.3))), 6);
        heartIcon(ctx, ax, ay, 50 * SC * (1 + 0.22 * beat + 0.3 * hit), { fill: COL.bg, stroke: COL.red, lineWidth: 10, glow: hit > 0.15 ? hit : 0 });
      } else if (k === 3) {
        ctx.lineWidth = 5;
        gutIcon(ctx, ax, ay, 56 * SC * (1 + 0.2 * hit));
      } else if (k === 4) {
        for (const h of [j.handL, j.handR]) {
          ctx.beginPath();
          ctx.arc(h[0], h[1], 22 * SC, 0, Math.PI * 2);
          ctx.stroke();
          // tremor marks
          ctx.lineWidth = 4;
          for (const sd of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(h[0], h[1], 34 * SC, (sd > 0 ? -0.5 : Math.PI - 0.5), (sd > 0 ? 0.5 : Math.PI + 0.5));
            ctx.stroke();
          }
          ctx.lineWidth = 6;
        }
      } else {
        // x-ray legs through the blanket
        ctx.lineWidth = 9;
        const kk = 50 * (tl >= tf ? Math.exp(-d * 4) * Math.abs(Math.sin(d * 26)) : 0);
        for (const sd of [-1, 1]) {
          seg(ctx, [[540 + sd * 24, j.hip[1] + 10], [540 + sd * 104, KNEE_Y - kk], [540 + sd * 142, FOOT_Y]]);
        }
      }
      ctx.restore();
    });
  }
  function drawLabels(ctx, tl, ta, cam, j, p) {
    T.sys.forEach((tf, k) => {
      const d = tl - tf;
      if (d < 0) return;
      const next = T.sys[k + 1];
      const out = next !== undefined ? ease.accel(remap(tl, next - 0.07, next)) : 0;
      const inn = ease.decel(remap(d, 0, 0.16));
      const al = inn * (1 - out);
      if (al <= 0.01) return;
      const [sx, sy] = toScreen(cam, ...partAt(k, j, p));
      const side = SYS[k].side;
      ctx.save();
      ctx.font = `40px ${FONT.black}`;
      ctx.letterSpacing = '4px';
      const tw = ctx.measureText(SYS[k].name).width;
      const pw = tw + 34 + 60, ph = 62;
      let bx = sx, reach = lerp(60, 130, inn);
      if (k <= 1) {
        const hs = toScreen(cam, j.head[0], j.head[1]);
        bx = hs[0] + side * j.headR * cam.zoom;
        reach = lerp(14, 44, inn);
      }
      let lx = side > 0 ? bx + reach : bx - reach - pw;
      lx = clamp(lx, 50, 930 - pw);
      const ly = clamp(sy - 70 - (k === 5 ? 0 : 10), 670, 1380);
      const jx = d < 0.1 ? 10 * hash(Math.floor(ta * 30) * 11 + k) : 0;
      ctx.globalAlpha = al;
      ctx.strokeStyle = COL.red;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      // leader line from the body part to the tag
      const ex = side > 0 ? lx : lx + pw;
      seg(ctx, [[sx + side * 30, sy], [ex - side * 10, ly + ph / 2]]);
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = COL.red;
      ctx.fill();
      // tag: power icon + name
      roundRect(ctx, lx + jx, ly, pw, ph, ph / 2);
      ctx.fillStyle = 'rgba(11,11,12,0.86)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.shadowColor = 'rgba(255,43,43,0.8)';
      ctx.shadowBlur = 14;
      ctx.stroke();
      const ix = lx + jx + 36, iy = ly + ph / 2;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(ix, iy + 2, 14, -Math.PI / 2 + 0.75, -Math.PI / 2 - 0.75 + Math.PI * 2);
      ctx.stroke();
      seg(ctx, [[ix, iy - 15], [ix, iy - 1]]);
      ctx.fillStyle = COL.red;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(SYS[k].name, ix + 26, iy + 3);
      ctx.restore();
    });
  }

  function drawBedroom(ctx, tl, ta, c, hd) {
    const hand = handheld(ta, 1.6), shk = camShake(tl, ta), env = envAt(tl);
    const far = layerCam(c, 0.8, hand, shk), mid = layerCam(c, 1, hand, shk), near = layerCam(c, 1.4, hand, shk);
    withCam(ctx, far, () => drawFar(ctx, tl, ta, env));
    dimTextBand(ctx);
    let j = null;
    withCam(ctx, mid, () => {
      drawBedBack(ctx, env);
      j = drawRig(ctx, hd.p);
      drawBlanket(ctx, j, hd, env);
      drawFailures(ctx, tl, ta, j, hd.p);
      lightPatch(ctx, ta, 0.035 * env);
    });
    withCam(ctx, near, () => drawNear(ctx, env));
    drawLabels(ctx, tl, ta, mid, j, hd.p);
    return mid;
  }

  // =====================================================================================
  // Part 3: the whip-zoom OUT on "awake"
  // =====================================================================================
  function drawWhip(ctx, S, tl, ta, u) {
    const E = EK();
    const hd = hero(tl, ta);
    const ew = eyeWorld(hd.p);
    const e = 1 - Math.pow(1 - u, 3);
    const Z = Math.exp(Math.log(Z0) * (1 - e));
    const P = [lerp(540, ew[0], e), lerp(EYE.cy, ew[1], e)];
    const b = buf();
    const mid = drawBedroom(b, tl, ta, { ax: ew[0], ay: ew[1], px: P[0], py: P[1], z: Z }, hd);
    const ea = 1 - remap(u, 0.1, 0.38);
    const sp = toScreen(mid, ew[0], ew[1]);
    if (ea > 0) {
      const k = eyeZoom(T.tA) * Z / Z0;
      b.save();
      b.globalAlpha = ea;
      b.translate(sp[0], sp[1]);
      b.scale(k, k);
      b.translate(-EYE.cx, -EYE.cy);
      E.drawEye(b, eyeState(S, tl));
      b.restore();
    }
    zoomBlur(ctx, _buf, sp[0], sp[1], 1 - remap(u, 0.05, 0.85));
    speedLines(ctx, sp[0], sp[1], 1 - remap(u, 0, 0.7), ta);
    flash(ctx, 0.8 * Math.exp(-u * 5.5));
  }

  SCENES.s1 = {
    textCy: 470,
    init(S) { T = times(S); },
    draw(ctx, S, tl, ta) {
      if (!T) T = times(S);
      if (tl < T.tA) return drawEyePhase(ctx, S, tl, ta);
      const u = (tl - T.tA) / T.wz;
      if (u < 1) return drawWhip(ctx, S, tl, ta, u);
      drawBedroom(ctx, tl, ta, camAt(tl), hero(tl, ta));
    },
    glitch(S, tl) {
      if (!T) T = times(S);
      let g = 0;
      for (const tf of T.sys) { const d = tl - tf; if (d >= 0 && d < 0.12) g = Math.max(g, 0.55 * (1 - d / 0.12) + 0.08); }
      const d = tl - T.tA;
      if (d >= 0 && d < 0.1) g = Math.max(g, 0.3);
      return g;
    },
    hud(S, tl) {
      if (!T) T = times(S);
      // clean 264 on frame 0; the digits only scramble on the reveal and on each failure
      let g = 0;
      for (const tf of T.sys) if (tl >= tf && tl < tf + 0.13) g = 1;
      if (tl >= T.tA && tl < T.tA + 0.16) g = 1;
      return { hours: 264, rate: 0, danger: 1, glitch: g };
    },
  };
})();
