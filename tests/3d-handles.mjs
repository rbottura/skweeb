/**
 * tests/3d-handles.mjs — run with: node tests/3d-handles.mjs
 *
 * Covers apps/3d/handles.js on three's own TransformControls, and the way
 * back from a mesh to its card (scene.js `placeOf`). The promises — a mesh
 * placed from values gives them back, each mode only its own: a move x, y,
 * z; a turn its three angles; a stretch by every axis the size, the
 * stretches kept, by one axis or two theirs, the size kept; stretched, a
 * shape is its size times its stretch along each axis. With the handles, a
 * shape seen from the front: the x arrow lights under the pointer, a press
 * takes it, and a drag moves the shape along x as far as the pointer went;
 * a press away from every handle takes none, nor one with nothing chosen,
 * nor one on a mesh the model let go of; the ring facing the eye turns the
 * shape about z by the angle the pointer swept round it; a cube stretches
 * the shape along its axis by as much as the pointer went out, the middle
 * one sizes it whole.
 */

const { Handles, MODES } = await import('../apps/3d/handles.js');
const { Model, placeOf } = await import('../apps/3d/scene.js');
const { shapeSchema } = await import('../apps/3d/shapes.js');
const { cameraFor, VIEW_PARAMS } = await import('../apps/3d/camera.js');
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

// ── From a mesh back to its card ─────────────────────────────────────────────

const schema = shapeSchema('box');
const placed = valuesFor(schema, { x: 1, y: -2, z: 0.5, turnX: 10, turnY: -35, turnZ: 120, size: 1.5, sx: 2, sy: 0.5, sz: 1 });
const mesh = new Model().update({ shapes: [{ id: 'box', params: placed }] }).parts[0].mesh;
ok('a move gives back where it stands, and only that', placeOf(mesh, placed, 'translate'), { x: 1, y: -2, z: 0.5 });
ok('a turn, its three angles', Object.values(placeOf(mesh, placed, 'rotate')).map(r3), [10, -35, 120]);
ok('stretched: size times stretch along each axis', mesh.scale.toArray(), [3, 0.75, 1.5]);
ok('a stretch by every axis: the size, the stretches kept', placeOf(mesh, placed, 'scale', 'XYZ'), { size: 1.5 });
ok('by one axis: its stretch, the size kept', placeOf(mesh, placed, 'scale', 'X'), { sx: 2 });
ok('by two: theirs', placeOf(mesh, placed, 'scale', 'XZ'), { sx: 2, sz: 1 });

// ── The handles, on a box seen from the front ───────────────────────────────

const view = { ...valuesFor(VIEW_PARAMS, {}), yaw: 0, pitch: 0 };
const camera = cameraFor(view, 400, 400);
const on = p => { const v = new Vector3(...p).project(camera); return [v.x, v.y]; };

/** The app's loop, short of the GPU: the card's values, the scene from them, the handles on its mesh. */
function rig(mode) {
  const s = { values: valuesFor(schema, {}), model: new Model() };
  s.handles = new Handles({
    onMove: (m, how) => { s.values = valuesFor(schema, { ...s.values, ...placeOf(m, s.values, how.mode, how.axis) }); },
  });
  s.handles.mode = MODES[mode];
  s.paint = () => {
    s.model.update({ ...view, shapes: [{ id: 'box', params: s.values }] });
    s.handles.attach(s.model.parts[0].mesh);
    s.handles.see(camera);
    s.handles.scene.updateMatrixWorld(true);
  };
  s.paint();
  return s;
}

/** The first point along a line through the world where the handles light `axis`. */
function find({ handles }, axis, along) {
  for (let t = 0.02; t < 2.5; t += 0.01) {
    handles.hover(on(along(t)));
    if (handles.controls.axis === axis) return t;
  }
  return null;
}

/** A press at one world point, a drag through more, and let go — painting between, as the app does. */
function stroke(s, points) {
  const took = s.handles.press(on(points[0]));
  for (const p of points.slice(1)) { s.handles.drag(on(p)); s.paint(); }
  s.handles.release();
  s.paint();
  return took;
}

const move = rig('move');
const tx = find(move, 'X', t => [t, 0, 0]);
ok('the x arrow lights under the pointer, along x', tx !== null && move.handles.lit, true);
ok('a press there takes it', [move.handles.press(on([tx, 0, 0])), move.handles.held], [true, true]);
move.handles.release();
ok('a drag along it moves the shape along x, as far as the pointer went', stroke(move, [[tx, 0, 0], [tx + 0.25, 0, 0], [tx + 0.5, 0, 0]])
  && [r3(move.values.x), r3(move.values.y), r3(move.values.z)], [0.5, 0, 0]);
ok('…its mesh drawn there, nothing held', [r3(move.model.parts[0].mesh.position.x), move.handles.held], [0.5, false]);
ok('a press away from every handle takes none', move.handles.press(on([2, 2, 0])), false);
move.handles.attach(null);
ok('nor one with nothing chosen', move.handles.press(on([0.5 + tx, 0, 0])), false);
move.handles.attach(move.model.parts[0].mesh);
move.model.update({ ...view, shapes: [] });
ok('nor one on a mesh the model let go of', move.handles.press(on([0.5 + tx, 0, 0])), false);

const turn = rig('turn');
const deg = Math.PI / 180;
const ring = find(turn, 'Z', t => [t * Math.cos(45 * deg), t * Math.sin(45 * deg), 0]);
const round = a => [ring * Math.cos(a * deg), ring * Math.sin(a * deg), 0];
ok('the ring facing the eye lights, round the shape', ring !== null, true);
stroke(turn, [round(45), round(60), round(75)]);
ok('…and turns it about z by the angle swept round it', [r3(turn.values.turnX), r3(turn.values.turnY), r3(turn.values.turnZ)], [0, 0, 30]);

const size = rig('size');
const cube = find(size, 'X', t => [t, 0, 0]);
stroke(size, [[cube, 0, 0], [cube * 1.25, 0, 0], [cube * 1.5, 0, 0]]);
ok('a cube stretches along its axis, as far as the pointer went out', [r3(size.values.sx), r3(size.values.sy), r3(size.values.size)], [1.5, 1, 1]);
const middle = find(size, 'XYZ', t => [t, t, 0]);
stroke(size, [[middle, middle, 0], [middle * 2, middle * 2, 0]]);
ok('the middle one sizes it whole, the stretch kept', [r3(size.values.size), r3(size.values.sx)], [2, 1.5]);
ok('…its mesh as big', size.model.parts[0].mesh.scale.toArray().map(r3), [3, 2, 2]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
