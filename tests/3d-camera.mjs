/**
 * tests/3d-camera.mjs — run with: node tests/3d-camera.mjs
 *
 * Covers apps/3d/camera.js. The promises — yaw 0 sees the front from +z, 90
 * the right side; the point looked at is the picture's middle, through
 * either lens, and both lenses frame the same height there; only the
 * picture's shape counts, so twice the pixels is the same picture; a drag
 * turns the model with the pointer, the yaw coming round and the pitch
 * stopping short of the poles; a slide keeps the point under the pointer
 * under it; nearer and further stay in the row's bounds; framing a sphere
 * fits it, the shorter side counting.
 */

const { direction, eyeOf, halfHeight, cameraFor, orbit, dolly, pan, frameAround, TURN, VIEW_PARAMS } = await import('../apps/3d/camera.js');
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
const r3s = a => a.map(r3);

const view = (over = {}) => ({ ...valuesFor(VIEW_PARAMS, {}), ...over });
/** Where a world point lands in a camera's picture, -1 to 1 each way, y up. */
const ndc = (camera, p) => { const v = new Vector3(...p).project(camera); return [r3(v.x), r3(v.y)]; };

// ── Where the eye is ─────────────────────────────────────────────────────────

ok('yaw 0, level: the eye on +z', r3s(direction(0, 0)), [0, 0, 1]);
ok('yaw 90: on +x, seeing the right side', r3s(direction(90, 0)), [1, 0, 0]);
ok('raised 90: straight above', r3s(direction(0, 90)), [0, 1, 0]);
ok('the eye: the point looked at, plus the distance that way', r3s(eyeOf(view({ yaw: 0, pitch: 0, distance: 5, tx: 1, ty: 2, tz: 3 }))), [1, 2, 8]);

// ── The picture ──────────────────────────────────────────────────────────────

for (const lens of ['perspective', 'orthographic']) {
  const v = view({ lens, yaw: 40, pitch: 25, distance: 6, tx: 0.5, ty: -0.2, tz: 1 });
  const camera = cameraFor(v, 300, 200);
  ok(`${lens}: the point looked at is the middle`, ndc(camera, [v.tx, v.ty, v.tz]), [0, 0]);
  const pitch = 25 * Math.PI / 180, yaw = 40 * Math.PI / 180;
  const up = [-Math.sin(pitch) * Math.sin(yaw), Math.cos(pitch), -Math.sin(pitch) * Math.cos(yaw)];   // the camera's up
  const top = [v.tx + up[0] * halfHeight(v), v.ty + up[1] * halfHeight(v), v.tz + up[2] * halfHeight(v)];
  ok(`${lens}: framing ${r3(halfHeight(v))} above it to the top edge`, ndc(camera, top), [0, 1]);
  const twice = cameraFor(v, 600, 400);
  ok(`${lens}: twice the pixels, the same projection`, twice.projectionMatrix.elements.map(r3), camera.projectionMatrix.elements.map(r3));
}

// ── By hand ──────────────────────────────────────────────────────────────────

const v0 = view({ yaw: 170, pitch: 80 });
ok('a drag right turns the eye the other way', r3(orbit(v0, 10, 0, 480).yaw), r3(170 - 10 * TURN / 480));
ok('the yaw comes round past 180', r3(orbit(v0, -40, 0, 480).yaw), r3(170 + 40 * TURN / 480 - 360));
ok('the pitch stops short of the pole', orbit(v0, 0, 400, 480).pitch, 89);
ok('and of the other', orbit(view({ pitch: -80 }), 0, -400, 480).pitch, -89);

ok('the wheel: nearer by its factor', r3(dolly(view({ distance: 4 }), 0.5).distance), 2);
ok('never nearer than the row allows', dolly(view({ distance: 0.3 }), 0.01).distance, VIEW_PARAMS.distance.min);
ok('nor further', dolly(view({ distance: 400 }), 10).distance, VIEW_PARAMS.distance.max);

for (const lens of ['perspective', 'orthographic']) {
  const v = view({ lens, yaw: -60, pitch: 30, distance: 5, tx: 1, ty: 0, tz: -2 });
  const at = [v.tx, v.ty, v.tz];
  const moved = { ...v, ...pan(v, 10, 5, 100) };
  const before = ndc(cameraFor(v, 200, 100), at), after = ndc(cameraFor(moved, 200, 100), at);
  ok(`${lens}: a slide carries the point under the pointer with it`, [r3(after[0] - before[0]), r3(after[1] - before[1])], [0.1, -0.1]);
}

// ── Framing ──────────────────────────────────────────────────────────────────

const round = { centre: [1, 2, 3], radius: 1.5 };
const framed = frameAround(view({ fov: 40 }), round.centre, round.radius, 400, 400);
ok('framed: looking at the middle of it', [framed.tx, framed.ty, framed.tz], [1, 2, 3]);
ok('far enough that the sphere touches the frame, with its margin',
   r3(framed.distance * Math.sin(20 * Math.PI / 180)), r3(1.5 * 1.15));
const tall = frameAround(view({ fov: 40 }), round.centre, round.radius, 200, 400);
ok('a narrow picture frames by its width: further', tall.distance > framed.distance, true);
const ortho = frameAround(view({ lens: 'orthographic', fov: 40 }), round.centre, round.radius, 400, 400);
ok('orthographic: half the height is the sphere and its margin', r3(halfHeight({ ...view({ fov: 40 }), ...ortho })), r3(1.5 * 1.15));

// ── The turntable (motion.js, P1): the eye's path in time, a loop that closes to the bit ──
const { loopOf, seenAt, turnedAt, MOTION_PARAMS } = await import('../apps/3d/motion.js');
const turning = { yaw: 30, sunYaw: -35, turns: 1, turning: 'the model', length: 72, fps: 24 };
ok('nothing turns: one frame, a still — and in a recipe saved before the turntable', [loopOf({ ...turning, turns: 0 }), loopOf({ yaw: 30 })],
  [{ length: 1, fps: 0, loop: false, closes: false, turns: 0, swings: false, evolves: false }, { length: 1, fps: 0, loop: false, closes: false, turns: 0, swings: false, evolves: false }]);
ok('a turn: its frames at its rate, a loop', loopOf(turning), { length: 72, fps: 24, loop: true, closes: true, turns: 1, swings: false, evolves: false });
ok('frame i turned 360° × turns × i / length: a quarter at 18, twice as far at two turns',
  [turnedAt(turning, 18), turnedAt({ ...turning, turns: 2 }, 18), turnedAt({ ...turning, turns: -1 }, 18)], [90, 180, -90]);
ok('the frame after the last is the first, to the bit', JSON.stringify(seenAt(turning, 72)) === JSON.stringify(seenAt(turning, 0))
  && JSON.stringify(seenAt(turning, -1)) === JSON.stringify(seenAt(turning, 71)), true);
ok('…and frame 0 is the recipe itself', seenAt(turning, 0) === turning, true);
ok('the model turns: the sun turns with the eye', [seenAt(turning, 18).yaw, seenAt(turning, 18).sunYaw], [120, 55]);
ok('the eye turns: the sun stays in the world', [seenAt({ ...turning, turning: 'the eye' }, 18).yaw, seenAt({ ...turning, turning: 'the eye' }, 18).sunYaw], [120, -35]);
ok('its rows: turns from −2 to 2, what turns only when it turns, the loop\'s length always — a swing\'s too',
  [MOTION_PARAMS.turns.min, MOTION_PARAMS.turns.max, MOTION_PARAMS.turns.default, JSON.stringify(MOTION_PARAMS.turning.when), MOTION_PARAMS.length.when],
  [-2, 2, 0, '{"turns":{"not":0}}', undefined]);

// A shape swung (P2): its place on a wave, whole cycles in the loop — frame `length` frame 0 again.
const { swungAt, swings } = await import('../apps/3d/motion.js');
const bob = { id: 'sphere', on: true, params: { y: 1, size: 2, turnY: 10, swingBy: 'y', swingMove: 0.5, swingCycles: 1, swingPhase: 0 } };
ok('a shape that swings makes the model a loop, turning or not', loopOf({ turns: 0, length: 60, fps: 30, shapes: [bob] }),
  { length: 60, fps: 30, loop: true, closes: true, turns: 0, swings: true, evolves: false });
ok('…one that is off, or swings nothing, does not', [swings({ ...bob, on: false }), swings({ ...bob, params: { ...bob.params, swingBy: 'none' } })], [false, false]);
ok('up and down: as far either way, a quarter round its top, half round where it began', [0, 15, 30, 45].map(i => +swungAt(bob, i, 60).params.y.toFixed(6)),
  [1, 1.5, 1, 0.5]);
ok('…frame 60 is frame 0, to the bit; two cycles twice as quick', [swungAt(bob, 60, 60).params.y === swungAt(bob, 0, 60).params.y,
  +swungAt({ ...bob, params: { ...bob.params, swingCycles: 2 } }, 15, 60).params.y.toFixed(6)], [true, 1]);
ok('turned, in degrees; its size, a share of it; at its phase', [swungAt({ ...bob, params: { ...bob.params, swingBy: 'turnY', swingTurn: 20 } }, 15, 60).params.turnY,
  swungAt({ ...bob, params: { ...bob.params, swingBy: 'size', swingSize: 0.5 } }, 15, 60).params.size,
  +swungAt({ ...bob, params: { ...bob.params, swingPhase: 90 } }, 0, 60).params.y.toFixed(6)], [30, 3, 1.5]);
ok('…and seen at a frame, its shapes swung with it', seenAt({ turns: 0, length: 60, fps: 30, yaw: 0, shapes: [bob] }, 15).shapes[0].params.y, 1.5);

// A model from every side (sides.js, P6): RPG Maker's order, the eye turned round it, no turntable.
const { SIDES, sideRecipe } = await import('../apps/3d/sides.js');
const { DIRECTIONS } = await import('../core/character.js');
ok('its sides in a character\'s order', SIDES.map(s => s[0]), DIRECTIONS);
ok('…each the eye turned round it — down as framed, left a quarter, right the other way, up from behind — and none turning',
  SIDES.map(([, by]) => { const r = sideRecipe({ yaw: 30, turns: 1, length: 72 }, by); return [r.yaw, r.turns]; }),
  [[30, 0], [120, 0], [-60, 0], [210, 0]]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
