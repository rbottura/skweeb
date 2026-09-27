/**
 * onion.js — a flipbook's onion skin: paused, the frame before the one shown
 * and the frame after it, faint and tinted, under it — so the next drawing
 * is placed to follow the last.
 *
 * Only what comes and goes is a ghost: a placement shown on the frame
 * before or after and not on this one. What is there throughout — a ground
 * still, a loop running under the flipbook — is on the page already, and a
 * ghost of it would only blur it. The page wraps, as it plays: before the
 * first frame is the last.
 *
 * Preview only. The ghosts are one layer, the whole page's size, at the
 * bottom of the stack — over the paper, under everything shown — and never
 * in a render, which draws its own layers (render.js).
 */

import { paintPage, pageSize } from './page.js';
import { showsAt } from './time.js';

/** Before in red, after in blue, as a lightbox's sheets are marked. */
const TINTS = { before: '#d8342a', after: '#2a62d8' };
const FAINT = 0.3;

const sheets = { before: null, after: null, both: null };

function sheet(key, w, h) {
  const c = sheets[key] || (sheets[key] = document.createElement('canvas'));
  if (c.width !== w) c.width = w;
  if (c.height !== h) c.height = h;
  return c;
}

/**
 * The layers of one neighbouring frame, tinted and faint, on a sheet the
 * preview's size: nothing, when nothing there comes or goes.
 */
function ghost(key, layers, page, view, w, h) {
  if (!layers.length) return null;
  const c = sheet(key, w, h);
  const g = c.getContext('2d');
  paintPage(g, { ...page, ground: 'none' }, layers, view);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.55;
  g.fillStyle = TINTS[key];
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  return c;
}

/**
 * The onion skin as a layer for paintPage, or null: the frames either side
 * of `tick`, what comes and goes on them, over one another on a sheet.
 *
 * @param {object} placements   placements.js
 * @param {number} tick         the page's tick on screen
 * @param {number} length       the page's length, in its frames
 * @param {object} page         the page's values
 * @param {number} view         canvas pixels per page pixel
 */
export function onionLayer(placements, tick, length, page, view) {
  if (length < 2) return null;
  const size = pageSize(page);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  const gone = p => !showsAt(tick, p.block);
  const before = (tick - 1 + length) % length;
  const after = (tick + 1) % length;
  const b = ghost('before', placements.layers(before, page.fps, gone), page, view, w, h);
  const a = after === before ? null : ghost('after', placements.layers(after, page.fps, gone), page, view, w, h);
  if (!a && !b) return null;

  const c = sheet('both', w, h);
  const g = c.getContext('2d');
  g.clearRect(0, 0, w, h);
  g.globalAlpha = FAINT;
  if (b) g.drawImage(b, 0, 0);
  if (a) g.drawImage(a, 0, 0);
  g.globalAlpha = 1;
  return { image: c, size, transform: { x: 0, y: 0, scale: 1, rot: 0 } };
}
