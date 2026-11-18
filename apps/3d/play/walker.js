/**
 * walker.js — a body on a sphere (M16a, docs/worm.md): where it stands, the
 * way it faces, how far it has gone.
 *
 * Its up is the planet's normal where it stands; its heading, `f`, a unit
 * tangent, turns about that up; a step carries both along the great circle
 * ahead — a turn of the whole frame about `up × f` by the step over the
 * radius — so the frame rolls over the planet and never drifts off it. Each
 * step puts the frame square again: the place back on the sphere, the
 * heading back in its tangent plane. `walked` is the signed distance gone,
 * what the worm's wave is timed by (worm.js).
 *
 * Pure: three's core only, Node runs it (tests/3d-play.mjs).
 */

import { Vector3 } from '../../../core/libs/three/three.core.js';

/** A walker on a planet of `radius`: on its top, facing away from the eye, as three's cameras face. */
export function walkerAt(radius) {
  return { p: new Vector3(0, radius, 0), f: new Vector3(0, 0, -1), walked: 0 };
}

/** Where it stands as a frame: its up, its forward, its right — `forward × up`, so a right-handed frame. */
export function frameOf(w) {
  const up = w.p.clone().normalize();
  return { up, forward: w.f.clone(), right: w.f.clone().cross(up).normalize() };
}

const axis = new Vector3();

/**
 * One step: turned by `turn` (−1 left to 1 right) at `turnRate` radians a second, moved by `move` (−1 back to 1
 * ahead) at `speed` units a second, for `dt` seconds, on a planet of `radius`.
 */
export function step(w, { move = 0, turn = 0 }, dt, { radius, speed, turnRate }) {
  const up = w.p.clone().normalize();
  if (turn) w.f.applyAxisAngle(up, -turn * turnRate * dt);
  const d = move * speed * dt;
  if (d) {
    axis.crossVectors(up, w.f).normalize();
    const angle = d / radius;
    w.p.applyAxisAngle(axis, angle);
    w.f.applyAxisAngle(axis, angle);
    w.walked += d;
  }
  return settle(w, radius);
}

/** The walker put square: on the sphere of `radius`, its heading a unit tangent there. */
export function settle(w, radius) {
  const up = w.p.lengthSq() > 0 ? w.p.clone().normalize() : new Vector3(0, 1, 0);
  w.p.copy(up).multiplyScalar(radius);
  w.f.addScaledVector(up, -w.f.dot(up));
  if (w.f.lengthSq() < 1e-12) w.f.set(1, 0, 0).addScaledVector(up, -up.x);   // facing straight up: any way round
  w.f.normalize();
  return w;
}
