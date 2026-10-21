'use strict';

SCENES.s4 = {
  textCy: 400,
  init(S) {
    const c = S.cues;
    this.bar = new DrainBar({
      x: 110, y: 1215, w: 820, h: 120, label: 'BODY INTEGRITY', labelSize: 50, pctSize: 76, warn: 0.4, segments: 12,
      keys: [[0, 1], [0.25, 0.98], [c.organs, 0.82], [c.fail, 0.55], [c.no_one, 0.32], [Math.max(c.purpose - 0.5, c.no_one + 0.1), 0.1], [c.purpose, 0]],
    });
  },
  draw(ctx, S, tl, ta) {
    const dur = sceneDur(S), p = tl / dur, c = S.cues;
    const bar = this.bar;
    const v = bar.valueAt(tl);
    const dead = tl >= c.purpose;
    const hit = Math.max(Math.exp(-Math.max(0, tl - c.fail) * 8) * (tl >= c.fail ? 1 : 0),
                         dead ? Math.exp(-(tl - c.purpose) * 6) : 0);
    const pulse = pulseFrom(TL.events.heartbeats, ta, 7);
    withCamScale(ctx, 1 + 0.04 * ease.std(p), hit * 18 * noise1(ta * 55, 1), hit * 14 * noise1(ta * 55, 2), () => {
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
  },
};
