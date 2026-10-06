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
import { createRunner, reachOf } from '../../core/gpu/runner.js';
import { chainWindow, windows } from '../../core/gpu/window.js';
import { drawFrameInto, openPicture } from '../../core/rebuild.js';

/**
 * `?open=<id>` brings back a chain whose source is in the vault, and a look —
 * a chain with no source, to go over whatever is chosen. A leaf has neither.
 */
export function reopens(object) {
  const recipe = object && object.recipe;
  if (!recipe) return false;
  return !!recipe.source || (object.type === 'params' && Array.isArray(recipe.chain));
}

/**
 * Whether filter draws this object again at a scale, rather than stretch its
 * render: when its source is in the vault. Its source is drawn at the scale
 * by its own app where it can be, and the chain's sizes follow the scale.
 */
export function redraws(object) {
  return !!(object && object.recipe && object.recipe.source);
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

  // Saved before `edges` existed, it kept its size (params.js).
  const grow = (recipe.edges || 'keep') !== 'keep';
  const seed = recipe.seed ?? 1;
  const room = grow ? reachOf(chain) : 0;
  const width = parent.width + 2 * room;
  const height = parent.height + 2 * room;
  const kept = {};                     // a print's windows' canvases (core/gpu/window.js)

  return {
    length: parent.frames,
    fps,
    loop: parent.loop,
    width,
    height,

    /** The chain fills the source's box and its room, so the buffer is the frame. */
    bounds: { x: 0, y: 0, w: width, h: height },
    missing: parent.missing,

    /** What the source really drew at; the chain's sizes follow the pixels it is handed. */
    scale: parent.scale,

    /** Borrowed, as every frame is: the runner's picture, until the next call. */
    frame(i) {
      return runner.run(parent.frame(i), chain, { scale: k, time: i / fps, grow, seed, tick: i });
    },

    /** A window of frame i at this scale, for a print past any canvas: the chain over its part (core/gpu/window.js). */
    ...(windows(chain) ? {
      window(i, win) {
        return chainWindow({
          runner, chain, grow, scale: k, time: i / fps, seed, tick: i,
          width: parent.pixels.w, height: parent.pixels.h,
          piece: part => parent.window(i, part),
        }, win, kept);
      },
    } : {}),

    drawInto(ctx, i, w, h) {
      drawFrameInto(ctx, this.frame(i), this.bounds, this, w, h);
    },

    dispose() {
      parent.dispose();
      runner.dispose();
    },
  };
}
