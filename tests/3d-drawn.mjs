/**
 * tests/3d-drawn.mjs — run with: node tests/3d-drawn.mjs
 *
 * Covers apps/3d/silhouette.js and loft.js (G4), on three.js's core, and
 * core/stage/drawing.js `stillOf`. The promises — a sprite's outline is the
 * loop that holds the most where its alpha passes the threshold, its holes
 * and smaller islands left out; a ring is n points at equal steps round it,
 * counter-clockwise, from the line out to the right; nothing passing, a
 * circle. A body is closed — every edge between two faces, once each way —
 * and outward, its volume positive: across the stroke and stamped, pointed
 * and flat, a mirrored copy too; open, its faces still outward. Its
 * sections turn as the brush turned, or not; two sprites along a stroke are
 * passed between. With no drawing, a worm of its own; a drawing of dots only,
 * the worm too. A sequence's events are a still's marks, its clip's
 * overrides on them.
 */

const { loopsOf, outlineOf, ringOf, areaOf, spriteRing, circleRing } = await import('../apps/3d/silhouette.js');
const { drawnGeometry, DRAWN_PARAMS, WORLD } = await import('../apps/3d/loft.js');
const { stillOf } = await import('../core/stage/drawing.js');
const { drawnIn } = await import('../apps/3d/drawn.js');
const { valuesFor } = await import('../core/params.js');
const { Box3 } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/** A mask w × h, ink where `inside(x, y)` holds at a pixel's centre. */
const maskOf = (w, h, inside) => {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = inside(x + 0.5, y + 0.5) ? 255 : 0;
  return m;
};
const disc = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) <= r;

// ── The silhouette ───────────────────────────────────────────────────────────
const round = maskOf(64, 64, disc(32, 32, 20));
const outline = outlineOf(round, 64, 64, 128);
ok('a disc\'s outline holds a disc\'s area, within 3%', near(areaOf(outline), Math.PI * 400, Math.PI * 400 * 0.03), true);
const ring = ringOf(outline.map(([x, y]) => [x - 32, 32 - y]), 32);
const steps = ring.map((p, j) => Math.hypot(ring[(j + 1) % 32][0] - p[0], ring[(j + 1) % 32][1] - p[1]));
ok('its ring: 32 points, counter-clockwise, the first out to the right, steps equal within 10%',
  [ring.length, areaOf(ring) > 0, near(ring[0][1], 0, 0.6) && ring[0][0] > 19, Math.max(...steps) / Math.min(...steps) < 1.1],
  [32, true, true, true]);
const annulus = maskOf(64, 64, (x, y) => disc(32, 32, 24)(x, y) && !disc(32, 32, 12)(x, y));
const loops = loopsOf(annulus, 64, 64, 128);
ok('a ring of ink: two loops, its outline round, its hole the other way', loops.map(l => Math.sign(areaOf(l))).sort(), [-1, 1]);
ok('…its outline the outer one, the hole left out', near(areaOf(outlineOf(annulus, 64, 64, 128)), Math.PI * 576, Math.PI * 576 * 0.03), true);
const islands = maskOf(64, 64, (x, y) => disc(20, 20, 12)(x, y) || disc(50, 50, 6)(x, y));
ok('two islands: the bigger is the outline', near(areaOf(outlineOf(islands, 64, 64, 128)), Math.PI * 144, Math.PI * 144 * 0.05), true);
const ell = maskOf(40, 40, (x, y) => (x > 4 && x < 16 && y > 4 && y < 36) || (x > 4 && x < 36 && y > 24 && y < 36));
const ellRing = spriteRing({ w: 40, h: 40, alpha: ell, width: 80, height: 80 }, 0.5, 96);
ok('an L, concave, at twice its mask\'s size: its ring holds its area, within 5%', near(areaOf(ellRing), 4 * (12 * 32 + 20 * 12), 4 * 624 * 0.05), true);
ok('nothing passes the threshold: a circle a quarter of its size across its middle',
  spriteRing({ w: 8, h: 8, alpha: new Uint8Array(64), width: 40, height: 40 }, 0.5, 16).map(([u, v]) => Math.round(Math.hypot(u, v))),
  new Array(16).fill(10));
const soft = maskOf(64, 64, () => true).map((_, i) => Math.round(255 * Math.max(0, 1 - Math.hypot((i % 64) + 0.5 - 32, Math.floor(i / 64) + 0.5 - 32) / 32)));
ok('a soft blot: a higher threshold, a smaller silhouette', areaOf(outlineOf(soft, 64, 64, 200)) < areaOf(outlineOf(soft, 64, 64, 60)), true);

// ── The body ─────────────────────────────────────────────────────────────────
/** Closed and outward: each edge once each way, its positions welded; and its volume. */
const closedness = g => {
  const p = g.attributes.position.array, idx = g.index.array, ids = new Map(), at = [];
  for (let i = 0; i < p.length / 3; i++) {
    const key = [p[3 * i], p[3 * i + 1], p[3 * i + 2]].map(x => Math.round(x * 1e5)).join(',');
    if (!ids.has(key)) ids.set(key, ids.size);
    at.push(ids.get(key));
  }
  const edges = new Map();
  let vol = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    for (const [u, w] of [[a, b], [b, c], [c, a]]) {
      const e = at[u] + '>' + at[w];
      edges.set(e, (edges.get(e) || 0) + 1);
    }
    const A = [p[3 * a], p[3 * a + 1], p[3 * a + 2]], B = [p[3 * b], p[3 * b + 1], p[3 * b + 2]], C = [p[3 * c], p[3 * c + 1], p[3 * c + 2]];
    vol += (A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6;
  }
  let closed = edges.size > 0;
  for (const [e, count] of edges) {
    const [u, w] = e.split('>');
    if (count !== 1 || edges.get(w + '>' + u) !== 1) closed = false;
  }
  return { closed, outward: vol > 0, vol };
};
const extent = g => {
  const box = new Box3().setFromBufferAttribute(g.attributes.position);
  return [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z];
};
const defaults = valuesFor(DRAWN_PARAMS, {});
const square = { w: 32, h: 32, alpha: maskOf(32, 32, (x, y) => x > 8 && x < 24 && y > 8 && y < 24), width: 64, height: 64 };
const line = (n, step, extra = {}) => Array.from({ length: n }, (_, i) => ({ x: i * step, y: 0, rotation: 0, scale: 1, flipX: 1, key: 'sq', ...extra }));
const drawing = (strokes, masks = new Map([['sq', square]])) => ({ id: 'test', strokes, masks });
const body = (values, d) => drawnGeometry({ ...defaults, ...values, drawn: d });

const worm = body({}, null);
ok('no drawing: a worm of its own — closed, outward', [worm.index.count > 0, closedness(worm).closed, closedness(worm).outward], [true, true, true]);
ok('…pointed: its rings, 48 points each, and a point at each end', (worm.attributes.position.count - 2) % 48, 0);
const straight = drawing([line(101, 4)]);
for (const ends of ['pointed', 'flat']) {
  for (const lay of ['across', 'stamped']) {
    const c = closedness(body({ ends, lay }, straight));
    ok(`a straight stroke, ${lay}, ${ends}: closed, outward`, [c.closed, c.outward], [true, true]);
  }
}
const flat = body({ ends: 'flat', spacing: 0.5 }, straight), [lx, ly, lz] = extent(flat);
ok('…across: as long as the stroke, its section square, the drawing\'s longer side WORLD',
  [near(lx / ly, 400 / 32, 0.6), near(ly, lz, 0.01), lx < WORLD && lx > WORLD * 0.85], [true, true, true]);
const open = body({ ends: 'open' }, straight), on = open.attributes.normal.array, op = open.attributes.position.array;
let outwardNormals = 0;
for (let i = 0; i < op.length / 3; i++) if (on[3 * i + 1] * op[3 * i + 1] + on[3 * i + 2] * op[3 * i + 2] > 0) outwardNormals++;
ok('open: not closed, every normal away from its line', [closedness(open).closed, outwardNormals === op.length / 3], [false, true]);
const mirrored = drawing([line(101, 4, { flipX: -1, rotation: 0.4 })]);
ok('a mirrored copy, turned: closed, outward', Object.values(closedness(body({ ends: 'flat' }, mirrored))).slice(0, 2), [true, true]);
const stamped = body({ lay: 'stamped', back: 1, ends: 'open' }, straight), [, , sz] = extent(stamped);
ok('stamped: flat in the plane, stepped back by the stroke\'s length', near(sz, extent(flat)[0], 0.05), true);
// Its sections turned as its brush was: a quarter turn along the stroke, its last section a square turned 90°.
const turning = drawing([line(101, 4).map((s, i) => ({ ...s, rotation: (i / 100) * Math.PI / 4 }))]);
const firstPoint = (g, r, n = 48) => { const p = g.attributes.position.array; return [p[3 * r * n + 1], p[3 * r * n + 2]]; };
const turned = body({ ends: 'open', smooth: 0, spacing: 0.5 }, turning), still = body({ ends: 'open', smooth: 0, spacing: 0.5, twist: false }, turning);
const rings = turned.attributes.position.count / 48 - 1;
const [ty, tz] = firstPoint(turned, rings), [sy, sz2] = firstPoint(still, rings);
ok('twist: its last section turned an eighth of a turn, the brush\'s; none without', [near(Math.atan2(tz, ty), -Math.PI / 4, 0.05), near(Math.atan2(sz2, sy), 0, 0.05)], [true, true]);
// Two sprites along one stroke: its sections passed from a square to a disc.
const masks = new Map([['sq', square], ['o', { w: 32, h: 32, alpha: maskOf(32, 32, disc(16, 16, 12)), width: 64, height: 64 }]]);
const both = drawing([line(101, 4).map((s, i) => ({ ...s, key: i < 50 ? 'sq' : 'o' }))], masks);
ok('a square, then a disc: closed, outward', Object.values(closedness(body({ ends: 'flat' }, both))).slice(0, 2), [true, true]);
ok('a pen held still — dots only: the worm', body({}, drawing([line(20, 0)])).attributes.position.count, worm.attributes.position.count);
const many = drawing([line(101, 4), line(60, 3).map(s => ({ ...s, y: 120, x: s.x + 30 }))]);
ok('two strokes: two bodies, each closed', closedness(body({ ends: 'pointed' }, many)).closed, true);

// ── Its skin: each point's place on the drawing's picture (G4b) ─────────────
const framed = { ...straight, frame: { x: -40, y: -40, w: 480, h: 80 } };
const firstRing = (g, n = 48) => { const uv = g.attributes.uv.array; let u = 0, w = 0;
  for (let j = 0; j < n; j++) { u += uv[2 * j]; w += uv[2 * j + 1]; } return [u / n, w / n].map(x => Math.round(x * 1e4) / 1e4); };
const loose = body({ lay: 'stamped', threshold: 0.2 }, framed), tight = body({ lay: 'stamped', threshold: 0.8 }, framed);
ok('a uv for every point', [loose.attributes.uv.count === loose.attributes.position.count, extent(loose)[0] !== extent(tight)[0]], [true, true]);
ok('…its first section where the first mark is on the picture, whatever the threshold that sized the body',
  [firstRing(loose), firstRing(tight)], [[0.0833, 0.5], [0.0833, 0.5]]);
const across = body({ ends: 'pointed' }, { ...straight, frame: { x: -45.26, y: -45.26, w: 490.52, h: 90.52 } }), auv = across.attributes.uv.array;
const ap = across.attributes.position.array;
let inside = true, same = true;
for (let i = 0; i < auv.length / 2; i++) {
  if (auv[2 * i] < 0 || auv[2 * i] > 1 || auv[2 * i + 1] < 0 || auv[2 * i + 1] > 1) inside = false;
  // Projected from the front: a point and the point across the plane from it, the same place on the picture.
  if (i < 48 && Math.abs(auv[2 * i + 1] - auv[2 * ((48 - i) % 48) + 1]) > 1e-6 && Math.abs(ap[3 * i + 2] + ap[3 * ((48 - i) % 48) + 2]) < 1e-6) same = false;
}
ok('across: every point on the picture framed as drawn.js frames it; front and back the same place', [inside, same], [true, true]);

// ── A sequence's events as a still's marks ──────────────────────────────────
const events = [{ t: 0, x: 1, y: 2, rotation: 0, scale: 0.5, familyId: 'brushes', spriteIndex: 3, pattern: 'single' },
                { t: 9, x: 5, y: 2, rotation: 0, scale: 0.25, familyId: 'brushes', spriteIndex: 3, pattern: 'single' }];
const seq = stillOf({ sequence: { w: 100, h: 80, events }, clip: { overrides: { familyId: null, spriteIndex: 7, pattern: 'mirror-x', scaleMul: 2 } } });
ok('a sequence: its events the marks, on its canvas, its clip\'s overrides on them',
  [seq.canvas, seq.marks.map(m => [m.familyId, m.spriteIndex, m.pattern, m.scale])],
  [{ w: 100, h: 80 }, [['brushes', 7, 'mirror-x', 1], ['brushes', 7, 'mirror-x', 0.5]]]);
const marks = { canvas: { w: 10, h: 10 }, marks: events };
ok('a still is its own; nothing marked, none', [stillOf(marks) === marks, stillOf({ sequence: { w: 1, h: 1, events: [] } }), stillOf(null)], [true, null, null]);
ok('the drawings a model\'s bodies name, shown, once each', drawnIn({ shapes: [
  { id: 'drawn', params: { drawing: 'gam_1' } }, { id: 'drawn', on: false, params: { drawing: 'gam_2' } },
  { id: 'drawn', params: { drawing: 'gam_1' } }, { id: 'cloud', params: { drawing: 'gam_3' } }] }), ['gam_1']);
ok('the circle a mark with no sprite has: counter-clockwise from the right', [areaOf(circleRing(12, 5)) > 0, circleRing(12, 5)[0]], [true, [5, 0]]);
const { takes } = await import('../core/vault-drag.js');
ok('its field takes the gamepad\'s stills and sequences, a smart one too — no other app\'s', [
  { type: 'still', origin: { app: 'gamepad' } }, { type: 'sequence', origin: { app: 'gamepad' } },
  { type: 'skw', binds: 'still', origin: { app: 'gamepad' } }, { type: 'sequence', origin: { app: 'particles' } },
  { type: 'shape', origin: { app: 'gamepad' } }].map(row => takes(DRAWN_PARAMS.drawing, row)), [true, true, true, false, false]);

// ── Its wave (G6): the worm alive ───────────────────────────────────────────
const calm = body({ ends: 'pointed' }, straight), [, wy0, wz0] = extent(calm);
const side = body({ ends: 'pointed', wave: 1, waves: 1 }, straight), [, wy1, wz1] = extent(side);
const upward = body({ ends: 'pointed', wave: 1, waves: 1, waveWay: 'up' }, straight), [, wy2, wz2] = extent(upward);
ok('a wave from side to side: wider across the line by about a section either way, as deep', [wy1 > wy0 * 2.5, Math.abs(wz1 - wz0) < wz0 * 0.1], [true, true]);
ok('…up and down: deeper, as wide', [wz2 > wz0 * 2.5, Math.abs(wy2 - wy0) < wy0 * 0.1], [true, true]);
ok('…closed and outward, waving', [closedness(side).closed, closedness(side).outward, closedness(upward).closed, closedness(upward).outward], [true, true, true, true]);
const at = phase => body({ ends: 'flat', wave: 0.8, waves: 2, waveCycles: 2, phase }, straight);
const alike = (g, h) => g.attributes.position.array.every((x, i) => Math.abs(x - h.attributes.position.array[i]) < 1e-6);
ok('…the loop closes: its phase 1 its phase 0, a quarter on another', [alike(at(0), at(1)), alike(at(0), at(0.25))], [true, false]);
const resting = body({ ends: 'flat', waves: 2, waveCycles: 2 }, straight).attributes.uv.array;
ok('…its skin on it as it moves: every uv where the point is at rest, whatever the phase', [0, 0.3].map(p =>
  at(p).attributes.uv.array.every((x, i) => Math.abs(x - resting[i]) < 1e-9)), [true, true]);

// ── Turned on a lathe (G7) ──────────────────────────────────────────────────
const { turnedGeometry, TURNED_PARAMS } = await import('../apps/3d/lathe.js');
const turnedOf = (values, d) => turnedGeometry({ ...valuesFor(TURNED_PARAMS, {}), ...values, drawn: d });
// A stroke upright 100 px from the drawing's left edge — a mark alone there — 200 px tall, its marks 20 px across.
const upright = Array.from({ length: 51 }, (_, i) => ({ x: 100, y: i * 4, rotation: 0, scale: 1, flipX: 1, key: '' }));
const post = { id: 'post', strokes: [upright, [{ x: 0, y: 100, rotation: 0, scale: 1, flipX: 1, key: '' }]], masks: new Map(), size: 20 };
const tube = turnedOf({ wall: 1 }, post), tc = closedness(tube), [lx0, ly0, lz0] = extent(tube);
ok('an upright stroke turned: a tube — closed, outward — its radius its distance from the axis, its wall its marks',
  [tc.closed, tc.outward, near(lx0, 4.4, 0.02), near(lz0, 4.4, 0.02), near(ly0, 4, 0.02), near(tc.vol, Math.PI * (2.2 ** 2 - 1.8 ** 2) * 4, 0.6)],
  [true, true, true, true, true, true]);
ok('…its axis across the drawing at its middle: half as far, half the radius', near(extent(turnedOf({ wall: 1, axis: 0.5 }, post))[0], 2.4, 0.02), true);
ok('…no wall: the surface alone, open', closedness(turnedOf({ wall: 0 }, post)).closed, false);
ok('…with no drawing, a vase of its own, outward', closedness(turnedOf({ wall: 1 }, null)).outward, true);
ok('…a turned drawing\'s drawing read and named a parent, as a drawn body\'s', drawnIn({ shapes: [{ id: 'turned', params: { drawing: 'gam_9' } }] }), ['gam_9']);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
