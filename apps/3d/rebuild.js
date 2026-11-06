/**
 * rebuild.js — how a model replays, for anything that asks.
 *
 * The other end of core/rebuild.js's dispatch: the vault's player, compose
 * placing a model, a print export. A model's recipe is its values and its
 * shapes, so replaying it is building the scene again and drawing it with
 * frames.js, the code its save drew with, on the page's one renderer.
 *
 * At its own size a model is its saved render, as any picture is
 * (core/rebuild.js); asked for more pixels it is drawn again here — three
 * loads only then. Where neither WebGPU nor WebGL2 will draw, it is its saved
 * render, as filter's objects are where there is no GPU. A shape the
 * catalogue does not know is `missing`, and the rest drawn.
 */

import { readPalettes } from './palettes.js';
import { openModel } from './frames.js';
import { openRenderer } from './renderer.js';
import { unknownIn } from './scene.js';
import { drawFrameInto, openPicture } from '../../core/rebuild.js';

// A model, or the loop of one that turns — a `sequence` its save makes (motion.js): the same recipe either way.
const isModel = object => !!(object && (object.type === 'model' || object.type === 'sequence')
  && object.recipe && Array.isArray(object.recipe.shapes));

/** `?open=<id>` brings a model back, its shapes and its view as they were — and its turntable. */
export const reopens = isModel;

/** Drawn again at any scale: a model is a function of its recipe (frames.js, *Sizes*). */
export const redraws = isModel;

/**
 * @param {object} object   a vault envelope written by the 3D app
 * @param {object} [opts]   { scale, url } — as core/rebuild.js passes them
 */
export async function openObject(object, opts = {}) {
  if (!isModel(object)) throw new Error('3d: that object has no model to replay');
  let renderer;
  try {
    renderer = await openRenderer();
  } catch {
    return openPicture(object, opts.url);
  }

  await readPalettes(object.recipe);                  // a palette of the vault a shape names, its colours from the first frame
  const frames = openModel(object.recipe, { renderer, scale: opts.scale > 0 ? opts.scale : 1 });
  const box = { x: 0, y: 0, w: frames.width, h: frames.height };
  return {
    length: frames.length,
    fps: frames.fps,
    loop: frames.loop,
    width: frames.width,
    height: frames.height,
    bounds: box,
    missing: unknownIn(object.recipe),
    scale: frames.scale,
    frame(i) { return frames.frame(i); },
    /** A window of frame i at this scale, for a print past any canvas (core/print.js). */
    window(i, win) { return frames.window(i, win); },
    drawInto(ctx, i, w, h) { drawFrameInto(ctx, frames.frame(i), box, this, w, h); },
    dispose() { frames.dispose(); },
  };
}
