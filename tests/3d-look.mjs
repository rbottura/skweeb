/**
 * tests/3d-look.mjs — run with: node tests/3d-look.mjs
 *
 * Covers apps/3d/look.js through the scene. The promises — with no style a
 * shape is three's physical shading, as before; with bands it is a toon
 * whose ramp has that many steps, each at its band's middle, nearest-read
 * and shared between models; a shape's colour, flat or smooth, and a
 * plane's two sides are still its own; a change of kind frees the old
 * material, a change of colour keeps it; whatever a recipe holds, the bands
 * are 0 to 6. An outline is a hull behind each shape but a plane — its back
 * faces, its geometry the shape's, followed when made again — pushed along
 * normals a corner's copies share, by a share of the picture in its
 * proportions; a click picks the shape, never its hull; at 0 it hides.
 * Shadows: the sun casts, every shape casts and receives, the sun's way kept
 * and its shadow camera round the model; a catcher of nothing but shadows
 * just under the model's foot, never a part; off, all of it undone; a
 * print's shadow map larger than the preview's 2048.
 */

const { Model } = await import('../apps/3d/scene.js');
const { rampOf, bandsOf, STYLE_PARAMS } = await import('../apps/3d/look.js');
const { NearestFilter, DoubleSide, BackSide } = await import('../core/libs/three/three.core.js');
const { pick } = await import('../apps/3d/pick.js');
const { cameraFor } = await import('../apps/3d/camera.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const shapes = [
  { id: 'box', params: { colour: '#ff0000', shading: 'flat' } },
  { id: 'plane', params: { colour: '#00ff00' } },
];
const model = new Model().update({ shapes });
const kinds = () => model.parts.map(p => p.mesh.material.type);

ok('no style: three\'s physical shading, as before', kinds(), ['MeshStandardMaterial', 'MeshStandardMaterial']);
ok('the style\'s row: none to six bands, none at first', [STYLE_PARAMS.toon.min, STYLE_PARAMS.toon.max, STYLE_PARAMS.toon.default], [0, 6, 0]);

const before = model.parts[0].mesh.material;
let freed = 0;
before.addEventListener('dispose', () => freed++);
model.update({ toon: 3, shapes });
ok('three bands: every shape a toon', kinds(), ['MeshToonMaterial', 'MeshToonMaterial']);
ok('…the old material freed', freed, 1);
const ramp = model.parts[0].mesh.material.gradientMap;
ok('…its ramp three steps, each at its band\'s middle', [ramp.image.width, ...[0, 1, 2].map(i => ramp.image.data[i * 4])], [3, 43, 128, 213]);
ok('…read nearest, never blended', [ramp.magFilter, ramp.minFilter, ramp.generateMipmaps], [NearestFilter, NearestFilter, false]);
ok('…one ramp for every model', new Model().update({ toon: 3, shapes }).parts[0].mesh.material.gradientMap === ramp && rampOf(3) === ramp, true);
ok('a shape\'s own look kept: its colour, flat, a plane\'s two sides', [model.parts[0].mesh.material.color.getHexString(),
  model.parts[0].mesh.material.flatShading, model.parts[1].mesh.material.side === DoubleSide], ['ff0000', true, true]);

const toon = model.parts[0].mesh.material;
model.update({ toon: 3, shapes: [{ id: 'box', params: { colour: '#0000ff', shading: 'flat' } }, shapes[1]] });
ok('a new colour keeps the material', [model.parts[0].mesh.material === toon, toon.color.getHexString()], [true, '0000ff']);
model.update({ toon: 5, shapes });
ok('five bands: the ramp five steps', model.parts[0].mesh.material.gradientMap.image.width, 5);
model.update({ toon: 0, shapes });
ok('back to none: physical again', kinds(), ['MeshStandardMaterial', 'MeshStandardMaterial']);
ok('one band: a shape in one flat colour, at half the light', [rampOf(1).image.width, rampOf(1).image.data[0]], [1, 128]);
ok('whatever a recipe holds, 0 to 6', [bandsOf({ toon: 99 }), bandsOf({ toon: -3 }), bandsOf({ toon: 'x' }), bandsOf(null), bandsOf({ toon: 2.6 })], [6, 0, 0, 0, 3]);

// ── The outline ──────────────────────────────────────────────────────────────

const hulls = m => m.parts.map(p => p.mesh.userData.hull || null);
ok('no outline: no hull', hulls(model).every(h => !h || !h.visible), true);
const lined = { outline: 6, ink: '#2a62d8', width: 1080, height: 1350, shapes };
model.update(lined);
const [boxHull, planeHull] = hulls(model);
ok('an outline: the box\'s hull, its own geometry, shown', !!boxHull && boxHull.visible && boxHull.geometry === model.parts[0].mesh.geometry
  && boxHull.parent === model.parts[0].mesh, true);
ok('…its back faces only, and no hull for a plane', [boxHull.material.side === BackSide, !planeHull || !planeHull.visible], [true, true]);
ok('…six thousandths of the height, the format\'s proportions, its colour', [model.ink.width.value, model.ink.aspect.value, model.ink.colour.value.getHexString()],
  [0.012, 0.8, '2a62d8']);
const corner = Array.from({ length: 24 }, (_, i) => i).filter(i => {
  const p = model.parts[0].mesh.geometry.attributes.position;
  return p.getX(i) > 0 && p.getY(i) > 0 && p.getZ(i) > 0;
});
const hullAt = i => { const h = model.parts[0].mesh.geometry.attributes.hull; return [h.getX(i), h.getY(i), h.getZ(i)].map(v => Math.round(v * 1000) / 1000); };
const third = Math.round(1000 / Math.sqrt(3)) / 1000;
ok('a corner\'s three copies push one way, out of the corner: no gap', [corner.length, ...corner.map(hullAt).map(String)], [3, ...Array(3).fill(String([third, third, third]))]);
const front = { yaw: 0, pitch: 0, distance: 7, fov: 40, tx: 0, ty: 0, tz: 0, lens: 'perspective' };
const pickable = new Model().update({ ...lined, ...front, shapes: [{ id: 'sphere', params: {} }] });
ok('a click still picks the shape, never its hull', pick(pickable, cameraFor(front, 400, 400), 0, 0).index, 0);
model.update({ ...lined, shapes: [{ id: 'box', params: { colour: '#ff0000' }, modifiers: [{ id: 'subdivide', params: { levels: 1 } }] }, shapes[1]] });
ok('a geometry made again: the hull follows it, smoothed again', model.parts[0].mesh.userData.hull.geometry === model.parts[0].mesh.geometry
  && !!model.parts[0].mesh.geometry.attributes.hull, true);
model.update({ ...lined, outline: 0 });
ok('the outline back to 0: the hulls hidden', hulls(model).every(h => !h || !h.visible), true);

// ── Shadows ──────────────────────────────────────────────────────────────────

const sunny = shadows => ({ sunYaw: -35, sunPitch: 50, shadows, shapes: [{ id: 'box', params: { y: 1 } }, { id: 'sphere', params: { x: 2 } }] });
const r3 = v => Math.round(v * 1000) / 1000;
const way = m => m.sun.position.clone().sub(m.sun.target.position).normalize().toArray().map(r3).join();
const lit = new Model().update(sunny(false));
const sunWay = way(lit);
ok('no shadows: nothing casts, no catcher', [lit.sun.castShadow, lit.parts.some(p => p.mesh.castShadow), !lit.catcher || !lit.catcher.visible], [false, false, true]);
lit.update(sunny(true));
ok('shadows: the sun casts, every shape casts and receives', [lit.sun.castShadow, lit.parts.every(p => p.mesh.castShadow && p.mesh.receiveShadow)], [true, true]);
const round = lit.bounds();
ok('…the sun\'s way kept, where it stands moved to the model\'s middle', [way(lit), lit.sun.target.position.toArray().map(r3).join()],
  [sunWay, round.centre.map(r3).join()]);
const shadowCam = lit.sun.shadow.camera;
ok('…its shadow camera round the whole model', shadowCam.right >= round.radius && shadowCam.top >= round.radius && shadowCam.left <= -round.radius, true);
ok('…a catcher just under the model\'s foot, under its middle, flat', [lit.catcher.visible, r3(lit.catcher.position.y), r3(lit.catcher.position.x),
  r3(lit.catcher.rotation.x)], [true, r3(-0.6 - (lit.catcher.scale.x / 10) * 1e-3), r3(round.centre[0]), r3(-Math.PI / 2)]);   // the sphere's foot, lowest
ok('…nothing but shadows, and never a part', [lit.catcher.material.type, lit.parts.some(p => p.mesh === lit.catcher)], ['ShadowMaterial', false]);
lit.update(sunny(false));
ok('shadows off: the catcher hidden, nothing casts, the sun as it was', [lit.catcher.visible, lit.sun.castShadow, way(lit)], [false, false, sunWay]);
ok('a print\'s shadow map larger, the preview\'s 2048', [new Model().update(sunny(true), { shadowMap: 4096 }).sun.shadow.mapSize.x,
  new Model().update(sunny(true)).sun.shadow.mapSize.x], [4096, 2048]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
