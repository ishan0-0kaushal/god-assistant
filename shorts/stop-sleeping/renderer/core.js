// Frame loop: renders the active scene (plus its text beat) into an offscreen buffer,
// composites it with the scene transition (cut punch or whip pan), then adds the HUD,
// glitch, vignette and grain. Scenes register themselves in SCENES (see renderer/scenes/).
'use strict';

let TL = null, VEINS = null, GRAIN = [];
const SCENES = {};
const EYE = { cx: 540, cy: 1010, w: 940, h: 540 };
const WHIP_IN = 6, WHIP_OUT = 4;
let _buf = null;

function sceneDur(S) { return S.dur_f / TL.fps; }

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

function setupCore(timeline) {
  TL = timeline;
  VEINS = buildVeins(1964, EYE.cx, EYE.cy, EYE.w, EYE.h);
  GRAIN = makeGrain();
  _buf = document.createElement('canvas');
  _buf.width = W;
  _buf.height = H;
  // A broken scene module must not stop stills of the other scenes from rendering, so it
  // is swapped for a placeholder and reported (render.cjs refuses a full render then).
  window.missingScenes = [];
  for (const S of TL.scenes) {
    try {
      if (!SCENES[S.id]) throw new Error('not registered (syntax error in its file?)');
      if (SCENES[S.id].init) SCENES[S.id].init(S);
    } catch (e) {
      window.missingScenes.push(`${S.id}: ${e.message}`);
      SCENES[S.id] = { textCy: 400, draw(ctx) { flash(ctx, 1, '#401010'); } };
    }
  }
}

let _vignette = null;
function overlays(ctx, f) {
  if (!_vignette) {
    _vignette = document.createElement('canvas');
    _vignette.width = W;
    _vignette.height = H;
    const v = _vignette.getContext('2d');
    const vg = v.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.48, H * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    v.fillStyle = vg;
    v.fillRect(0, 0, W, H);
  }
  ctx.drawImage(_vignette, 0, 0);
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

function drawSceneInto(bctx, S, tl, ta) {
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.globalAlpha = 1;
  bctx.globalCompositeOperation = 'source-over';
  bctx.shadowBlur = 0;
  bctx.filter = 'none';
  bctx.fillStyle = COL.bg;
  bctx.fillRect(0, 0, W, H);
  const scene = SCENES[S.id];
  bctx.save();
  scene.draw(bctx, S, tl, ta);
  bctx.restore();
  const beats = S.text.filter((b) => b.at_s <= tl + 1e-6);
  const beat = beats[beats.length - 1];
  if (beat && !(scene.hideText && scene.hideText(S, tl, ta))) {
    const cy = scene.textCyFor ? scene.textCyFor(beat, S, tl) : scene.textCy;
    drawTextBeat(bctx, beat, tl - beat.at_s, { cx: W / 2, cy, maxW: 920, ta });
  }
}

// Draw the buffer with a horizontal offset and a motion smear trailing behind it.
function smear(ctx, img, dx, vel) {
  const n = 6;
  for (let k = n - 1; k >= 0; k--) {
    ctx.globalAlpha = k === 0 ? 1 : 0.22 * (1 - k / n);
    ctx.drawImage(img, dx - vel * k * 0.35, 0);
  }
  ctx.globalAlpha = 1;
}

function renderFrame(ctx, f) {
  const ta = f / TL.fps;
  const i = Math.max(0, TL.scenes.findIndex((s) => f >= s.start_f && f < s.start_f + s.dur_f));
  const S = TL.scenes[i], next = TL.scenes[i + 1];
  const lf = f - S.start_f, tl = lf / TL.fps;
  const scene = SCENES[S.id];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  if (TL.events.blackouts.some(([a, b]) => ta >= a && ta < b)) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const bctx = _buf.getContext('2d');
  drawSceneInto(bctx, S, tl, ta);

  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);
  const whipIn = S.transition === 'whip' && lf < WHIP_IN;
  const whipOut = next && next.transition === 'whip' && lf >= S.dur_f - WHIP_OUT;
  if (whipIn) {
    const u = (lf + 1) / WHIP_IN;
    const dx = W * 0.6 * (1 - ease.decel(u));
    smear(ctx, _buf, dx, W * 0.6 / WHIP_IN * (1 - u) * 3);
  } else if (whipOut) {
    const u = (lf - (S.dur_f - WHIP_OUT) + 1) / WHIP_OUT;
    const dx = -W * 0.6 * ease.accel(u);
    smear(ctx, _buf, dx, -W * 0.6 / WHIP_OUT * u);
  } else if (S.id !== TL.scenes[0].id && S.transition !== 'whip' && lf < 7) {
    // hard cut lands with a scale punch and a one-frame flash
    const k = 1 - ease.decel((lf + 1) / 7);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(1 + 0.07 * k, 1 + 0.07 * k);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(_buf, 0, 0);
    ctx.restore();
    if (lf === 0) flash(ctx, 0.35);
  } else {
    ctx.drawImage(_buf, 0, 0);
  }

  if (scene.glitch) glitchSlices(ctx, scene.glitch(S, tl, ta), ta);
  if (scene.hud) drawHUD(ctx, scene.hud(S, tl, ta), ta);
  overlays(ctx, f);
}
