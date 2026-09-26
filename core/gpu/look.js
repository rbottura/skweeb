/**
 * look.js — a chain carried to another app: an object's frames through it.
 *
 * A look is a filter chain saved alone, as a `params` object whose recipe is
 * `{ chain, edges }` (apps/filter/save.js). This file is how anything holding
 * an object's frames — compose, for a placement — runs them through one
 * without knowing what a filter is: open the look, then wrap the object's
 * frames in a handle of the same shape (core/rebuild.js), each frame the
 * chain run over the object's own.
 *
 * The box: an object's frame covers its bounds, its ink over the whole loop.
 * A look that grows (`edges`, and the chain's reach — runner.js, *Past the
 * edge*) covers more, the same room on every side, and the wrapped handle's
 * bounds say so: a page sizes a glowing sprite by its glow.
 *
 * Where there is no WebGPU, or the look will not open, the frames go through
 * as they are and `missing` names the look — as it names a sprite family that
 * is not on this machine.
 */

import { Vault } from '../vault.js';
import { createRunner, reachOf } from './runner.js';
import { drawFrameInto } from '../rebuild.js';

/** A look by id: its chain, whether it grows, what it is called. */
export async function openLook(id) {
  const { object } = await Vault.load(id);
  const recipe = object.recipe || {};
  if (!Array.isArray(recipe.chain)) throw new Error(`${id} is not a look — it holds no chain`);
  return { id, title: object.title || id, chain: recipe.chain, grow: recipe.edges !== 'keep' };
}

/**
 * An object's frames through a look.
 *
 * @param {object} handle   what core/rebuild.js openFrames() gave
 * @param {{chain: object[], grow: boolean, title: string}} look
 * @returns {Promise<object>} a handle of the same shape; its frames are the runner's, borrowed
 */
export async function withLook(handle, look) {
  const runner = await createRunner();
  if (!runner) return without(handle, `"${look.title}"`, 'no WebGPU here');
  try {
    await runner.prepare(look.chain);
  } catch (err) {
    runner.dispose();
    throw err;
  }

  const box = handle.bounds || { x: 0, y: 0, w: handle.width, h: handle.height };
  const r = look.grow ? reachOf(look.chain) : 0;
  const fps = handle.fps || 30;

  return {
    length: handle.length,
    fps: handle.fps,
    loop: handle.loop,
    width: handle.width,
    height: handle.height,
    bounds: { x: box.x - r, y: box.y - r, w: box.w + 2 * r, h: box.h + 2 * r },
    missing: handle.missing || [],
    scale: handle.scale,

    frame(i) {
      const picture = handle.frame(i);
      // Its pixels per pixel of the object, as its app drew them: a look's
      // sizes follow, so a blur keeps its look at print scale.
      const density = picture.width / box.w;
      return runner.run(picture, look.chain, { scale: density, time: i / fps, grow: look.grow });
    },

    drawInto(ctx, i, w, h) {
      drawFrameInto(ctx, this.frame(i), this.bounds, this, w, h);
    },

    dispose() {
      handle.dispose();
      runner.dispose();
    },
  };
}

/**
 * A handle through the look named by `id`, or as it is when there is none.
 * What cannot be done is said in `missing`, never thrown: a page with a look
 * that will not open still shows its object.
 */
export async function lookOver(handle, id) {
  if (!id) return handle;
  let look;
  try {
    look = await openLook(id);
  } catch (err) {
    return without(handle, `the look ${id}`, err.message);
  }
  try {
    return await withLook(handle, look);
  } catch (err) {
    return without(handle, `"${look.title}"`, err.message);
  }
}

/** The frames as they are, and why, in the words a page says it with. */
function without(handle, what, why) {
  handle.missing = [...(handle.missing || []), `${what} (${why})`];
  return handle;
}
