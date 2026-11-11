/**
 * tests/3d-forces.mjs — run with: node tests/3d-forces.mjs
 *
 * Covers apps/3d/forces.js and a cloud's time in motion.js and the scene. The
 * promises — at its defaults a cloud does not move; gravity alone is the
 * schoolbook's to the rounding, gravity and drag their closed form within a
 * step's error; a frame stands alone: drawn fresh, after a later one or after
 * an earlier one, the same to the bit; a vortex turns a cloud the right
 * hand's way round its axis and moves nothing along it; a pull draws it in,
 * as far as its reach; curl noise moves it every way, seeded; a launch goes
 * out from the centre, the way a dot faces, or every way, each its own speed;
 * a model is an evolution only with a cloud that moves and time for it —
 * frame 0 at rest, the last at its time, no loop — and the scene draws its
 * dots where the forces have them, a pull changed making no dot again.
 */

import { valuesFor } from '../core/params.js';

const { Evolution, forcesOn, fieldOf, launchOf, reaching, STEP } = await import('../apps/3d/forces.js');
const { dotsOf } = await import('../apps/3d/cloud.js');
const { shapeSchema } = await import('../apps/3d/shapes.js');
const { loopOf, seenAt, elapsedAt } = await import('../apps/3d/motion.js');
const { Model } = await import('../apps/3d/scene.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(72), JSON.stringify(got).slice(0, 70),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const values = (v = {}) => valuesFor(shapeSchema('cloud'), v);
const cloud = v => { const vs = values(v); return { v: vs, dots: dotsOf(vs) }; };
const evolve = (v, t) => { const { v: vs, dots } = cloud(v); return { dots, at: new Evolution(dots, vs).at(t) }; };
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const each = (d, f) => { for (let k = 0; k < d.count; k++) f(k); };

// ── At rest, and gravity ────────────────────────────────────────────────────

ok('at its defaults a cloud does not move: no force on', forcesOn(values()), false);
ok('…drag alone moves nothing still', forcesOn(values({ drag: 3 })), false);
const still = evolve({}, 2);
ok('…and its dots at 2 s are where they were', same(still.at, still.dots.centres), true);
const fall = evolve({ gravity: 2, drag: 0, count: 50 }, 1.5);
let worst = 0;
each(fall.dots, k => { worst = Math.max(worst, Math.abs(fall.at[k * 3 + 1] - (fall.dots.centres[k * 3 + 1] - 0.5 * 2 * 1.5 * 1.5)),
  Math.abs(fall.at[k * 3] - fall.dots.centres[k * 3])); });
ok('gravity alone: y − g t² / 2, x as it was, to the rounding', worst < 1e-5, true);
const g = 2, k = 0.8, t = 1.3, drop = (g / k) * t - (g / k) * (1 - Math.exp(-k * t)) / k;
const dragged = evolve({ gravity: g, drag: k, count: 50 }, t);
worst = 0;
each(dragged.dots, j => { worst = Math.max(worst, Math.abs(dragged.at[j * 3 + 1] - (dragged.dots.centres[j * 3 + 1] - drop))); });
ok('gravity and drag: their closed form, within a step\'s error', worst < 1e-4, true);

// ── A frame stands alone ────────────────────────────────────────────────────

const busy = { gravity: 1, vortex: 3, attract: 0.5, noise: 1.5, speed: 1, count: 200 };
const { v: bv, dots: bd } = cloud(busy);
const fresh = Float32Array.from(new Evolution(bd, bv).at(2.37));
const after = new Evolution(bd, bv);
after.at(4.9);                                      // past two of its kept states, then back
const back = Float32Array.from(after.at(2.37));
const on = new Evolution(bd, bv);
on.at(0.5); on.at(1.2);
const forward = Float32Array.from(on.at(2.37));
ok('a frame stands alone: fresh, after a later one, after earlier ones — to the bit', [same(back, fresh), same(forward, fresh)], [true, true]);
ok('…and the same time, between steps, the same part-step', same(Float32Array.from(new Evolution(bd, bv).at(2.37)), fresh), true);
ok('the steps a second', Math.round(1 / STEP), 60);

// ── The fields ──────────────────────────────────────────────────────────────

const ring = { emitter: 'ring', extent: 1, depth: 0, count: 60, drag: 0 };
const turned = evolve({ ...ring, vortex: 2 }, 0.3);
let anticlockwise = 0, along = 0;
each(turned.dots, j => {
  const a0 = Math.atan2(turned.dots.centres[j * 3 + 1], turned.dots.centres[j * 3]), a1 = Math.atan2(turned.at[j * 3 + 1], turned.at[j * 3]);
  if (((a1 - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI > 0.01) anticlockwise++;
  along = Math.max(along, Math.abs(turned.at[j * 3 + 2]));
});
ok('a vortex round z turns a flat ring the right hand\'s way, nothing along its axis', [anticlockwise, along], [60, 0]);
const roundY = evolve({ emitter: 'ring', extent: 1, depth: 0, count: 20, drag: 0, vortex: 2, axis: 'y' }, 0.3);
ok('…round y, it turns in x and z, nothing up', (() => { let up = 0, moved = 0; each(roundY.dots, j => {
  up = Math.max(up, Math.abs(roundY.at[j * 3 + 1] - roundY.dots.centres[j * 3 + 1]));
  moved = Math.max(moved, Math.abs(roundY.at[j * 3 + 2] - roundY.dots.centres[j * 3 + 2])); }); return up < 1e-9 && moved > 0.01; })(), true);
const pulled = evolve({ ...ring, attract: 1 }, 0.5);
ok('a pull draws it in', (() => { let n = 0; each(pulled.dots, j => { if (Math.hypot(pulled.at[j * 3], pulled.at[j * 3 + 1]) < 0.95) n++; }); return n; })(), 60);
const pushed = evolve({ ...ring, attract: -1 }, 0.5);
ok('…less than 0, away', (() => { let n = 0; each(pushed.dots, j => { if (Math.hypot(pushed.at[j * 3], pushed.at[j * 3 + 1]) > 1.05) n++; }); return n; })(), 60);
const short = evolve({ ...ring, attract: 1, vortex: 2, reach: 0.9 }, 0.5);
ok('…as far as their reach: a ring past it, untouched', same(short.at, short.dots.centres), true);
ok('the reach fades to nothing at its edge, smoothly', [reaching(0, 1), reaching(1, 1), reaching(0.5, 1) > 0 && reaching(0.5, 1) < 1, reaching(3, 0)], [1, 0, true, 1]);
const swirl = evolve({ count: 100, noise: 2 }, 0.8), again = evolve({ count: 100, noise: 2 }, 0.8), other = evolve({ count: 100, noise: 2, seed: 2 }, 0.8);
ok('curl noise moves it, every way', [0, 1, 2].every(a => { let m = 0; each(swirl.dots, j => { m = Math.max(m, Math.abs(swirl.at[j * 3 + a] - swirl.dots.centres[j * 3 + a])); }); return m > 0.02; }), true);
ok('…seeded: the same seed the same paths, another seed others', [same(swirl.at, again.at), same(swirl.at, other.at)], [true, false]);
const f = new Float64Array(3);
fieldOf(values({ vortex: 1, cx: 1 }))(1, 0, 0, f);
ok('at the centre a vortex is nothing, not a throw', [...f], [0, 0, 0]);

// ── A launch ────────────────────────────────────────────────────────────────

const shell = cloud({ emitter: 'shell', extent: 1, count: 40, speed: 2, speedSpread: 0 });
const out = launchOf(shell.dots, shell.v);
ok('a launch out from the centre: each away from it, at its speed', (() => { let w = 0; each(shell.dots, j => {
  const c = [0, 1, 2].map(a => shell.dots.centres[j * 3 + a]), u = [0, 1, 2].map(a => out[j * 3 + a]);
  w = Math.max(w, Math.abs(Math.hypot(...u) - 2), Math.hypot(...u.map((x, a) => x / 2 - c[a]))); }); return w < 1e-5; })(), true);
const flat = cloud({ emitter: 'disc', depth: 0, count: 30, speed: 1, speedSpread: 0, aim: 'face' });
const up = launchOf(flat.dots, flat.v);
ok('…the way it faces: out of a flat cloud\'s plane', (() => { let w = 0; each(flat.dots, j => {
  w = Math.max(w, Math.abs(up[j * 3]), Math.abs(up[j * 3 + 1]), Math.abs(up[j * 3 + 2] - 1)); }); return w < 1e-6; })(), true);
const any = cloud({ count: 300, speed: 1, speedSpread: 0.5, aim: 'any' });
const ways = launchOf(any.dots, any.v);
ok('…every way: each its own, its speed within its spread', (() => { let lo = 9, hi = 0, zs = 0; each(any.dots, j => {
  const s = Math.hypot(ways[j * 3], ways[j * 3 + 1], ways[j * 3 + 2]); lo = Math.min(lo, s); hi = Math.max(hi, s); if (ways[j * 3 + 2] > 0) zs++; });
  return lo >= 0.5 - 1e-9 && hi <= 1.5 + 1e-9 && hi - lo > 0.5 && zs > 100 && zs < 200; })(), true);
ok('…none, at no speed', launchOf(any.dots, values({ count: 300 })).every(x => x === 0), true);

// ── A model's time ──────────────────────────────────────────────────────────

const moving = { id: 'cloud', params: { gravity: 1 } };
const model = (shapes, more = {}) => ({ time: 3, length: 31, fps: 24, shapes, ...more });
ok('no cloud that moves: no evolution, a still', [loopOf(model([{ id: 'cloud', params: {} }])).loop, loopOf(model([moving], { time: 0 })).loop,
  loopOf(model([{ ...moving, on: false }])).loop], [false, false, false]);
const ev = loopOf(model([moving]));
ok('a cloud that moves, and time: an evolution of its frames, played once', [ev.loop, ev.closes, ev.evolves, ev.length], [true, false, true, 31]);
ok('…frame 0 at rest, the last at its time, between in step', [0, 10, 30, 99].map(i => +elapsedAt(model([moving]), i).toFixed(6)), [0, 1, 3, 3]);
ok('…its frame seen with that time', seenAt(model([moving]), 15).elapsed, 1.5);
ok('…a turntable turning along it no loop either', [loopOf(model([moving], { turns: 1 })).closes, loopOf({ turns: 1, shapes: [] }).closes], [false, true]);
const scene = new Model();
const dropped = (elapsed, params = {}) => {
  scene.update({ elapsed, shapes: [{ id: 'cloud', params: { emitter: 'shell', extent: 1, count: 20, drag: 0, gravity: 2, ...params } }] });
  const a = scene.parts[0].mesh.instanceMatrix.array;
  return { mesh: scene.parts[0].mesh, y: a[13] };
};
const rest = dropped(0), dot0 = scene.parts[0].dots.centres[1];
ok('in the scene: at rest, a dot where its cloud has it', Math.abs(rest.y - dot0) < 1e-6, true);
const later = dropped(1);
ok('…a second under gravity, fallen as far as g t² / 2', Math.abs(later.y - (dot0 - 1)) < 1e-5, true);
const harder = dropped(1, { gravity: 4 });
ok('…a pull changed: further, and no dot made again', [Math.abs(harder.y - (dot0 - 2)) < 1e-5, harder.mesh === later.mesh], [true, true]);
scene.dispose();

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
