/**
 * pick.js — which shape a point of the picture shows.
 *
 * A ray from the eye through the point, by the camera the picture was drawn
 * with (camera.js `cameraFor`), and the first shape it meets: three's
 * Raycaster, on the faces as they are drawn — a plane from both sides, every
 * other shape from the front. A hidden shape is not in the scene, so it is
 * never picked. The answer is the shape's place in the recipe's list, its
 * card's (scene.js, a part's `index`), never the mesh: the view and the cards
 * agree whatever is hidden.
 *
 * A point is the picture's own, -1 to 1 each way, y up — where the pointer is
 * in the canvas's box, which shows the whole picture at its shape
 * (core/theme.css) — so nothing here reads a pixel, and a pick is the same at
 * any size.
 *
 * Only three.core.js: Node runs it (tests/3d-pick.mjs).
 */

import { Raycaster, Vector2, WebGPUCoordinateSystem } from '../../core/libs/three/three.core.js';

/** Where a pointer is on the picture a canvas shows: -1 to 1 each way, y up. */
export function onPicture(clientX, clientY, rect) {
  return [((clientX - rect.left) / rect.width) * 2 - 1, 1 - ((clientY - rect.top) / rect.height) * 2];
}

/**
 * The ray through a point of the picture, as far as the camera sees. three
 * starts an orthographic ray in the eye's plane; this one draws what is behind
 * the eye too (camera.js: near is -far), so the ray starts at the near plane
 * instead — what is drawn is what can be picked.
 */
export function rayThrough(camera, x, y) {
  const raycaster = new Raycaster();
  raycaster.setFromCamera(new Vector2(x, y), camera);
  if (camera.isOrthographicCamera) {
    const near = camera.coordinateSystem === WebGPUCoordinateSystem ? 0 : -1;
    raycaster.ray.origin.set(x, y, near).unproject(camera);
    raycaster.far = camera.far - camera.near;
  } else {
    raycaster.near = camera.near;
    raycaster.far = camera.far;
  }
  return raycaster;
}

/**
 * The shape a point of the picture shows, or null where it shows none.
 *
 * @param {import('./scene.js').Model} model   as the picture was drawn
 * @param {object} camera                      the camera it was drawn with
 * @param {number} x                           the point, -1 to 1, y up
 * @param {number} y
 * @returns {?{index: number, point: number[], distance: number}}
 */
export function pick(model, camera, x, y) {
  const [hit] = rayThrough(camera, x, y).intersectObjects(model.parts.map(p => p.mesh), false);
  if (!hit) return null;
  const part = model.parts.find(p => p.mesh === hit.object);
  return { index: part.index, point: hit.point.toArray(), distance: hit.distance };
}
