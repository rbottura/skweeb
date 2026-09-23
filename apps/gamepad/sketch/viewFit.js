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
 * size. It eases rather than jumps, the way the timeline slides.
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
 * Apply the view to `p`, between a push() and a pop() the caller owns. Returns
 * whether it is fitted at all, so the caller can mark the page's edge.
 *
 * @param {p5} p
 * @returns {boolean}
 */
export function applyView(p) {
  const k1 = target(p.width, p.height);
  const t = 1 - Math.exp(-(p.deltaTime || 16) / EASE_MS);
  _k += (k1 - _k) * t;
  if (Math.abs(k1 - _k) < 0.001) _k = k1;
  if (_k === 1) return false;

  // Centred across, and centred in the room above the inset.
  const free = p.height - _inset;
  const w = p.width * _k, h = p.height * _k;
  p.translate((p.width - w) / 2, Math.max(0, (free - h) / 2));
  p.scale(_k);
  return true;
}

/** Around the page while it is fitted: what is outside is not the drawing. */
export function drawPageEdge(p) {
  p.push();
  p.noFill();
  p.stroke(17);
  p.strokeWeight(2 / _k);
  p.rect(0, 0, p.width, p.height);
  p.pop();
}
