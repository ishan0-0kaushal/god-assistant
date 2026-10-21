'use strict';

SCENES.s3 = {
  textCy: 410,
  draw(ctx, S, tl, ta) {
    const dur = sceneDur(S), p = tl / dur, c = S.cues;
    const g = ctx.createRadialGradient(540, 880, 40, 540, 900, 1050);
    g.addColorStop(0, COL.roomLit);
    g.addColorStop(0.55, COL.room);
    g.addColorStop(1, '#0E0E10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const phantomT = tl - c.phantom;
    const phantomOn = phantomT > -0.05 && phantomT < 0.8 && !(phantomT > 0.5 && Math.floor(phantomT * 30) % 3 === 0);
    // the figure looks around, snaps to the phantom, and it is gone
    let turn = 0.8 * Math.sin(ta * 2.2) * (0.6 + 0.4 * noise1(ta, 8));
    if (phantomT > 0.15 && phantomT < 1.2) turn = lerp(turn, 1, clamp((phantomT - 0.15) * 6) * clamp((1.2 - phantomT) * 3));
    withCamScale(ctx, 1 + 0.035 * ease.std(p), 0, 0, () => {
      drawCreepers(ctx, ta, 0.15 + 0.85 * ease.inOut(remap(tl, 0, dur * 0.92)), phantomT > -0.1 && phantomT < 0.4);
      if (phantomOn) {
        ctx.save();
        ctx.globalAlpha = clamp((phantomT + 0.05) * 8) * 0.95;
        drawStickman(ctx, { t: ta, x: 870, ground: 1190, s: 1.18, color: '#000', silhouette: true, arms: { l: [0.08, 0], r: [0.08, 0] } });
        ctx.restore();
      }
      drawStickman(ctx, {
        t: ta, x: 540, ground: 1170, s: 0.9, eyes: 'wide', tremor: 5, headTurn: turn,
        lean: -0.04 * turn, arms: { l: [0.55, 0.9], r: [0.55, 0.9] },
      });
      drawThermometer(ctx, 175, 1080, tl, lerp(0.72, 0.2, ease.inOut(remap(tl, c.temp, c.temp + 1.4))), ease.decel(remap(tl, c.temp - 0.1, c.temp + 0.25)));
    });
    drawECG(ctx, 110, 1335, 820, 150, ta, TL.events.ecg, ease.decel(remap(tl, c.heart - 0.15, c.heart + 0.3)), S.start + c.glitch);
  },
};
