/**
 * guides.js — what the preview draws over the map to show how it is made:
 * the grid, the chosen thing's box, and later what is walkable and what
 * answers.
 *
 * Preview only, as particles' guides are: never in a save or a bake. Sized
 * in CSS pixels, so a line reads the same at any preview size.
 */

import { mapSize } from './grid.js';

const LINE = 'rgba(17, 17, 17, 0.18)';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} m          the map's values
 * @param {number} view       canvas pixels per map pixel
 * @param {number} [dpp=1]    canvas pixels per CSS pixel
 */
export function drawGrid(ctx, m, view, dpp = 1) {
  const { width, height } = mapSize(m);
  const step = m.tile * view;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = dpp;
  ctx.beginPath();
  for (let c = 0; c <= m.cols; c++) {
    const x = Math.round(c * step) + 0.5 * (dpp % 2);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height * view);
  }
  for (let r = 0; r <= m.rows; r++) {
    const y = Math.round(r * step) + 0.5 * (dpp % 2);
    ctx.moveTo(0, y);
    ctx.lineTo(width * view, y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * The chosen thing: its box, dashed, and the cell it stands on.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x, y, w, h}} box   in the map's pixels (things.js `boxOf`)
 * @param {{col, row}} cell
 * @param {number} tile
 * @param {number} view        canvas pixels per map pixel
 * @param {number} [dpp=1]
 */
export function drawChosen(ctx, box, cell, tile, view, dpp = 1) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineWidth = 2 * dpp;
  ctx.strokeStyle = 'rgba(255, 253, 246, 0.9)';
  ctx.strokeRect(box.x * view, box.y * view, box.w * view, box.h * view);
  ctx.setLineDash([6 * dpp, 4 * dpp]);
  ctx.strokeStyle = '#1f5fd6';
  ctx.strokeRect(box.x * view, box.y * view, box.w * view, box.h * view);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(31, 95, 214, 0.18)';
  ctx.fillRect(cell.col * tile * view, cell.row * tile * view, tile * view, tile * view);
  ctx.restore();
}
