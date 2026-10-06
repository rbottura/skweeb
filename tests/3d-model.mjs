/**
 * tests/3d-model.mjs — run with: node tests/3d-model.mjs
 *
 * Covers apps/3d/scene.js and the words save.js gives a model. The promises
 * — a recipe's shapes become meshes in its order, placed, turned, sized and
 * coloured as their values say; values are coerced by their shape's schema,
 * so an old or hand-made recipe draws; a shape that is off is not drawn, one
 * the catalogue lacks is named and skipped, and each part knows its place in
 * the list, the skipped counted; an update that changes only a place or a
 * colour keeps the geometry, one that changes the form makes it again and
 * frees the old, and what goes is freed; the sun comes from where its angles
 * say; the bounds are every shape's; a title counts the shapes.
 */

const { Model, shapesOf, unknownIn, LIGHT_PARAMS } = await import('../apps/3d/scene.js');
const { titleOf } = await import('../apps/3d/save.js');
const { direction } = await import('../apps/3d/camera.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const r3 = x => Math.round(x * 1000) / 1000 || 0;

const recipe = shapes => ({ sun: 2, sunYaw: 0, sunPitch: 90, ambient: 0.5, shapes });

const model = new Model().update(recipe([
  { id: 'box', params: { width: 2, x: 1, y: 2, z: 3, turnY: 90, size: 2, colour: '#ff0000' } },
  { id: 'sphere', params: { radius: 0.5 }, on: false },
  { id: 'teapot', params: {} },
  { id: 'torus', params: { colour: '#2a62d8', shading: 'flat' } },
]));

ok('the shapes that are on and known, in order', model.parts.map(p => p.form.split(':')[0]), ['box', 'torus']);
ok('drawn as many', model.count, 2);
ok('each knows its place in the list, the skipped counted', model.parts.map(p => p.index), [0, 3]);
ok('…so a card finds its shape, and a hidden one none', [model.partAt(3) === model.parts[1], model.partAt(1)], [true, null]);
const [box, torus] = model.parts.map(p => p.mesh);
ok('placed where its values say', box.position.toArray(), [1, 2, 3]);
ok('turned, degrees to radians', r3(box.rotation.y), r3(Math.PI / 2));
ok('sized', box.scale.toArray(), [2, 2, 2]);
ok('coloured', box.material.color.getHexString(), 'ff0000');
ok('flat where it says flat', [box.material.flatShading, torus.material.flatShading], [false, true]);
ok('the shape the catalogue lacks is named', unknownIn(recipe([{ id: 'box' }, { id: 'teapot' }, null])), ['teapot', '?']);
ok('values coerced by the shape\'s schema', shapesOf(recipe([{ id: 'sphere', params: { radius: 900, segments: 'many' } }]))[0].values.radius, 50);
ok('missing values at their defaults', shapesOf(recipe([{ id: 'box' }]))[0].values.colour, '#ffd60a');

// ── Kept in step ─────────────────────────────────────────────────────────────

const geometryBefore = box.geometry;
let freed = 0;
geometryBefore.addEventListener('dispose', () => freed++);
model.update(recipe([
  { id: 'box', params: { width: 2, x: -1, colour: '#00ff00' } },
  { id: 'torus', params: { colour: '#2a62d8', shading: 'flat' } },
]));
ok('a move and a colour keep the geometry', model.parts[0].mesh.geometry === geometryBefore, true);
ok('…and move and colour it', [model.parts[0].mesh.position.x, model.parts[0].mesh.material.color.getHexString()], [-1, '00ff00']);

model.update(recipe([
  { id: 'box', params: { width: 3, x: -1 } },
  { id: 'torus', params: { colour: '#2a62d8', shading: 'flat' } },
]));
ok('a new width makes the geometry again', model.parts[0].mesh.geometry !== geometryBefore, true);
ok('…and frees the old one', freed, 1);

const going = model.parts[1].mesh;
let goneGeometry = 0, goneMaterial = 0;
going.geometry.addEventListener('dispose', () => goneGeometry++);
going.material.addEventListener('dispose', () => goneMaterial++);
model.update(recipe([{ id: 'box', params: { width: 3 } }]));
ok('a shape taken out leaves the scene', [model.count, model.scene.children.includes(going)], [1, false]);
ok('…its geometry and material freed', [goneGeometry, goneMaterial], [1, 1]);

const shading = model.parts[0].mesh.material;
const version = shading.version;
model.update(recipe([{ id: 'box', params: { width: 3, shading: 'flat' } }]));
ok('flat after smooth: the material is compiled again', shading.version > version, true);

// ── The light ────────────────────────────────────────────────────────────────

model.update({ ...recipe([{ id: 'box' }]), sun: 3, sunYaw: 90, sunPitch: 0, ambient: 0.25 });
ok('the sun comes from where its angles say', model.sun.position.toArray().map(x => r3(x / 10)), direction(90, 0).map(r3));
ok('…as strong as it says, the fill too', [model.sun.intensity, model.fill.intensity], [3, 0.25]);
ok('a recipe with no light has the defaults', new Model().update({ shapes: [] }).sun.intensity, LIGHT_PARAMS.sun.default);

// ── Bounds, and words ────────────────────────────────────────────────────────

const bounded = new Model().update(recipe([{ id: 'box', params: { width: 2, height: 1, depth: 1, x: 2 } }]));
const round = bounded.bounds();
ok('the bounds of what is drawn: its middle', round.centre, [2, 0, 0]);
ok('…and the sphere round its corners', r3(round.radius), r3(Math.hypot(1, 0.5, 0.5)));
ok('nothing drawn, no bounds', new Model().update(recipe([])).bounds(), null);

let all = 0;
const disposing = new Model().update(recipe([{ id: 'box' }, { id: 'cone' }]));
for (const p of disposing.parts) { p.mesh.geometry.addEventListener('dispose', () => all++); p.mesh.material.addEventListener('dispose', () => all++); }
disposing.dispose();
ok('disposed: every geometry and material freed', [all, disposing.count], [4, 0]);

ok('a title counts the shapes', titleOf([{ id: 'box' }, { id: 'sphere' }, { id: 'sphere' }, { id: 'torus', on: false }]), 'box, sphere ×2');
ok('an empty model says so', titleOf([]), 'an empty model');

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
