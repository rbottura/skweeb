/**
 * viewFit.js — the page, shrunk to fit whatever is left above the timeline.
 *
 * The timeline docks along the bottom and, with a layer's drawer open, stands
 * up to 58% of the screen tall: the bottom of a drawing or a sequence was
 * simply under it. Resizing the canvas would not help — the canvas IS the
 * page here: the ink buffer, the recorder and every sequence are measured in
 * its pixels, and shrinking it would crop them. So the page keeps its size
 * and only the view changes: the whole page, scaled down and centred in the
 * space still visible, like a document zoomed to fit.
 *
 * A view, nothing else. Saves read the ink buffer and recordings store world
 * coordinates, so nothing made while fitted differs from anything made at full
 * size. It eases rather than jumps, the way the timeline slides. On a 2D
 * context since C6b (docs/gamepad.md), as everything the page draws.
 */

/** Room kept between the page and whatever covers the screen's edge. */
const MARGIN = 12;

/** How fast the view settles, in ms — about the timeline's own slide. */
const EASE_MS = 90;

let _inset = 0;                 // screen pixels covered along the bottom
let _k = 1;                     // the scale drawn at, easing towards the target

/** Tell the view how much of the bottom of the screen is covered. 0 is none. */
export function setViewInset(px) {
  _inset = Math.max(0, px || 0);
}

/** The scale that fits a w × h page into what is left. Never enlarges. */
function target(w, h) {
  if (!_inset) return 1;
  const room = h - _inset - 2 * MARGIN;
  return Math.max(0.1, Math.min(1, room / h, (w - 2 * MARGIN) / w));
}

/**
 * The view this frame, `dt` ms after the last: where the w × h page goes and
 * at what scale — `{ x, y, k }`, centred across and in the room above the
 * inset — or null when it is the whole screen, unfitted.
 *
 * @param {number} w
 * @param {number} h
 * @param {number} [dt=16]
 * @returns {?{x: number, y: number, k: number}}
 */
export function viewNow(w, h, dt = 16) {
  const k1 = target(w, h);
  const t = 1 - Math.exp(-(dt || 16) / EASE_MS);
  _k += (k1 - _k) * t;
  if (Math.abs(k1 - _k) < 0.001) _k = k1;
  if (_k === 1) return null;
  const free = h - _inset;
  return { x: (w - w * _k) / 2, y: Math.max(0, (free - h * _k) / 2), k: _k };
}

/** Around the page while it is fitted, in the page's units: what is outside is not the drawing. */
export function drawPageEdge(ctx, w, h) {
  ctx.save();
  ctx.strokeStyle = 'rgb(17, 17, 17)';
  ctx.lineWidth = 2 / _k;
  ctx.strokeRect(0, 0, w, h);
  ctx.restore();
}
