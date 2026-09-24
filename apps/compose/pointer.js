/**
 * pointer.js — a placement picked up and moved on the page itself.
 *
 * Press on the page and the topmost placement under the pointer is chosen;
 * drag and it follows, in page pixels, through the placed panel's own `x`
 * and `y` — so its rows move with it, and what is saved is what the panel
 * says. Press where nothing is, and nothing is chosen. Over a placement the
 * pointer says it can move it.
 */

import { hitTest } from './page.js';

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas   the preview
 * @param {() => number} opts.view          canvas pixels per page pixel, as last painted
 * @param {() => object} opts.page          the page's values
 * @param {{items: object[]}} opts.placements
 * @param {() => ?object} opts.chosen
 * @param {(entry: ?object) => void} opts.choose
 * @param {(x: number, y: number) => void} opts.moveTo   the chosen one's new place
 */
export function wirePointer({ canvas, view, page, placements, chosen, choose, moveTo }) {
  let drag = null;

  /** A pointer's place on the page, in page pixels. */
  const at = e => {
    const rect = canvas.getBoundingClientRect();
    const k = canvas.width / rect.width / view();
    return [(e.clientX - rect.left) * k, (e.clientY - rect.top) * k];
  };

  /** The topmost open placement under a point, or null. */
  const under = point => {
    const open = placements.items.filter(p => p.size);
    const i = hitTest(point, open.map(p => ({ size: p.size, transform: p.block.transform })), page());
    return i < 0 ? null : open[i];
  };

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const point = at(e);
    const p = under(point);
    if (p !== chosen()) choose(p);
    if (!p) return;
    drag = { from: point, x: p.block.transform.x, y: p.block.transform.y };
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', e => {
    const point = at(e);
    if (!drag) { canvas.classList.toggle('can-move', !!under(point)); return; }
    moveTo(Math.round(drag.x + point[0] - drag.from[0]), Math.round(drag.y + point[1] - drag.from[1]));
  });

  const drop = () => { drag = null; };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
}
