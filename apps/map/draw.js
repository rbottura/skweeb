/**
 * draw.js — a map, drawn: its ground, then its tiles.
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
 */
export function drawMap(ctx, m, scale) {
  const { width, height } = mapSize(m);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (m.ground && m.ground !== 'none') {
    ctx.fillStyle = m.ground;
    ctx.fillRect(0, 0, width, height);
  }
}
