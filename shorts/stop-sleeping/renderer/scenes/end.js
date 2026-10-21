// End: hard cut back to the Day 11 eye, worse than ever. "so..." while the lid fights to
// close; on "how long could YOU last?" it snaps wide and locks onto the viewer with a punch-in.
// Then it keeps pushing, and in the last ~0.5 s eases every parameter (camera, lid, pupil,
// veins) back to s1's frame-0 state, so the last frame flows straight into frame 0.
(() => {
  'use strict';
  const EK = () => SCENES._eye;
  let T = null;
  function times(S) {
    const dur = sceneDur(S), q = S.cues.question;
    return {
      dur, q,
      settle: Math.max(q + 0.8, dur - 0.55),
      breaks: cue(S, 'breaks'), ways: cue(S, 'ways'), never: cue(S, 'never'),
    };
  }
  const blendAt = (tl) => ease.inOut(remap(tl, T.settle, T.dur - 1 / 30));

  function state(S, tl) {
    const E = EK(), F = E.FRAME0, { dur, q, settle } = T;
    const ta = S.start + tl, tau = tl - dur;
    const b = blendAt(tl);
    const tw = E.twitchState(ta);
    const pulse = pulseFrom(TL.events.heartbeats, ta, 6);
    // lid: heavy after the cut and sinking; snaps wide on the question; then sinks again
    let droop;
    if (tl < q) droop = lerp(0.36, 0.62, Math.pow(tl / q, 1.4));
    else {
      droop = lerp(0.0, 0.42, Math.pow(remap(tl, q + 0.2, settle), 1.3));
      droop = lerp(0.62, droop, ease.decel(remap(tl, q, q + 0.07)));
    }
    droop += E.lidWobble(tau) * 1.4;
    // pupil darts: frantic before the question, dead-centre stare on it
    const keys = [
      [0, -0.36, 0.12], [q * 0.3, 0.42, -0.12], [q * 0.62, -0.22, 0.18],
      [q, 0.0, -0.02, 0.05],
      [T.breaks, 0.32, 0.12], [T.ways, -0.34, -0.06], [T.never, 0.02, -0.04],
    ].sort((x, y) => x[0] - y[0]);
    const lk = E.dart(keys, tl), tr = E.tremor(tau, 2.2);
    // extra flutter of the lower lid on "breaks"
    const flutter = 0.22 * Math.sin(Math.PI * remap(tl, T.breaks, T.breaks + 0.3)) * (0.5 + 0.5 * Math.sin((tl - T.breaks) * 47));
    const pupil = tl < q ? 0.58 : lerp(0.3, 0.44, ease.inOut(remap(tl, q + 0.15, settle)));
    const pupilQ = tl < q ? pupil : lerp(0.58, pupil, ease.decel(remap(tl, q, q + 0.12)));
    const surge = Math.exp(-Math.max(0, tl - T.breaks) * 3) * (tl >= T.breaks ? 1 : 0);
    const lookNow = [lk[0] + tr[0], lk[1] + tr[1]];
    const tr0 = E.tremor(tau, 1);
    return {
      t: ta,
      look: [lerp(lookNow[0], F.look[0] + tr0[0], b), lerp(lookNow[1], F.look[1] + tr0[1], b)],
      droop: clamp(lerp(droop, F.droop + E.lidWobble(tau), b), 0, 0.95),
      lower: (Math.max(tw.lower, flutter)) * (1 - b),
      jerk: tw.jerk * (1 - b),
      pulse,
      pupil: lerp(pupilQ, F.pupil, b),
      veins: lerp(1, F.veins, b),
      extra: lerp(1, F.extra, b),
      red: lerp(1, F.red, b) + 0.15 * surge * (1 - b),
    };
  }
  function zoomAt(tl) {
    const { q, settle } = T;
    let z = 1.03 + 0.03 * remap(tl, 0, q);
    z += 0.055 * ease.decel(remap(tl, q, q + 0.22));
    z += 0.05 * ease.inOut(remap(tl, q + 0.22, settle));
    return lerp(z, 1, blendAt(tl));
  }

  SCENES.end = {
    textCy: 470,
    textCyFor: (beat) => (beat.at === 'question' ? 440 : 470),
    init(S) { T = times(S); },
    draw(ctx, S, tl, ta) {
      if (!T) T = times(S);
      const E = EK(), tau = tl - T.dur, k = 1 - blendAt(tl);
      const cam = E.eyeCam(tau, zoomAt(tl), E.FRAME0.hand,
        shake(ta, trauma(tl, [T.q], 5) * k, 30),
        shake(ta + 2, trauma(tl, [T.breaks], 7) * 0.6 * k, 18));
      withCam(ctx, cam, () => {
        E.pulseRings(ctx, ta);
        E.drawEye(ctx, state(S, tl));
      });
    },
    glitch(S, tl) {
      if (!T) T = times(S);
      const d = tl - T.q;
      return d >= 0 && d < 0.1 ? 0.35 * (1 - d / 0.1) + 0.05 : 0;
    },
    hud(S, tl) {
      if (!T) T = times(S);
      return { hours: 264, rate: 0, danger: 1, glitch: tl >= T.q && tl < T.q + 0.12 ? 1 : 0 };
    },
  };
})();
