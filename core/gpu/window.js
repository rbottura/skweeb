/**
 * window.js — one window of a chain's picture, for a print past any canvas
 * (core/print.js).
 *
 * A chain reads round each pixel — a blur its radius, a shadow its offset,
 * a pixelation its block — so a window of its picture is the part of its
 * source the window needs: the window and as far as the chain reads round
 * it (runner.js `readsOf`), a few pixels more for a sample's smoothing. A
 * chain that reads from anywhere has no window (`windows`): it is drawn
 * whole. That part is run as itself in the
 * whole picture (wgsl.js, `frame`: its corner and the whole's size), so
 * whatever a filter places by position lands where it would in the whole,
 * and the window is cut from it. Where the chain grows the picture, its room
 * is the part's too, and empty, as a whole run's is.
 *
 * The source's part comes from its own `window` — an app's, drawn at its
 * size — so nothing ever holds the whole picture.
 */

import { marginOf, readsOf } from './runner.js';

/** Whether a chain's picture can be drawn a window at a time: it reads a bounded way round each pixel. */
export const windows = chain => Number.isFinite(readsOf(chain));

/** A canvas at least `w` × `h`: the one kept while it is big enough. */
const sized = (canvas, w, h) => (canvas && canvas.width >= w && canvas.height >= h
  ? canvas : new OffscreenCanvas(Math.max(w, canvas ? canvas.width : 0), Math.max(h, canvas ? canvas.height : 0)));

/**
 * @param {object} run
 * @param {object} run.runner        core/gpu's, prepared for the chain
 * @param {object[]} run.chain
 * @param {number} run.width         the source's frame, in pixels at this scale, before any room
 * @param {number} run.height
 * @param {(win: {x, y, w, h}) => CanvasImageSource} run.piece   a window of the source's frame
 * @param {boolean} [run.grow]       the chain gives itself room past the edge
 * @param {number} [run.scale]       the chain's sizes' multiplier, as a whole run's
 * @param {number} [run.time]
 * @param {number} [run.seed]
 * @param {number} [run.tick]
 * @param {number} [run.frames]     the loop's length, as a whole run's
 * @param {{x, y, w, h}} win         in the chain's picture's pixels, its room counted
 * @param {object} keep              canvases kept from one window to the next
 * @returns {OffscreenCanvas}        the window at its corner — borrowed
 */
export function chainWindow({ runner, chain, width, height, piece, grow = false, scale = 1, time = 0, seed = 0, tick = 0, frames = 0 }, win, keep) {
  const m = grow ? marginOf(chain, scale) : 0;
  const W = width + 2 * m, H = height + 2 * m;
  const r = Math.ceil(readsOf(chain) * scale) + 4;
  const x0 = Math.max(0, win.x - r), y0 = Math.max(0, win.y - r);
  const x1 = Math.min(W, win.x + win.w + r), y1 = Math.min(H, win.y + win.h + r);
  // Exactly the part's size: a run is as big as what it is handed.
  if (!keep.part || keep.part.width !== x1 - x0 || keep.part.height !== y1 - y0) keep.part = new OffscreenCanvas(x1 - x0, y1 - y0);
  const part = keep.part;
  const a = part.getContext('2d');
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.clearRect(0, 0, part.width, part.height);
  // The source's own part, where the room ends and the picture is.
  const sx0 = Math.max(0, x0 - m), sy0 = Math.max(0, y0 - m);
  const sx1 = Math.min(width, x1 - m), sy1 = Math.min(height, y1 - m);
  if (sx1 > sx0 && sy1 > sy0) {
    const w = sx1 - sx0, h = sy1 - sy0;
    a.drawImage(piece({ x: sx0, y: sy0, w, h }), 0, 0, w, h, sx0 + m - x0, sy0 + m - y0, w, h);
  }
  const ran = runner.run(part, chain, { scale, time, seed, tick, frames, window: { x: x0, y: y0, width: W, height: H } });
  keep.tile = sized(keep.tile, win.w, win.h);
  const t = keep.tile.getContext('2d');
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.clearRect(0, 0, win.w, win.h);
  t.drawImage(ran, win.x - x0, win.y - y0, win.w, win.h, 0, 0, win.w, win.h);
  return keep.tile;
}
