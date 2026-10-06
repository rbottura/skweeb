/**
 * tests/3d-modifiers.mjs — run with: node tests/3d-modifiers.mjs
 *
 * Covers apps/3d/modifiers.js, deform.js and repeat.js, and a shape's stack
 * in apps/3d/scene.js. The promises — the six are catalogue entries a card
 * can be drawn from; subdivide cuts every triangle into four, sharing each
 * edge's midpoint, keeping every attribute and the shape's bounds, its
 * normals one long, and stops short of MAX_TRIANGLES the same way every
 * time; twist turns one end by half its angle one way and the other end the
 * other way, the middle still, its extent along the axis kept; a twisted
 * face's normals are the surface's, a face square to the axis keeping its
 * own; a bend of 180° makes a plank a half ring, its ends up at the radius
 * and facing up, the other way for a negative angle, nothing for none;
 * displace keeps every point within its amount, bumpy, the same for its
 * seed, and cracks nothing — a box's corners move together, its edges stay
 * hard, a sphere's seam smooth; a mirror is a twin facing out, a row's
 * middle stays where the shape was, and both stop at the cap; a stack runs
 * in order and frees what it replaces; a shape's stack makes its geometry,
 * a change to it makes it again, a modifier off is skipped, one unknown
 * named, the model framed by its vertices rather than its shapes' turned
 * boxes, and a recipe from before stacks draws as it did.
 */

const { MODIFIERS, MAX_TRIANGLES, modify, subdivide, triangles } = await import('../apps/3d/modifiers.js');
const { Model, unknownIn } = await import('../apps/3d/scene.js');
const { defineParams, valuesFor } = await import('../core/params.js');
const T = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const r3 = x => Math.round(x * 1000) / 1000 || 0;
const box = () => new T.BoxGeometry(1, 1, 1);
const bounds = g => { const b = new T.Box3().setFromBufferAttribute(g.attributes.position); return [...b.min.toArray(), ...b.max.toArray()].map(r3); };
const stack = (...ms) => ms.map(([id, params]) => ({ id, values: valuesFor(MODIFIERS[id].params, params) }));
/** Every vertex as [x, y, z], and its normal. */
const points = g => Array.from({ length: g.attributes.position.count }, (_, i) =>
  [g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)]);
const normals = g => Array.from({ length: g.attributes.normal.count }, (_, i) =>
  [g.attributes.normal.getX(i), g.attributes.normal.getY(i), g.attributes.normal.getZ(i)]);

// ── The catalogue ────────────────────────────────────────────────────────────

ok('the six, in the roadmap\'s order', Object.keys(MODIFIERS), ['subdivide', 'displace', 'twist', 'bend', 'mirror', 'array']);
ok('each says its id, and its schema declares', Object.entries(MODIFIERS).every(([k, m]) => m.id === k
  && !!defineParams('3d:' + k, m.params) && typeof m.apply === 'function'), true);

// ── Subdivide ────────────────────────────────────────────────────────────────

const once = subdivide(box(), 1), twice = subdivide(box(), 2);
ok('every triangle into four, twice: 12, 48, 192', [triangles(box()), triangles(once), triangles(twice)], [12, 48, 192]);
ok('each edge\'s midpoint shared: 24 vertices, 54, 150', [box().attributes.position.count, once.attributes.position.count, twice.attributes.position.count], [24, 54, 150]);
ok('every attribute kept, the bounds the same', [Object.keys(twice.attributes).sort(), bounds(twice)], [['normal', 'position', 'uv'], bounds(box())]);
ok('its normals one long', normals(subdivide(new T.SphereGeometry(1, 8, 4), 2)).every(n => Math.abs(Math.hypot(...n) - 1) < 1e-6), true);
const dense = () => new T.SphereGeometry(1, 128, 64);
const capped = subdivide(dense(), 4);
ok('it stops short of the cap, as many levels as fit', [triangles(capped) <= MAX_TRIANGLES, triangles(capped) === triangles(dense()) * 16], [true, true]);
ok('…the same every time', triangles(subdivide(dense(), 4)), triangles(capped));

// ── Twist ────────────────────────────────────────────────────────────────────

const twisted = modify(box(), stack(['subdivide', { levels: 2 }], ['twist', { axis: 'y', angle: 90 }]));
const corner = points(twisted).find(([x, y, z]) => Math.abs(y - 0.5) < 1e-6 && Math.abs(Math.hypot(x, z) - Math.SQRT1_2) < 1e-6 && x > 0.7);
ok('twisted 90° about y: the corner (½, ½, ½) turned 45°, to (0.707, ½, 0)', corner && corner.map(r3), [0.707, 0.5, 0]);
const low = points(twisted).find(([x, y, z]) => Math.abs(y + 0.5) < 1e-6 && Math.abs(x - 0.5 * Math.SQRT2) < 1e-6);
ok('…and (½, -½, -½) turned -45°, to (0.707, -½, 0)', low && low.map(r3), [0.707, -0.5, 0]);
ok('the middle ring unturned: (½, 0, ½) where it was', points(twisted).some(([x, y, z]) => r3(x) === 0.5 && r3(y) === 0 && r3(z) === 0.5), true);
ok('its height kept', [bounds(twisted)[1], bounds(twisted)[4]], [-0.5, 0.5]);
const back = modify(box(), stack(['subdivide', { levels: 2 }], ['twist', { axis: 'y', angle: -90 }]));
ok('a twist the other way turns the corner the other way', points(back).some(([x, y, z]) => Math.abs(y - 0.5) < 1e-6 && r3(x) === 0 && r3(z) === 0.707), true);

/** How far a geometry's vertex normals are from its triangles' own: the least dot of any vertex in any triangle. */
const truest = g => {
  const p = points(g), n = normals(g), idx = g.index.array;
  let least = 1;
  for (let i = 0; i < idx.length; i += 3) {
    const [a, b, c] = [idx[i], idx[i + 1], idx[i + 2]].map(k => new T.Vector3(...p[k]));
    const face = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a)).normalize();
    for (const k of [idx[i], idx[i + 1], idx[i + 2]]) least = Math.min(least, face.dot(new T.Vector3(...n[k])));
  }
  return least;
};
const cut = subdivide(box(), 4);
const caps = normals(cut).flatMap((nn, i) => (Math.abs(nn[1]) === 1 ? [i] : []));      // the top's and the bottom's
const fine = modify(cut, stack(['twist', { axis: 'y', angle: 90 }]));                  // in place: the same vertices
ok('a twisted face\'s normals are the surface\'s', truest(fine) > 0.99, true);
ok('…a face square to the axis keeping its own', caps.length > 0 && caps.every(i => Math.abs(Math.abs(normals(fine)[i][1]) - 1) < 1e-6), true);

// ── Bend ─────────────────────────────────────────────────────────────────────

const plank = subdivide(new T.BoxGeometry(4, 0.1, 0.4), 4);   // a triangle an arc of 11.25°
const ends = normals(plank).flatMap((nn, i) => (Math.abs(nn[0]) === 1 ? [i] : []));     // its two end faces
const bent = modify(plank, stack(['bend', { axis: 'x', angle: 180 }]));
const R = 4 / Math.PI;
ok('a plank bent 180° along x: a half ring, its ends up at the radius', [bounds(bent)[0], bounds(bent)[1], bounds(bent)[3], bounds(bent)[4]],
  [-r3(R + 0.05), -0.05, r3(R + 0.05), r3(R)]);
ok('…its ends facing up, as a half ring\'s do', ends.length > 0 && ends.every(i => normals(bent)[i][1] > 0.999), true);
ok('…its faces\' normals the surface\'s', truest(bent) > 0.99, true);
ok('a bend of nothing is nothing', JSON.stringify(points(modify(box(), stack(['bend', { angle: 0 }])))), JSON.stringify(points(box())));
const down = modify(subdivide(new T.BoxGeometry(4, 0.1, 0.4), 3), stack(['bend', { axis: 'x', angle: -180 }]));
ok('the other way, a half ring the other way up', [bounds(down)[1], bounds(down)[4]], [-r3(R), 0.05]);

// ── Displace ─────────────────────────────────────────────────────────────────

const ball = () => subdivide(new T.SphereGeometry(1, 16, 8), 2);
const bumpy = modify(ball(), stack(['displace', { amount: 0.2, size: 0.5, seed: 3 }]));
const radii = points(bumpy).map(p => Math.hypot(...p));
ok('a ball displaced: every point within the amount of where it was', radii.every(r => r > 0.79 && r < 1.21), true);
ok('…and bumpy, not a bigger ball', Math.max(...radii) - Math.min(...radii) > 0.1, true);
ok('the same seed, the same bumps', JSON.stringify(points(modify(ball(), stack(['displace', { amount: 0.2, size: 0.5, seed: 3 }])))), JSON.stringify(points(bumpy)));
ok('…another seed, others', JSON.stringify(points(modify(ball(), stack(['displace', { amount: 0.2, size: 0.5, seed: 4 }])))) !== JSON.stringify(points(bumpy)), true);
/** The copies of each place in a geometry: [their positions, their normals], keyed by where they started. */
const placesOf = (before, after) => {
  const groups = new Map();
  points(before).forEach((p, i) => { const k = p.map(v => Math.round(v * 1e5)).join(); (groups.get(k) || groups.set(k, []).get(k)).push(i); });
  return [...groups.values()].filter(g => g.length > 1).map(g => ({ at: g.map(i => points(after)[i]), n: g.map(i => normals(after)[i]) }));
};
const block = subdivide(box(), 2);
const rough = modify(block.clone(), stack(['displace', { amount: 0.15, size: 0.3, seed: 8 }]));
const corners = placesOf(block, rough);
ok('a box displaced does not crack: each point\'s copies move together', corners.every(c => c.at.every(p => p.every((v, k) => Math.abs(v - c.at[0][k]) < 1e-9))), true);
ok('…its edges stay hard: copies across one keep their own normals', corners.some(c => c.n.some(nn => nn[0] * c.n[0][0] + nn[1] * c.n[0][1] + nn[2] * c.n[0][2] < 0.9)), true);
const seamed = new T.SphereGeometry(1, 16, 8);
const smooth = modify(seamed.clone(), stack(['displace', { amount: 0.15, size: 0.3, seed: 8 }]));
ok('…a sphere\'s seam stays smooth: its copies share one normal', placesOf(seamed, smooth).filter(c => Math.abs(c.at[0][1]) < 0.99)
  .every(c => c.n.every(nn => nn.every((v, k) => Math.abs(v - c.n[0][k]) < 1e-6))), true);

// ── Mirror and array ─────────────────────────────────────────────────────────

const twins = modify(box(), stack(['mirror', { axis: 'x', offset: 0.6 }]));
ok('mirrored across x, 0.6 off: twice the triangles, a twin from 0.7 to 1.7', [triangles(twins), bounds(twins)[0], bounds(twins)[3]], [24, -0.5, 1.7]);
ok('…the twin\'s faces still facing out', truest(twins) > 0.999, true);
const denser = () => subdivide(new T.SphereGeometry(1, 130, 66), 2);             // over half the cap
ok('a mirror past the cap is left out', triangles(modify(denser(), stack(['mirror', {}]))), triangles(denser()));
const row = modify(box(), stack(['array', { count: 3, dx: 1.5 }]));
ok('a row of three, 1.5 apart, its middle where the box was', [triangles(row), bounds(row)[0], bounds(row)[3]], [36, -2, 2]);
ok('a row past the cap is cut shorter', triangles(modify(dense(), stack(['array', { count: 64 }]))), Math.floor(MAX_TRIANGLES / triangles(dense())) * triangles(dense()));

// ── A stack ──────────────────────────────────────────────────────────────────

const first = modify(box(), stack(['twist', { angle: 90 }], ['subdivide', { levels: 2 }]));
ok('a stack runs in order: a twist before subdividing is not one after', JSON.stringify(points(first)) !== JSON.stringify(points(twisted)), true);
const original = box();
let freed = 0;
original.addEventListener('dispose', () => freed++);
modify(original, stack(['subdivide', { levels: 1 }]));
ok('…and frees a geometry it replaces', freed, 1);

// ── A shape's stack, in the scene ────────────────────────────────────────────

const recipe = mods => ({ shapes: [{ id: 'box', params: {}, modifiers: mods }] });
const model = new Model().update(recipe([{ id: 'subdivide', params: { levels: 1 } }]));
ok('a shape\'s stack makes its geometry', triangles(model.parts[0].mesh.geometry), 48);
const kept = model.parts[0].mesh.geometry;
model.update(recipe([{ id: 'subdivide', params: { levels: 1 } }]));
ok('the same stack keeps it', model.parts[0].mesh.geometry === kept, true);
model.update(recipe([{ id: 'subdivide', params: { levels: 2 } }]));
ok('a change to the stack makes it again', triangles(model.parts[0].mesh.geometry), 192);
model.update(recipe([{ id: 'subdivide', params: { levels: 2 }, on: false }, { id: 'melt', params: {} }]));
ok('a modifier off is skipped, one unknown too', triangles(model.parts[0].mesh.geometry), 12);
ok('…and the unknown named', unknownIn(recipe([{ id: 'melt' }, { id: 'twist' }])), ['melt']);
model.update({ shapes: [{ id: 'box', params: {} }] });
ok('a recipe from before stacks draws as it did', [triangles(model.parts[0].mesh.geometry), bounds(model.parts[0].mesh.geometry)], [12, bounds(box())]);
const turnedTwist = new Model().update({ shapes: [{ id: 'box', params: { turnY: 45 },
  modifiers: [{ id: 'subdivide', params: { levels: 2 } }, { id: 'twist', params: { angle: 90 } }] }] });
ok('framed by its vertices: twisted and turned 45°, still √(½ + ¼ + ½) round', r3(turnedTwist.bounds().radius), r3(Math.sqrt(1.25)));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
