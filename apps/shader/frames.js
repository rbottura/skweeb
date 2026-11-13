/**
 * frames.js — a shader recipe as frames: what the preview draws, what each
 * row's picture is, and what a save and a replay will draw (M15c) — the same
 * code, so they cannot drift.
 *
 * A recipe is the panel's values and the chain. Frame `i` is the chain run
 * by core/gpu's runner over a blank picture of the size wanted, told its
 * tick and the loop's length: no clock, no DOM. The chain *cut* at a row is
 * the rows down to it — the picture as it stands there, which is the lesson
 * the app is (docs/vfx.md).
 *
 * ── Sizes ──────────────────────────────────────────────────────────────────
 *
 * A surface's own size is its format times the recipe's `scale`. Drawn at
 * `px` pixels a format pixel — the preview's view factor, a row's small
 * picture, a print's scale — the runner is told `px` as its scale: what a
 * generator counts is counted across the picture, and what a filter
 * measures in pixels follows. So any size is the same surface, drawn again.
 */

import { surface } from '../../core/surface.js';

/** The chain down to a row and no further: `at` its index; past the end, or null, the whole. */
export const cut = (chain, at = null) => (at == null || at < 0 ? chain : chain.slice(0, at + 1));

/** The loop a recipe plays: its frames, at least one. */
export const loopOf = recipe => Math.max(1, Math.floor(recipe.frames) || 1);

/**
 * One frame of a recipe on the GPU.
 *
 * @param {object} runner     core/gpu's, the chain prepared
 * @param {object} blank      a canvas of the size wanted, its 2D context got: the GPU copies from no other
 * @param {object} recipe     the values, and `chain`
 * @param {number} tick       the frame
 * @param {number} px         pixels a format pixel
 * @param {?number} [at]      cut at this row (`cut`)
 * @returns {ImageBitmap} the runner's, good until its next run
 */
export function drawSurface(runner, blank, recipe, tick, px, at = null) {
  const frames = loopOf(recipe);
  return runner.run(blank, cut(recipe.chain || [], at),
    { scale: px, seed: recipe.seed, tick, frames, time: recipe.fps ? tick / recipe.fps : 0 });
}

/** A blank picture the GPU will copy from: a canvas whose 2D context has been got. */
export function blankOf(w, h) {
  const blank = surface(w, h);
  blank.getContext('2d');
  return blank;
}

/**
 * @param {object} recipe           the values, and `chain`
 * @param {object} opts
 * @param {object} opts.runner      core/gpu's, the chain prepared
 * @param {number} [opts.scale=1]   pixels per pixel of its own size
 * @returns {{length, fps, loop, width, height, scale, frame(i)}}
 *          `frame` hands out one canvas, drawn again on every call — borrowed
 */
export function openSurface(recipe, { runner, scale = 1 } = {}) {
  if (!runner) throw new Error('shader: a surface needs WebGPU, and there is none here');
  const own = recipe.scale || 1;
  const px = own * scale;
  const w = Math.max(1, Math.round(recipe.width * px)), h = Math.max(1, Math.round(recipe.height * px));
  const length = loopOf(recipe);
  let canvas = null, ctx = null, blank = null;
  return {
    length,
    fps: length > 1 ? recipe.fps : 0,
    loop: length > 1,
    width: Math.max(1, Math.round(recipe.width * own)),
    height: Math.max(1, Math.round(recipe.height * own)),
    scale,
    frame(i) {
      if (!canvas) {
        canvas = surface(w, h);
        ctx = canvas.getContext('2d');
        blank = blankOf(w, h);
      }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(drawSurface(runner, blank, recipe, i, px), 0, 0);
      return canvas;
    },
  };
}
