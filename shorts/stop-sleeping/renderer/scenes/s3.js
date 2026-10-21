// Scene 3: DAY 3, hallucinations. A dark hallway in one-point perspective lit by one faulty
// bulb. He backs down the hall away from eyes in the dark; shadows creep from the corners and
// doorways. On "aren't" a shadow figure is right behind him (snap-zoom), he spins, it glitches
// away. "Temperature": he hugs himself, frost grows in from the edges, the thermometer drops.
// "Heart": a red heart beats in his chest with the ECG; on "glitches" the rhythm breaks, he
// clutches his chest and the camera jolts on every irregular beat.
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const fgA = (a) => `rgba(242,240,235,${clamp(a).toFixed(3)})`;
  const whA = (a) => `rgba(255,255,255,${clamp(a).toFixed(3)})`;
  const rdA = (a) => `rgba(255,43,43,${clamp(a).toFixed(3)})`;
  const blA = (a) => `rgba(0,0,0,${clamp(a).toFixed(3)})`;
  const h01 = (n) => 0.5 + 0.5 * hash(n);
  const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
  const win = (t, a, b, rin, rout) => (b <= a ? 0 : sm(remap(t, a, a + rin)) * (1 - sm(remap(t, b - rout, b))));

  // ---------------- hallway projection ----------------
  // World units ~ metres: x across the hall (0 = centre), y height above the floor, z depth down
  // the hall. The lens is shifted so the vanishing point sits right of centre: the left wall
  // (doors, creepers, the shadow figure) gets the space and the hero stands left of the VP.
  const F = 1000, VX = 700, VY = 905, EH = 1.65, CH = 2.75, HW = 1.15, CAMX = 0.45;
  const HEIGHT = 1.75, RIG_H = 570;            // rig height in px at s = 1
  const Z_STOP = 10, HX0 = -0.2, STEP = 0.22;  // where he ends up; lateral position; metres per step
  const D_END = 3.84;                          // camera distance once he stops (hero s ~ 0.8)
  const BULB = { x: -0.05, z: Z_STOP + 0.4, cord: 0.5 };
  const PHANTOM = { x: -0.86, z: Z_STOP - 0.95, h: 2.3 };
  const Z_FAR = Z_STOP + 15;
  const DOORS = [
    { side: -1, dz: 0.55, open: true, noise: true },
    { side: -1, dz: 3.3, open: true },
    { side: -1, dz: 6.6, open: false },
    { side: -1, dz: -2.6, open: false },
    { side: 1, dz: 1.5, open: true },
    { side: 1, dz: 4.8, open: false },
  ];
  let CZ = 0;                                  // camera depth for the frame being drawn
  function P3(x, y, z) {
    const d = Math.max(0.25, z - CZ), k = F / d;
    return [VX + (x - CAMX) * k, VY + (EH - y) * k, k];
  }
  const fog = (z) => clamp(1.35 - (z - CZ) / 11);

  // ---------------- keyframe helpers ----------------
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
  function trackV(keys, t) {
    if (t <= keys[0][0]) return keys[0][1].slice();
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const u = (keys[i][2] || ease.inOut)(remap(t, keys[i - 1][0], keys[i][0]));
        return keys[i][1].map((v, k) => lerp(keys[i - 1][1][k], v, u));
      }
    }
    return keys[keys.length - 1][1].slice();
  }
  function mono(keys) {
    for (let i = 1; i < keys.length; i++) if (keys[i][0] < keys[i - 1][0] + 0.02) keys[i][0] = keys[i - 1][0] + 0.02;
    return keys;
  }

  // ---------------- timing: every beat comes from a cue or a VO word ----------------
  const memo = {};
  function T(S) {
    const key = `${S.start}:${S.dur_f}`;
    if (memo[key]) return memo[key];
    const c = S.cues, dur = sceneDur(S);
    const w = (word, o, d) => { try { return cue(S, word, o); } catch (e) { return d; } };
    const B = { dur };
    B.P = c.phantom ?? dur * 0.36;
    B.TP = c.temp ?? dur * 0.58;
    B.HT = c.heart ?? dur * 0.81;
    B.GL = c.glitch ?? dur * 0.9;
    B.three = w('three', {}, B.P * 0.17);
    B.you = w('you', {}, B.P * 0.39);
    B.seeing = w('seeing', {}, B.P * 0.6);
    B.things = w('things', {}, B.P * 0.75);
    B.that = w('that', {}, B.P * 0.9);
    B.there = w('there', {}, B.P + 0.41);
    B.your1 = w('your', {}, B.TP - 0.6);
    B.core = w('core', {}, B.TP - 0.3);
    B.drops = w('drops', {}, B.TP + 0.7);
    B.your2 = w('your', { nth: 1 }, B.HT - 0.3);
    B.ecg = TL.events.ecg.map((e) => ({ t: e.t - S.start, glitch: !!e.glitch })).filter((e) => e.t > -1 && e.t < dur + 1);
    B.beats = B.ecg.map((e) => e.t).sort((a, b) => a - b);
    B.gbeats = B.ecg.filter((e) => e.glitch).map((e) => e.t).sort((a, b) => a - b);
    if (!B.gbeats.length) B.gbeats = [B.GL + 0.23, B.GL + 0.45, B.GL + 0.63].filter((x) => x < dur);
    // derived beats
    B.glance0 = B.three + 0.1;
    B.glance1 = Math.min(B.glance0 + 0.34, B.you - 0.1);
    B.dark0 = Math.max(B.seeing + 0.3, Math.min(B.that + 0.03, B.P - 0.24));
    B.spin = B.P + 0.27;
    B.van = Math.max(B.there + 0.05, B.P + 0.47);
    B.calm = B.van + 0.32;
    // bulb outages: [from, to, level] (sfx_scenes/s3.py mirrors this list for the buzz and zaps)
    B.offs = [
      [0.034, 0.1, 0.08], [0.167, 0.2, 0.3],
      [B.dark0, B.dark0 + 0.1, 0.05], [B.dark0 + 0.135, B.P, 0.02],
      [B.van, B.van + 0.067, 0.12], [B.van + 0.1, B.van + 0.134, 0.35],
      ...B.gbeats.map((g) => [g, g + 0.067, 0.35]),
    ];
    // walking: total distance (he stops in the dark before the phantom)
    B.total = walked(dur, B);
    B.hoursK = mono([[0, 48], [B.three + 0.38, 72], [dur, 80]]);
    B.dangerK = mono([[0, 0.45], [B.three + 0.38, 0.62], [B.P, 0.72], [B.HT, 0.86], [B.GL, 1]]);
    B.Dk = mono([[0, 4.55], [B.dark0, D_END, ease.inOut]]);
    // darkness: creeper growth, recoils when the light slams back on, swallows the end
    B.growK = mono([
      [0, 0.18], [B.things - 0.05, 0.4], [B.things + 0.18, 0.62, ease.decel], [B.dark0, 0.6], [B.P - 0.01, 0.82],
      [B.P + 0.12, 0.5, ease.decel], [B.van, 0.55], [B.van + 0.3, 0.32, ease.decel], [B.TP, 0.3], [B.HT, 0.42],
      [B.GL, 0.55], [dur, 1.0, ease.accel],
    ]);
    memo[key] = B;
    // camera keys need the hero's resting screen position, so they are built after memoising
    B.shots = shotKeys(B);
    return B;
  }

  // ---------------- walking backward ----------------
  function speedAt(t, B) {
    const slow = 0.5 * win(t, -1, B.you + 0.02, 0.01, 0.14) * (1 - 0.92 * win(t, B.glance0, B.glance1, 0.07, 0.1));
    const fast = 0.85 * win(t, B.seeing - 0.02, B.dark0 + 0.06, 0.12, 0.18);
    return slow + fast;
  }
  function walked(t, B) {
    t = Math.max(0, t);
    const n = Math.max(1, Math.ceil(t * 40)), h = t / n;
    let s = 0;
    for (let i = 0; i < n; i++) s += speedAt((i + 0.5) * h, B);
    return s * h;
  }
  function world(t, B) {
    const dist = walked(t, B);
    const hz = Z_STOP + (B.total - dist);
    const D = track(B.Dk, t);
    const step = 0.16 * ease.decel(remap(t, B.spin, B.spin + 0.25));
    return { dist, hz, hx: HX0 - 0.07 * clamp(dist / Math.max(B.total, 0.01)) + step, cz: hz - D, speed: speedAt(t, B) };
  }

  // ---------------- the bulb ----------------
  function lightAt(t, ta, B) {
    let L = 1;
    for (const [a, b, lv] of B.offs) if (t >= a && t < b) L = Math.min(L, lv);
    const base = 1 - 0.2 * sm(remap(t, B.core, B.TP + 0.4)) - 0.32 * sm(remap(t, B.HT - 0.25, B.HT + 0.25));
    const shimmer = hash(Math.floor(ta * 30) * 3 + 11) > 0.82 ? 0.9 : 1;
    const over = t >= B.P && L >= 1 ? 0.6 * Math.exp(-(t - B.P) * 5) : 0;
    return L * base * shimmer + over;
  }
  function bulbSway(t, B) {
    const kick = t >= B.P ? 0.32 * Math.exp(-(t - B.P) * 1.1) : 0;
    return (0.05 + kick) * Math.sin(t * 3.1 + 0.4) + 0.02 * noise1(t * 0.8, 61);
  }

  // ---------------- hero acting ----------------
  function heroPose(t, ta, B, wd) {
    const ph = 0.6 - (wd.dist / STEP) * Math.PI;
    const amt = clamp(wd.speed / 0.62);
    const wl = walkLimbs(ph, amt);
    const walkP = (lean, up) => pose({
      facing: 1, torso: lean - 0.03 * amt, neck: 0.12 + 0.05 * Math.sin(ta * 2.1), legL: wl.legL, legR: wl.legR,
      armL: [0.5 * wl.armL[0] + up, 0.5 + 0.5 * up], armR: [0.5 * wl.armR[0] + up + 0.12, 0.55 + 0.5 * up],
      eyes: 'wide', mouth: up > 0.5 ? 'o' : 'flat',
    });
    const look = (t - B.calm) * 4.2;
    const chatter = Math.floor(ta * 15) % 2 === 0 ? 'grit' : 'flat';
    const beat = pulseFrom(B.beats, t, 9);
    const gb = pulseFrom(B.gbeats, t, 7);
    const crouch = sm(remap(t, B.drops - 0.05, B.drops + 0.35));
    const segs = [
      [-1, () => walkP(-0.06, 0.28), 0],
      // glances back over his shoulder (exactly where the figure will be)
      [B.glance0, () => pose({ facing: -1, torso: 0.02, neck: 0.22, armL: [0.3, 0.5], armR: [0.42, 0.6], legL: [0.16, -0.1], legR: [-0.14, -0.05], eyes: 'wide', mouth: 'o' }), 0.07],
      [B.glance1, () => walkP(-0.06, 0.28), 0.08],
      // a noise in the doorway on the left: head snaps to it
      [B.you, () => pose({ facing: 0, torso: 0.05, neck: -0.2, look: -1, armL: [1.0, 0.95], armR: [0.6, 0.9], legL: [0.24, 0], legR: [0.14, 0], eyes: 'wide', mouth: 'o' }), 0.07],
      // eyes open at the end of the hall: snaps back and backs away faster
      [B.seeing, () => walkP(-0.17, 0.8), 0.07],
      // the bulb dies: he freezes
      [B.dark0, () => pose({ facing: 1, torso: -0.1, neck: 0.04, armL: [0.25, 0.35], armR: [0.4, 0.45], legL: [0.2, -0.06], legR: [-0.14, -0.04], eyes: 'wide', mouth: 'flat' }), 0.16],
      // something is behind him: head pulls in
      [B.P + 0.03, () => pose({ facing: 1, torso: -0.04, neck: -0.18, armL: [0.12, 0.25], armR: [0.18, 0.3], legL: [0.18, -0.08], legR: [-0.12, -0.06], eyes: 'wide', mouth: 'o' }), 0.08],
      // spins around: recoil
      [B.spin, () => pose(Object.assign({}, POSES.recoil, { facing: 0, torso: 0.14, neck: 0.12, look: -1, eyes: 'wide', mouth: 'open', legL: [0.28, -0.05], legR: [0.16, 0] })), 0.06],
      // it's gone: scans the hall, arms coming down
      [B.calm, () => pose({ facing: 0, torso: 0.03 * Math.sin(look), neck: -0.12 * Math.sin(look), look: Math.sin(look), armL: [0.55, 0.85], armR: [0.5, 0.8], legL: [0.2, 0], legR: [0.16, 0], eyes: 'wide', mouth: 'o' }), 0.4],
      // the cold creeps in: arms pull in, rubbing
      [B.core - 0.05, () => pose({ facing: 0, torso: 0, neck: 0.1, armL: [0.3, -1.5 + 0.25 * Math.sin(ta * 9)], armR: [0.36, -1.45 + 0.25 * Math.sin(ta * 9 + 2)], legL: [0.1, 0], legR: [0.1, 0], eyes: 'open', lid: 0.25, mouth: 'flat' }), 0.35],
      // "temperature": hugging himself, shivering, knees buckling on "drops"
      [B.TP - 0.08, () => pose(Object.assign({}, POSES.hug, {
        armL: [0.26, -2.36], armR: [0.22, -2.42],
        neck: 0.12 + 0.06 * crouch, eyes: 'wide', mouth: chatter,
        legL: [lerp(0.06, 0.34, crouch), lerp(0, -0.3, crouch)], legR: [lerp(0.06, 0.32, crouch), lerp(0, -0.28, crouch)],
      })), 0.25],
      // "heart": arms open off the chest, staring at the glow
      [B.HT - 0.1, () => pose({ facing: 0, torso: 0, neck: -0.08, armL: [0.62, -1.2], armR: [0.62, -1.25], legL: [0.3, -0.24], legR: [0.28, -0.22], eyes: 'wide', mouth: 'o', glow: 0.5 * beat }), 0.14],
      // "glitches": clutches his chest, buckling on every irregular beat
      [B.GL, () => pose(Object.assign({}, POSES.clutch, {
        facing: 1, torso: 0.26 + 0.22 * gb, neck: 0.3 + 0.25 * gb, eyes: 'wide', mouth: 'grit', glow: 0.85 * gb,
        legL: [0.3, -0.45 - 0.35 * gb], legR: [-0.02, -0.2 - 0.3 * gb],
      })), 0.1],
    ];
    segs.sort((a, b) => a[0] - b[0]);   // real VO timings could reorder neighbouring beats
    let i = 0;
    while (i + 1 < segs.length && t >= segs[i + 1][0]) i++;
    let p = segs[i][1]();
    const bl = segs[i][2];
    if (i > 0 && bl > 0 && t < segs[i][0] + bl) p = lerpPose(segs[i - 1][1](), p, ease.std((t - segs[i][0]) / bl));
    return p;
  }

  // ---------------- shadow figure ----------------
  function phantomPose(t, B) {
    const [sx, sy, k] = P3(PHANTOM.x, 0, PHANTOM.z);
    const reach = ease.decel(remap(t, B.P - 0.1, B.P + 0.45));
    const p = pose({
      facing: 1, torso: 0.2, neck: 0.38 + 0.08 * Math.sin(t * 7), s: (PHANTOM.h * k) / RIG_H, x: sx, y: sy - 500,
      armR: [lerp(0.7, 1.32, reach), lerp(0.5, 0.12, reach)], armL: [0.32, 0.35],
      legL: [-0.06, -0.05], legR: [0.1, -0.08],
    });
    return onGround(p, sy);
  }
  function drawPhantomBody(ctx, p, rimA) {
    const j = rigJoints(p), s = p.s;
    const seg = (pts, lw) => {
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    const fingers = (el, hd, lw) => {
      const a = Math.atan2(hd[1] - el[1], hd[0] - el[0]);
      for (let f = -1.5; f <= 1.5; f += 1) {
        const b = a + f * 0.2, L = (52 + 14 * (1.5 - Math.abs(f))) * s;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(hd[0], hd[1]);
        ctx.quadraticCurveTo(hd[0] + Math.cos(b) * L * 0.6, hd[1] + Math.sin(b) * L * 0.6, hd[0] + Math.cos(b + 0.35) * L, hd[1] + Math.sin(b + 0.35) * L);
        ctx.stroke();
      }
    };
    const pass = (extra, col) => {
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      seg([j.hip, j.kneeL, j.footL], 20 * s + extra);
      seg([j.shoulder, j.elbowL, j.handL], 17 * s + extra);
      fingers(j.elbowL, j.handL, 6 * s + extra);
      seg([j.hip, j.neck], 34 * s + extra);
      seg([j.hip, j.kneeR, j.footR], 20 * s + extra);
      seg([j.shoulder, j.elbowR, j.handR], 17 * s + extra);
      fingers(j.elbowR, j.handR, 6 * s + extra);
      ctx.beginPath();
      ctx.ellipse(j.head[0], j.head[1], j.headR * 0.92 + extra / 2, j.headR * 1.12 + extra / 2, 0.35, 0, TAU);
      ctx.fill();
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (rimA > 0.01) pass(8 * s, fgA(rimA));
    pass(0, '#000');
    return j;
  }
  function drawPhantom(ctx, p, a, slice, ta, L) {
    if (a <= 0.01) return;
    const j = rigJoints(p), s = p.s;
    ctx.save();
    ctx.globalAlpha = a;
    // a pool of darkness around it
    const g = ctx.createRadialGradient(j.chest[0], j.chest[1], 40 * s, j.chest[0], j.chest[1], 420 * s);
    g.addColorStop(0, blA(0.55));
    g.addColorStop(1, blA(0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(j.chest[0], j.chest[1], 420 * s, 0, TAU);
    ctx.fill();
    const body = () => drawPhantomBody(ctx, p, 0.12 + 0.2 * clamp(L));
    if (slice > 0.01) {
      // glitching out: the figure tears into displaced horizontal slices
      const top = j.head[1] - j.headR * 1.4, bot = Math.max(j.footL[1], j.footR[1]) + 20;
      const n = 9, seed = Math.floor(ta * 30);
      for (let i = 0; i < n; i++) {
        const y0 = lerp(top, bot, i / n), y1 = lerp(top, bot, (i + 1) / n);
        if (hash(i * 13 + seed) > 1.4 - slice * 1.6) continue;
        ctx.save();
        ctx.beginPath();
        ctx.rect(-4000, y0, 9000, y1 - y0 + 1);
        ctx.clip();
        ctx.translate(140 * slice * hash(i * 7 + seed * 3), 0);
        body();
        ctx.restore();
      }
    } else {
      body();
    }
    // eyes: two slanted red slits
    const ex = j.head[0] + j.headR * 0.18, ey = j.head[1] - j.headR * 0.02;
    ctx.fillStyle = COL.red;
    ctx.shadowColor = 'rgba(255,43,43,0.95)';
    ctx.shadowBlur = 30 * s;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(ex + sx * j.headR * 0.36, ey, 15 * s, 6.5 * s, sx * 0.32, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  function phantomEyesWorld(B) {
    // screen-at-rest position of the figure's eyes (camera depth fixed after he stops)
    const save = CZ;
    CZ = Z_STOP - D_END;
    const j = rigJoints(phantomPose(B.P + 0.2, B));
    CZ = save;
    return [j.head[0] + j.headR * 0.18, j.head[1]];
  }
  function heroRestChest(B) {
    const save = CZ;
    CZ = Z_STOP - D_END;
    const [sx, sy, k] = P3(HX0 - 0.07 + 0.16, 0, Z_STOP);
    const p = onGround(pose(Object.assign({}, POSES.hug, { x: sx, y: sy - 300, s: (HEIGHT * k) / RIG_H })), sy);
    const j = rigJoints(p);
    CZ = save;
    return j.chest;
  }

  // ---------------- camera ----------------
  function shotKeys(B) {
    const [ex, ey] = phantomEyesWorld(B);
    const [hx, hy] = heroRestChest(B);
    const zs = 2.45;
    const snap = [zs, ex - (430 - 540) / zs, ey - (900 - 960) / zs, 0.045];
    const zc = 1.72;
    const chest = [zc, hx - (520 - 540) / zc, hy - (1000 - 960) / zc, 0];
    const zh = 1.3;
    const hug = [zh, hx - (520 - 540) / zh, hy - (1020 - 960) / zh, 0];
    const two = [1.06, 470, 985, 0];
    return mono([
      [0, [1.13, 540, 975, 0]],
      [0.62, [1.0, 540, 960, 0], ease.decel],
      [B.you - 0.02, [1.0, 535, 960, 0]],
      [B.you + 0.13, [1.09, 455, 990, -0.012], ease.decel],
      [B.seeing - 0.02, [1.1, 460, 990, -0.012]],
      [B.seeing + 0.35, [1.17, 610, 950, 0.01], ease.decel],
      [B.dark0, [1.18, 590, 955, 0.008]],
      [B.P - 0.02, [1.27, 560, 965, 0], ease.inOut],
      [B.P + 0.12, snap, ease.decel],
      [B.spin, [zs * 1.04, snap[1], snap[2], 0.05]],
      [B.spin + 0.2, two, ease.inOut],
      [B.core, [1.08, 480, 985, 0]],
      [B.drops + 0.3, hug, ease.inOut],
      [B.your2, [zh * 1.03, hug[1], hug[2], 0]],
      [B.HT + 0.15, chest, ease.decel],
      [B.GL, [zc * 1.02, chest[1], chest[2], 0]],
      [B.GL + 0.14, [zc * 1.13, chest[1], chest[2] + 10, -0.03], ease.decel],
      [B.dur, [zc * 1.2, chest[1], chest[2] + 14, -0.04]],
    ]);
  }
  function camera(t, ta, B) {
    const [zoom, cx, cy, rot] = trackV(B.shots, t);
    const fear = Math.max(win(t, B.dark0, B.calm + 0.4, 0.2, 0.4), 0.3);
    const tr = Math.max(
      0.9 * trauma(t, [B.P], 6), 0.5 * trauma(t, [B.spin + 0.2], 8), 0.8 * trauma(t, [B.van], 7),
      0.35 * trauma(t, [B.drops], 6), 0.4 * trauma(t, [B.HT], 8),
      1.15 * trauma(t, B.gbeats, 6), 0.3 * trauma(t, [B.you, B.seeing], 9),
    );
    const shiver = 3.5 * win(t, B.TP - 0.1, B.HT, 0.3, 0.3);
    const sv = { ox: shiver * noise1(ta * 26, 71), oy: shiver * noise1(ta * 24, 72) };
    const sh = shake(ta, Math.min(1.3, tr), 34);
    const cam = addCam({ cx, cy, zoom, rot }, handheld(ta, 1.5 + 1.2 * fear), sh, sv);
    // heartbeat bumps the lens
    cam.zoom *= 1 + 0.018 * pulseFrom(B.beats, t, 10) + 0.05 * pulseFrom(B.gbeats, t, 9);
    cam.shake = sh;
    return cam;
  }

  // ---------------- environment ----------------
  function poly(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function line3(ctx, a, b) {
    const p = P3(...a), q = P3(...b);
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
  }
  // Smooth layers of the hall: one radial gradient carries both the bulb's light and the dark
  // falling away from it (software raster makes every full-frame fill cost ~4 ms), then the
  // floor pool, the cone of light and the dark far end.
  function drawHallBG(ctx, t, B, L, sway) {
    const lit = clamp(L);
    const bx = BULB.x + Math.sin(sway) * BULB.cord, by = CH - Math.cos(sway) * BULB.cord;
    const bp = P3(bx, by, BULB.z);
    const dc = [bp[0], bp[1] + 0.9 * bp[2]];
    // opaque stops (this layer sits on the opaque background): alpha stops band visibly
    const grey = (v) => { v = Math.round(clamp(v, 0, 255)); return `rgb(${v},${v},${v + 1})`; };
    const g = ctx.createRadialGradient(dc[0], dc[1], 0, dc[0], dc[1], 4.8 * bp[2]);
    g.addColorStop(0, grey(19 + 44 * lit));
    g.addColorStop(0.22, grey(15 + 20 * lit));
    g.addColorStop(0.55, grey(8 + 6 * lit));
    g.addColorStop(1, grey(2 + 3 * lit));
    ctx.fillStyle = g;
    ctx.fillRect(-2 * W, -2 * H, 5 * W, 5 * H);
    // floor pool under the bulb and the cone of light
    const fx = bx + Math.sin(sway) * 1.6;
    const pool = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      pool.push(P3(fx + Math.cos(a) * 1.0, 0, BULB.z + Math.sin(a) * 1.1));
    }
    ctx.fillStyle = fgA(0.05 * lit);
    poly(ctx, pool); ctx.fill();
    if (lit > 0.02) {
      const l = P3(fx - 1.05, 0, BULB.z), r = P3(fx + 1.05, 0, BULB.z);
      const cg = ctx.createLinearGradient(0, bp[1], 0, l[1]);
      cg.addColorStop(0, fgA(0.12 * lit));
      cg.addColorStop(1, fgA(0.012 * lit));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(bp[0] - 0.08 * bp[2], bp[1]);
      ctx.lineTo(bp[0] + 0.08 * bp[2], bp[1]);
      ctx.lineTo(r[0], r[1]);
      ctx.lineTo(l[0], l[1]);
      ctx.closePath();
      ctx.fill();
    }
    // the far end swallowed in black
    const vg = ctx.createRadialGradient(VX, VY, 8, VX, VY, 330);
    vg.addColorStop(0, blA(0.97));
    vg.addColorStop(0.4, blA(0.75));
    vg.addColorStop(1, blA(0));
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.arc(VX, VY, 330, 0, TAU);
    ctx.fill();
    return { bp, bx, by, dc };
  }

  // Line work and doors at full resolution. Strokes use a radial gradient centred on the light
  // so lines fade into the dark away from the bulb without another full-frame overlay.
  function drawHallLines(ctx, t, ta, B, L, bulb) {
    const zn = CZ + 0.3, zf = Z_FAR;
    const lit = clamp(L);
    const la = 0.07 + 0.17 * lit;
    const { bp, dc } = bulb;
    const grad = (a) => {
      const gr = ctx.createRadialGradient(dc[0], dc[1], 0.6 * bp[2], dc[0], dc[1], 4.4 * bp[2]);
      gr.addColorStop(0, fgA(a));
      gr.addColorStop(1, fgA(a * (0.3 + 0.2 * lit)));
      return gr;
    };
    ctx.lineCap = 'round';
    const strokeBand = (style, lw, fn) => {
      ctx.strokeStyle = style;
      ctx.lineWidth = lw;
      ctx.beginPath();
      fn();
      ctx.stroke();
    };
    const zl = Z_STOP + 11;
    // the four long edges of the hall
    strokeBand(grad(la), 5, () => {
      for (const x of [-HW, HW]) for (const y of [0, CH]) line3(ctx, [x, y, zn], [x, y, zl]);
    });
    // floorboards running away from us, baseboards, ceiling rails
    strokeBand(grad(la * 0.45), 3, () => {
      for (let i = 1; i < 6; i++) line3(ctx, [-HW + (2 * HW * i) / 6, 0, zn], [-HW + (2 * HW * i) / 6, 0, zl]);
      for (const x of [-HW, HW]) line3(ctx, [x, 0.14, zn], [x, 0.14, zl]);
      line3(ctx, [-0.35, CH, zn], [-0.35, CH, zl]);
      line3(ctx, [0.35, CH, zn], [0.35, CH, zl]);
    });
    // cross seams: these stream past as the camera dollies back
    const z0 = Math.ceil((zn - Z_STOP) / 1.1) * 1.1 + Z_STOP;
    for (let z = z0; z < zf; z += 1.1) {
      const a = la * 0.75 * fog(z) * (0.35 + 0.65 * Math.exp(-Math.abs(z - BULB.z) / 2.5));
      if (a < 0.01) continue;
      strokeBand(fgA(a), Math.max(1.5, 0.012 * F / (z - CZ)), () => {
        line3(ctx, [-HW, 0, z], [HW, 0, z]);
        line3(ctx, [-HW, CH, z], [HW, CH, z]);
      });
    }
    for (const dr of DOORS) drawDoor(ctx, dr, t, ta, B, lit);
  }

  function doorQuad(dr) {
    const x = dr.side * HW, z = Z_STOP + dr.dz, dw = 0.95, dh = 2.15;
    return [P3(x, 0, z), P3(x, dh, z), P3(x, dh, z + dw), P3(x, 0, z + dw)];
  }
  function drawDoor(ctx, dr, t, ta, B, lit) {
    const z = Z_STOP + dr.dz;
    if (z + 0.95 < CZ + 0.4) return;
    const q = doorQuad(dr);
    const fa = fog(z) * (0.35 + 0.65 * Math.exp(-Math.abs(z + 0.47 - BULB.z) / 2.5));
    if (fa <= 0.02) return;
    const k = q[0][2];
    if (dr.open) {
      ctx.fillStyle = '#000';
      poly(ctx, q); ctx.fill();
      // eyes in the doorway
      const eo = dr.noise ? win(t, B.things - 0.05, B.P - 0.05, 0.12, 0.1) : win(t, B.seeing + 0.25, B.van, 0.15, 0.1);
      if (eo > 0.01) drawEyesAt(ctx, P3(dr.side * HW, 1.55, z + 0.5), (F / (z + 0.5 - CZ)) * 0.06, eo, t, dr.dz * 7);
    } else {
      ctx.fillStyle = fgA(0.025 * fa);
      poly(ctx, q); ctx.fill();
    }
    ctx.strokeStyle = fgA((0.14 + 0.22 * lit) * fa);
    ctx.lineWidth = Math.max(2, 0.03 * k);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    ctx.lineTo(q[1][0], q[1][1]);
    ctx.lineTo(q[2][0], q[2][1]);
    ctx.lineTo(q[3][0], q[3][1]);
    ctx.stroke();
    if (!dr.open) {
      // knob
      const kp = P3(dr.side * HW, 1.0, z + 0.8);
      ctx.fillStyle = fgA((0.15 + 0.2 * lit) * fa);
      ctx.beginPath();
      ctx.arc(kp[0], kp[1], Math.max(2, 0.03 * kp[2]), 0, TAU);
      ctx.fill();
    }
  }

  // red eyes that blink open in the dark
  function drawEyesAt(ctx, p, size, open, t, seed) {
    const blink = (t * 0.7 + h01(seed)) % 1;
    const lid = blink > 0.93 ? 0.1 : 1;
    const o = open * lid;
    if (o <= 0.02) return;
    ctx.save();
    ctx.fillStyle = COL.red;
    ctx.shadowColor = 'rgba(255,43,43,0.9)';
    ctx.shadowBlur = size * 1.6;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(p[0] + sx * size * 1.3, p[1], size, size * 0.55 * o + 0.4, sx * 0.25, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // tapered black tendril along a path of screen points
  function tendril(ctx, pts, w0) {
    const n = pts.length;
    if (n < 2) return;
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
      const w = (w0 * Math.pow(1 - i / (n - 1), 0.75) + 1.2) / 2;
      L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fill();
  }

  // shadows spilling out of the open doorways and crawling along the wall toward him
  function doorCreep(ctx, t, ta, B, grow, grip) {
    ctx.fillStyle = '#000';
    for (const dr of DOORS) {
      if (!dr.open || dr.side > 0) continue;
      const z = Z_STOP + dr.dz;
      if (z < CZ + 0.5) continue;
      const amt = dr.noise ? Math.max(grow, grip) : grow * 0.8;
      for (let k = 0; k < 6; k++) {
        const y0 = 0.25 + k * 0.33 + 0.05 * hash(k * 3 + dr.dz * 10);
        const len = (0.25 + 0.95 * amt) * (0.6 + 0.4 * h01(k * 5 + 1)) * (dr.noise && k >= 2 && k <= 4 ? 1 + 0.5 * grip : 1);
        const pts = [];
        const N = 9;
        for (let i = 0; i <= N; i++) {
          const u = i / N;
          const zz = z + 0.06 - u * len;
          const yy = y0 + 0.22 * Math.sin(u * 3.2 + t * 1.7 + k) * u + 0.1 * noise1(u * 2 + t * 0.9, k + 40);
          const p = P3(-HW + 0.005, yy, zz);
          pts.push([p[0], p[1]]);
        }
        tendril(ctx, pts, 0.09 * P3(-HW, 0, z)[2]);
      }
      // fingers gripping the frame of the noisy door
      if (dr.noise && grip > 0.02) {
        for (let f = 0; f < 4; f++) {
          const pts = [];
          for (let i = 0; i <= 8; i++) {
            const u = i / 8;
            const zz = z + 0.03 - u * 0.24 * grip;
            const yy = 1.42 - f * 0.07 - 0.08 * Math.sin(u * 2.6) * grip;
            const p = P3(-HW + 0.005, yy, zz);
            pts.push([p[0], p[1]]);
          }
          tendril(ctx, pts, 0.035 * P3(-HW, 0, z)[2]);
        }
      }
    }
  }

  // creepers in the screen corners (improved drawCreepers): black masses with long bony fingers
  // that flex and curl toward him. Drawn together with the frost haze, the ECG backing band and
  // the red pulse.

  const ANCHORS = [[-30, 330, 0.9], [W + 30, 330, 0.8], [-40, H + 30, 1.2], [W + 40, H + 30, 1.05], [-50, 1100, 0.72]];
  function drawScreenFX(ctx, t, ta, grow, target, frostG, ecgA, gbp) {
    const g = ctx;
    g.save();
    // frost haze on the edges (under the creepers: the dark eats the frost)
    if (frostG > 0.005) {
      const hz = (x0, y0, x1, y1, a) => {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, whA(a));
        gr.addColorStop(1, whA(0));
        return gr;
      };
      g.fillStyle = hz(0, 0, 240, 0, 0.16 * frostG);
      g.fillRect(0, 0, 240, H);
      g.fillStyle = hz(W, 0, W - 240, 0, 0.16 * frostG);
      g.fillRect(W - 240, 0, 240, H);
      g.fillStyle = hz(0, H, 0, H - 280, 0.14 * frostG);
      g.fillRect(0, H - 280, W, 280);
    }
    g.fillStyle = '#000';
    const eyes = [];
    ANCHORS.forEach(([x, y, size], ci) => {
      const R = size * lerp(95, 250, grow) * (1 + 0.05 * Math.sin(t * 2.1 + ci));
      g.beginPath();
      const N = 36;
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * TAU;
        const r = R * (1 + 0.3 * noise1(a * 3.5 + t * 0.7, ci) + 0.12 * noise1(a * 7 - t * 1.4, ci + 9));
        const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.fill();
      const toC = Math.atan2(target[1] - y, target[0] - x);
      const nf = 4;
      for (let k = 0; k < nf; k++) {
        const a0 = toC + (k - (nf - 1) / 2) * 0.24 + 0.08 * noise1(t * 0.6 + k, ci + 20);
        const len = R * (1.35 + 1.7 * grow) * (k === 0 || k === nf - 1 ? 0.72 : 0.9 + 0.25 * h01(ci * 7 + k));
        // three phalanges; the knuckles flex so the fingers curl and uncurl
        const curl = 0.3 * Math.sin(t * 1.4 + k * 1.7 + ci) + 0.2 * noise1(t * 0.9, ci * 9 + k);
        const side = k < (nf - 1) / 2 ? -1 : k > (nf - 1) / 2 ? 1 : 0;
        const bends = [0, side * 0.12 + 0.3 * curl, 0.5 * curl];
        let px = x + Math.cos(a0) * R * 0.85, py = y + Math.sin(a0) * R * 0.85, a = a0;
        const pts = [[px, py]];
        const knuckles = [];
        [0.45, 0.33, 0.22].forEach((fr, si) => {
          a += bends[si];
          for (let i = 1; i <= 4; i++) {
            px += (Math.cos(a) * len * fr) / 4;
            py += (Math.sin(a) * len * fr) / 4;
            pts.push([px, py]);
          }
          if (si < 2) knuckles.push([px, py, (10 - 3 * si) * size + 3]);
        });
        tendril(g, pts, 13 * size + 5);
        for (const [kx, ky, kr] of knuckles) {
          g.beginPath();
          g.arc(kx, ky, kr * 0.62, 0, TAU);
          g.fill();
        }
      }
      if (ci % 2 === 0 && grow > 0.3) eyes.push([x + Math.cos(toC) * R * 0.5, y + Math.sin(toC) * R * 0.5, ci]);
    });
    if (ecgA > 0) {
      const bandG = g.createLinearGradient(0, 1150, 0, 1480);
      bandG.addColorStop(0, blA(0));
      bandG.addColorStop(0.45, blA(0.6 * ecgA));
      bandG.addColorStop(1, blA(0.25 * ecgA));
      g.fillStyle = bandG;
      g.fillRect(0, 1150, W, 330);
    }
    if (gbp > 0.02) {
      // irregular beats punch red into the frame edges
      const vg = g.createRadialGradient(W / 2, 1000, 430, W / 2, 1000, 1150);
      vg.addColorStop(0, rdA(0));
      vg.addColorStop(1, rdA(0.24 * gbp));
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    }
    g.restore();
    for (const [ex, ey, ci] of eyes) drawEyesAt(ctx, [ex, ey], 14, clamp((grow - 0.3) * 4), t + ci * 0.37, ci * 11 + 3);
  }

  // ---------------- frost ----------------
  // Fern-like ice dendrites: a stem with short needles at +-60 degrees, the odd side stem.
  // Segments carry u (0..1 growth order) so they can grow in from the screen edges.
  let FROST = null;
  function buildFrost() {
    const rnd = mulberry32(331);
    const segs = [];   // [x0, y0, x1, y1, u, cls] cls 0 stem, 1 side stem, 2 needle
    const seeds = [];
    for (let i = 0; i < 10; i++) seeds.push([0, 640 + i * 118 + rnd() * 50, 0, 1]);
    for (let i = 0; i < 10; i++) seeds.push([W, 620 + i * 118 + rnd() * 50, Math.PI, 1]);
    for (let i = 0; i < 4; i++) seeds.push([40 + i * 330 + rnd() * 60, H, -Math.PI / 2 + (i < 2 ? -0.75 : 0.75) + (rnd() - 0.5) * 0.4, 0.9]);
    for (let i = 0; i < 3; i++) seeds.push([0, 150 + i * 150, 0.15, 0.6]);
    for (let i = 0; i < 3; i++) seeds.push([W, 150 + i * 150, Math.PI - 0.15, 0.6]);
    const SIX = Math.PI / 3;
    for (const [x, y, ang0, k] of seeds) {
      const maxL = (120 + 170 * rnd()) * k;
      const grow = (sx, sy, a, len, depth, u0) => {
        let px = sx, py = sy, d = 0;
        const n = Math.max(2, Math.floor(len / 12));
        for (let i = 0; i < n; i++) {
          const nx = px + Math.cos(a) * 12, ny = py + Math.sin(a) * 12;
          segs.push([px, py, nx, ny, u0 + d / maxL, depth]);
          px = nx; py = ny; d += 12;
          const rest = len - d;
          if (i % 2 === 1 && rest > 10) {
            for (const sg of [-1, 1]) {
              const nl = Math.min(depth === 0 ? 46 : 26, rest * 0.42) * (0.65 + 0.35 * rnd());
              const b = a + sg * SIX;
              segs.push([px, py, px + Math.cos(b) * nl, py + Math.sin(b) * nl, u0 + (d + nl * 0.5) / maxL, 2]);
            }
          }
          if (depth === 0 && rest > 70 && rnd() < 0.14) grow(px, py, a + (rnd() < 0.5 ? -SIX : SIX), rest * 0.5, 1, u0 + d / maxL);
        }
      };
      grow(x, y, ang0 + (rnd() - 0.5) * 0.7, maxL, 0, 0);
    }
    return segs;
  }
  function drawFrost(ctx, g, ta) {
    if (g <= 0.005) return;
    if (!FROST) FROST = buildFrost();
    ctx.save();
    ctx.lineCap = 'round';
    for (const [cls, lw, al] of [[0, 3.4, 0.62], [1, 2.6, 0.5], [2, 1.8, 0.42]]) {
      ctx.strokeStyle = whA(al * clamp(g * 1.5));
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (const s of FROST) {
        if (s[5] !== cls || s[4] > g * 1.05) continue;
        ctx.moveTo(s[0], s[1]);
        ctx.lineTo(s[2], s[3]);
      }
      ctx.stroke();
    }
    // glints on the growing tips
    ctx.fillStyle = whA(0.7 * g);
    for (let i = 0; i < 14; i++) {
      const s = FROST[(i * 97 + Math.floor(ta * 6) * 13) % FROST.length];
      if (s[4] > g) continue;
      ctx.beginPath();
      ctx.arc(s[2], s[3], 2.5 + 2 * h01(i), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // breath puffs from his mouth in the cold
  function drawBreath(ctx, j, p, t, B) {
    const on = win(t, B.core, B.HT + 0.4, 0.1, 0.3);
    if (on <= 0.01) return;
    const per = 0.62;
    const mouth = [j.head[0] + (p.facing || 0) * j.headR * 0.5, j.head[1] + j.headR * 0.55];
    for (let k = 0; k < 3; k++) {
      const t0 = Math.floor(t / per - k) * per;
      const u = (t - t0) / 0.95;
      if (u < 0 || u > 1 || t0 < B.core - 0.1) continue;
      const dir = hash(Math.round(t0 * 10)) > 0 ? 1 : -1;
      const r = (16 + 46 * ease.decel(u)) * p.s;
      const x = mouth[0] + dir * 95 * p.s * ease.decel(u), y = mouth[1] + 6 * p.s - 80 * p.s * u;
      const a = 0.6 * on * Math.pow(1 - u, 1.3) * clamp(u * 10);
      for (let c = 0; c < 3; c++) {
        const cx = x + (c - 1) * r * 0.6, cy = y + (c === 1 ? -r * 0.3 : 0), rr = r * (c === 1 ? 1 : 0.8);
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
        gr.addColorStop(0, whA(a));
        gr.addColorStop(0.55, whA(a * 0.7));
        gr.addColorStop(1, whA(0));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, TAU);
        ctx.fill();
      }
    }
  }

  // cartoon shiver marks either side of him
  function drawShiver(ctx, j, p, amt, ta) {
    if (amt <= 0.02) return;
    const s = p.s, fr = Math.floor(ta * 15);
    ctx.save();
    ctx.strokeStyle = fgA(0.7 * amt);
    ctx.lineWidth = 6 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const sd of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const jit = (fr + k) % 2 ? 6 * s : -6 * s;
        const x = j.chest[0] + sd * (118 + 22 * k) * s + jit;
        const y = lerp(j.neck[1], j.hip[1], 0.15 + 0.3 * k) - 10 * s;
        const h = (46 - 10 * k) * s;
        ctx.moveTo(x - sd * 6 * s, y - h / 2);
        ctx.quadraticCurveTo(x + sd * 8 * s, y, x - sd * 6 * s, y + h / 2);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  // the heart in his chest
  function drawHeart(ctx, j, p, t, ta, B) {
    const on = ease.decel(remap(t, B.HT - 0.1, B.HT + 0.2));
    if (on <= 0.01) return;
    const beat = pulseFrom(B.beats, t, 8);
    const gb = pulseFrom(B.gbeats, t, 6);
    const wild = t >= B.GL ? 1 : 0;
    const s = p.s;
    const jx = wild * 7 * s * hash(Math.floor(ta * 30) * 5), jy = wild * 5 * s * hash(Math.floor(ta * 30) * 7);
    const x = j.chest[0] + jx, y = j.chest[1] + 8 * s + jy;
    const R = (140 + 120 * beat + 140 * gb) * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, rdA((0.32 + 0.4 * beat + 0.3 * gb) * on));
    g.addColorStop(1, rdA(0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fill();
    const size = (62 + 26 * beat + 34 * gb) * s * on;
    heartIcon(ctx, x, y, size, { fill: rdA(0.35 + 0.5 * Math.max(beat, gb)), stroke: COL.red, glow: 0.6 + beat + gb, lineWidth: 10 });
  }

  // ECG strip: drawECG's trace (same ecgWave, same glitch rules) batched into one white and one
  // red stroke, so the red glow costs one shadow pass instead of one per segment.
  function ecgStrip(ctx, x, y, w, h, tAbs, beats, appear, glitchAt) {
    if (appear <= 0) return;
    const span = 2.2;
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
    const N = Math.floor(w / 3), reveal = clamp(appear * 1.4);
    const pts = [];
    for (let i = 0; i <= N * reveal; i++) {
      const u = i / N, tau = tAbs - span * (1 - u);
      let px = x + u * w;
      if (tau >= glitchAt && hash(Math.floor(tau * 20)) > 0.7) px += 14 * hash(i);
      pts.push([px, y - sig(tau) * h * 0.5, tau >= glitchAt]);
    }
    if (pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = clamp(appear * 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 8;
    for (const red of [false, true]) {
      ctx.beginPath();
      let pen = false;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i][2] !== red) { pen = false; continue; }
        if (!pen) { ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); pen = true; }
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.strokeStyle = red ? COL.red : COL.fg;
      ctx.shadowColor = red ? 'rgba(255,43,43,0.8)' : 'rgba(0,0,0,0)';
      ctx.shadowBlur = red ? 14 : 0;
      ctx.stroke();
    }
    const last = pts[pts.length - 1];
    ctx.fillStyle = last[2] ? COL.red : COL.fg;
    ctx.shadowColor = last[2] ? 'rgba(255,43,43,1)' : 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(last[0], last[1], 11, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------------- scene ----------------
  SCENES.s3 = {
    textCy: 430,
    draw(ctx, S, tl, ta) {
      const B = T(S), t = tl;
      const wd = world(t, B);
      CZ = wd.cz;
      const L = lightAt(t, ta, B);
      const sway = bulbSway(t, B);
      const cam = camera(t, ta, B);

      // hero
      const [hsx, hsy, hk] = P3(wd.hx, 0, wd.hz);
      let p = heroPose(t, ta, B, wd);
      p.x = hsx;
      p.y = hsy - 300;
      p.s = (HEIGHT * hk) / RIG_H;
      p = onGround(p, hsy);
      const trem = 2.5 * win(t, B.dark0, B.calm + 0.6, 0.2, 0.4) + 7 * win(t, B.core, B.HT + 0.1, 0.4, 0.3) + 4 * (t >= B.GL ? 1 : 0);
      p.x += trem * noise1(ta * 31, 81) * p.s;
      p.armL = [p.armL[0] + 0.02 * trem * noise1(ta * 27, 82) / 4, p.armL[1]];
      p.armR = [p.armR[0] + 0.02 * trem * noise1(ta * 29, 83) / 4, p.armR[1]];
      p.alpha = L < 0.2 ? 0.62 : 1;
      const spinFlash = t >= B.spin ? Math.exp(-(t - B.spin) * 10) : 0;

      // phantom: eyes first glow in the dark, then it is there when the bulb slams on
      const phOn = t >= B.P - 0.12 && t < B.van + 0.16;
      const phA = t < B.P ? 0 : 1;
      const phEyesOnly = t >= B.P - 0.12 && t < B.P;
      const slice = t >= B.van ? clamp((t - B.van) / 0.16) : 0;

      let bulb = null;
      withCam(ctx, cam, () => {
        bulb = drawHallBG(ctx, t, B, L, sway);
        drawHallLines(ctx, t, ta, B, L, bulb);
        const growBase = track(B.growK, t) + 0.22 * (1 - clamp(L));
        doorCreep(ctx, t, ta, B, clamp(growBase * 0.9), ease.decel(remap(t, B.you - 0.16, B.you + 0.08)) * (1 - sm(remap(t, B.P, B.P + 0.3))));
        // far-end eyes open on "seeing"
        const eo = win(t, B.seeing - 0.05, B.van, 0.14, 0.12);
        if (eo > 0) {
          const eyesFar = [[-0.35, 1.55, 0], [0.4, 1.25, 0.12], [0.0, 1.85, 0.24]];
          for (const [x, y, d] of eyesFar) {
            const q = P3(x, y, Z_STOP + 7.5 + d * 8);
            drawEyesAt(ctx, q, Math.max(9, 0.11 * q[2]), eo * ease.decel(remap(t, B.seeing + d, B.seeing + d + 0.12)), t, x * 31 + 5);
          }
        }
        const lit = clamp(L);
        // bulb + cord
        const piv = P3(BULB.x, CH, BULB.z), bp = bulb.bp;
        // pushed-in shots lift the bulb toward the text band: dim it there
        const bsy = H / 2 + (cam.oy || 0) + (bp[1] - cam.cy) * cam.zoom;
        const bfade = 0.25 + 0.75 * remap(bsy, 600, 700);
        ctx.save();
        ctx.globalAlpha = bfade;
        ctx.strokeStyle = fgA(0.3);
        ctx.lineWidth = Math.max(2, 0.012 * bp[2]);
        ctx.beginPath();
        ctx.moveTo(piv[0], piv[1]);
        ctx.lineTo(bp[0], bp[1]);
        ctx.stroke();
        const br = 0.07 * bp[2];
        const bg = ctx.createRadialGradient(bp[0], bp[1], 0, bp[0], bp[1], br * 6);
        bg.addColorStop(0, whA(0.75 * lit));
        bg.addColorStop(0.2, whA(0.25 * lit));
        bg.addColorStop(1, whA(0));
        ctx.fillStyle = bg;
        ctx.fillRect(bp[0] - br * 6, bp[1] - br * 6, br * 12, br * 12);
        ctx.fillStyle = lit > 0.3 ? whA(0.95) : fgA(0.25);
        ctx.strokeStyle = fgA(0.6);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bp[0], bp[1] + br * 0.2, br * 0.75, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        dust(ctx, ta, 26, 33, { alpha: 0.14 * lit, vx: 8, vy: 10 });

        // hero, with his heart and his breath
        const j = drawRig(ctx, p);
        drawHeart(ctx, j, p, t, ta, B);
        drawBreath(ctx, j, p, t, B);
        drawShiver(ctx, j, p, win(t, B.TP, B.HT - 0.05, 0.15, 0.15), ta);
        if (spinFlash > 0.02) speedLines(ctx, j.head[0], j.head[1], 0.4 * spinFlash, ta);

        // the shadow figure is nearer the camera than he is
        if (phOn) {
          const pp = phantomPose(t, B);
          if (phEyesOnly) {
            const jj = rigJoints(pp);
            drawEyesAt(ctx, [jj.head[0] + jj.headR * 0.18, jj.head[1]], 13 * pp.s, ease.decel(remap(t, B.P - 0.12, B.P - 0.02)), 0, 1);
          } else {
            const flick = slice > 0 && Math.floor(t * 30) % 2 === 0 ? 0.45 : 1;
            drawPhantom(ctx, pp, phA * flick * (1 - (slice >= 1 ? 1 : 0)), slice, ta, L);
          }
        }
      });

      // screen-space layers: creepers + frost haze + ECG backing + red pulse in one half-res pass
      const target = [W / 2 + (cam.cx - 540) * -0.2, 1000];
      const frostG = clamp(ease.decel(remap(t, B.core - 0.1, B.drops + 0.45)) - 0.45 * sm(remap(t, B.HT, B.GL + 0.3)));
      const ecgA = ease.decel(remap(t, B.HT - 0.15, B.HT + 0.3));
      const gbp = pulseFrom(B.gbeats, t, 9);
      drawScreenFX(ctx, t, ta, clamp(track(B.growK, t) + 0.25 * (1 - clamp(L))), target, frostG, ecgA, gbp);
      drawFrost(ctx, frostG, ta);

      // snap-zoom streaks onto the figure and the whip back out
      const snapU = remap(t, B.P - 0.02, B.P + 0.18);
      if (snapU > 0 && snapU < 1) speedLines(ctx, 430, 900, 0.85 * Math.sin(Math.PI * snapU), ta);
      const whipU = remap(t, B.spin, B.spin + 0.22);
      if (whipU > 0 && whipU < 1) speedLines(ctx, 540, 1000, 0.6 * Math.sin(Math.PI * whipU), ta);
      if (t >= B.P) flash(ctx, 0.28 * Math.exp(-(t - B.P) * 22));

      // thermometer: slides in on "temperature", bottoms out on "drops", leaves before the heart
      const thIn = ease.decel(remap(t, B.TP - 0.15, B.TP + 0.25));
      const thOut = ease.accel(remap(t, B.your2 - 0.05, B.your2 + 0.25));
      if (thIn > 0 && thOut < 1) {
        const level = track([[B.TP + 0.05, 0.8], [B.drops + 0.3, 0.07]], t);
        ctx.save();
        ctx.translate(0.6 * (cam.shake.ox || 0) - 320 * thOut, 0.6 * (cam.shake.oy || 0));
        drawThermometer(ctx, 150, 1210, t, level, thIn * (1 - thOut));
        ctx.restore();
      }

      // ECG strip under him from "heart"
      if (ecgA > 0) {
        ctx.save();
        ctx.translate(0.7 * (cam.shake.ox || 0), 0.7 * (cam.shake.oy || 0));
        ecgStrip(ctx, 100, 1325, 800, 150, ta, TL.events.ecg, ecgA, S.start + B.GL);
        ctx.restore();
      }
    },
    hud(S, tl) {
      const B = T(S);
      const glitch = Math.max(
        tl >= B.P ? Math.exp(-(tl - B.P) * 6) : 0, tl >= B.van ? Math.exp(-(tl - B.van) * 6) : 0,
        pulseFrom(B.gbeats, tl, 6),
      );
      return { hours: hoursAt(B.hoursK, tl), rate: hoursRate(B.hoursK, tl), danger: track(B.dangerK, tl), glitch };
    },
    glitch(S, tl) {
      const B = T(S);
      let g = 0;
      const spike = (at, k, len) => {
        const d = tl - at;
        if (d >= 0 && d < len) g = Math.max(g, k * (1 - d / len));
      };
      spike(B.P, 0.4, 0.1);
      spike(B.van, 0.85, 0.17);
      for (const b of B.gbeats) spike(b, 0.6, 0.12);
      spike(B.GL, 0.3, 0.08);
      return g;
    },
  };
})();
