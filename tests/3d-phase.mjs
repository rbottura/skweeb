/**
 * tests/3d-phase.mjs — run with: node tests/3d-phase.mjs
 *
 * Covers the phase (M16b, docs/worm.md): apps/3d/play/phase.js, morph.js,
 * bridge.js, reach.js and phasing.js, on three.js's core. The promises — a
 * passage frames, swings there and back as many times as asked and comes to
 * rest on B, holds, then bonds; a ghost is brightest as the phase passes it.
 * A body's rings are read tail to head with its head ahead, whichever way it
 * was drawn; resampled, they keep its ends; mixed, nothing is A and all is
 * B; a tube over them is closed. The bridge stands on an arc from one body
 * to the other, raised at its middle. A radius lies on the ground. Walked
 * into a radius, the frozen body takes the walked one in: framed, swung,
 * bonded — the other walked, the first a shell — and not again until the
 * walked one has left the radius.
 */

const { swingAt, passageAt, glowAt, TIMES } = await import('../apps/3d/play/phase.js');
const { ringsOf, resample, mixRings, tubeOf } = await import('../apps/3d/play/morph.js');
const { arcAt, canonOf, Bridge } = await import('../apps/3d/play/bridge.js');
const { ribbonOf } = await import('../apps/3d/play/reach.js');
const { Phasing } = await import('../apps/3d/play/phasing.js');
const { Worm } = await import('../apps/3d/play/worm.js');
const { walkerAt, step, frameOf } = await import('../apps/3d/play/walker.js');
const { drawnGeometry, DRAWN_PARAMS } = await import('../apps/3d/loft.js');
const { valuesFor } = await import('../core/params.js');
const { Scene, Vector3 } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const R = 24;

// ── The passage ─────────────────────────────────────────────────────────────

{
  ok('the swings begin at A', swingAt(0, 4), 0);
  ok('…and end on B', near(swingAt(1, 4), 1), true);
  let crossings = 0, last = swingAt(0, 4);
  for (let i = 1; i <= 2000; i++) { const p = swingAt(i / 2000, 4); if ((last - 0.5) * (p - 0.5) < 0) crossings++; last = p; }
  ok('four there and back, then over: nine passings of the middle', crossings, 9);
  ok('none asked, straight over', near(swingAt(0.5, 0), 0.5), true);
  const { frame, swing, hold } = TIMES;
  ok('at first it frames', passageAt(0).stage, 'framing');
  ok('…then swings', passageAt(frame + 0.01).stage, 'swinging');
  ok('…then holds on B', [passageAt(frame + swing + hold / 2).stage, passageAt(frame + swing + hold / 2).phase], ['fixed', 1]);
  ok('…then bonds', passageAt(frame + swing + hold + 0.01).stage, 'bonded');
  ok('its own pace: the swings as long as asked', passageAt(frame + 5, { swing: 6 }).stage, 'swinging');
  ok('a ghost is brightest as the phase passes it', glowAt(0.5, 0.5, 7) > glowAt(0.3, 0.5, 7) && glowAt(0.5, 0.5, 7) === 1, true);
  ok('…and never quite dark', glowAt(1, 0, 7) > 0.1, true);
}

// ── The morph ───────────────────────────────────────────────────────────────

{
  const g = drawnGeometry({ ...valuesFor(DRAWN_PARAMS, {}), drawn: null });
  const body = g.userData.bodies[0];
  const rings = ringsOf(g);
  ok('a body read as its rings', [rings.length, rings[0].length], [body.rings, body.points]);
  const back = ringsOf(g, { headAtEnd: false });
  ok('its head where it began: read the other way', back[0][0], rings[rings.length - 1][0]);
  const turned = ringsOf(g, { toward: -1 });
  ok('its head along −x: turned about its up, ahead again', [turned[3][5][0], turned[3][5][1], turned[3][5][2]],
     [-rings[3][5][0], rings[3][5][1], -rings[3][5][2]]);
  const some = resample(rings, 32, 16);
  ok('resampled: as many rings as asked, as many points', [some.length, some[0].length], [32, 16]);
  const mid = r => r.reduce((c, p) => c.map((x, q) => x + p[q]), [0, 0, 0]).map(x => x / r.length);
  const d = (a, b) => Math.hypot(...a.map((x, q) => x - b[q]));
  ok('…its ends where they were', d(mid(some[0]), mid(rings[0])) < 1e-3 && d(mid(some[31]), mid(rings[rings.length - 1])) < 1e-3, true);
  const other = resample(rings.map(r => r.map(([x, y, z]) => [x * 0.5, y + 1, z * 2])), 32, 16);
  ok('mixed at none, it is A', mixRings(some, other, 0)[7][3], some[7][3]);
  ok('…at all, it is B', mixRings(some, other, 1)[7][3].map(x => Math.round(x * 1e9) / 1e9), other[7][3].map(x => Math.round(x * 1e9) / 1e9));
  const tube = tubeOf(some);
  ok('a tube over its rings, a point at each end', tube.getAttribute('position').count, 32 * 16 + 2);
  ok('…closed: every face there', tube.index.count, (31 * 16 * 2 + 2 * 16) * 3);
}

// ── The bridge, and a radius ────────────────────────────────────────────────

{
  const a = new Vector3(0, R, 0), b = new Vector3(0, 0, -R);
  ok('the bridge begins at A', arcAt(a, b, 0).distanceTo(a) < 1e-9, true);
  ok('…ends at B', arcAt(a, b, 1).distanceTo(b) < 1e-9, true);
  ok('…raised at its middle', near(arcAt(a, b, 0.5, 2).length(), R + 2), true);
  const ribbon = ribbonOf(a, R, 4, { width: 0.1, over: 0.04 });
  const P = ribbon.getAttribute('position'), x = new Vector3();
  let worst = 0, along = [Infinity, 0];
  for (let i = 0; i < P.count; i++) {
    x.fromBufferAttribute(P, i);
    worst = Math.max(worst, Math.abs(x.length() - R - 0.04));
    const ground = R * x.clone().normalize().angleTo(new Vector3(0, 1, 0));
    along = [Math.min(along[0], ground), Math.max(along[1], ground)];
  }
  ok('a radius lies on the ground', worst < 1e-4, true);
  ok('…its reach along the ground, its width either side', near(along[0], 3.9, 1e-4) && near(along[1], 4.1, 1e-4), true);
}

// ── Into a phase, and out ───────────────────────────────────────────────────

{
  const scene = new Scene();
  const phasing = new Phasing(scene);
  const A = new Worm().shape({ body: {}, wave: 0.5 }), B = new Worm().shape({ body: {}, wave: 0.5, head: 'start' });
  const wa = walkerAt(R), wb = walkerAt(R);
  step(wb, { move: 1 }, 1, { radius: R, speed: 6, turnRate: 1 });
  wb.f.negate();
  A.place(frameOf(wa), wa.p);
  B.place(frameOf(wb), wb.p);
  phasing.add(A, wa, { ground: '#7fae6b', sky: '#cfe3f1' });
  phasing.add(B, wb, { ground: '#5d4f86', sky: '#1f1b3a' });
  ok('far from it, no phase takes it in', phasing.within(4), -1);
  step(wa, { move: 1 }, 1, { radius: R, speed: 3, turnRate: 1 });
  ok('walked into its radius, the frozen worm takes it in', phasing.within(4), 1);
  const passage = phasing.begin(1, { ghosts: 5 });
  ok('…the bridge laid: its ghosts', passage.bridge.ghosts.length, 5);
  const canon = [canonOf(A), canonOf(B)];
  ok('…both bodies read with their heads ahead', canon.every(c => near(c.k.x, 1, 1e-6)), true);
  let swung = 0, last = 0, sky = null;
  while (phasing.passage) {
    const at = phasing.advance(1 / 60, { swing: 2.4, swings: 4 });
    if ((last - 0.5) * (at.phase - 0.5) < 0) swung++;
    last = at.phase;
    if (at.stage === 'fixed' && at.fixed > 0.45 && at.fixed < 0.55) sky = phasing.reality().sky;
  }
  ok('swung there and back, then over', swung, 9);
  ok('…the world half way to B\'s as it holds', sky !== '#cfe3f1' && sky !== '#1f1b3a' && !!sky, true);
  ok('bonded: B is walked, in its reality', [phasing.walking, phasing.reality().sky], [1, '#1f1b3a']);
  ok('…A left a shell, B filled', [A.shellAt, B.shellAt], [1, 0]);
  ok('…the bridge gone', scene.children.filter(c => c.isGroup).length, 0);
  ok('not taken in again at once', phasing.within(4), -1);
  step(wb, { move: 1 }, 2, { radius: R, speed: 6, turnRate: 1 });
  ok('…but once it has left the radius', [phasing.within(4), phasing.armed], [-1, true]);
  phasing.dispose();
  ok('let go of, it holds nothing', [phasing.bodies.length, !!phasing.passage], [0, false]);
  const lone = new Bridge(A, B, { count: 3 });
  lone.light(0.5, 1);
  ok('a bridge lit at the middle: its middle ghost brightest', lone.lights()[1] === Math.max(...lone.lights()), true);
  lone.dispose();
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
