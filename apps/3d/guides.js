/**
 * guides.js — what the preview draws over the picture and a save never does:
 * the chosen shape's box, dashed, as the map editor draws its chosen thing
 * (apps/map/guides.js) — a paper line under the dashes, so it reads on any
 * colour.
 *
 * The box is the shape's own outline on the picture: every vertex of its
 * geometry seen by the camera the picture was drawn with, so it hugs a sphere
 * from any side rather than boxing the cube round it. Where part of the shape
 * is behind a perspective eye there is no such box, and none is drawn.
 *
 * Only three.core.js: Node runs `boxOnPicture` (tests/3d-pick.mjs).
 */

import { Vector3, Matrix4 } from '../../core/libs/three/three.core.js';

/**
 * A mesh's outline on a `w` × `h` picture, in its pixels from the top left —
 * or null where part of it is behind the eye.
 *
 * @returns {?{x: number, y: number, w: number, h: number}}
 */
export function boxOnPicture(mesh, camera, w, h) {
  if (mesh.isInstancedMesh) return boxOfDots(mesh, camera, w, h);
  const seen = new Matrix4().multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
  const position = mesh.geometry.attributes.position;
  const p = new Vector3();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i).applyMatrix4(seen);
    if (camera.isPerspectiveCamera && p.z > -camera.near) return null;
    p.applyMatrix4(camera.projectionMatrix);
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  if (!(x1 >= x0)) return null;
  return { x: ((x0 + 1) / 2) * w, y: ((1 - y1) / 2) * h, w: ((x1 - x0) / 2) * w, h: ((y1 - y0) / 2) * h };
}

/**
 * A cloud's outline on the picture (cloud.js): each dot's centre seen, and as
 * far round it as its radius comes to there — a dot is round from any side,
 * so this hugs the cloud with a point a dot rather than every vertex of each.
 * Its radius is its instance's times the cloud's own size, which a stretch
 * leaves alone (scene.js `placeDots`).
 */
function boxOfDots(mesh, camera, w, h) {
  const seen = new Matrix4().multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
  const a = mesh.instanceMatrix.array, e = camera.projectionMatrix.elements, p = new Vector3();
  const grow = new Vector3().setFromMatrixColumn(mesh.matrixWorld, 0).length();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k < mesh.count; k++) {
    const o = k * 16, r = a[o] * grow;
    p.set(a[o + 12], a[o + 13], a[o + 14]).applyMatrix4(seen);
    let depth = 1;
    if (camera.isPerspectiveCamera) {
      depth = -p.z;
      if (depth - r < camera.near) return null;
    }
    p.applyMatrix4(camera.projectionMatrix);
    const rx = (r * e[0]) / depth, ry = (r * e[5]) / depth;
    if (p.x - rx < x0) x0 = p.x - rx;
    if (p.x + rx > x1) x1 = p.x + rx;
    if (p.y - ry < y0) y0 = p.y - ry;
    if (p.y + ry > y1) y1 = p.y + ry;
  }
  if (!(x1 >= x0)) return null;
  return { x: ((x0 + 1) / 2) * w, y: ((1 - y1) / 2) * h, w: ((x1 - x0) / 2) * w, h: ((y1 - y0) / 2) * h };
}

/**
 * The chosen shape's box, a little clear of it.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x, y, w, h}} box   boxOnPicture's, in the canvas's pixels
 * @param {number} [dpp=1]     canvas pixels per CSS pixel: the line is as thick on any screen
 */
export function drawChosen(ctx, box, dpp = 1) {
  const m = 5 * dpp;
  const x = box.x - m, y = box.y - m, w = box.w + 2 * m, h = box.h + 2 * m;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineWidth = 2 * dpp;
  ctx.strokeStyle = 'rgba(255, 253, 246, 0.9)';
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([6 * dpp, 4 * dpp]);
  ctx.strokeStyle = '#1f5fd6';
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
