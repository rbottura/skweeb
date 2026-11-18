/**
 * follow.js — the camera behind the worm and above it (M16a, docs/worm.md):
 * "vu tps d'assez haut", the author's.
 *
 * Where it should be is the walker's frame's: `distance` behind, `height`
 * above, looking at a point just over the worm, its up the worm's up — so
 * the horizon stays level with the ground the worm stands on, wherever on
 * the planet that is. Where it is eases toward that each frame, `ease` the
 * rate: a share `1 − e^(−ease·dt)` of the way, the same at any frame rate.
 * The first frame, and any jump, it is put there at once (`snap`).
 *
 * `aim` is where it should be, as data: the phase's framing (M16b) asks for
 * another and is eased to it the same way.
 *
 * Pure: three's core only, Node runs it (tests/3d-play.mjs).
 */

/** Where the camera should be for a walker's frame at `p`: its eye, the point it looks at, its up. */
export function aimBehind(frame, p, { distance, height }, size = 1) {
  const eye = p.clone().addScaledVector(frame.up, height).addScaledVector(frame.forward, -distance);
  const at = p.clone().addScaledVector(frame.up, 0.6 * size);
  return { eye, at, up: frame.up.clone() };
}

/** The camera eased toward `aim` over `dt` seconds at `ease` — or put there, `snap`. Its own eye, look and up kept on it. */
export function follow(camera, aim, ease, dt, snap = false) {
  const k = snap ? 1 : 1 - Math.exp(-ease * dt);
  const now = camera.userData.aim || (camera.userData.aim = { eye: aim.eye.clone(), at: aim.at.clone(), up: aim.up.clone() });
  now.eye.lerp(aim.eye, k);
  now.at.lerp(aim.at, k);
  now.up.lerp(aim.up, k);
  if (now.up.lengthSq() < 1e-12) now.up.copy(aim.up);
  now.up.normalize();
  camera.position.copy(now.eye);
  camera.up.copy(now.up);
  camera.lookAt(now.at);
  camera.updateMatrixWorld();
  return camera;
}

/** How far the eye is from where it should be: 0, there. */
export const offAim = (camera, aim) => (camera.userData.aim ? camera.userData.aim.eye.distanceTo(aim.eye) : Infinity);

/** A point's height over the planet of `radius` centred at the origin. */
export const heightOver = (point, radius) => point.length() - radius;
