/**
 * tests/3d-shapes.mjs — run with: node tests/3d-shapes.mjs
 *
 * Covers apps/3d/shapes.js, on three.js's core, which Node runs. The
 * promises — every shape is a catalogue entry a card can be drawn from, its
 * schema its form then the place and look every shape has, a recipe from
 * before the stretches standing as it did; each geometry is the size its
 * params say, the same for the same values, and rounder for more segments; a
 * shape added from the menu starts beside the last, in the next colour.
 */

const { SHAPES, PLACE, SHAPE_GROUPS, shapeSchema, formKeys, startOf, COLOURS } = await import('../apps/3d/shapes.js');
const { defineParams, valuesFor } = await import('../core/params.js');
const { Box3 } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const r3 = x => Math.round(x * 1000) / 1000;

/** A shape's geometry at its defaults with some values changed, and its size along x, y, z. */
const geometry = (id, values = {}) => SHAPES[id].geometry(valuesFor(shapeSchema(id), values));
const extent = g => {
  const box = new Box3().setFromBufferAttribute(g.attributes.position);
  return [r3(box.max.x - box.min.x), r3(box.max.y - box.min.y), r3(box.max.z - box.min.z)];
};

// ── The catalogue ────────────────────────────────────────────────────────────

ok('seven shapes, in the menu\'s order', Object.keys(SHAPES), ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'capsule']);
ok('each entry says its own id', Object.entries(SHAPES).every(([k, s]) => s.id === k && typeof s.label === 'string'), true);
ok('every schema declares, as a card will', Object.keys(SHAPES).every(id => !!defineParams('3d:' + id, shapeSchema(id))), true);
ok('a schema is the form, then place and look', Object.keys(shapeSchema('sphere')),
   ['radius', 'segments', 'x', 'y', 'z', 'turnX', 'turnY', 'turnZ', 'size', 'sx', 'sy', 'sz', 'colour', 'shading']);
ok('a recipe from before the stretches stands as it did: each 1', ['sx', 'sy', 'sz'].map(k => valuesFor(shapeSchema('box'), { size: 2 })[k]), [1, 1, 1]);
ok('every row is in a card\'s drawer', Object.keys(SHAPES).every(id =>
  Object.values(shapeSchema(id)).every(spec => spec.group in SHAPE_GROUPS)), true);
ok('form rows are the form\'s, place and look every shape\'s', Object.values(SHAPES).every(s =>
  Object.values(s.params).every(spec => spec.group === 'form')) && Object.values(PLACE).every(spec => spec.group !== 'form'), true);
ok('what makes a box\'s geometry', formKeys('box'), ['width', 'height', 'depth']);
let threw = '';
try { shapeSchema('teapot'); } catch (err) { threw = err.message; }
ok('a shape the catalogue lacks is said, not guessed', threw, '3d: no shape "teapot"');

// ── Geometry, as big as its params say ──────────────────────────────────────

ok('a box is its width, height and depth', extent(geometry('box', { width: 2, height: 0.5, depth: 3 })), [2, 0.5, 3]);
ok('a sphere is its diameter every way', extent(geometry('sphere', { radius: 0.75 })), [1.5, 1.5, 1.5]);
ok('a cylinder: its wider radius across, its height up', extent(geometry('cylinder', { top: 0.2, bottom: 0.9, height: 2 })), [1.8, 2, 1.8]);
ok('a cylinder with no top radius is a cone', extent(geometry('cylinder', { top: 0, bottom: 0.5, height: 1 })), extent(geometry('cone', { radius: 0.5, height: 1 })));
ok('a cone: its base across, its height up', extent(geometry('cone', { radius: 0.4, height: 1.5 })), [0.8, 1.5, 0.8]);
ok('a torus lies in x and y: across, twice radius and tube', extent(geometry('torus', { radius: 1, tube: 0.25 })), [2.5, 2.5, 0.5]);
ok('a plane has no depth', extent(geometry('plane', { width: 3, height: 1 })), [3, 1, 0]);
ok('a capsule: its length and both caps up', extent(geometry('capsule', { radius: 0.3, length: 1 })), [0.6, 1.6, 0.6]);

const a = geometry('torus', { radius: 0.8 }), b = geometry('torus', { radius: 0.8 });
ok('the same values, the same vertices', Array.from(a.attributes.position.array).every((x, i) => x === b.attributes.position.array[i]), true);
ok('more segments, more vertices', geometry('sphere', { segments: 12 }).attributes.position.count
   < geometry('sphere', { segments: 64 }).attributes.position.count, true);
ok('segments are a whole number, at least three', [valuesFor(shapeSchema('sphere'), { segments: 1 }).segments,
   valuesFor(shapeSchema('sphere'), { segments: 7.6 }).segments], [3, 8]);
ok('a size is held to its row', valuesFor(shapeSchema('box'), { width: 999, height: -1 }).width, 50);

// ── Where a new shape starts ────────────────────────────────────────────────

ok('side by side: the middle, right, left, further right', [0, 1, 2, 3, 4].map(n => startOf(n).x), [0, 1.6, -1.6, 3.2, -3.2]);
ok('each in the next colour, round', [0, 1, COLOURS.length].map(n => startOf(n).colour), [COLOURS[0], COLOURS[1], COLOURS[0]]);
ok('the middle is 0, not -0', Object.is(startOf(0).x, 0), true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
