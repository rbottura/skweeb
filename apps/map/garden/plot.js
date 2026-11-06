/**
 * plot.js — where things are in the garden (M14): what stands on a cell, and
 * the nearest bare earth round a flower, where its next generation is
 * planted. Pure: a map's recipe and its blocks in, cells out.
 */

import { walkable } from '../walk.js';

/** The block standing on a cell — its feet there; of several, the last placed, the one on top — or null. */
export function blockOn(blocks, col, row) {
  for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].col === col && blocks[i].row === row) return blocks[i];
  return null;
}

/** Whether a cell is on the map. */
export const inside = (m, { col, row }) => col >= 0 && row >= 0 && col < m.cols && row < m.rows;

/**
 * The nearest bare cell round `at`: on the map, walkable, nothing standing
 * on it, and not one of `away` — where the gardener is. Ring after ring
 * round it, the nearest first, then the nearest the gardener.
 *
 * @param {object} recipe    `{ map, walls, place }`
 * @param {{col, row}} at
 * @param {Array<{col, row}>} [away]
 * @returns {?{col: number, row: number}}
 */
export function bareNear(recipe, at, away = []) {
  const m = recipe.map, place = recipe.place || [];
  const taken = new Set(place.map(b => `${b.col},${b.row}`));
  for (const a of away) taken.add(`${a.col},${a.row}`);
  const me = away[0] || at;
  const far = (c, from) => Math.hypot(c.col - from.col, c.row - from.row);
  for (let r = 1; r <= Math.max(m.cols, m.rows); r++) {
    const ring = [];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push({ col: at.col + dx, row: at.row + dy });
      }
    }
    ring.sort((a, b) => far(a, at) - far(b, at) || far(a, me) - far(b, me));
    const bare = ring.find(c => inside(m, c) && !taken.has(`${c.col},${c.row}`) && walkable(recipe, c.col, c.row));
    if (bare) return bare;
  }
  return null;
}
