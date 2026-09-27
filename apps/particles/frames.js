/**
 * frames.js — a particles recipe as frames: what a save draws and what a
 * replay draws, the same code, so the two cannot drift.
 *
 * A recipe is the two panels' values, `{ emit, picture }` — and `tick`, for
 * a still: the one frame it is. Frame `i` is `particlesAt(recipe, i / fps)`
 * drawn by draw.js, so any frame is drawn on its own, in any order, at any
 * scale, exactly.
 *
 * ── Sizes ──────────────────────────────────────────────────────────────────
 *
 * An object's own size is its render's (core/rebuild.js): the picture's
 * canvas times the picture's `scale`, as it was saved. Asked for `scale` k,
 * its frames are k times that many pixels, drawn again — a position is a
 * number and a sprite is drawn from its own picture, so nothing is stretched.
 */

import { prepare, particlesAt } from './model.js';
import { toModel, framesOf }    from './params.js';
import { drawParticles, pictureSize } from './draw.js';
import { surface }              from '../../core/surface.js';

/**
 * @param {object} recipe            `{ emit, picture, tick? }`
 * @param {?Array} sprites           the set's images (sprites.js), or null for dots
 * @param {object} [opts]
 * @param {number} [opts.scale=1]    pixels per pixel of its own size
 * @returns {{length, fps, loop, width, height, scale, frame(i): OffscreenCanvas|HTMLCanvasElement}}
 *          `frame` hands out one canvas, drawn again on every call — borrowed
 */
export function openParticles(recipe, sprites, { scale = 1 } = {}) {
  const { emit, picture } = recipe;
  const model = prepare(toModel(emit, picture));
  const size = pictureSize(picture);
  const own = picture.scale || 1;
  const px = own * scale;
  const canvas = surface(size.width * px, size.height * px);
  const ctx = canvas.getContext('2d');
  const still = Number.isInteger(recipe.tick);

  return {
    length: still ? 1 : framesOf(emit, picture, model.longest),
    fps: still ? 0 : picture.fps,
    loop: !still && emit.mode !== 'burst',
    width: Math.max(1, Math.round(size.width * own)),
    height: Math.max(1, Math.round(size.height * own)),
    scale,

    frame(i) {
      const tick = still ? recipe.tick : i;
      drawParticles(ctx, particlesAt(model, tick / picture.fps), picture, px, sprites);
      return canvas;
    },
  };
}
