/**
 * tests/3d-play.mjs — run with: node tests/3d-play.mjs
 *
 * Covers the worm's player (M16a, docs/worm.md): apps/3d/play/walker.js,
 * follow.js, worm.js and planet.js, on three.js's core, and the layout
 * loft.js now keeps of its bodies. The promises — a walker stays on its
 * planet however it goes, its heading a unit tangent; walked once round, it
 * is back where it began; right is right. The camera stands behind and
 * above, and eases there. A body's rings are where loft.js says they are.
 * The worm's head is where its stroke ends, or begins; its lowest point is
 * on the ground; its wave's phase is the distance over a wavelength, and it
 * is lofted again only when that moved. A planet is its seed's, the same
 * twice, another for another seed.
 */

const { walkerAt, step, settle, frameOf } = await import('../apps/3d/play/walker.js');
const { aimBehind, follow, offAim, heightOver } = await import('../apps/3d/play/follow.js');
const { Worm, waveWayOf } = await import('../apps/3d/play/worm.js');
const { Planet, scatter, patchAt } = await import('../apps/3d/play/planet.js');
const { drawnGeometry, DRAWN_PARAMS, DEMO } = await import('../apps/3d/loft.js');
const { valuesFor } = await import('../core/params.js');
const { makeRng } = await import('../core/rng.js');
const { PerspectiveCamera, Vector3 } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const R = 24, LIMITS = { radius: R, speed: 4, turnRate: Math.PI };

// ── The walker ──────────────────────────────────────────────────────────────

{
  const w = walkerAt(R);
  const rng = makeRng(7);
  let worst = 0, square = 0;
  for (let i = 0; i < 2000; i++) {
    step(w, { move: rng() * 2 - 1, turn: rng() * 2 - 1 }, 1 / 60, LIMITS);
    const up = w.p.clone().normalize();
    worst = Math.max(worst, Math.abs(w.p.length() - R));
    square = Math.max(square, Math.abs(w.f.dot(up)), Math.abs(w.f.length() - 1));
  }
  ok('a walker stays on its planet, however it goes', worst < 1e-9, true);
  ok('…its heading a unit tangent there', square < 1e-9, true);

  const round = walkerAt(R);
  const steps = 600, dt = (2 * Math.PI * R) / LIMITS.speed / steps;
  for (let i = 0; i < steps; i++) step(round, { move: 1 }, dt, LIMITS);
  ok('walked once round, it is back where it began', round.p.distanceTo(new Vector3(0, R, 0)) < 1e-6, true);
  ok('…facing the way it set off', round.f.distanceTo(new Vector3(0, 0, -1)) < 1e-6, true);
  ok('…and it has walked the circle', near(round.walked, 2 * Math.PI * R, 1e-6), true);

  const start = frameOf(walkerAt(R));
  ok('right is forward × up: facing away, +x', start.right.toArray(), [1, 0, 0]);
  const turned = walkerAt(R);
  for (let i = 0; i < 30; i++) step(turned, { turn: 1 }, 1 / 60, { ...LIMITS, turnRate: Math.PI });   // half a second: 90°
  ok('turned right a quarter, it faces its right', turned.f.toArray().map(x => Math.round(x * 1e6) / 1e6), [1, 0, 0]);
  const back = walkerAt(R);
  step(back, { move: -1 }, 1, LIMITS);
  ok('backing, it walks less than nothing', near(back.walked, -4), true);

  const moved = walkerAt(R);
  moved.p.set(3, 4, 0);
  settle(moved, 10);
  ok('settled on a planet, it stands on it', near(moved.p.length(), 10), true);
}

// ── The camera ──────────────────────────────────────────────────────────────

{
  const w = walkerAt(R), frame = frameOf(w);
  const aim = aimBehind(frame, w.p, { distance: 10, height: 7 });
  ok('the camera wants to be above the planet', heightOver(aim.eye, R) > 5, true);
  ok('…behind the worm', aim.eye.clone().sub(w.p).dot(frame.forward) < 0, true);
  ok('…its up the worm\'s up', aim.up.toArray(), frame.up.toArray());
  const camera = new PerspectiveCamera();
  follow(camera, aim, 5, 1 / 60, true);
  ok('put there at once, it is there', offAim(camera, aim) < 1e-9, true);
  const far = aimBehind(frame, w.p, { distance: 30, height: 7 });
  const before = offAim(camera, far);
  follow(camera, far, 5, 1 / 60);
  const k = 1 - Math.exp(-5 / 60);
  ok('eased, it goes a share of the way a frame', near(offAim(camera, far), before * (1 - k), 1e-9), true);
}

// ── A body's rings, as loft.js lays them ────────────────────────────────────

{
  const v = { ...valuesFor(DRAWN_PARAMS, {}), drawn: null };
  const g = drawnGeometry(v);
  const bodies = g.userData.bodies;
  ok('loft.js says where its one body lies', bodies.length, 1);
  ok('…from its first point, its rings of points', [bodies[0].base, bodies[0].points], [0, 48]);
  ok('…its rings and two points for its ends are all it has', bodies[0].rings * bodies[0].points + 2,
     g.getAttribute('position').count);
  ok('…its line\'s length in the world\'s units', bodies[0].length > 3 && bodies[0].length < 8, true);
}

// ── The worm ────────────────────────────────────────────────────────────────

{
  ok('it undulates side to side: from the side, out of the drawing', waveWayOf('side', 'side'), 'up');
  ok('…from above, across it in the drawing', waveWayOf('above', 'side'), 'side');
  ok('…up and down, from the side, in the drawing', waveWayOf('side', 'up'), 'side');

  const worm = new Worm().shape({ body: {}, seen: 'side', head: 'end', wave: 0.5, waves: 1.5 });
  // loft.js's worm is drawn left to right: its head, where it ends, is along +x.
  ok('its head is where its stroke ends: along the drawing\'s x', worm.toward, 1);
  const tail = new Worm().shape({ body: {}, seen: 'side', head: 'start', wave: 0.5 });
  ok('…or where it begins, the other way', tail.toward, -1);

  const w = walkerAt(R), frame = frameOf(w);
  worm.place(frame, w.p);
  const P = worm.mesh.geometry.getAttribute('position'), m = worm.mesh.matrix, x = new Vector3();
  let low = Infinity;
  for (let i = 0; i < P.count; i++) low = Math.min(low, heightOver(x.fromBufferAttribute(P, i).applyMatrix4(m), R));
  // It hangs on the ground's tangent: its lowest point at most what the planet's curve, under half its length, lifts.
  ok('hung on the planet, its lowest point is on the ground', low > -1e-6 && low < 2.5 ** 2 / (2 * R), true);

  const wavelength = worm.length / 1.5;
  ok('standing, its wave holds', worm.phaseAt(0), 0);
  ok('half a wavelength on, half a wave', near(worm.phaseAt(wavelength / 2), 0.5, 1e-9), true);
  ok('a wavelength on, the wave it began with', near(worm.phaseAt(wavelength) % 1, 0, 1e-9) || near(worm.phaseAt(wavelength), 1, 1e-9), true);
  const at = Array.from(P.array.slice(0, 30));
  ok('walked, it is lofted again', worm.pose(1.234), true);
  ok('…its points moved by its wave', at.some((a, i) => Math.abs(a - P.array[i]) > 1e-6), true);
  ok('…and not again where it already is', worm.pose(1.234), false);
  const still = new Worm().shape({ body: {}, wave: 0 });
  ok('with no wave it is never lofted again', still.pose(5), false);
  const above = new Worm().shape({ body: {}, seen: 'above', wave: 0 });
  above.place(frame, w.p);
  const Q = above.mesh.geometry.getAttribute('position');
  let lowAbove = Infinity;
  for (let i = 0; i < Q.count; i++) lowAbove = Math.min(lowAbove, heightOver(x.fromBufferAttribute(Q, i).applyMatrix4(above.mesh.matrix), R));
  ok('seen from above, it lies on the ground too', lowAbove > -1e-6 && lowAbove < 2.5 ** 2 / (2 * R), true);
  ok('…its whole drawing flat on it', above.mesh.matrix.determinant() > 0 && worm.mesh.matrix.determinant() > 0, true);
  ok('loft.js\'s worm is the drawing it walks with none', DEMO.strokes.length, 1);
}

// ── The planet ──────────────────────────────────────────────────────────────

{
  const v = { radius: R, things: 120, ground: '#7fae6b', sky: '#cfe3f1', seed: 3 };
  const a = new Planet().build(v), b = new Planet().build(v), c = new Planet().build({ ...v, seed: 4 });
  const matrices = p => p.things.map(m => Array.from(m.instanceMatrix.array.slice(0, 32)).map(x => Math.round(x * 1e5)));
  ok('a planet holds the things asked for', a.things.reduce((n, m) => n + m.count, 0), 120);
  ok('…the same seed, the same planet', JSON.stringify(matrices(a)) === JSON.stringify(matrices(b)), true);
  ok('…another seed, another', JSON.stringify(matrices(a)) !== JSON.stringify(matrices(c)), true);
  const G = a.ground.geometry.getAttribute('position');
  let off = 0;
  for (let i = 0; i < G.count; i++) off = Math.max(off, Math.abs(new Vector3().fromBufferAttribute(G, i).length() - R));
  ok('its ground is its radius all round', off < 1e-4, true);
  const spread = scatter(makeRng(1), 4000), mean = spread.reduce((s, p) => s.add(p), new Vector3()).divideScalar(4000);
  ok('things spread all round it, none favoured', mean.length() < 0.05, true);
  const shades = spread.slice(0, 200).map(n => patchAt([{ d: new Vector3(0, 1, 0), f: 3, phase: 0 }], n));
  ok('a patch\'s shade is between none and full', shades.every(s => s >= 0 && s <= 1), true);
  a.dispose();
  ok('let go of, it holds nothing', [a.ground, a.things.length], [null, 0]);
}

console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
