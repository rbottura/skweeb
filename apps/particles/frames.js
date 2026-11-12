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
import { toModel, framesOf, overlayAsLayer } from './params.js';
import { laidOn }               from '../../core/layers-draw.js';
import { drawPicture, pictureSize } from './draw.js';
import { surface }              from '../../core/surface.js';
import { windowed, canvasFor }  from '../../core/windowed.js';

/**
 * @param {object} recipe            `{ emit, picture, tick? }`
 * @param {?Array} sprites           the set's images (sprites.js), or null for dots
 * @param {object} [opts]
 * @param {number} [opts.scale=1]    pixels per pixel of its own size
 * @param {?object} [opts.points]    an object emitter's points (core/points.js)
 * @param {?object} [opts.field]     a field from another object (core/fields.js)
 * @param {?object} [opts.palette]   a palette's colours (core/palettes.js)
 * @param {object[]} [opts.layers]   its layers' objects, opened (core/layers-draw.js `openLayers`)
 * @returns {{length, fps, loop, width, height, scale, frame(i): OffscreenCanvas|HTMLCanvasElement}}
 *          `frame` hands out one canvas, drawn again on every call — borrowed
 */
export function openParticles(recipe, sprites, { scale = 1, points = null, field = null, palette = null, layers = [] } = {}) {
  recipe = { ...recipe, picture: overlayAsLayer(recipe.picture) };     // one from before L13: its overlay its first layer
  const { emit, picture } = recipe;
  const model = prepare(toModel(emit, picture), { points, field });
  const inks = palette ? palette.colours : null;
  const laid = laidOn(picture.layers, layers);
  const size = pictureSize(picture);
  const own = picture.scale || 1;
  const px = own * scale;
  const W = Math.max(1, Math.round(size.width * px)), H = Math.max(1, Math.round(size.height * px));
  let canvas = null, tile = null;      // the whole frame's when asked for; a print's windows' (core/print.js)
  const still = Number.isInteger(recipe.tick);

  /** One frame onto a context: the particles, and its layers in front of them or behind. */
  const paint = (ctx, tick) => drawPicture(ctx, particlesAt(model, tick / picture.fps), picture, px, sprites, inks, laid, tick);

  return {
    length: still ? 1 : framesOf(emit, picture, model.longest),
    fps: still ? 0 : picture.fps,
    loop: !still && emit.mode !== 'burst',
    width: Math.max(1, Math.round(size.width * own)),
    height: Math.max(1, Math.round(size.height * own)),
    scale,

    frame(i) {
      const tick = still ? recipe.tick : i;
      canvas = canvas || surface(W, H);
      paint(canvas.getContext('2d'), tick);
      return canvas;
    },

    /** A window of frame i at this scale: drawn as a frame is, every transform moved by its corner. */
    window(i, win) {
      const tick = still ? recipe.tick : i;
      tile = canvasFor(tile, win);
      paint(windowed(tile.getContext('2d'), { x: win.x, y: win.y, width: W, height: H }), tick);
      return tile;
    },
  };
}
