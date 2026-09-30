/**
 * draw.js — a map, drawn: its ground, then its tiles, each cell's from the
 * tileset by its index, then the things standing on it, back to front.
 *
 * What a save draws and what the preview draws, at any number of canvas
 * pixels per map pixel — the preview at the size the viewer shows, an
 * export at its scale. Nothing here is preview only: the grid's lines are
 * guides.js's, drawn over the top, and never saved.
 */

import { mapSize } from './grid.js';

/**
 * @param {CanvasRenderingContext2D} ctx   a canvas the map's size times `scale`
 * @param {object} m                       the map's values
 * @param {number} scale                   canvas pixels per map pixel
 * @param {object} [given]
 * @param {number[]} [given.cells]         a tile index a cell, row after row; -1 empty
 * @param {?Array} [given.tiles]           the tileset's images, by index
 * @param {Array<{image, box}>} [given.layers]   the things, back to front (things.js `layers`)
 */
export function drawMap(ctx, m, scale, { cells = [], tiles = null, layers = [] } = {}) {
  const { width, height } = mapSize(m);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (m.ground && m.ground !== 'none') {
    ctx.fillStyle = m.ground;
    ctx.fillRect(0, 0, Math.round(width * scale), Math.round(height * scale));
  }
  if (tiles && tiles.length) {
    // Each tile from one whole canvas pixel to the next: at a fractional
    // scale, edges rounded apart would show the ground between tiles.
    const edge = i => Math.round(i * m.tile * scale);
    for (let row = 0; row < m.rows; row++) {
      for (let col = 0; col < m.cols; col++) {
        const t = cells[row * m.cols + col];
        const img = Number.isInteger(t) && t >= 0 ? tiles[t] : null;
        if (img) ctx.drawImage(img, edge(col), edge(row), edge(col + 1) - edge(col), edge(row + 1) - edge(row));
      }
    }
  }
  if (!layers.length) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const { image, box } of layers) ctx.drawImage(image, box.x, box.y, box.w, box.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
