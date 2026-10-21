// Pose-able stickman rig (forward kinematics) so characters can act instead of stand.
//
// A pose is a plain object (see POSE_DEFAULT). Angles are radians:
//   torso / neck: lean of the spine / head; + leans toward `facing` (front view: toward +x).
//   armL/armR/legL/legR: [a1, a2]. a1 is the upper segment's angle from straight DOWN
//     (world, i.e. gravity-relative), a2 bends the lower segment relative to the upper one.
//     Side view (facing = 1 or -1): + swings toward the facing direction (forward).
//     Front view (facing = 0): + swings outward (away from the body's centre line).
//   Knees bend backward with a negative a2; elbows bend forward with a positive a2.
// In side view the L limbs are the far side and draw dimmer for depth.
'use strict';

const RIG = { torso: 205, headR: 60, neckGap: 10, upper: 100, fore: 96, thigh: 118, shin: 118, stroke: 15 };

const POSE_DEFAULT = {
  x: 540, y: 900, s: 1, facing: 0, torso: 0, neck: 0,
  armL: [0.22, 0.08], armR: [0.22, 0.08], legL: [0.1, 0], legR: [0.1, 0],
  eyes: 'open', lid: 0, mouth: 'flat', look: 0, bags: true,
  color: null, alpha: 1, glow: 0,
};

function pose(over) {
  return Object.assign({}, POSE_DEFAULT, over);
}

// Blend two poses; discrete fields (facing, eyes, mouth) switch at the midpoint.
function lerpPose(a, b, t) {
  t = clamp(t);
  const out = Object.assign({}, t < 0.5 ? a : b);
  for (const k of ['x', 'y', 's', 'torso', 'neck', 'lid', 'look', 'alpha', 'glow']) {
    if (typeof a[k] === 'number' && typeof b[k] === 'number') out[k] = lerp(a[k], b[k], t);
  }
  for (const k of ['armL', 'armR', 'legL', 'legR']) out[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t)];
  return out;
}

// Ready-made poses (x/y/s/facing are filled in by the caller).
const POSES = {
  stand: { torso: 0, neck: 0, armL: [0.22, 0.08], armR: [0.22, 0.08], legL: [0.1, 0], legR: [0.1, 0] },
  slump: { torso: 0.12, neck: 0.45, armL: [0.08, 0.05], armR: [0.08, 0.05], legL: [0.12, -0.08], legR: [0.12, -0.08] },
  // front view, hugging itself (shivering)
  hug: { facing: 0, torso: 0, neck: 0.15, armL: [0.18, -2.05], armR: [0.28, -1.95], legL: [0.06, 0], legR: [0.06, 0] },
  // front view, hands up defensively / recoiling
  recoil: { facing: 0, torso: -0.08, neck: -0.1, armL: [1.9, 0.9], armR: [1.9, 0.9], legL: [0.22, 0], legR: [0.22, 0] },
  // side view, seated (driving)
  sit: { torso: -0.12, neck: 0.05, armL: [1.25, -0.25], armR: [1.15, -0.2], legL: [1.45, -1.35], legR: [1.4, -1.3] },
  // side view, on both knees
  kneel: { torso: 0.18, neck: 0.5, armL: [0.1, 0.1], armR: [0.25, 0.15], legL: [0.35, -1.95], legR: [0.2, -1.85] },
  // side view, face down on the ground
  collapsed: { torso: 1.52, neck: 0.35, armL: [1.6, 0.15], armR: [-1.35, -0.1], legL: [-1.45, 0.12], legR: [-1.58, 0.3] },
  // side view, clutching chest
  clutch: { torso: 0.22, neck: 0.3, armL: [0.35, -2.7], armR: [0.55, -2.95], legL: [0.25, -0.35], legR: [-0.05, -0.1] },
};

// Side-view walk / stagger cycle. phase in radians (one stride = 2*PI); amt 0..1 scales it.
function walkLimbs(phase, amt = 1) {
  const leg = (ph) => [0.42 * amt * Math.sin(ph), -amt * (0.08 + 0.75 * Math.max(0, Math.sin(ph + 1.9)))];
  const arm = (ph) => [0.38 * amt * Math.sin(ph + Math.PI), 0.25 + 0.2 * amt * Math.max(0, Math.sin(ph + Math.PI))];
  return { legL: leg(phase), legR: leg(phase + Math.PI), armL: arm(phase), armR: arm(phase + Math.PI), bob: Math.abs(Math.cos(phase)) };
}

// World-space joint positions for a pose.
function rigJoints(p) {
  const s = p.s, f = p.facing;
  const ts = f !== 0 ? f : 1;
  const up = (a) => [ts * Math.sin(a), -Math.cos(a)];
  const hip = [p.x, p.y];
  const tv = up(p.torso);
  const neck = [hip[0] + tv[0] * RIG.torso * s, hip[1] + tv[1] * RIG.torso * s];
  const shoulder = [hip[0] + tv[0] * RIG.torso * 0.86 * s, hip[1] + tv[1] * RIG.torso * 0.86 * s];
  const hv = up(p.torso + p.neck);
  const hd = (RIG.headR + RIG.neckGap) * s;
  const head = [neck[0] + hv[0] * hd, neck[1] + hv[1] * hd];
  const limb = (root, [a1, a2], sg, L1, L2) => {
    const mid = [root[0] + sg * Math.sin(a1) * L1 * s, root[1] + Math.cos(a1) * L1 * s];
    const end = [mid[0] + sg * Math.sin(a1 + a2) * L2 * s, mid[1] + Math.cos(a1 + a2) * L2 * s];
    return [mid, end];
  };
  const sgL = f !== 0 ? f : -1, sgR = f !== 0 ? f : 1;
  const [elbowL, handL] = limb(shoulder, p.armL, sgL, RIG.upper, RIG.fore);
  const [elbowR, handR] = limb(shoulder, p.armR, sgR, RIG.upper, RIG.fore);
  const [kneeL, footL] = limb(hip, p.legL, sgL, RIG.thigh, RIG.shin);
  const [kneeR, footR] = limb(hip, p.legR, sgR, RIG.thigh, RIG.shin);
  const chest = [lerp(hip[0], neck[0], 0.7), lerp(hip[1], neck[1], 0.7)];
  const belly = [lerp(hip[0], neck[0], 0.3), lerp(hip[1], neck[1], 0.3)];
  return { hip, neck, shoulder, head, headR: RIG.headR * s, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR, chest, belly };
}

// Shift the pose vertically so its lowest point rests on groundY (feet, knees, hands, hip or head).
function onGround(p, groundY) {
  const j = rigJoints(p);
  const pts = [j.footL, j.footR, j.kneeL, j.kneeR, j.handL, j.handR, j.hip];
  let low = Math.max(...pts.map((q) => q[1]), j.head[1] + j.headR);
  const stroke = (RIG.stroke * p.s) / 2;
  return Object.assign({}, p, { y: p.y + (groundY - low - stroke) });
}

function drawFace(ctx, p, j) {
  const s = p.s, r = j.headR, f = p.facing;
  ctx.save();
  ctx.translate(j.head[0], j.head[1]);
  ctx.rotate((f !== 0 ? f : 1) * (p.torso + p.neck));
  const fg = p.color || COL.fg;
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineCap = 'round';
  const line = (a, b) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
  const eyesAt = f !== 0 ? [f * r * 0.42] : [-r * 0.34 + p.look * r * 0.3, r * 0.34 + p.look * r * 0.3];
  const ey = -r * 0.08;
  const lid = clamp(p.lid);
  for (const ex of eyesAt) {
    if (p.bags && p.eyes !== 'x') {
      ctx.strokeStyle = COL.grey;
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.arc(ex, ey + 6 * s, 13 * s, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
      ctx.strokeStyle = fg;
    }
    if (p.eyes === 'wide') {
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.arc(ex, ey - 4 * s, 13 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex + (f !== 0 ? f * 4 * s : p.look * 5 * s), ey - 4 * s, 5 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.eyes === 'x') {
      ctx.lineWidth = 6 * s;
      const k = 10 * s;
      line([ex - k, ey - k], [ex + k, ey + k]);
      line([ex - k, ey + k], [ex + k, ey - k]);
    } else if (p.eyes === 'closed' || lid > 0.92) {
      ctx.lineWidth = 6 * s;
      line([ex - 11 * s, ey], [ex + 11 * s, ey]);
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, 8.5 * s, 0, Math.PI * 2);
      ctx.fill();
      if (p.eyes === 'tired' || lid > 0.05) {
        const cover = 12 * s * (0.45 + lid * 0.95);
        ctx.fillStyle = COL.bg;
        ctx.fillRect(ex - 12 * s, ey - 12 * s, 24 * s, cover);
        ctx.fillStyle = fg;
        ctx.lineWidth = 5 * s;
        line([ex - 12 * s, ey - 12 * s + cover], [ex + 12 * s, ey - 12 * s + cover]);
      }
    }
  }
  const mx = f !== 0 ? f * r * 0.36 : p.look * r * 0.25;
  const my = r * 0.45;
  ctx.lineWidth = 5 * s;
  if (p.mouth === 'o') {
    ctx.beginPath();
    ctx.ellipse(mx, my, 8 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (p.mouth === 'open') {
    ctx.beginPath();
    ctx.ellipse(mx, my, 13 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.mouth === 'grit') {
    ctx.beginPath();
    ctx.moveTo(mx - 16 * s, my);
    for (let i = 1; i <= 4; i++) ctx.lineTo(mx - 16 * s + i * 8 * s, my + (i % 2 ? -5 : 5) * s);
    ctx.stroke();
  } else if (p.mouth === 'frown') {
    ctx.beginPath();
    ctx.arc(mx, my + 10 * s, 13 * s, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();
  } else if (p.mouth !== 'none') {
    const w = f !== 0 ? 10 * s : 15 * s;
    line([mx - w, my + 2 * s], [mx + w, my - 2 * s]);
  }
  ctx.restore();
}

// Draw a posed stickman. Returns its joints so scenes can attach props (steering wheel,
// x-ray organs, a heart in the chest, frost on the hands...).
function drawRig(ctx, p) {
  const j = rigJoints(p);
  const s = p.s;
  const fg = p.color || COL.fg;
  ctx.save();
  ctx.globalAlpha *= p.alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = RIG.stroke * s;
  ctx.strokeStyle = fg;
  if (p.glow > 0) {
    ctx.shadowColor = `rgba(255,43,43,${(0.9 * p.glow).toFixed(3)})`;
    ctx.shadowBlur = 30 * s * p.glow;
  }
  const poly = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.stroke(); };
  const side = p.facing !== 0;
  // far limbs first, dimmer in side view
  ctx.save();
  if (side) ctx.globalAlpha *= 0.55;
  poly([j.hip, j.kneeL, j.footL]);
  poly([j.shoulder, j.elbowL, j.handL]);
  ctx.restore();
  poly([j.hip, j.neck]);
  poly([j.hip, j.kneeR, j.footR]);
  poly([j.shoulder, j.elbowR, j.handR]);
  ctx.beginPath();
  ctx.arc(j.head[0], j.head[1], j.headR, 0, Math.PI * 2);
  ctx.fillStyle = p.color === '#000' ? '#000' : COL.bg;
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (p.silhouette) {
    ctx.fillStyle = COL.red;
    ctx.shadowColor = 'rgba(255,43,43,0.9)';
    ctx.shadowBlur = 22 * s;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(j.head[0] + sx * j.headR * 0.36, j.head[1] - j.headR * 0.05, 9 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    drawFace(ctx, p, j);
  }
  ctx.restore();
  return j;
}
