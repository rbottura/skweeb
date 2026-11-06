/**
 * draw.js — the garden drawn (M14): the map under it as the map draws it
 * (../draw.js), its flowers from their marks as they grow (beds.js), the
 * gardener among them by the row it stands on, and the flower faced boxed.
 * What it draws is handed to it whole, each frame: it keeps nothing.
 */

import { mapSize } from '../grid.js';
import { drawMap } from '../draw.js';
import { drawOrder, boxOf } from '../things.js';
import { viewFactor } from '../../../core/view.js';

/**
 * The garden into its canvas, at the size its viewer shows it.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} g
 * @param {object} g.m           the map's values
 * @param {object} g.things      ../things.js's, what stands on it
 * @param {object} g.beds        beds.js's, its flowers
 * @param {object} g.avatar      the gardener (../play/avatar.js)
 * @param {boolean} g.worn       the gardener wears what stands on the spawn: that thing not drawn
 * @param {?{block, size}} g.faced   the flower faced, boxed
 * @returns {number} the view: canvas pixels per map pixel
 */
export function paintGarden(canvas, { m, cells, tiles, things, beds, avatar, tick, grow, worn, now, faced }) {
  const size = mapSize(m), view = viewFactor(canvas, size, 1);
  const w = Math.max(1, Math.round(size.width * view)), h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  // The flowers the garden draws from their marks; the rest as the map does; the spawn's thing, when it is worn.
  const layers = [...things.layers(tick, m, b => beds.claims(b) || (worn && b.event === 'spawn')),
                  ...beds.layers(drawOrder(things.items), m, view, now, grow)];
  layers.sort((a, b) => a.row - b.row);
  const me = avatar.layer(m, now);
  const after = layers.findIndex(l => l.row > me.row);
  layers.splice(after < 0 ? layers.length : after, 0, me);
  const ctx = canvas.getContext('2d');
  drawMap(ctx, m, view, { cells, tiles, layers });
  if (faced) outline(ctx, boxOf(faced.block, faced.size, m.tile), view);
  return view;
}

/** A box drawn round, a dark line under a yellow one, as the player outlines what answers. */
function outline(ctx, b, view) {
  const dpp = ctx.canvas.width / Math.max(1, ctx.canvas.getBoundingClientRect().width);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineWidth = 3 * dpp;
  ctx.strokeStyle = '#111111';
  ctx.strokeRect(b.x * view, b.y * view, b.w * view, b.h * view);
  ctx.lineWidth = 1.5 * dpp;
  ctx.strokeStyle = '#ffd60a';
  ctx.strokeRect(b.x * view, b.y * view, b.w * view, b.h * view);
  ctx.restore();
}
