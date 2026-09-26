/**
 * rebuild.js — how a filter object replays, for anything that asks.
 *
 * The other end of core/rebuild.js's dispatch: a filter object's recipe is
 * its source by id and a chain, `{ source, chain }`, so replaying it is
 *
 *     open the source, exact or draft, at the scale asked (source.js)
 *       -> run the chain over each frame on the GPU (core/gpu/)
 *
 * and nothing was stored to make that work that save.js did not already
 * write. A replay on another machine may differ a little from the render:
 * GPU arithmetic is not the same everywhere, and that was accepted
 * (docs/object-model.md, *The recipe contract*).
 *
 * Where there is no WebGPU, the object shows as its saved render — its
 * picture, one frame long — rather than failing: core's openPicture().
 *
 * Not an import cycle, for grid's reason: source.js reaches core/rebuild.js,
 * which reaches this file only through a dynamic import().
 */

import { fromVault }    from './source.js';
import { createRunner } from '../../core/gpu/runner.js';
import { drawFrameInto, openPicture } from '../../core/rebuild.js';

/** `?open=<id>` brings back a chain whose source is in the vault; a leaf has none. */
export function reopens(object) {
  return !!(object && object.recipe && object.recipe.source);
}

/**
 * Whether filter draws this object again at a scale, rather than stretch its
 * render: when its source is in the vault. Its source is drawn at the scale
 * by its own app where it can be, and the chain's sizes follow the scale.
 */
export function redraws(object) {
  return reopens(object);
}

/**
 * Replay a filter object into frames.
 *
 * @param {object} object   a vault envelope written by filter
 * @param {object} [opts]   { depth, draft, scale, url } — as core/rebuild.js passes them
 * @returns {Promise<object>} the handle core/rebuild.js returns
 */
export async function openObject(object, opts = {}) {
  const recipe = object && object.recipe;
  if (!recipe || !recipe.source) {
    throw new Error('filter: that object was saved from a file, as a leaf — there is no source to replay');
  }

  const runner = await createRunner();
  if (!runner) return openPicture(object, opts.url);

  const chain = recipe.chain || [];
  await runner.prepare(chain);

  const k = opts.scale > 0 ? opts.scale : 1;
  let parent;
  try {
    parent = await fromVault(recipe.source, { draft: !!opts.draft, scale: k, depth: opts.depth });
  } catch (err) {
    runner.dispose();
    throw err;
  }
  const fps = parent.fps || (object.render && object.render.fps) || 30;

  return {
    length: parent.frames,
    fps,
    loop: parent.loop,
    width: parent.width,
    height: parent.height,

    /** The chain fills the source's box, so the buffer is the frame. */
    bounds: { x: 0, y: 0, w: parent.width, h: parent.height },
    missing: parent.missing,

    /** What the source really drew at; the chain's sizes follow the pixels it is handed. */
    scale: parent.scale,

    /** Borrowed, as every frame is: the runner's picture, until the next call. */
    frame(i) {
      return runner.run(parent.frame(i), chain, { scale: k, time: i / fps });
    },

    drawInto(ctx, i, w, h) {
      drawFrameInto(ctx, this.frame(i), this.bounds, this, w, h);
    },

    dispose() {
      parent.dispose();
      runner.dispose();
    },
  };
}
