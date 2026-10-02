/**
 * guides.js — the bones over the drawing: each a line from its joint to its
 * far end, one colour a chain, the far end a handle to take hold of.
 *
 * Preview only, never in a save. Sized in CSS pixels, so a bone reads the
 * same at any preview size.
 */

import { tipOf } from './bones.js';

/** A colour for each chain — a stroke's bones — so what bends together reads together. */
const HUES = ['#1f5fd6', '#d62828', '#2a9d4b', '#c77d00', '#7b2cbf', '#0a9396', '#c2185b'];
const INK = '#111111', PAPER = '#fffdf6', HOT = '#ffd60a';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} bones              at rest
 * @param {Array<{x, y, a}>} at         bones.js `posed`
 * @param {number} view                 canvas pixels per picture pixel
 * @param {{x, y}} stage                draw.js `stageOf`
 * @param {number} dpp                  canvas pixels per CSS pixel
 * @param {Array<?number>} [lit]        the bones whose handles light: under the pointer, held, chosen
 */
export function drawBones(ctx, bones, at, view, stage, dpp, lit = []) {
  const px = p => ({ x: (p.x - stage.x) * view, y: (p.y - stage.y) * view });
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineCap = 'round';
  for (const b of bones) {
    const a = px(at[b.id]), z = px(tipOf(b, at[b.id]));
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(z.x, z.y);
    ctx.lineWidth = 6 * dpp;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.lineWidth = 3 * dpp;
    ctx.strokeStyle = HUES[b.stroke % HUES.length];
    ctx.stroke();
  }
  for (const b of bones) {
    const a = px(at[b.id]), z = px(tipOf(b, at[b.id]));
    dot(ctx, a, 3.5 * dpp, INK, INK, dpp);
    dot(ctx, z, 6 * dpp, lit.includes(b.id) ? HOT : PAPER, HUES[b.stroke % HUES.length], dpp);
  }
  ctx.restore();
}

function dot(ctx, p, r, fill, line, dpp) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2 * dpp;
  ctx.strokeStyle = line;
  ctx.stroke();
}

/**
 * The path a crawl goes round, dashed — closed, and arrowed the way the head
 * goes — so the stage says where the body will be.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{points: Array<{x, y}>}} path   crawl.js `pathOf`
 * @param {number} view
 * @param {{x, y}} stage
 * @param {number} dpp
 */
export function drawPath(ctx, path, view, stage, dpp) {
  const px = p => ({ x: (p.x - stage.x) * view, y: (p.y - stage.y) * view });
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  path.points.forEach((p, i) => { const q = px(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
  ctx.closePath();
  ctx.setLineDash([6 * dpp, 5 * dpp]);
  ctx.lineWidth = 2 * dpp;
  ctx.strokeStyle = HUES[0];
  ctx.stroke();
  ctx.setLineDash([]);
  const a = px(path.points[0]), b = px(path.points[Math.min(path.points.length - 1, 8)]);
  const t = Math.atan2(b.y - a.y, b.x - a.x), r = 9 * dpp;
  ctx.beginPath();
  ctx.moveTo(a.x + Math.cos(t) * r, a.y + Math.sin(t) * r);
  ctx.lineTo(a.x + Math.cos(t + 2.5) * r, a.y + Math.sin(t + 2.5) * r);
  ctx.lineTo(a.x + Math.cos(t - 2.5) * r, a.y + Math.sin(t - 2.5) * r);
  ctx.closePath();
  ctx.fillStyle = HUES[0];
  ctx.fill();
  ctx.restore();
}
