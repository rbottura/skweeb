/**
 * frames.js — a model's recipe as frames: what a save draws and what a
 * replay draws, the same code, so the two cannot drift.
 *
 * A recipe is the app's values — view, light, ground, format — and its
 * shapes (scene.js). A frame is the scene built from it, seen by the camera
 * its values make (camera.js), drawn by the page's one renderer
 * (renderer.js) over the recipe's ground. A model is a still for now: one
 * frame. Motion is M10's fifth brick.
 *
 * ── Sizes ──────────────────────────────────────────────────────────────────
 *
 * An object's own size is its render's (core/rebuild.js): the format times
 * the recipe's `scale`, as it was saved. Asked for `scale` k, its frames are
 * k times that many pixels, drawn again — the camera reads only the
 * picture's shape, so a bigger picture is the same picture, sharper, never a
 * stretch.
 */

import { Model } from './scene.js';
import { cameraFor } from './camera.js';
import { surface } from '../../core/surface.js';

/**
 * @param {object} recipe              the values and `shapes`
 * @param {object} opts
 * @param {object} opts.renderer       renderer.js's
 * @param {number} [opts.scale=1]      pixels per pixel of its own size
 * @returns {{length, fps, loop, width, height, scale, frame(i), dispose()}}
 *          `frame` hands out one canvas, drawn again on every call — borrowed
 */
export function openModel(recipe, { renderer, scale = 1 }) {
  const own = recipe.scale || 1;
  const px = own * scale;
  const w = Math.max(1, Math.round(recipe.width * px)), h = Math.max(1, Math.round(recipe.height * px));
  const canvas = surface(w, h);
  const ctx = canvas.getContext('2d');
  const model = new Model().update(recipe);

  return {
    length: 1,
    fps: 0,
    loop: false,
    width: Math.max(1, Math.round(recipe.width * own)),
    height: Math.max(1, Math.round(recipe.height * own)),
    scale,
    model,

    frame() {
      drawModel(ctx, renderer, model, recipe, w, h);
      return canvas;
    },

    dispose() { model.dispose(); },
  };
}

/**
 * The model seen by the recipe's camera, over its ground, filling `ctx`'s
 * `w` × `h` — or by the camera given, the one the preview draws its guides
 * and handles with over it.
 */
export function drawModel(ctx, renderer, model, values, w, h, camera = cameraFor(values, w, h)) {
  ctx.clearRect(0, 0, w, h);
  if (values.ground && values.ground !== 'none') {
    ctx.fillStyle = values.ground;
    ctx.fillRect(0, 0, w, h);
  }
  const picture = renderer.draw(model.scene, camera, w, h);
  ctx.drawImage(picture, 0, 0);
  picture.close();
}
