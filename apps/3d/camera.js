/**
 * camera.js — where the model is seen from, as params, and the camera they make.
 *
 * The view is an orbit: a point looked at (`tx`, `ty`, `tz`), a distance from
 * it, and two angles — `yaw`, turned round the up axis, 0 seeing the model's
 * front from +z, and `pitch`, raised above the ground's plane. A pointer only
 * ever moves these (pointer.js), so the panel's rows follow the picture and
 * what is saved is what the panel says, as fractals' plane is.
 *
 * Two lenses. **Perspective**, by its field of view. **Orthographic**, the
 * game's: no vanishing point, the same size near and far — isometric, if
 * turned 45° and raised 35.26°. Both frame the same height at the point
 * looked at, `distance × tan(fov / 2)` each side of it, so switching lens
 * keeps the model the size it was there.
 *
 * Everything here is a function of the values and the picture's shape —
 * never its pixels — so a picture at twice the pixels is the same picture:
 * print scale is drawn again, and exact (tests/3d-camera.mjs).
 */

import { PerspectiveCamera, OrthographicCamera } from '../../core/libs/three/three.core.js';

const view = 'view';
const along = axis => ({ type: 'range', min: -100, max: 100, step: 'any', default: 0, label: `looking at ${axis}`, group: view });

/** The view's rows, for the app's schema. */
export const VIEW_PARAMS = {
  lens:     { type: 'enum', options: ['perspective', 'orthographic'], default: 'perspective', display: 'chips', label: 'lens', group: view },
  yaw:      { type: 'range', min: -180, max: 180, step: 'any', default: 30, label: 'turned °', group: view },
  pitch:    { type: 'range', min: -89, max: 89, step: 'any', default: 22, label: 'raised °', group: view },
  distance: { type: 'range', min: 0.2, max: 500, step: 'any', log: true, default: 7, label: 'distance', group: view },
  fov:      { type: 'range', min: 5, max: 120, step: 0.5, default: 40, label: 'field of view °', group: view, when: { lens: 'perspective' } },
  tx: along('x'), ty: along('y'), tz: along('z'),
};

const RAD = Math.PI / 180;

/** The unit vector from the point looked at to the eye. */
export function direction(yaw, pitch) {
  const y = yaw * RAD, p = pitch * RAD;
  return [Math.cos(p) * Math.sin(y), Math.sin(p), Math.cos(p) * Math.cos(y)];
}

/** Where the eye is. */
export function eyeOf(v) {
  const d = direction(v.yaw, v.pitch);
  return [v.tx + d[0] * v.distance, v.ty + d[1] * v.distance, v.tz + d[2] * v.distance];
}

/** Half the height the view frames at the point looked at — either lens. */
export const halfHeight = v => v.distance * Math.tan((v.fov * RAD) / 2);

/**
 * The camera for a picture of `w` × `h` pixels: only their ratio counts.
 *
 * @returns {import('../../core/libs/three/three.core.js').Camera}
 */
export function cameraFor(v, w, h) {
  const aspect = w / h;
  const near = Math.max(0.001, v.distance / 1000);
  const far = v.distance * 20 + 1000;
  let camera;
  if (v.lens === 'orthographic') {
    const hh = halfHeight(v), hw = hh * aspect;
    // Near enough to clip nothing in front of the point looked at, within reason.
    camera = new OrthographicCamera(-hw, hw, hh, -hh, -far, far);
  } else {
    camera = new PerspectiveCamera(v.fov, aspect, near, far);
  }
  camera.position.set(...eyeOf(v));
  camera.lookAt(v.tx, v.ty, v.tz);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

/** Degrees turned by a drag the height of the picture. */
export const TURN = 240;

/**
 * A drag of `dx`, `dy` pixels on a picture `h` high: the model turns with
 * the pointer — the eye goes the other way round it. Yaw wraps; pitch stops
 * short of the poles, where up would be lost.
 */
export function orbit(v, dx, dy, h) {
  const k = TURN / Math.max(1, h);
  const yaw = ((((v.yaw - dx * k) + 180) % 360) + 360) % 360 - 180;
  const pitch = Math.max(-89, Math.min(89, v.pitch + dy * k));
  return { yaw, pitch };
}

/** The eye nearer or further by `factor`, within the row's bounds. */
export function dolly(v, factor, min = VIEW_PARAMS.distance.min, max = VIEW_PARAMS.distance.max) {
  return { distance: Math.max(min, Math.min(max, v.distance * factor)) };
}

/**
 * A drag of `dx`, `dy` pixels on a picture `h` high, moving the point looked
 * at so the model follows the pointer: at that point, a pixel is
 * `2 × halfHeight / h` of the world, along the camera's right and its up.
 */
export function pan(v, dx, dy, h) {
  const d = direction(v.yaw, v.pitch);
  const f = [-d[0], -d[1], -d[2]];                                  // looking
  const r = normalise([-f[2], 0, f[0]]);                             // f × up
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];   // r × f
  const unit = (2 * halfHeight(v)) / Math.max(1, h);
  return {
    tx: v.tx - (r[0] * dx - u[0] * dy) * unit,
    ty: v.ty - (r[1] * dx - u[1] * dy) * unit,
    tz: v.tz - (r[2] * dx - u[2] * dy) * unit,
  };
}

/**
 * The view that frames a sphere — a centre and a radius — whole, from where
 * it is seen now: the point looked at its centre, the distance enough for
 * the radius and a margin to fit the shorter side of a `w` × `h` picture.
 */
export function frameAround(v, centre, radius, w = 1, h = 1, margin = 1.15) {
  const r = Math.max(1e-3, radius) * margin;
  const tan = Math.tan((v.fov * RAD) / 2) * Math.min(1, w / h);
  const distance = v.lens === 'orthographic' ? r / tan : r / Math.sin(Math.atan(tan));
  return { tx: centre[0], ty: centre[1], tz: centre[2], ...dolly({ distance }, 1) };
}

function normalise(a) {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}
