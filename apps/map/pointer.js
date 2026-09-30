/**
 * pointer.js — a press on the map, by the tool in hand.
 *
 * With *tiles*: the chosen tile into the cell under it, a drag into every
 * cell it crosses — the cells between two moves too (grid.js
 * `cellsBetween`), so a fast stroke leaves no gaps. The right button, or the
 * eraser, empties them.
 *
 * With *things*: the nearest thing under it is chosen and follows a drag,
 * cell to cell, keeping where it was taken hold of, and never past the
 * map's edge; a press on nothing chooses nothing.
 */

import { cellAt, cellsBetween, mapSize } from './grid.js';

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {() => object} opts.map                   the map's values
 * @param {() => 'tiles' | 'things'} opts.tool
 * @param {() => ?number} opts.chosen               the palette's tile, -1 the eraser, null none
 * @param {(cells: Array<{col, row}>, tile: number) => void} opts.paint
 * @param {object} opts.things                      { at(x, y), choose(p), move(p, col, row) }
 */
export function wirePointer({ canvas, map, tool, chosen, paint, things }) {
  let last = null, tile = null, grab = null;

  /** Where the pointer is on the map, in its own pixels. */
  const pointOf = e => {
    const r = canvas.getBoundingClientRect(), { width, height } = mapSize(map());
    return { x: ((e.clientX - r.left) / r.width) * width, y: ((e.clientY - r.top) / r.height) * height };
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    const pt = pointOf(e), m = map();
    if (tool() === 'things') {
      const p = things.at(pt.x, pt.y);
      things.choose(p);
      if (!p) return;
      grab = { p, dc: p.block.col - Math.floor(pt.x / m.tile), dr: p.block.row - Math.floor(pt.y / m.tile) };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    tile = e.button === 2 ? -1 : chosen();
    if (tile == null) return;                       // no tileset: nothing to paint with
    const at = cellAt(m, pt.x, pt.y);
    if (!at) return;
    canvas.setPointerCapture(e.pointerId);
    last = at;
    paint([at], tile);
  });
  canvas.addEventListener('pointermove', e => {
    const pt = pointOf(e), m = map();
    if (grab) {
      const col = clamp(Math.floor(pt.x / m.tile) + grab.dc, 0, m.cols - 1);
      const row = clamp(Math.floor(pt.y / m.tile) + grab.dr, 0, m.rows - 1);
      if (col !== grab.p.block.col || row !== grab.p.block.row) things.move(grab.p, col, row);
      return;
    }
    if (!last) return;
    const at = cellAt(m, pt.x, pt.y);
    if (!at || (at.col === last.col && at.row === last.row)) return;
    paint(cellsBetween(last, at), tile);
    last = at;
  });
  const end = () => { last = null; grab = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}
