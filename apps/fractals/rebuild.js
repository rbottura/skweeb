/**
 * rebuild.js — how a fractals object replays, for anything that asks.
 *
 * The other end of core/rebuild.js's dispatch: the vault's player, compose
 * placing an idle, a print export. A fractals object's recipe is the
 * panel's values, so replaying it is opening its sprite — for copies — or a
 * GPU runner — for escape time — and drawing frames with frames.js, the
 * code its save drew with.
 *
 * Copies replay on any machine: Canvas 2D, and a sprite that will not open
 * said as `missing` and drawn as dots. Escape time needs WebGPU; where
 * there is none it shows as its saved render, as filter's objects do.
 */

import { openFractal, chainOf } from './frames.js';
import { loadSprites }   from '../../core/sprites.js';
import { drawFrameInto, openPicture } from '../../core/rebuild.js';
import { createRunner }  from '../../core/gpu/runner.js';

const isFractal = object => !!(object && object.recipe && object.recipe.family);

/** `?open=<id>` brings back a still or an idle, the panel as it was. */
export const reopens = isFractal;

/** Drawn again at any scale: a fractal is a function of its params (frames.js, *Sizes*). */
export const redraws = isFractal;

/**
 * @param {object} object   a vault envelope written by fractals
 * @param {object} [opts]   { scale, url } — as core/rebuild.js passes them
 */
export async function openObject(object, opts = {}) {
  if (!isFractal(object)) throw new Error('fractals: that object has no recipe to replay');
  const recipe = object.recipe;
  const missing = [];
  let sprites = null, runner = null;

  if (recipe.family === 'copies') {
    if (recipe.sprite) {
      try {
        const got = await loadSprites(recipe.sprite);
        sprites = got.images.length ? got.images : null;
        if (!sprites) missing.push(got.title);
      } catch {
        missing.push(recipe.sprite);
      }
    }
  } else {
    runner = await createRunner();
    if (!runner) return openPicture(object, opts.url);
    await runner.prepare(chainOf(recipe));
  }

  const frames = openFractal(recipe, { sprites, runner, scale: opts.scale > 0 ? opts.scale : 1 });
  const box = { x: 0, y: 0, w: frames.width, h: frames.height };
  return {
    length: frames.length,
    fps: frames.fps || (object.render && object.render.fps) || 0,
    loop: frames.loop,
    width: frames.width,
    height: frames.height,
    bounds: box,
    missing,
    scale: frames.scale,
    frame(i) { return frames.frame(i); },
    drawInto(ctx, i, w, h) { drawFrameInto(ctx, frames.frame(i), box, this, w, h); },
    dispose() { if (runner) runner.dispose(); },
  };
}
