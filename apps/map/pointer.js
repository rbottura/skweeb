/**
 * pointer.js — painting on the map: a press puts the chosen tile into the
 * cell under it, a drag into every cell it crosses — the cells between two
 * moves too (grid.js `cellsBetween`), so a fast stroke leaves no gaps. The
 * right button, or the eraser, empties them.
 */

import { cellAt, cellsBetween, mapSize } from './grid.js';

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {() => object} opts.map                   the map's values
 * @param {() => ?number} opts.chosen               the palette's tile, -1 the eraser, null none
 * @param {(cells: Array<{col, row}>, tile: number) => void} opts.paint
 */
export function wirePainting({ canvas, map, chosen, paint }) {
  let last = null, tile = null;

  const cellOf = e => {
    const r = canvas.getBoundingClientRect(), m = map(), { width, height } = mapSize(m);
    return cellAt(m, ((e.clientX - r.left) / r.width) * width, ((e.clientY - r.top) / r.height) * height);
  };

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    tile = e.button === 2 ? -1 : chosen();
    if (tile == null) return;                       // no tileset: nothing to paint with
    const at = cellOf(e);
    if (!at) return;
    canvas.setPointerCapture(e.pointerId);
    last = at;
    paint([at], tile);
  });
  canvas.addEventListener('pointermove', e => {
    if (!last) return;
    const at = cellOf(e);
    if (!at || (at.col === last.col && at.row === last.row)) return;
    paint(cellsBetween(last, at), tile);
    last = at;
  });
  const end = () => { last = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
