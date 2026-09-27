/**
 * frames.js — a fractals recipe as frames: what a save draws and what a
 * replay draws, the same code, so the two cannot drift.
 *
 * A recipe is the panel's values. Frame `i` is the values at `i`
 * (motion.js) drawn by their family: copies on a Canvas 2D (copies.js),
 * escape time by the GPU pass (fractal.js) through a runner the caller
 * brings. A still is one frame; a moving copies picture its loop.
 *
 * ── Sizes ──────────────────────────────────────────────────────────────────
 *
 * An object's own size is its render's (core/rebuild.js): the format times
 * the recipe's `scale`, as it was saved. Asked for `scale` k, its frames are
 * k times that many pixels, drawn again — a fractal is a function of its
 * params, so a bigger picture has more of it in it, never a stretch.
 */

import { drawCopies }        from './copies.js';
import { FRACTAL }           from './fractal.js';
import { loopOf, valuesAt }  from './motion.js';
import { mipFor }            from '../../core/stamps.js';
import { surface }           from '../../core/surface.js';

/** The pass as a chain the runner takes (core/gpu/runner.js). */
export const chainOf = values => [{ filter: FRACTAL, params: values }];

/**
 * @param {object} recipe            the values
 * @param {object} [opts]
 * @param {?Array} [opts.sprites]    the copies' images (core/sprites.js), or null: dots
 * @param {?object} [opts.runner]    core/gpu's, prepared for the pass: escape time needs one
 * @param {number} [opts.scale=1]    pixels per pixel of its own size
 * @returns {{length, fps, loop, width, height, scale, frame(i)}}
 *          `frame` hands out one canvas, drawn again on every call — borrowed
 */
export function openFractal(recipe, { sprites = null, runner = null, scale = 1 } = {}) {
  const own = recipe.scale || 1;
  const px = own * scale;
  const w = Math.max(1, Math.round(recipe.width * px)), h = Math.max(1, Math.round(recipe.height * px));
  const canvas = surface(w, h);
  const ctx = canvas.getContext('2d');
  let blank = null;
  const length = loopOf(recipe);
  if (recipe.family !== 'copies' && !runner) throw new Error('fractals: escape time needs WebGPU, and there is none here');

  return {
    length,
    fps: length > 1 ? recipe.fps : 0,
    loop: length > 1,
    width: Math.max(1, Math.round(recipe.width * own)),
    height: Math.max(1, Math.round(recipe.height * own)),
    scale,

    frame(i) {
      const v = valuesAt(recipe, i);
      if (v.family === 'copies') {
        drawCopies(ctx, v, sprites, px, mipFor);
        return canvas;
      }
      if (!blank) { blank = surface(w, h); blank.getContext('2d'); }   // the GPU copies only from a canvas with a context
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(runner.run(blank, chainOf(v)), 0, 0);
      return canvas;
    },
  };
}
