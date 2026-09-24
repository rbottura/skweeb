/**
 * draft-paint.js — the live preview's way of drawing a dither: one fill per tile.
 *
 * paintField (grid.js) draws every cell with its own drawImage, resampling its
 * tile to the cell each time. A dense dither is tens of thousands of cells —
 * 57,600 at 6px over a 1920px frame — and at that count the calls themselves
 * are the cost: about 230 ms a frame, whatever the tiles look like.
 *
 * Here each tile is drawn once at the cell's size, fitted as paintField fits
 * it (a stamp), and made a repeating pattern; every cell holding that tile is
 * a rect in one path, and the path is filled. One fill per tile. Measured on
 * the same 57,600 cells: 229 ms → 42 ms (2026-09-24).
 *
 * Only cells drawn at exactly their cell's size go that way. A cell growing in
 * or out is drawn on its own afterwards, on top — there are few at a time; a
 * sprite size other than 1 spills over the neighbours, which a rect cannot
 * hold, so renderGrid keeps paintField for it.
 *
 * The preview's own: a stamp resamples the tile once, not per cell, and comes
 * out a hair different. Saves, exports and replays draw with paintField.
 */

import { fitInCell } from './tone.js';

const _stamps = new WeakMap();      // tile → Map(cell px → its stamp)

/** A tile at the cell's size, fitted and centred, on a canvas exactly one cell square. */
function stampOf(tile, cell) {
  let sizes = _stamps.get(tile);
  if (!sizes) _stamps.set(tile, sizes = new Map());
  let stamp = sizes.get(cell);
  if (!stamp) {
    stamp = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(cell, cell)
      : Object.assign(document.createElement('canvas'), { width: cell, height: cell });
    const x = stamp.getContext('2d');
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    const f = fitInCell(tile.width, tile.height);
    x.drawImage(tile, f.x * cell, f.y * cell, f.w * cell, f.h * cell);
    sizes.set(cell, stamp);
  }
  return stamp;
}

/**
 * The same arguments as paintField, at a sprite size of 1.
 *
 * @returns {number} cells drawn
 */
export function paintDraft(ctx, { indices, cols, cell, tiles, offsetX = 0, offsetY = 0, scales = null }) {
  const groups = tiles.map(() => []);
  const loose = [];
  for (let i = 0; i < indices.length; i++) {
    const t = indices[i];
    if (t < 0 || !tiles[t]) continue;
    const g = scales ? scales[i] : 1;
    if (g === 1) groups[t].push(i);
    else if (g > 0) loose.push(i);
  }

  let drawn = 0;
  ctx.save();
  ctx.translate(offsetX, offsetY);                // the patterns start where the grid does
  for (let t = 0; t < tiles.length; t++) {
    const cells = groups[t];
    if (!cells.length) continue;
    ctx.beginPath();
    for (const i of cells) ctx.rect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
    ctx.fillStyle = ctx.createPattern(stampOf(tiles[t], cell), 'repeat');
    ctx.fill();
    drawn += cells.length;
  }
  ctx.restore();

  // Growing and shrinking: one at a time, on top, as paintField draws them.
  for (const i of loose) {
    const tile = tiles[indices[i]];
    const s = scales[i];
    const f = fitInCell(tile.width, tile.height);
    const col = i % cols, row = Math.floor(i / cols);
    ctx.drawImage(tile,
      offsetX + (col + f.x + f.w * (1 - s) / 2) * cell,
      offsetY + (row + f.y + f.h * (1 - s) / 2) * cell,
      f.w * s * cell, f.h * s * cell);
    drawn++;
  }
  return drawn;
}
