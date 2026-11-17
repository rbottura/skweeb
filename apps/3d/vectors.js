/**
 * vectors.js — a model's clouds as vectors: every dot a circle where the
 * camera sees it, written by core/svg-canvas.js (G11, for BEC 2027).
 *
 * An unlit cloud draws its dots as flat discs of their colours exactly
 * (cloud.js); seen through the picture's camera, each is a circle — its
 * centre projected, its radius the dot's at its depth — and the near ones
 * over the far, as the GPU's depth has them. The same camera as its PNG
 * (camera.js `cameraFor`), the same matrices (scene.js `placeDots`), and the
 * colour the GPU is given — the material's times the dot's, out of three's
 * linear working space into sRGB — so the SVG is the PNG's picture, its dots
 * circles.
 *
 * What is not a dot is left out and counted, for the bar to say: a box, a
 * grid, a drawn body. A lit or toon cloud is drawn flat, its colours
 * unshaded; a cloud's outline is not drawn.
 *
 * Only three.core.js: Node runs it (tests/3d-cloud.mjs).
 */

import { Matrix4, Vector4, Color } from '../../core/libs/three/three.core.js';
import { svgCanvas } from '../../core/svg-canvas.js';

/**
 * Every dot the camera sees, far first: where on the picture of `w` × `h`, how big, in what colour.
 *
 * @returns {{dots: Array<{x: number, y: number, r: number, fill: string, alpha: number, depth: number}>,
 *            clouds: number, others: number, lit: number}}   the clouds drawn, the shapes shown that are none, the clouds lit
 */
export function dotsSeen(model, camera, w, h) {
  model.scene.updateMatrixWorld(true);
  const toClip = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const eye = camera.matrixWorldInverse.elements;                 // its third row: how deep a point is before the eye
  const across = camera.projectionMatrix.elements[5] * (h / 2);     // a length at clip w = 1, in the picture's pixels
  const m = new Matrix4(), v = new Vector4(), c = new Color();
  const dots = [];
  let clouds = 0, others = 0, lit = 0;
  for (const part of model.parts) {
    const mesh = part.mesh;
    if (!mesh || !mesh.visible) continue;
    if (!part.instanced) { others++; continue; }
    clouds++;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!material.isMeshBasicMaterial) lit++;
    const alpha = material.transparent ? material.opacity : 1;
    for (let k = 0; k < mesh.count; k++) {
      mesh.getMatrixAt(k, m);
      m.premultiply(mesh.matrixWorld);
      const e = m.elements;
      v.set(e[12], e[13], e[14], 1).applyMatrix4(toClip);
      if (!(v.w > 0) || v.z < -v.w || v.z > v.w) continue;          // behind the eye, or past what it sees
      // One dot's geometry is a sphere of radius 1: its matrix's longest axis is its radius.
      const radius = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
      mesh.getColorAt(k, c);
      c.multiply(material.color);
      const deep = -(eye[2] * e[12] + eye[6] * e[13] + eye[10] * e[14] + eye[14]);
      dots.push({ x: (v.x / v.w + 1) * (w / 2), y: (1 - v.y / v.w) * (h / 2), r: (radius * across) / v.w,
                  fill: '#' + c.getHexString(), alpha, depth: deep - radius });
    }
  }
  // Far first, by each dot's nearest point: where two cross, the GPU draws the lens their surfaces meet in, which
  // no stack of circles can — the one that stands further out takes the overlap, as it takes most of it on screen.
  dots.sort((a, b) => b.depth - a.depth);
  return { dots, clouds, others, lit };
}

/**
 * The model at values `v` as an SVG of `w` × `h`: its ground, then its dots, far first — and, given, what its
 * layers draw behind it and in front (core/layers-draw.js `drawSide`), as its PNG lays them: behind under its ground.
 *
 * @param {object} o   { title, mm, behind(ctx), front(ctx) }
 * @returns {object}   core/svg-canvas.js's `svg()`, and `clouds`, `others`, `lit`
 */
export function modelSvg(model, v, camera, w, h, { title = '', mm = null, behind = null, front = null } = {}) {
  const ctx = svgCanvas(w, h, { title, mm });
  if (behind) behind(ctx);
  if (v.ground && v.ground !== 'none') {
    ctx.fillStyle = v.ground;
    ctx.fillRect(0, 0, w, h);
  }
  const seen = dotsSeen(model, camera, w, h);
  for (const d of seen.dots) {
    ctx.globalAlpha = d.alpha;
    ctx.fillStyle = d.fill;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (front) front(ctx);
  return { ...ctx.svg(), clouds: seen.clouds, others: seen.others, lit: seen.lit };
}
