/**
 * tests/3d-pick.mjs — run with: node tests/3d-pick.mjs
 *
 * Covers apps/3d/pick.js and the chosen shape's box in apps/3d/guides.js.
 * The promises — a pointer's place in the canvas's box is the picture's
 * point, y up; a pick answers the shape's place in the recipe's list, hidden
 * ones counted, so a card and its shape agree; nothing under the point is
 * null, a torus's hole included; the nearest shape wins whatever the order;
 * what an orthographic eye draws behind itself can be picked; a plane is
 * picked from behind, a shape from inside is not, as neither is drawn
 * otherwise; a pick reads no pixel; the box hugs a sphere exactly, and is
 * none where the shape is behind the eye.
 */

const { pick, onPicture } = await import('../apps/3d/pick.js');
const { boxOnPicture } = await import('../apps/3d/guides.js');
const { Model } = await import('../apps/3d/scene.js');
const { cameraFor, halfHeight, VIEW_PARAMS } = await import('../apps/3d/camera.js');
const { valuesFor } = await import('../core/params.js');
const { Vector3 } = await import('../core/libs/three/three.core.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const r3 = x => Math.round(x * 1000) / 1000 || 0;

/** From the front, level, seven away, unless told otherwise. */
const view = (over = {}) => ({ ...valuesFor(VIEW_PARAMS, {}), yaw: 0, pitch: 0, ...over });
const modelOf = (shapes, v = view()) => new Model().update({ ...v, shapes });
/** Where a world point is on a camera's picture, -1 to 1, y up. */
const on = (camera, p) => { const q = new Vector3(...p).project(camera); return [q.x, q.y]; };
const pickAt = (model, camera, p) => { const hit = pick(model, camera, ...on(camera, p)); return hit && hit.index; };

// ── The pointer's point ─────────────────────────────────────────────────────

const rect = { left: 10, top: 20, width: 200, height: 100 };
ok('the canvas\'s top left is -1, 1', onPicture(10, 20, rect), [-1, 1]);
ok('its bottom right 1, -1', onPicture(210, 120, rect), [1, -1]);
ok('its middle 0, 0', onPicture(110, 70, rect), [0, 0]);

// ── Which shape ─────────────────────────────────────────────────────────────

const row = modelOf([
  { id: 'box', params: { x: -1.6 }, on: false },
  { id: 'sphere', params: {} },
  { id: 'torus', params: { x: 1.6 } },
]);
const front = cameraFor(view(), 400, 400);
ok('the sphere: the second in the list, the hidden box counted', pickAt(row, front, [0, 0, 0]), 1);
ok('the torus\'s tube: the third', pickAt(row, front, [1.6 + 0.55, 0, 0]), 2);
ok('through the torus\'s hole: nothing', pickAt(row, front, [1.6, 0, 0]), null);
ok('where the hidden box would be: nothing', pickAt(row, front, [-1.6, 0, 0]), null);
ok('between the shapes: nothing', pickAt(row, front, [0, 1.2, 0]), null);
ok('the same point at another size, the same shape', pick(row, cameraFor(view(), 300, 300), 0, 0).index, 1);
const hit = pick(row, front, 0, 0);
ok('…met on the sphere\'s front, 0.6 before its middle', [r3(hit.point[2]), r3(hit.distance)], [0.6, 6.4]);

const behind = modelOf([{ id: 'box', params: {} }, { id: 'sphere', params: { radius: 0.3, z: 1 } }]);
ok('the nearest wins: a sphere before the box', pickAt(behind, front, [0, 0, 0]), 1);
const hidden = modelOf([{ id: 'box', params: {} }, { id: 'sphere', params: { radius: 0.3, z: -1 } }]);
ok('…and the box before a sphere behind it', pickAt(hidden, front, [0, 0, 0]), 0);

// ── What is drawn is what is picked ─────────────────────────────────────────

const ortho = view({ lens: 'orthographic', distance: 2 });
const backOfEye = modelOf([{ id: 'box', params: { z: 4 } }, { id: 'sphere', params: {} }], ortho);
ok('orthographic: a box behind the eye is drawn, and picked', pick(backOfEye, cameraFor(ortho, 400, 400), 0, 0).index, 0);

const fromBehind = view({ yaw: 180 });
ok('a plane, from behind', pick(modelOf([{ id: 'plane', params: {} }], fromBehind), cameraFor(fromBehind, 400, 400), 0, 0)?.index, 0);
const inside = view({ distance: 2 });
ok('a sphere, from inside: not drawn, not picked', pick(modelOf([{ id: 'sphere', params: { radius: 5 } }], inside), cameraFor(inside, 400, 400), 0, 0), null);

// ── The chosen shape's box ──────────────────────────────────────────────────

const flat = view({ lens: 'orthographic', distance: 6 });
const ball = modelOf([{ id: 'sphere', params: { radius: 0.6 } }], flat);
const k = 0.6 / halfHeight(flat);
const box = boxOnPicture(ball.parts[0].mesh, cameraFor(flat, 400, 400), 400, 400);
ok('it hugs a sphere: as wide and high as it is', [r3(box.w), r3(box.h)], [r3(k * 400), r3(k * 400)]);
ok('…round its middle', [r3(box.x + box.w / 2), r3(box.y + box.h / 2)], [200, 200]);
const moved = modelOf([{ id: 'sphere', params: { radius: 0.6, y: 1 } }], flat);
ok('higher in the world, higher on the picture', boxOnPicture(moved.parts[0].mesh, cameraFor(flat, 400, 400), 400, 400).y < box.y, true);
const near = view({ distance: 0.5 });
const around = modelOf([{ id: 'box', params: { width: 10, height: 10, depth: 10 } }], near);
ok('none where the shape is behind the eye', boxOnPicture(around.parts[0].mesh, cameraFor(near, 400, 400), 400, 400), null);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
