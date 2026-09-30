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
 * and row, what is new empty (-1), what falls off the edge gone.
 *
 * @param {number[]} cells    the old list, `from.cols` wide
 * @param {{cols, rows}} from
 * @param {{cols, rows}} to
 * @returns {number[]}
 */
export function resize(cells, from, to) {
  const out = new Array(to.cols * to.rows).fill(-1);
  for (let row = 0; row < Math.min(from.rows, to.rows); row++) {
    for (let col = 0; col < Math.min(from.cols, to.cols); col++) {
      const v = cells[row * from.cols + col];
      out[row * to.cols + col] = Number.isInteger(v) ? v : -1;
    }
  }
  return out;
}
