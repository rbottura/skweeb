/**
 * guides.js — what the preview draws over the map to show how it is made:
 * the grid, what cannot be walked, what answers, and the chosen thing's box.
 *
 * Preview only, as particles' guides are: never in a save or a bake. Sized
 * in CSS pixels, so a line reads the same at any preview size.
 */

import { mapSize } from './grid.js';
import { blockedBy, FACES } from './walk.js';

const LINE = 'rgba(17, 17, 17, 0.18)';
const WALL = { wash: 'rgba(214, 40, 40, 0.2)', line: 'rgba(214, 40, 40, 0.8)' };
const SOLID = { wash: 'rgba(31, 95, 214, 0.12)', line: 'rgba(31, 95, 214, 0.75)' };
const EVENT = '#1f5fd6';

/** A cell's edges in canvas pixels, from one whole pixel to the next as the tiles are (draw.js). */
const edges = (m, view) => i => Math.round(i * m.tile * view);

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

/**
 * What cannot be walked, hatched: the walls in red, a solid thing's feet in
 * the things' blue — so a cell that will not clear under the walls tool says
 * why. One set of diagonals, clipped to the cells, so neighbours' lines meet.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} m            the map's values
 * @param {number} view
 * @param {number} dpp
 * @param {object} given        { walls: a flag a cell, place: the things' blocks }
 */
export function drawBlocked(ctx, m, view, dpp, { walls = [], place = [] }) {
  const painted = [];
  for (let i = 0; i < m.cols * m.rows; i++) if (walls[i]) painted.push({ col: i % m.cols, row: Math.floor(i / m.cols) });
  const solid = place.flatMap(b => blockedBy(b))
    .filter(c => c.col >= 0 && c.row >= 0 && c.col < m.cols && c.row < m.rows);
  hatch(ctx, m, view, dpp, painted, WALL);
  hatch(ctx, m, view, dpp, solid, SOLID);
}

function hatch(ctx, m, view, dpp, cells, look) {
  if (!cells.length) return;
  const edge = edges(m, view);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  for (const { col, row } of cells) ctx.rect(edge(col), edge(row), edge(col + 1) - edge(col), edge(row + 1) - edge(row));
  ctx.fillStyle = look.wash;
  ctx.fill();
  ctx.clip();
  const w = ctx.canvas.width, h = ctx.canvas.height, step = 9 * dpp;
  ctx.beginPath();
  for (let x = -h; x < w; x += step) {
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
  }
  ctx.strokeStyle = look.line;
  ctx.lineWidth = 1.5 * dpp;
  ctx.stroke();
  ctx.restore();
}

/**
 * What answers: a tag on each sign and warp's cell, a dashed square where a
 * thing with nothing to see stands, and the spawn as an arrow the way the
 * avatar will face — faint where no thing is the spawn and it falls to the
 * middle, red on a cell that cannot be walked.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} m
 * @param {number} view
 * @param {number} dpp
 * @param {object[]} place      the things' blocks
 * @param {{col, row, face, from}} spawn   walk.js `spawnOf`
 * @param {boolean} spawnWalkable
 */
export function drawEvents(ctx, m, view, dpp, place, spawn, spawnWalkable) {
  const edge = edges(m, view);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `600 ${Math.round(10 * dpp)}px ui-monospace, Menlo, Consolas, monospace`;
  ctx.textBaseline = 'top';
  for (const b of place) {
    const x = edge(b.col), y = edge(b.row), side = edge(b.col + 1) - x;
    if (!b.ref) {
      ctx.setLineDash([4 * dpp, 3 * dpp]);
      ctx.lineWidth = 1.5 * dpp;
      ctx.strokeStyle = EVENT;
      ctx.strokeRect(x + 2 * dpp, y + 2 * dpp, side - 4 * dpp, side - 4 * dpp);
      ctx.setLineDash([]);
    }
    const tag = b.event === 'sign' ? 'sign' : b.event === 'warp' ? `→ ${b.to || '?'}` : b.event === 'effect' ? 'effect' : '';
    if (!tag) continue;
    const pad = 3 * dpp, tw = ctx.measureText(tag).width;
    ctx.fillStyle = EVENT;
    ctx.fillRect(x + pad, y + pad, tw + 2 * pad, 10 * dpp + 2 * pad);
    ctx.fillStyle = '#fffdf6';
    ctx.fillText(tag, x + 2 * pad, y + 2 * pad);
  }
  arrow(ctx, edge(spawn.col), edge(spawn.row), edge(spawn.col + 1) - edge(spawn.col), spawn.face,
        spawnWalkable ? EVENT : '#d62828', spawn.from == null ? 0.35 : 0.9, dpp);
  ctx.restore();
}

/** A triangle in a cell, pointing the way it faces. */
function arrow(ctx, x, y, side, face, colour, alpha, dpp) {
  const turn = { down: 0, left: Math.PI / 2, up: Math.PI, right: -Math.PI / 2 }[FACES.includes(face) ? face : 'down'];
  const r = side * 0.28;
  ctx.save();
  ctx.translate(x + side / 2, y + side / 2);
  ctx.rotate(turn);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.lineTo(-r * 0.9, -r * 0.6);
  ctx.lineTo(r * 0.9, -r * 0.6);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.lineWidth = 1.5 * dpp;
  ctx.strokeStyle = '#fffdf6';
  ctx.stroke();
  ctx.restore();
}
