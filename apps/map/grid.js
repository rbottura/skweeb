/**
 * grid.js — a map's grid: how big it is, which cell a point is in, where a
 * cell is. Pure arithmetic on the map's values, so tests/map-grid.mjs holds
 * it without a page.
 *
 * A map is `cols` × `rows` tiles of `tile` px each, in the map's own pixels
 * — large, since assets are made large and baked small (docs/roadmap.md,
 * M8). Cells count from the top left, a column then a row, and a map's
 * cells are one list, row after row: cell (col, row) is `row × cols + col`.
 */

/** The map in its own pixels. */
export function mapSize(m) {
  return { width: m.cols * m.tile, height: m.rows * m.tile };
}

/**
 * The cell under a point of the map, in its own pixels — or null past its
 * edge.
 *
 * @returns {?{col: number, row: number}}
 */
export function cellAt(m, x, y) {
  const col = Math.floor(x / m.tile), row = Math.floor(y / m.tile);
  if (col < 0 || row < 0 || col >= m.cols || row >= m.rows) return null;
  return { col, row };
}

/** A cell's place in the list of a map's cells. */
export const indexOf = (m, col, row) => row * m.cols + col;

/**
 * The cells a map keeps when it changes size: each where it was, by column
 * and row, what is new empty, what falls off the edge gone. The tiles' list
 * is empty at -1; the walls', a flag a cell, at 0 — walkable.
 *
 * @param {number[]} cells    the old list, `from.cols` wide
 * @param {{cols, rows}} from
 * @param {{cols, rows}} to
 * @param {number} [empty=-1] what a new cell, or one that held no whole number, holds
 * @returns {number[]}
 */
export function resize(cells, from, to, empty = -1) {
  const out = new Array(to.cols * to.rows).fill(empty);
  for (let row = 0; row < Math.min(from.rows, to.rows); row++) {
    for (let col = 0; col < Math.min(from.cols, to.cols); col++) {
      const v = cells[row * from.cols + col];
      out[row * to.cols + col] = Number.isInteger(v) ? v : empty;
    }
  }
  return out;
}

/**
 * The cells on a straight line from one to another, both ends in — so a
 * fast drag paints no gaps between the moves it was told about.
 *
 * @param {{col, row}} a
 * @param {{col, row}} b
 * @returns {Array<{col: number, row: number}>}
 */
export function cellsBetween(a, b) {
  const out = [];
  let col = a.col, row = a.row;
  const dx = Math.abs(b.col - col), dy = -Math.abs(b.row - row);
  const sx = col < b.col ? 1 : -1, sy = row < b.row ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push({ col, row });
    if (col === b.col && row === b.row) return out;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; col += sx; }
    if (e2 <= dx) { err += dx; row += sy; }
  }
}
