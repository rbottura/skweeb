/**
 * rebuild.js — how a ckt object replays, for anything that asks.
 *
 * core/rebuild.js replays gamepad marks itself and hands every other recipe
 * to the app that wrote it, by convention: `/apps/<app>/rebuild.js`, exporting
 * `openObject()`. This is ckt's. It is what lets the vault viewer play a ckt
 * loop and grid dither one, frame by frame, with no frames stored anywhere —
 * the recipe names the dataset and the sprite, and render.js is a pure
 * function of the tick.
 *
 * A `dataset` replays as one frame: its first entry's dots on white, which is
 * what stage one showed when it was made.
 */

import { centre, loopFrames } from './motion.js';
import { framing, renderFrame } from './render.js';
import { datasetFor, glyphOf } from './datasets.js';
import { markFor }       from './sprites.js';
import { plotDots }      from './dots.js';
import { surface }       from './surface.js';
import { drawFrameInto } from '../../core/rebuild.js';

/**
 * Whether `/apps/ckt/?open=<id>` brings this object back to work on
 * (core/reopen.js): a dot-set always — its dots are its render, recipe or not
 * — and a still, a loop or a brush while it keeps the motion recipe that drew
 * it. A family's set holds members, not a recipe to restore.
 *
 * @param {object} object   a vault envelope written by ckt
 */
export function reopens(object) {
  if (!object) return false;
  if (object.type === 'dataset') return true;
  return ['still', 'sequence', 'shape'].includes(object.type)
    && !!object.recipe && Number.isFinite(object.recipe.glyph);
}

/**
 * Whether ckt draws this object again at a scale, rather than stretch its
 * render (core/rebuild.js `openFrames`): anything it reopens but a dot-set,
 * whose dots are drawn at one size.
 *
 * @param {object} object   a vault envelope written by ckt
 */
export function redraws(object) {
  return reopens(object) && object.type !== 'dataset';
}

/**
 * @param {object} object   a vault envelope written by ckt
 * @param {object} [opts]
 * @param {number} [opts.scale]  frames at this many pixels per pixel of its render
 * @returns {Promise<object>} the handle core/rebuild.js documents
 */
export async function openObject(object, opts = {}) {
  const recipe = object && object.recipe;
  if (object && object.type === 'dataset') return openDataset(object);
  if (!recipe) throw new Error('ckt: that object has no recipe — it is a leaf and cannot replay');

  const data = await datasetFor(recipe);
  const mark = await markFor(recipe);
  const world = { width: recipe.width, height: recipe.height };
  const anchors = centre(glyphOf(data, recipe.glyph), world);
  // Its own size is its render's — the frame at the recipe's scale. Asked for
  // more, the whole picture is drawn at more; the size it reports stays its own.
  const k = opts.scale > 0 ? opts.scale : 1;
  const frame = framing(recipe, anchors, mark, 1, k);
  const own = k === 1 ? frame : framing(recipe, anchors, mark);

  const missing = [];
  if (recipe.mark === 'sprite' && !mark) missing.push(recipe.shape || recipe.family);

  // A loop is every tick. Anything else is one frame of one — the tick its
  // recipe records, which is the picture that was kept.
  const loop = object.type === 'sequence';
  const length = loop ? loopFrames(recipe) : 1;
  const tickOf = i => (loop ? i : (Number.isFinite(recipe.tick) ? recipe.tick : 0));
  const size = { width: own.width, height: own.height };

  return {
    length,
    fps: recipe.fps || 30,
    loop: true,
    width: size.width,
    height: size.height,
    bounds: { x: 0, y: 0, w: size.width, h: size.height },
    content: { x: 0, y: 0, w: size.width, h: size.height },
    missing,
    scale: k,                          // the whole picture drawn again at the size asked
    frame(i) { return renderFrame({ recipe, anchors, mark, tick: tickOf(i), frame }).canvas; },
    drawInto(ctx, i, w, h) { drawFrameInto(ctx, this.frame(i), this.bounds, this, w, h); },
    dispose() {},
  };
}

async function openDataset(object) {
  const res = await fetch('/vault/objects/' + object.id + '/' + object.render.file);
  const data = res.ok ? await res.json() : [];
  const w = object.render.w || 1920, h = object.render.h || 1080;

  const canvas = surface(w, h);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  plotDots(ctx, data[0] || [], { color: '#000000', radius: 2 });

  return {
    length: 1, fps: 1, loop: false, width: w, height: h,
    bounds: { x: 0, y: 0, w, h }, content: { x: 0, y: 0, w, h }, missing: [],
    frame() { return canvas; },
    drawInto(c, i, dw, dh) { drawFrameInto(c, canvas, this.bounds, this, dw, dh); },
    dispose() {},
  };
}
