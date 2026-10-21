// Scene s4: "Push past eleven days and your organs begin to fail. No one has survived much
// longer - on purpose."  X-RAY COLLAPSE, in a hospital corridor.
//   start     whip in (core) on him staggering down the corridor, camera following. On
//             "Push past" a scanner beam sweeps the frame and turns his body x-ray: a glowing
//             body outline with line-art organs inside (kidneys, liver, lungs, heart, brain).
//   days      the HUD locks on 264 in red; he stumbles, arms flailing, and catches himself.
//   organs / begin / fail / No / survived: kidneys, liver, lungs, heart and brain fail one by
//             one: red flash, crack, shock ring, shards, a glitch, the corridor lights stutter,
//             BODY INTEGRITY drops a chunk, the camera shakes and the Dutch tilt grows. Each
//             failure hits him: arches back (kidneys), doubles over (liver), gasps (lungs).
//   No        heart: he clutches his chest, whip push-in, knees buckle, he drops to his knees.
//   survived  brain: his head snaps, arms go limp, he pitches forward face down (dust, shake).
//   longer/on a last effort to lift his head; it drops on "on". Slow push in, faint ECG.
//   purpose   red flash, the ECG goes flat and slices across the frame, X eyes, all else dims.
(() => {
  'use strict';
  const G = 1200;                 // ground line in the hero plane (world y)
  const HS = 0.93;                // hero scale
  const OW = 4.5;                 // x-ray body outline ring width (x s)
  const ARM_W = 30, LEG_W = 38, NECK_W = 44, HEAD_PAD = 9;
  const BAR = { x: 110, y: 1318, w: 820, h: 100 };
  const ECG_Y = 865;
  const TAGS = true;              // tiny scanner tags naming each failing organ
  const WALL_D = 0.8, NEAR_D = 1.3, WALL_BASE = G - 78;

  // torso outline in the torso frame: [b forward of the spine, a up from the hip] (unscaled)
  const TORSO = [[-58, -18], [-70, 40], [-72, 120], [-66, 185], [-46, 213], [-14, 224], [14, 224], [48, 212],
    [74, 182], [80, 138], [72, 92], [66, 42], [62, -6], [34, -30], [-26, -30]];
  // organs, in failure order. b/a: centre in the torso frame (brain: head frame, x fwd, y down)
  const ORG = [
    { id: 'kidneys', tag: 'KIDNEYS', b: 2, a: 34, r: 58, k: 1.2 },
    { id: 'liver', tag: 'LIVER', b: 14, a: 82, r: 50, k: 1.25 },
    { id: 'lungs', tag: 'LUNGS', b: 2, a: 168, r: 66, k: 1.18 },
    { id: 'heart', tag: 'HEART', b: 12, a: 134, r: 40, k: 1.22 },
    { id: 'brain', tag: 'BRAIN', head: true, b: -15, a: -18, r: 32, k: 1 },
  ];
  const DRAW_ORDER = [0, 1, 2, 3]; // brain is drawn on the head, after the rig

  // ---------------------------------------------------------------------------------------
  // timing: everything hangs off cues / VO words
  // ---------------------------------------------------------------------------------------
  let T = null;
  function times(S) {
    const c = S.cues, dur = sceneDur(S);
    const w = (word, fb, o) => { try { return cue(S, word, o); } catch (e) { return fb; } };
    const org = c.organs, fail = c.fail, no = c.no_one, pur = c.purpose;
    const surv = clamp(w('survived', lerp(no, pur, 0.22)), no + 0.3, pur - 1.0);
    const o = {
      dur, org, fail, no, pur, surv,
      begin: clamp(w('begin', lerp(org, fail, 0.45)), org + 0.2, fail - 0.2),
      scan0: 0.08,
      scan1: clamp(w('eleven', org * 0.35), 0.4, org - 0.6),
      days: clamp(w('days', org * 0.56), 0.5, org - 0.4),
      daysEnd: clamp(w('days', org * 0.68, { edge: 'end' }), 0.6, org - 0.25),
    };
    o.your = clamp(w('your', org - 0.3), o.daysEnd + 0.05, org - 0.15);
    o.fails = [org, o.begin, fail, no, surv];
    o.kneelLand = no + Math.min(0.36, 0.55 * (surv - no));
    o.fallStart = surv + Math.min(0.22, 0.15 * (pur - surv));
    o.fallLand = o.fallStart + Math.min(0.42, 0.3 * (pur - surv));
    o.longer = clamp(w('longer', lerp(o.fallLand, pur, 0.25)), o.fallLand + 0.15, pur - 0.6);
    o.on = clamp(w('on', pur - 0.6), o.longer + 0.35, pur - 0.15);
    return o;
  }

  // ---------------------------------------------------------------------------------------
  // small helpers
  // ---------------------------------------------------------------------------------------
  const jolt = (tl, t0, k) => (tl >= t0 ? Math.exp(-(tl - t0) * k) : 0);
  const held = (tl, t0, d) => ease.decel(remap(tl, t0, t0 + d));
  const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  function frameOf(j) {
    const ux = j.neck[0] - j.hip[0], uy = j.neck[1] - j.hip[1], L = Math.hypot(ux, uy) || 1;
    const u = [ux / L, uy / L];
    return { o: j.hip, u, f: [-u[1], u[0]], ang: Math.atan2(u[0], -u[1]) };
  }
  const TP = (fr, b, a, s) => [fr.o[0] + (fr.u[0] * a + fr.f[0] * b) * s, fr.o[1] + (fr.u[1] * a + fr.f[1] * b) * s];
  function headPt(j, p, x, y) {
    const r = p.torso + p.neck, c = Math.cos(r), sn = Math.sin(r);
    return [j.head[0] + (x * c - y * sn) * p.s, j.head[1] + (x * sn + y * c) * p.s];
  }
  function toScreen(c, x, y) {
    const dx = (x - c.cx) * c.zoom, dy = (y - c.cy) * c.zoom, cr = Math.cos(c.rot), sr = Math.sin(c.rot);
    return [W / 2 + c.ox + dx * cr - dy * sr, H / 2 + c.oy + dx * sr + dy * cr];
  }
  function layerCam(C, d) {
    return { cx: C.cx * d, cy: C.cy, zoom: 1 + (C.zoom - 1) * d, rot: C.rot, ox: C.ox, oy: C.oy };
  }
  // side-view arm angles (rig convention) that put the hand on a target; elbow +1 swings the
  // elbow up/forward of the shoulder-target line, -1 down/back of it
  function armIK(sh, tg, s, elbow) {
    const L1 = RIG.upper * s, L2 = RIG.fore * s;
    const dx = tg[0] - sh[0], dy = tg[1] - sh[1];
    const d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 2, L1 + L2 - 0.5);
    const phi = Math.atan2(dx, dy);
    const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const be = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    return elbow > 0 ? [phi + al, -(Math.PI - be)] : [phi - al, Math.PI - be];
  }
  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  const rgba = (rgb, a) => `rgba(${rgb},${clamp(a).toFixed(3)})`;
  // gradient sprites, built once per page and drawn scaled (far cheaper than per-frame gradients)
  let SPR = null;
  function sprites() {
    if (SPR) return SPR;
    const mk = (w, h, fn) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      fn(c.getContext('2d'), w, h);
      return c;
    };
    const radial = (rgb) => (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, `rgba(${rgb},1)`);
      r.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = r;
      g.fillRect(0, 0, w, h);
    };
    SPR = {
      // red danger vignette, full frame (a 1:1 blit is the fastest draw)
      wash: mk(W, H, (g, w, h) => {
        const r = g.createRadialGradient(540, 1000, 340, 540, 1000, 1180);
        r.addColorStop(0, 'rgba(200,10,15,0)');
        r.addColorStop(1, 'rgba(200,10,15,1)');
        g.fillStyle = r;
        g.fillRect(0, 0, w, h);
      }),
      glow: mk(128, 128, radial(FG)),
      shadow: mk(128, 128, radial('0,0,0')),
      fade: mk(4, 64, (g) => {
        const l = g.createLinearGradient(0, 0, 0, 64);
        l.addColorStop(0, 'rgba(11,11,12,0)');
        l.addColorStop(1, 'rgba(11,11,12,0.88)');
        g.fillStyle = l;
        g.fillRect(0, 0, 4, 64);
      }),
    };
    return SPR;
  }
  const FG = '242,240,235', RED = '255,43,43';

  // ---------------------------------------------------------------------------------------
  // walk path: stagger phase and the distance it covers (integrated once per page)
  // ---------------------------------------------------------------------------------------
  const X0 = 360, STEP_K = 58, DT = 1 / 120;
  const phaseAt = (t) => 2 * Math.PI * (0.92 * t - 0.03 * t * t) + 0.5 * Math.sin(1.9 * t + 0.4) + 0.6;
  const dPhase = (t) => 2 * Math.PI * (0.92 - 0.06 * t) + 0.95 * Math.cos(1.9 * t + 0.4);
  const walkAmt = (t) => 0.6 * (1 - ease.std(remap(t, T.no, T.no + 0.3)));
  function stumble(t) {
    const d0 = T.days - 0.06;
    return ease.decel(remap(t, d0, d0 + 0.16)) * (1 - ease.inOut(remap(t, d0 + 0.22, d0 + 0.7)));
  }
  function buildPath() {
    const n = Math.ceil((T.dur + 0.5) / DT) + 2;
    const xs = new Float64Array(n);
    xs[0] = X0;
    for (let i = 1; i < n; i++) {
      const t = (i - 0.5) * DT;
      const v = STEP_K * HS * walkAmt(t) * dPhase(t) + 170 * stumble(t) * (t < T.days + 0.2 ? 1 : 0.3);
      xs[i] = xs[i - 1] + Math.max(0, v) * DT;
    }
    T.xs = xs;
  }
  function heroX(t) {
    const f = clamp(t, 0, T.dur + 0.4) / DT, i = Math.floor(f);
    return lerp(T.xs[i], T.xs[Math.min(i + 1, T.xs.length - 1)], f - i);
  }

  // ---------------------------------------------------------------------------------------
  // the hero: one pose per instant
  // ---------------------------------------------------------------------------------------
  const KNEEL = { torso: 0.32, neck: 0.45, legL: [0.35, -1.95], legR: [0.2, -1.85] };
  // face down: near arm flung forward on the floor, far arm along the side, legs trailing
  const PRONE = { torso: 1.5, neck: 0.12, armL: [-0.95, -0.45], armR: [0.84, 0.72], legL: [-1.06, -0.5], legR: [-0.98, -0.58] };

  // lowest point of the body (bones, limb tubes, x-ray torso and head outline) on the ground
  function grounded(p) {
    const j = rigJoints(p), s = p.s, fr = frameOf(j);
    const lows = [j.hip[1]];
    const tube = (a, b, w) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      return b[1] + Math.max(RIG.stroke / 2, (w / 2) * Math.abs(dx) / L) * s;
    };
    lows.push(tube(j.kneeL, j.footL, LEG_W), tube(j.kneeR, j.footR, LEG_W));
    lows.push(j.kneeL[1] + (LEG_W / 2) * s, j.kneeR[1] + (LEG_W / 2) * s);
    lows.push(tube(j.elbowL, j.handL, ARM_W), tube(j.elbowR, j.handR, ARM_W));
    lows.push(j.head[1] + j.headR + (HEAD_PAD + OW) * s);
    for (const [b, a] of TORSO) lows.push(TP(fr, b, a, s)[1] + OW * s);
    const low = Math.max(...lows);
    return Object.assign({}, p, { y: p.y + (G - low) });
  }

  function heroPose(tl) {
    const F = T.fails, s = HS;
    const ph = phaseAt(tl), amt = walkAmt(tl);
    const wl = walkLimbs(ph, amt);
    const sway = Math.sin(ph * 2 + 0.7);
    const sb = stumble(tl);
    const nz = (seed, f) => noise1(tl * f, seed);
    const J = (i, k) => jolt(tl, F[i], k);
    const Hd = (i, d = 0.12) => held(tl, F[i], d);

    // ---- walking stagger
    let torso = 0.2 + 0.05 * sway + 0.06 * nz(3, 1.3) + 0.4 * sb;
    let neck = 0.28 + 0.16 * nz(4, 1.1) + 0.18 * sb;
    let armL = [wl.armL[0] * 0.75 - 0.06, 0.32 + 0.1 * nz(5, 2)];
    let armR = [wl.armR[0] * 0.75 - 0.06, 0.3 + 0.1 * nz(6, 2)];
    let legL = wl.legL.slice(), legR = wl.legR.slice();
    // stumble on "days": pitch forward, near arm flails out, catch step
    armR = lerp2(armR, [1.45, 0.55], sb);
    armL = lerp2(armL, [-0.7, 0.5], sb);
    legR = lerp2(legR, [0.45, -0.25], sb * 0.8);
    legL = lerp2(legL, [-0.3, -0.4], sb * 0.8);

    // ---- failure reactions (jolts decay, holds stay)
    torso += -0.3 * J(0, 7) + 0.06 * Hd(0);                  // kidneys: arches back
    torso += 0.32 * J(1, 6) + 0.1 * Hd(1); neck += 0.3 * J(1, 6); // liver: doubles over
    torso += -0.16 * J(2, 5); neck += -0.65 * J(2, 4.5);    // lungs: head thrown back, gasp
    torso += 0.1 * Hd(3, 0.1);                              // heart: hunches over his chest

    let eyes = 'tired', lid = 0.45 + 0.2 * (0.5 + 0.5 * nz(7, 0.9)), mouth = 'open';
    for (let i = 0; i < 4; i++) if (tl >= F[i] && tl < F[i] + 0.3) eyes = 'wide';
    if (tl >= F[0] && tl < F[0] + 0.3) mouth = 'grit';
    if ((tl >= F[1] && tl < F[1] + 0.4) || (tl >= F[2] && tl < F[2] + 0.5)) mouth = 'o';

    let p = pose({ facing: 1, s, x: heroX(tl), y: G, torso, neck, armL, armR, legL, legR, eyes, lid, mouth, look: 0 });

    // ---- hands go where it hurts (IK on the body)
    const j0 = rigJoints(p), fr0 = frameOf(j0);
    const at = (b, a) => TP(fr0, b, a, s);
    const ikR = (b, a, e) => armIK(j0.shoulder, at(b, a), s, e);
    const w1 = Hd(0, 0.1) * (1 - Hd(1, 0.1));
    const w2 = Hd(1, 0.1) * (1 - Hd(2, 0.08));
    const w3 = Hd(2, 0.08) * (1 - Hd(3, 0.08));
    const w4 = Hd(3, 0.1);
    p.armR = lerp2(p.armR, ikR(-84, 46, -1), w1);             // hand to the lower back
    // (elbow -1: the elbow hangs low and the forearm comes up to the body)
    p.armR = lerp2(p.armR, ikR(86, 78, -1), w2);              // both hands to the gut
    p.armL = lerp2(p.armL, ikR(80, 70, -1), w2 * 0.9);
    p.armR = lerp2(p.armR, ikR(66, 210, -1), w3);             // hand to the throat
    p.armL = lerp2(p.armL, [-0.45, 0.7], w3);
    p.armR = lerp2(p.armR, ikR(88, 136, -1), w4);             // clutches the heart
    p.armL = lerp2(p.armL, ikR(84, 122, -1), w4);

    // ---- knees buckle (heart) -> kneel
    const kneelK = ease.accel(remap(tl, T.no + 0.06, T.kneelLand));
    if (kneelK > 0) {
      p = lerpPose(p, Object.assign({}, p, KNEEL, { armL: p.armL, armR: p.armR, eyes: p.eyes, mouth: 'open' }), kneelK);
      p.x += 28 * HS * ease.decel(remap(tl, T.no, T.kneelLand + 0.2));
      const wob = remap(tl, T.kneelLand, T.kneelLand + 0.2);
      p.torso += 0.16 * jolt(tl, T.kneelLand, 9) + wob * 0.05 * Math.sin((tl - T.kneelLand) * 9);
      p.neck += 0.22 * jolt(tl, T.kneelLand, 8);
    }

    // ---- brain: head snaps back, arms go limp, he pitches forward face down
    if (tl >= T.surv) {
      const snap = jolt(tl, T.surv, 7) * (1 - remap(tl, T.fallStart, T.fallStart + 0.1));
      p.neck += -0.6 * snap;
      p.torso += -0.1 * snap;
      const limp = ease.decel(remap(tl, T.surv, T.surv + 0.22));
      p.armL = lerp2(p.armL, [0.15, 0.2], limp);
      p.armR = lerp2(p.armR, [0.25, 0.15], limp);
      p.eyes = tl < T.surv + 0.12 ? 'wide' : 'closed';
      p.mouth = 'o';
    }
    const fallK = ease.accel(remap(tl, T.fallStart, T.fallLand));
    let pinX = 0;
    if (fallK > 0) {
      const kneelP = p;
      const pr = Object.assign({}, p, PRONE);
      p = lerpPose(kneelP, pr, fallK);
      p.eyes = 'closed';
      p.mouth = 'none';
      // the knees stay planted while he pitches over them
      const kA = rigJoints(Object.assign({}, kneelP, { x: 0, y: 0 })).kneeR[0];
      const kB = rigJoints(Object.assign({}, p, { x: 0, y: 0 })).kneeR[0];
      pinX = kA - kB;
      p.x += pinX;
      // landing: the body bounces once, the head knocks
      const dl = tl - T.fallLand;
      if (dl >= 0) {
        const b = Math.exp(-dl * 8) * Math.sin(dl * 34);
        p.torso += -0.035 * b;
        p.neck += -0.22 * Math.exp(-dl * 10) * (dl < 0.3 ? 1 : 0);
      }
      // last effort on "longer": the head lifts and the hand claws forward; drops on "on"
      const up = ease.decel(remap(tl, T.longer, T.longer + 0.4)) * (1 - ease.accel(remap(tl, T.on - 0.02, T.on + 0.12)));
      if (up > 0) {
        p.neck += -0.6 * up + 0.04 * up * Math.sin(tl * 40);
        p.torso += -0.05 * up;
        p.armL = [p.armL[0] + 0.18 * up, p.armL[1] - 0.25 * up];
        if (up > 0.25) { p.eyes = 'closed'; p.mouth = 'open'; }
      }
      const dropped = tl - (T.on + 0.12);
      if (dropped >= 0) p.neck += -0.1 * Math.exp(-dropped * 9) * Math.sin(dropped * 30);
    }
    if (tl >= T.pur) { p.eyes = 'x'; p.mouth = 'none'; p.bags = false; }

    p = grounded(p);
    // body sinks into the knees on landing / squashes into the floor on the fall
    p.y += 9 * HS * jolt(tl, T.kneelLand, 12) * (tl < T.fallStart ? 1 : 0);
    return p;
  }

  // ---------------------------------------------------------------------------------------
  // x-ray body: union outline (two passes), vertebrae, organs, then the stick skeleton
  // ---------------------------------------------------------------------------------------
  function bodyParts(p, j) {
    const s = p.s, fr = frameOf(j);
    const torso = new Path2D();
    const pts = TORSO.map(([b, a]) => TP(fr, b, a, s));
    const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]);
    torso.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
      const q = pts[i], m2 = mid(q, pts[(i + 1) % n]);
      torso.quadraticCurveTo(q[0], q[1], m2[0], m2[1]);
    }
    torso.closePath();
    const tubes = [
      [[j.hip, j.kneeL, j.footL], LEG_W], [[j.hip, j.kneeR, j.footR], LEG_W],
      [[j.shoulder, j.elbowL, j.handL], ARM_W], [[j.shoulder, j.elbowR, j.handR], ARM_W],
      [[j.neck, j.head], NECK_W],
    ];
    return { fr, torso, tubes };
  }
  function drawBody(ctx, p, j, bp, glow, redK) {
    const s = p.s;
    const out = mixColor('#7A7976', COL.red, redK);
    const strokeTubes = (extra, col) => {
      ctx.strokeStyle = col;
      for (const [pts, w] of bp.tubes) {
        ctx.lineWidth = (w + extra) * s;
        poly(ctx, pts);
      }
    };
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    // pass 0: luminous halo (two translucent rings; much cheaper than shadowBlur)
    const halo = redK > 0.05 ? RED : FG;
    ctx.lineCap = 'round';
    for (const [extra, al] of [[18 + 26 * glow, 0.045 + 0.06 * glow + 0.08 * redK], [8 + 10 * glow, 0.07 + 0.1 * glow + 0.12 * redK]]) {
      const col = rgba(halo, al);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = (OW + extra) * 2 * s;
      ctx.stroke(bp.torso);
      strokeTubes((OW + extra) * 2, col);
      ctx.beginPath();
      ctx.arc(j.head[0], j.head[1], j.headR + (HEAD_PAD + OW + extra) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineCap = 'butt';
    // pass 1: outline
    ctx.fillStyle = out;
    ctx.strokeStyle = out;
    ctx.lineWidth = OW * 2 * s;
    ctx.fill(bp.torso);
    ctx.stroke(bp.torso);
    strokeTubes(OW * 2, out);
    ctx.beginPath();
    ctx.arc(j.head[0], j.head[1], j.headR + (HEAD_PAD + OW) * s, 0, Math.PI * 2);
    ctx.fill();
    // pass 2: interior (a faint luminous gradient, brighter at the chest)
    const ch = TP(bp.fr, 5, 140, s);
    const g = ctx.createRadialGradient(ch[0], ch[1], 10 * s, ch[0], ch[1], 330 * s);
    g.addColorStop(0, mixColor(COL.bg, COL.fg, 0.11 + 0.06 * glow));
    g.addColorStop(1, mixColor(COL.bg, COL.fg, 0.035));
    ctx.fillStyle = g;
    ctx.strokeStyle = g;
    ctx.fill(bp.torso);
    strokeTubes(0, g);
    ctx.beginPath();
    ctx.arc(j.head[0], j.head[1], j.headR + HEAD_PAD * s, 0, Math.PI * 2);
    ctx.fill();
    // faint ribs
    ctx.strokeStyle = rgba(FG, 0.13);
    ctx.lineWidth = 3.5 * s;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = 192 - i * 19;
      for (const side of [-1, 1]) {
        const p0 = TP(bp.fr, 0, a, s), p1 = TP(bp.fr, side * 40, a - 8, s), p2 = TP(bp.fr, side * 54, a - 26, s);
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawVertebrae(ctx, p, bp) {
    const s = p.s;
    ctx.save();
    ctx.strokeStyle = COL.bg;
    ctx.lineWidth = 3 * s;
    for (let a = 14; a < 200; a += 17) {
      const q0 = TP(bp.fr, -9, a, s), q1 = TP(bp.fr, 9, a, s);
      poly(ctx, [q0, q1]);
    }
    ctx.restore();
  }

  // ---- organ shapes (organ-local: x forward, y down, unscaled)
  function lobe(ctx, w, h) {
    ctx.moveTo(-w * 0.32, -h * 0.5);
    ctx.quadraticCurveTo(w * 0.55, -h * 0.58, w * 0.5, h * 0.12);
    ctx.quadraticCurveTo(w * 0.48, h * 0.52, -w * 0.02, h * 0.5);
    ctx.quadraticCurveTo(-w * 0.52, h * 0.48, -w * 0.46, h * 0.18);
    ctx.quadraticCurveTo(-w * 0.2, -h * 0.05, -w * 0.32, -h * 0.5);
    ctx.closePath();
  }
  function bean(ctx) {
    ctx.moveTo(0, -17);
    ctx.quadraticCurveTo(15, -17, 13, 0);
    ctx.quadraticCurveTo(15, 17, 0, 17);
    ctx.quadraticCurveTo(-11, 16, -8, 6);
    ctx.quadraticCurveTo(-3, 0, -8, -6);
    ctx.quadraticCurveTo(-11, -16, 0, -17);
    ctx.closePath();
  }
  function organPath(ctx, id) {
    ctx.beginPath();
    if (id === 'kidneys') {
      for (const sx of [-1, 1]) {
        ctx.save();
        ctx.translate(sx * 31, 0);
        ctx.scale(-sx, 1);
        bean(ctx);
        ctx.restore();
      }
    } else if (id === 'liver') {
      ctx.moveTo(-38, -10);
      ctx.quadraticCurveTo(-6, -27, 36, -16);
      ctx.quadraticCurveTo(46, -5, 30, 9);
      ctx.quadraticCurveTo(6, 22, -24, 17);
      ctx.quadraticCurveTo(-44, 8, -38, -10);
      ctx.closePath();
    } else if (id === 'lungs') {
      for (const sx of [-1, 1]) {
        ctx.save();
        ctx.translate(sx * 29, 2);
        ctx.scale(sx, 1);
        lobe(ctx, 44, 84);
        ctx.restore();
      }
    } else if (id === 'heart') {
      ctx.moveTo(0, 20);
      ctx.bezierCurveTo(-35, -3, -29, -32, 0, -14.5);
      ctx.bezierCurveTo(29, -32, 35, -3, 0, 20);
      ctx.closePath();
    } else if (id === 'brain') {
      for (let i = 0; i <= 56; i++) {
        const th = (i / 56) * Math.PI * 2, sn = Math.sin(th);
        const bump = sn < 0.2 ? 1 + 0.09 * Math.abs(Math.sin(th * 5)) : 1;
        const x = Math.cos(th) * 31 * bump, y = sn * (sn > 0 ? 15 : 22) * bump;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
  }
  function organDetail(ctx, id) {
    ctx.beginPath();
    if (id === 'lungs') {
      ctx.moveTo(0, -50); ctx.lineTo(0, -30);
      ctx.moveTo(0, -30); ctx.quadraticCurveTo(-8, -22, -20, -18);
      ctx.moveTo(0, -30); ctx.quadraticCurveTo(8, -22, 20, -18);
      ctx.moveTo(-20, -18); ctx.lineTo(-30, 2); ctx.moveTo(-24, -10); ctx.lineTo(-40, -2);
      ctx.moveTo(20, -18); ctx.lineTo(30, 2); ctx.moveTo(24, -10); ctx.lineTo(40, -2);
    } else if (id === 'brain') {
      ctx.moveTo(-4, -20); ctx.quadraticCurveTo(2, -8, -4, 6);
      ctx.moveTo(-22, -10); ctx.quadraticCurveTo(-14, -14, -14, -4); ctx.quadraticCurveTo(-14, 4, -22, 4);
      ctx.moveTo(8, -12); ctx.quadraticCurveTo(18, -14, 18, -4); ctx.quadraticCurveTo(18, 4, 10, 4);
      ctx.moveTo(-8, 13); ctx.quadraticCurveTo(-6, 20, -14, 26);
    } else if (id === 'liver') {
      ctx.moveTo(-10, -18); ctx.quadraticCurveTo(-4, -2, -14, 14);
    } else if (id === 'kidneys') {
      for (const sx of [-1, 1]) { ctx.moveTo(sx * 23, 0); ctx.lineTo(sx * 8, 4); }
    }
    ctx.stroke();
  }

  // organ state at time tl: scale, colours, shake
  function organState(i, tl, ta) {
    const k = tl - T.fails[i];
    const hb = pulseFrom(TL.events.heartbeats, ta, 9);
    const o = ORG[i];
    let sc = 1, sx = 1, jx = 0, jy = 0;
    if (o.id === 'heart') sc = 1 + 0.16 * hb;
    if (o.id === 'lungs') sx = 1 + 0.05 * Math.sin(tl * 2 * Math.PI * 1.1);
    if (k < 0) return { k, sc, sx, jx, jy, stroke: rgba(FG, 0.92), fill: 'rgba(11,11,12,0.78)', glow: 0, failed: false };
    const flash = Math.exp(-k * 7);
    sc *= 1 + 0.32 * Math.exp(-k * 15) - 0.08 * (1 - Math.exp(-k * 4));
    if (o.id === 'lungs') sx = 0.92 + 0.03 * Math.sin(tl * 23);
    const flick = 0.5 + 0.5 * hash(Math.floor(ta * 20) + i * 17);
    const trem = 1.6 + 3 * flash;
    jx = trem * noise1(ta * 31, 40 + i);
    jy = trem * noise1(ta * 29, 50 + i);
    if (o.id === 'heart') { sc += 0.05 * noise1(ta * 40, 9); }
    const dead = tl >= T.pur;
    return {
      k, sc, sx, jx, jy, failed: true, flash,
      stroke: dead ? rgba(RED, 0.45) : rgba(RED, 0.95),
      fill: dead ? 'rgba(40,6,8,0.9)' : rgba(RED, 0.3 + 0.6 * flash + 0.14 * flick),
      glow: dead ? 0 : 0.35 + 0.65 * flash,
    };
  }
  function organWorld(i, p, j, fr) {
    const o = ORG[i];
    return o.head ? headPt(j, p, o.b, o.a) : TP(fr, o.b, o.a, p.s);
  }
  function drawOrgan(ctx, i, p, j, fr, tl, ta) {
    const o = ORG[i], st = organState(i, tl, ta), s = p.s;
    const c = organWorld(i, p, j, fr);
    ctx.save();
    ctx.translate(c[0] + st.jx, c[1] + st.jy);
    ctx.rotate(o.head ? p.torso + p.neck : fr.ang);
    ctx.scale(s * st.sc * st.sx * o.k, s * st.sc * o.k);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    organPath(ctx, o.id);
    ctx.fillStyle = st.fill;
    ctx.fill();
    if (st.glow > 0) { ctx.shadowColor = rgba(RED, 0.9); ctx.shadowBlur = 26 * st.glow; }
    ctx.strokeStyle = st.stroke;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 3;
    ctx.strokeStyle = st.failed ? rgba(RED, 0.7) : rgba(FG, 0.55);
    organDetail(ctx, o.id);
    // cracks run through the organ after it fails (clipped to its shape)
    if (st.failed) {
      const grow = ease.decel(remap(st.k, 0, 0.16));
      organPath(ctx, o.id);
      ctx.clip();
      const crack = (col, lw) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        for (const cr of T.cracks[i]) {
          const nseg = Math.max(1, Math.ceil((cr.length - 1) * grow));
          ctx.beginPath();
          ctx.moveTo(cr[0][0], cr[0][1]);
          for (let q = 1; q <= nseg && q < cr.length; q++) ctx.lineTo(cr[q][0], cr[q][1]);
          ctx.stroke();
        }
      };
      crack(tl >= T.pur ? rgba(RED, 0.35) : rgba(RED, 1), 6);
      crack(COL.bg, 2.6);
    }
    ctx.restore();
  }
  function buildCracks() {
    T.cracks = ORG.map((o, i) => {
      const rnd = mulberry32(400 + i * 37);
      const out = [];
      const n = o.id === 'kidneys' || o.id === 'lungs' ? 4 : 3;
      for (let c = 0; c < n; c++) {
        let x = (o.id === 'kidneys' || o.id === 'lungs' ? (c % 2 ? 1 : -1) * 28 : 0) + (rnd() - 0.5) * 8;
        let y = (rnd() - 0.5) * 10;
        let ang = (c / n) * Math.PI * 2 + rnd() * 1.2;
        const pts = [[x, y]];
        const segs = 4 + Math.floor(rnd() * 2);
        for (let k = 0; k < segs; k++) {
          ang += (rnd() - 0.5) * 1.3;
          const L = o.r * (0.16 + rnd() * 0.12);
          x += Math.cos(ang) * L;
          y += Math.sin(ang) * L;
          pts.push([x, y]);
        }
        out.push(pts);
      }
      return out;
    });
  }
  // shock ring + shards flying out of a failing organ (world space)
  function drawBurst(ctx, i, c, tl, s) {
    const k = tl - T.fails[i];
    if (k < 0 || k > 0.6) return;
    ctx.save();
    ctx.lineCap = 'round';
    const u = k / 0.3;
    if (u < 1) {
      ctx.strokeStyle = rgba(RED, 0.8 * (1 - u));
      ctx.lineWidth = 7 * (1 - u) + 1.5;
      ctx.shadowColor = rgba(RED, 0.9);
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(c[0], c[1], (ORG[i].r * 0.9 + 150 * ease.decel(u)) * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    for (let q = 0; q < 9; q++) {
      const a = (q / 9) * Math.PI * 2 + hash(i * 31 + q) * 0.6;
      const sp = 420 + 260 * (0.5 + 0.5 * hash(i * 13 + q * 7));
      const d = (sp * (1 - Math.exp(-k * 6))) / 6 + ORG[i].r * 0.6;
      const x = c[0] + Math.cos(a) * d * s, y = c[1] + Math.sin(a) * d * s + 260 * k * k;
      ctx.globalAlpha = clamp(1.4 - k * 2.6);
      ctx.strokeStyle = q % 3 === 0 ? COL.fg : COL.red;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.cos(a) * 16, y - Math.sin(a) * 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHero(ctx, p, tl, ta, xray, glow) {
    const j = rigJoints(p), s = p.s;
    if (!xray) { drawRig(ctx, p); return j; }
    const bp = bodyParts(p, j);
    let redK = 0;
    for (let i = 0; i < 5; i++) redK = Math.max(redK, jolt(tl, T.fails[i], 9));
    drawBody(ctx, p, j, bp, glow, redK * 0.85);
    drawRig(ctx, p);
    drawVertebrae(ctx, p, bp);
    for (const i of DRAW_ORDER) drawOrgan(ctx, i, p, j, bp.fr, tl, ta);
    // the near arm is in front of the organs
    ctx.save();
    ctx.strokeStyle = COL.fg;
    ctx.lineWidth = RIG.stroke * s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    poly(ctx, [j.shoulder, j.elbowR, j.handR]);
    ctx.restore();
    // an organ in the middle of failing pops in front of the hand so the beat reads
    for (const i of DRAW_ORDER) {
      const k = tl - T.fails[i];
      if (k >= 0 && k < 0.55) drawOrgan(ctx, i, p, j, bp.fr, tl, ta);
    }
    // ...but behind the head: re-render the rig clipped to the head disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(j.head[0], j.head[1], j.headR + RIG.stroke * s, 0, Math.PI * 2);
    ctx.clip();
    drawRig(ctx, p);
    ctx.restore();
    drawOrgan(ctx, 4, p, j, bp.fr, tl, ta);
    for (let i = 0; i < 5; i++) drawBurst(ctx, i, organWorld(i, p, j, bp.fr), tl, s);
    return j;
  }

  // ---------------------------------------------------------------------------------------
  // the corridor (parallax): back wall with doors, handrail, lamps; perspective floor
  // ---------------------------------------------------------------------------------------
  function lampLevel(tl) {
    let v = 1;
    for (const f of T.fails) {
      const k = tl - f;
      if (k >= 0 && k < 0.22) v = Math.min(v, hash(Math.floor(k * 45) + Math.round(f * 100)) > 0 ? 0.25 : 0.8);
    }
    const kp = tl - T.pur;
    if (kp >= 0) v = 0.2;
    return v;
  }
  function drawCorridor(ctx, C, tl, ta) {
    const lamp = lampLevel(tl);
    const Cw = layerCam(C, WALL_D);
    const span = (cam) => [cam.cx - (W / 2 + 420) / cam.zoom, cam.cx + (W / 2 + 420) / cam.zoom];
    withCam(ctx, Cw, () => {
      const [x0, x1] = span(Cw);
      // wall tone
      ctx.fillStyle = '#111113';
      ctx.fillRect(x0, WALL_BASE - 1400, x1 - x0, 1400);
      const SP = 760, OFF = 120;
      // lamps: soft pools on the wall (round, so drawn axis-aligned in screen space: fast path)
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let k = Math.floor((x0 - OFF - 380 - 300) / SP); k <= Math.floor((x1 - OFF - 380 + 300) / SP); k++) {
        const lx = OFF + 380 + k * SP, ly = WALL_BASE - 520;
        const fl = lamp * (0.9 + 0.1 * noise1(ta * 9 + k, 77));
        const c = toScreen(Cw, lx, ly + 100), r = 300 * Cw.zoom;
        if (c[0] < -r || c[0] > W + r) continue;
        ctx.globalAlpha = 0.1 * fl;
        ctx.drawImage(sprites().glow, Math.round(c[0] - r), Math.round(c[1] - r), Math.round(2 * r), Math.round(2 * r));
      }
      ctx.restore();
      ctx.lineCap = 'round';
      // doors with a small window
      for (let k = Math.floor((x0 - OFF) / SP) - 1; k <= Math.ceil((x1 - OFF) / SP); k++) {
        const dx = OFF + k * SP;
        ctx.strokeStyle = rgba(FG, 0.2);
        ctx.lineWidth = 5;
        ctx.strokeRect(dx, WALL_BASE - 470, 200, 470);
        ctx.strokeStyle = rgba(FG, 0.14);
        ctx.lineWidth = 4;
        ctx.strokeRect(dx + 62, WALL_BASE - 420, 76, 104);
        ctx.beginPath();
        ctx.moveTo(dx + 168, WALL_BASE - 250);
        ctx.lineTo(dx + 168, WALL_BASE - 200);
        ctx.stroke();
      }
      // handrail between the doors, with brackets
      ctx.strokeStyle = rgba(FG, 0.22);
      ctx.lineWidth = 7;
      const ry = WALL_BASE - 262;
      for (let k = Math.floor((x0 - OFF) / SP) - 1; k <= Math.ceil((x1 - OFF) / SP); k++) {
        const a = OFF + k * SP + 240, b = OFF + (k + 1) * SP - 40;
        poly(ctx, [[a, ry], [b, ry]]);
        ctx.lineWidth = 4;
        for (let bx = a + 60; bx < b - 30; bx += 230) poly(ctx, [[bx, ry], [bx, ry + 34], [bx + 14, ry + 34]]);
        ctx.lineWidth = 7;
      }
      // baseboard
      ctx.strokeStyle = rgba(FG, 0.3);
      ctx.lineWidth = 5;
      poly(ctx, [[x0, WALL_BASE], [x1, WALL_BASE]]);
      ctx.strokeStyle = rgba(FG, 0.1);
      ctx.lineWidth = 3;
      poly(ctx, [[x0, WALL_BASE - 22], [x1, WALL_BASE - 22]]);
    });
    // perspective floor: seams run from the wall base (far layer) to the near layer
    const Cn = layerCam(C, NEAR_D);
    ctx.save();
    ctx.lineCap = 'round';
    const SEAM = 190;
    const [hx0, hx1] = span(C);
    for (let k = Math.floor(hx0 / SEAM) - 3; k <= Math.ceil(hx1 / SEAM) + 3; k++) {
      const X = k * SEAM;
      const a = toScreen(Cw, X * WALL_D, WALL_BASE), b = toScreen(Cn, X * NEAR_D, G + 420);
      ctx.strokeStyle = rgba(FG, 0.09);
      ctx.lineWidth = 3;
      poly(ctx, [a, b]);
    }
    for (const [u, al] of [[0.18, 0.1], [0.4, 0.09], [0.66, 0.08], [0.95, 0.07]]) {
      const yW = lerp(WALL_BASE, G + 420, u);
      const d = lerp(WALL_D, NEAR_D, Math.pow(u, 0.8));
      const cam = layerCam(C, d);
      const a = toScreen(cam, cam.cx - 2000, yW), b = toScreen(cam, cam.cx + 2000, yW);
      ctx.strokeStyle = rgba(FG, al);
      ctx.lineWidth = 3;
      poly(ctx, [a, b]);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------
  // camera
  // ---------------------------------------------------------------------------------------
  function chestOf(tl) {
    const p = heroPose(tl), j = rigJoints(p);
    return [lerp(j.hip[0], j.neck[0], 0.55), lerp(j.hip[1], j.neck[1], 0.55)];
  }
  function camAt(tl, ta, v) {
    const F = T.fails;
    // anchor: the chest, followed with a slight lag
    const c0 = chestOf(tl), c1 = chestOf(tl - 0.09), c2 = chestOf(tl - 0.18);
    const ax = (c0[0] + c1[0] + c2[0]) / 3, ay = (c0[1] + c1[1] + c2[1]) / 3;
    const down = ease.inOut(remap(tl, T.fallStart - 0.05, T.fallLand + 0.3));
    const push = ease.decel(remap(tl, T.your, T.your + 0.32));   // motivated push-in on "your organs"
    const kn = ease.inOut(remap(tl, T.no, T.kneelLand + 0.1));
    const px = lerp(lerp(500, 515, push), 560, down) + 12 * Math.sin(tl * 0.9);
    const py = lerp(lerp(lerp(860, 910, push), 900, kn), 1072, down);
    // standing: 1 -> 1.25 on the push-in; kneeling: 1.36 (whip push on the heart); down: 1.3 -> 1.42
    let z = 1.0 + 0.03 * ease.inOut(remap(tl, T.days, T.your)) + 0.22 * push;
    for (let i = 0; i < 3; i++) {
      const k = tl - F[i];
      if (k >= 0) z += 0.045 * ease.decel(Math.min(1, k / 0.05)) * Math.exp(-k * 4.5);
    }
    z += 0.11 * ease.decel(remap(tl, T.no, T.no + 0.2));
    z += 0.04 * Math.exp(-Math.max(0, tl - T.surv) * 4) * (tl >= T.surv ? 1 : 0);
    z = lerp(z, 1.3, down);
    z += 0.12 * ease.inOut(remap(tl, T.fallLand + 0.1, T.pur));
    z += 0.03 * ease.decel(remap(tl, T.pur, T.pur + 0.15));
    // dutch tilt grows as integrity drops; handheld always; shake on every hit
    const tr = Math.max(trauma(tl, F, 5.5), 0.75 * trauma(tl, [T.kneelLand], 7), trauma(tl, [T.fallLand], 5), 0.7 * trauma(tl, [T.pur], 8));
    const hand = handheld(ta, 1.6 + 2.2 * (1 - v));
    const shk = shake(ta, tr, 44);
    const base = {
      cx: ax - (px - W / 2) / z, cy: ay - (py - H / 2) / z, zoom: z,
      rot: 0.11 * ease.inOut(1 - v) + 0.012 * Math.sin(tl * 1.3),
    };
    return { cam: addCam(base, hand, shk), tr };
  }

  // ---------------------------------------------------------------------------------------
  // screen-space layers
  // ---------------------------------------------------------------------------------------
  function scanX(tl) {
    return lerp(W + 60, -80, ease.inOut(remap(tl, T.scan0, T.scan1)));
  }
  function drawScanBeam(ctx, x) {
    if (x > W + 40 || x < -70) return;
    ctx.save();
    const g = ctx.createLinearGradient(x, 0, x + 220, 0);
    g.addColorStop(0, rgba(FG, 0.22));
    g.addColorStop(1, rgba(FG, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 220, H);
    ctx.fillStyle = rgba(FG, 0.06);
    for (let y = 0; y < H; y += 9) ctx.fillRect(x, y, 220, 2);
    ctx.shadowColor = rgba(FG, 0.95);
    ctx.shadowBlur = 34;
    ctx.fillStyle = COL.fg;
    ctx.fillRect(x - 3, 0, 6, H);
    ctx.restore();
  }
  function drawWash(ctx, v, pulse, dim) {
    const a = ((1 - v) * 0.5 + pulse * 0.16 * (1 - v)) * (1 - 0.4 * dim);
    if (a <= 0.003) return;
    ctx.save();
    ctx.globalAlpha = clamp(a);
    ctx.drawImage(sprites().wash, 0, 0, W, H);
    ctx.restore();
  }
  function drawTags(ctx, cam, p, j, fr, tl) {
    if (!TAGS) return;
    ctx.save();
    ctx.font = `34px ${FONT.bold}`;
    ctx.letterSpacing = '5px';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let i = 0; i < 5; i++) {
      const k = tl - T.fails[i];
      if (k < 0 || k > 0.95) continue;
      const nx = i < 4 ? T.fails[i + 1] : T.fallStart; // hand off to the next tag; clear before the fall
      const a = ease.decel(remap(k, 0, 0.08)) * (1 - ease.accel(remap(k, 0.7, 0.95))) * (1 - remap(tl, nx - 0.02, nx + 0.06));
      if (a <= 0.01) continue;
      const c = toScreen(cam, ...organWorld(i, p, j, fr));
      const ty = clamp(c[1] - 20, 690, 1180);
      const tx = Math.max(250, c[0] - 170 * cam.zoom);
      ctx.globalAlpha = a;
      ctx.strokeStyle = COL.red;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx + 14, ty);
      ctx.lineTo(lerp(tx + 14, c[0] - ORG[i].r * 0.9 * cam.zoom * HS, ease.decel(remap(k, 0, 0.12))), lerp(ty, c[1], ease.decel(remap(k, 0, 0.12))));
      ctx.stroke();
      ctx.fillStyle = COL.red;
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 10;
      ctx.fillText(ORG[i].tag, tx, ty);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
  // faint ECG trace once he is down; at "purpose" a red flat line slices across the frame
  function wave(dt) {
    const g = (mu, sg, a) => a * Math.exp(-((dt - mu) ** 2) / (2 * sg * sg));
    return g(0.04, 0.018, 0.12) + g(0.105, 0.008, -0.14) + g(0.13, 0.009, 1) + g(0.152, 0.009, -0.32) + g(0.32, 0.04, 0.22);
  }
  function drawECGTrace(ctx, S, tl, ta, dim) {
    const appear = ease.decel(remap(tl, T.fallLand - 0.1, T.fallLand + 0.35));
    if (appear <= 0) return;
    const purA = S.start + T.pur, span = 2.0, x0 = 70, x1 = 1010;
    const beats = TL.events.heartbeats.filter((b) => b > ta - span - 0.7 && b < purA);
    const amp = (b) => 70 * lerp(1, 0.35, remap(b - S.start, T.fallLand, T.pur));
    const sweep = tl >= T.pur ? ease.decel(remap(tl, T.pur, T.pur + 0.1)) : -1;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // old trace (fades as the flat line overwrites it)
    ctx.globalAlpha = appear * 0.42 * (1 - 0.8 * dim);
    ctx.strokeStyle = COL.fg;
    ctx.lineWidth = 5;
    ctx.beginPath();
    const N = 160;
    let last = null;
    for (let i = 0; i <= N; i++) {
      const u = i / N, tau = ta - span * (1 - u);
      const x = lerp(x0, x1, u);
      if (sweep >= 0 && x < lerp(-20, W + 20, sweep)) continue;
      let y = ECG_Y;
      for (const b of beats) { const dt = tau - b; if (dt > -0.05 && dt < 0.6) y -= wave(dt) * amp(b); }
      if (tau >= purA) y = ECG_Y;
      if (last === null) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      last = [x, y];
    }
    ctx.stroke();
    if (last && sweep < 0) {
      ctx.globalAlpha = appear * 0.8;
      ctx.fillStyle = COL.fg;
      ctx.shadowColor = rgba(FG, 0.8);
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(last[0], last[1], 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (sweep >= 0) {
      const xe = lerp(-20, W + 20, sweep);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.shadowColor = rgba(RED, 1);
      ctx.shadowBlur = 34;
      ctx.strokeStyle = COL.red;
      ctx.lineWidth = 9;
      poly(ctx, [[-20, ECG_Y], [xe, ECG_Y]]);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFD0D0';
      ctx.lineWidth = 2.5;
      poly(ctx, [[-20, ECG_Y], [xe, ECG_Y]]);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = rgba(RED, 1);
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(xe, ECG_Y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  function drawBar(ctx, tl, cam, dim) {
    const bar = T.bar;
    let punch = 0;
    for (const f of T.fails) if (tl >= f) punch = Math.max(punch, Math.exp(-(tl - f) * 9));
    const sc = 1 + 0.035 * punch;
    const cx = BAR.x + BAR.w / 2, cy = BAR.y + BAR.h / 2;
    ctx.save();
    ctx.globalAlpha = 1 - 0.6 * dim;
    ctx.translate(cx + cam.ox * 0.35, cy + cam.oy * 0.35);
    ctx.rotate(cam.rot * 0.25);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = 'rgba(11,11,12,0.88)';
    roundRect(ctx, BAR.x, BAR.y, BAR.w, BAR.h, BAR.h * 0.22);
    ctx.fill();
    bar.draw(ctx, tl);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------------------
  SCENES.s4 = {
    textCy: 410,
    init(S) {
      T = times(S);
      buildPath();
      buildCracks();
      const F = T.fails;
      const vals = [0.77, 0.6, 0.43, 0.25, 0.1];
      const keys = [[0, 1], [F[0] - 0.02, 0.93]];
      let prev = 0.93;
      for (let i = 0; i < 5; i++) {
        const next = i < 4 ? F[i + 1] - 0.02 : T.pur - 0.04;
        keys.push([F[i], prev], [F[i] + 0.13, vals[i]]);
        prev = i < 4 ? vals[i] - 0.025 : 0.03;
        keys.push([next, prev]);
      }
      keys.push([T.pur, 0]);
      for (let i = 1; i < keys.length; i++) if (keys[i][0] <= keys[i - 1][0]) keys[i][0] = keys[i - 1][0] + 0.01;
      T.bar = new DrainBar({
        x: BAR.x, y: BAR.y, w: BAR.w, h: BAR.h, label: 'BODY INTEGRITY', labelSize: 46, pctSize: 72,
        warn: 0.45, segments: 12, trailLag: 0.3, keys,
      });
    },
    draw(ctx, S, tl, ta) {
      if (!T) this.init(S);
      const v = T.bar.valueAt(tl);
      const dead = tl >= T.pur;
      const dim = ease.decel(remap(tl, T.pur, T.pur + 0.08));
      const pulse = pulseFrom(TL.events.heartbeats, ta, 7);
      const { cam } = camAt(tl, ta, v);
      const p = heroPose(tl);

      drawCorridor(ctx, cam, tl, ta);
      dust(ctx, ta, 26, 4, { alpha: 0.1, vx: -30, vy: 10 });
      if (dim > 0) flash(ctx, 0.62 * dim, '#000000');

      // hero: plain stickman until the scanner beam has passed, x-ray after
      const bx = scanX(tl);
      const hs = toScreen(cam, p.x, p.y - 200);
      const glow = Math.exp(-Math.pow((bx - hs[0]) / 140, 2)) + 0.25 * Math.exp(-Math.max(0, tl - T.scan1) * 3) * (tl > T.scan1 ? 1 : 0);
      let j = null;
      // contact shadow
      withCam(ctx, cam, () => {
        const jj = rigJoints(p);
        const xs = [jj.footL[0], jj.footR[0], jj.kneeL[0], jj.kneeR[0], jj.head[0], jj.hip[0]];
        const l = Math.min(...xs) - 40, r = Math.max(...xs) + 40;
        const hw = (r - l) / 2 + 30;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.drawImage(sprites().shadow, (l + r) / 2 - hw, G - hw * 0.12, hw * 2, hw * 0.24);
        ctx.restore();
      });
      if (bx > -70) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-50, -50, bx + 50, H + 100);
        ctx.clip();
        withCam(ctx, cam, () => drawHero(ctx, p, tl, ta, false, 0));
        ctx.restore();
      }
      if (bx < W + 40) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx, -50, W + 100, H + 100);
        ctx.clip();
        withCam(ctx, cam, () => { j = drawHero(ctx, p, tl, ta, true, clamp(glow)); });
        ctx.restore();
      }
      // floor dust where he lands: soft puffs rolling out along the floor
      const dl = tl - T.fallLand;
      if (dl >= 0 && dl < 1.0) {
        withCam(ctx, cam, () => {
          const jj = rigJoints(p);
          ctx.save();
          for (let q = 0; q < 10; q++) {
            const side = q % 2 ? 1 : -1;
            const ox = lerp(jj.hip[0] - 100, jj.head[0], (q >> 1) / 4);
            const sp = 60 + 110 * (0.5 + 0.5 * hash(q * 7 + 3));
            const x = ox + side * sp * (1 - Math.exp(-dl * 4)) / 2;
            const y = G - 14 - 40 * (0.5 + 0.5 * hash(q * 11)) * (1 - Math.exp(-dl * 3));
            const r = 22 + 46 * ease.decel(clamp(dl / 0.8));
            ctx.globalAlpha = 0.16 * (1 - dl);
            ctx.drawImage(sprites().glow, x - r, y - r, r * 2, r * 2);
          }
          ctx.restore();
        });
      }
      // the floor fades to dark above the bar (cropped legs dissolve instead of being cut)
      ctx.drawImage(sprites().fade, 0, 1222, W, 78);
      ctx.fillStyle = 'rgba(11,11,12,0.88)';
      ctx.fillRect(0, 1300, W, H - 1300);

      drawWash(ctx, v, pulse, dim);
      // red hit flash on each organ failure
      let hit = 0;
      for (const f of T.fails) if (tl >= f) hit = Math.max(hit, 0.2 * Math.exp(-(tl - f) * 12));
      if (hit > 0.003) flash(ctx, hit, COL.red);
      if (j) drawTags(ctx, cam, p, j, frameOf(j), tl);
      drawScanBeam(ctx, bx);
      drawECGTrace(ctx, S, tl, ta, dim);
      drawBar(ctx, tl, cam, dim);
      if (dead) flash(ctx, 0.5 * Math.exp(-(tl - T.pur) * 14), COL.red);
    },
    _dbg: { heroPose: (tl) => heroPose(tl), camAt: (tl, ta, v) => camAt(tl, ta, v), toScreen, T: () => T, rigJoints: (p) => rigJoints(p) },
    glitch(S, tl) {
      if (!T) return 0;
      let g = 0;
      for (const f of T.fails) {
        const k = tl - f;
        if (k >= 0 && k < 0.1) g = Math.max(g, 0.4 * (1 - k / 0.1) + 0.08);
      }
      const kp = tl - T.pur;
      if (kp >= 0 && kp < 0.07) g = 0.55;
      return g;
    },
    hud(S, tl) {
      if (!T) this.init(S);
      if (tl >= T.pur) return { hours: 0, rate: 0, danger: 1, glitch: 0, text: '---' };
      const lock = T.daysEnd;
      if (tl < lock) {
        const keys = [[0, 80], [lock, 264]];
        return { hours: hoursAt(keys, tl), rate: hoursRate(keys, tl), danger: remap(tl, lock - 0.3, lock), glitch: 0 };
      }
      const n = T.fails.filter((f) => tl >= f).length + (tl >= T.fallLand ? 1 : 0);
      const hitNow = T.fails.some((f) => tl >= f && tl < f + 0.15) || (tl >= lock && tl < lock + 0.12);
      return { hours: 264 + n, rate: 0.3, danger: 1, glitch: hitNow ? 1 : 0.22 };
    },
  };
})();
