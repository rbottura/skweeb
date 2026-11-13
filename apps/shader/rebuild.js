/**
 * rebuild.js — how a shader object replays, for anything that asks.
 *
 * The other end of core/rebuild.js's dispatch: the vault's player, compose
 * placing a loop, a print export. A shader object's recipe is the panel's
 * values and its chain, so replaying it is a GPU runner and frames.js, the
 * code its save drew with — the same surface at any scale.
 *
 * A surface needs WebGPU; where there is none it shows as its saved render,
 * as filter's objects do (rule 7).
 */

import { openSurface }   from './frames.js';
import { drawFrameInto, openPicture } from '../../core/rebuild.js';
import { createRunner }  from '../../core/gpu/runner.js';

const isSurface = object => !!(object && object.recipe && Array.isArray(object.recipe.chain));

/** `?open=<id>` brings back a still or a loop: the panel and the chain as they were. */
export const reopens = isSurface;

/** Drawn again at any scale: a surface is a function of its recipe (frames.js, *Sizes*). */
export const redraws = isSurface;

/**
 * @param {object} object   a vault envelope written by the shader app
 * @param {object} [opts]   { scale, url } — as core/rebuild.js passes them
 */
export async function openObject(object, opts = {}) {
  if (!isSurface(object)) throw new Error('shader: that object has no chain to replay');
  const recipe = object.recipe;
  const runner = await createRunner();
  if (!runner) return openPicture(object, opts.url);
  await runner.prepare(recipe.chain);

  const frames = openSurface(recipe, { runner, scale: opts.scale > 0 ? opts.scale : 1 });
  const box = { x: 0, y: 0, w: frames.width, h: frames.height };
  return {
    length: frames.length,
    fps: frames.fps || (object.render && object.render.fps) || 0,
    loop: frames.loop,
    width: frames.width,
    height: frames.height,
    bounds: box,
    missing: [],
    scale: frames.scale,
    frame(i) { return frames.frame(i); },
    /** A window of frame i at this scale, for a print past any canvas (core/print.js). */
    ...(frames.window ? { window(i, win) { return frames.window(i, win); } } : {}),
    drawInto(ctx, i, w, h) { drawFrameInto(ctx, frames.frame(i), box, this, w, h); },
    dispose() { runner.dispose(); },
  };
}
