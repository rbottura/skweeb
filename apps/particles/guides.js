/**
 * guides.js — what the preview draws over the particles to show what makes
 * them: the emitter and its launch, the fields and their centre, the pull.
 *
 * Preview only, like compose's trim line and outline: never in a save, a
 * frame, a sheet — frames.js draws those, and knows nothing of this file.
 * Drawn in canvas pixels, after the particles, each line light under dark
 * so it reads on any ground:
 *
 *   the picture's centre     a small grey cross, what x and y count from
 *   the emitter              blue: its shape — a point, a line, a disc
 *                            dashed, a ring, an object's points — through
 *                            the camera at its depth; its launch cone, or
 *                            arrows outward; a handle to drag it by
 *   the fields               magenta: arrows of the whole field on a grid,
 *                            sampled from the very function the particles
 *                            move through (forces.js); a vortex's turn and
 *                            an attractor's pull round the centre; their
 *                            reach, a dashed circle with a handle on it; and
 *                            the centre's handle — there with no field on,
 *                            faint, so it can be placed first
 *   the pull                 gravity and wind, one arrow in the corner
 */

import { prepare, turned } from './model.js';
import { toModel } from './params.js';
import { fieldOf } from './forces.js';
import { pictureSize } from './draw.js';

const DEG = Math.PI / 180;
const EMITTER = '#1f5fd6';
const FIELD = '#c81e6a';
const QUIET = '#6b6b6b';
const HALO = 'rgba(255, 253, 246, 0.9)';

/** Whether any field pulls: then there is a centre worth a handle. */
export const hasField = e => !!(e.vortex || e.attract || e.noise || (e.fieldFrom && e.fieldPull));

/** How far the camera scales something at depth `z` (draw.js `drawOrder`); 0 behind it. */
const depthScale = (z, focal) => {
  const f = focal > 0 ? focal : 800;
  return f + (z || 0) < 1 ? 0 : f / (f + (z || 0));
};

/**
 * The handles, in picture pixels from its centre, as they are seen: the
 * emitter through the camera at its depth; the fields' centre in the plane,
 * always, so it can be placed before a field is on; and, with a falloff,
 * the reach, on its circle to the centre's right. `k` is how far the camera
 * scales the handle's own moves. The reach first: at a small radius it sits
 * near the centre, and a press there means to change the radius.
 *
 * @returns {Array<{id: 'emitter' | 'field' | 'reach', x: number, y: number, k: number}>}
 */
export function handlesOf(e, p) {
  const out = [];
  if (e.falloff > 0 && (e.vortex || e.attract)) out.push({ id: 'reach', x: e.fx + e.falloff, y: e.fy, k: 1 });
  const k = depthScale(e.z, p.focal);
  if (k > 0) out.push({ id: 'emitter', x: e.x * k, y: e.y * k, k });
  out.push({ id: 'field', x: e.fx, y: e.fy, k: 1 });
  return out;
}

/** A path stroked twice: a light halo, then the colour. */
function stroke(ctx, colour, width = 1.5, dash = []) {
  ctx.setLineDash([]);
  ctx.lineWidth = width + 2.5;
  ctx.strokeStyle = HALO;
  ctx.stroke();
  ctx.setLineDash(dash);
  ctx.lineWidth = width;
  ctx.strokeStyle = colour;
  ctx.stroke();
  ctx.setLineDash([]);
}

/** An arrow from (x, y), `len` long, pointing at `a` radians clockwise from up. */
function arrow(ctx, x, y, a, len, colour, width = 1.5) {
  const tx = x + Math.sin(a) * len, ty = y - Math.cos(a) * len;
  const head = Math.min(7, len * 0.4);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.moveTo(tx - Math.sin(a - 0.5) * head, ty + Math.cos(a - 0.5) * head);
  ctx.lineTo(tx, ty);
  ctx.lineTo(tx - Math.sin(a + 0.5) * head, ty + Math.cos(a + 0.5) * head);
  stroke(ctx, colour, width);
}

function label(ctx, text, x, y, colour) {
  ctx.font = '600 11px ui-monospace, monospace';
  ctx.lineWidth = 3;
  ctx.strokeStyle = HALO;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

function handle(ctx, x, y, colour, square) {
  ctx.beginPath();
  if (square) {
    ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.closePath();
  } else {
    ctx.arc(x, y, 6, 0, Math.PI * 2);
  }
  ctx.fillStyle = HALO;
  ctx.fill();
  stroke(ctx, colour, 2);
}

/** The handle F places (core/shell/guides.js): a ring round it. */
function ring(ctx, x, y, colour) {
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  stroke(ctx, colour, 1.5);
}

/**
 * Draw the guides over a preview already painted.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} e        the emitter's values
 * @param {object} p        the picture's values
 * @param {number} view     canvas pixels per picture pixel
 * @param {number} [dpp=1]  canvas pixels per CSS pixel: the guides are sized
 *                          on screen, not on the canvas, so they read the same
 *                          on any display and at any preview size
 * @param {object} [given]  what the emitter names, loaded: `points`, `field`;
 *                          and `selected`, the handle F places, ringed
 */
export function drawGuides(ctx, e, p, view, dpp = 1, { points = null, field = null, selected = null } = {}) {
  const { width, height } = pictureSize(p);
  view /= dpp;                                  // from here on, CSS pixels
  const ox = (width / 2) * view, oy = (height / 2) * view;
  ctx.save();
  ctx.setTransform(dpp, 0, 0, dpp, 0, 0);
  ctx.globalAlpha = 1;

  // The picture's centre: where x and y count from.
  ctx.beginPath();
  ctx.moveTo(ox - 8, oy); ctx.lineTo(ox + 8, oy);
  ctx.moveTo(ox, oy - 8); ctx.lineTo(ox, oy + 8);
  stroke(ctx, QUIET, 1);

  drawField(ctx, e, p, view, ox, oy, width, height, field, selected === 'field');
  drawEmitter(ctx, e, p, view, ox, oy, points, selected === 'emitter');
  drawPull(ctx, e);
  ctx.restore();
}

/** At most this many of an object's points are drawn: enough to see its shape. */
const SHOWN = 900;

function drawEmitter(ctx, e, p, view, ox, oy, points, chosen) {
  const k = depthScale(e.z, p.focal);
  if (!k) return;
  const x = ox + e.x * k * view, y = oy + e.y * k * view;
  const r = e.extent * k * view;

  if (e.shape === 'line') {
    const a = e.lineAngle * DEG, cx = Math.cos(a) * r / 2, cy = Math.sin(a) * r / 2;
    const nx = -Math.sin(a) * 5, ny = Math.cos(a) * 5;
    ctx.beginPath();
    ctx.moveTo(x - cx, y - cy); ctx.lineTo(x + cx, y + cy);
    ctx.moveTo(x - cx - nx, y - cy - ny); ctx.lineTo(x - cx + nx, y - cy + ny);
    ctx.moveTo(x + cx - nx, y + cy - ny); ctx.lineTo(x + cx + nx, y + cy + ny);
    stroke(ctx, EMITTER, 2);
  } else if (e.shape === 'disc' || e.shape === 'ring') {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
    stroke(ctx, EMITTER, e.shape === 'ring' ? 2 : 1.5, e.shape === 'disc' ? [6, 4] : []);
  }
  const list = e.shape === 'object' && points ? points.list : [];
  if (list.length) {
    const every = Math.max(1, Math.ceil(list.length / SHOWN));
    ctx.fillStyle = EMITTER;
    for (let i = 0; i < list.length; i += every) {
      const [u, v] = turned(list[i][0], list[i][1], e.objectAngle);
      ctx.fillRect(x + u * r - 1, y + v * r - 1, 2, 2);
    }
  }

  // The launch: arrows outward round a disc or a ring, or the cone.
  const len = Math.max(36, Math.min(90, (e.speed || 0) * 0.3 * view));
  if (list.length && e.aim === 'outward') {
    for (let i = 0; i < 12; i++) {
      const [u, v] = turned(...list[Math.floor((i / 12) * list.length)], e.objectAngle);
      arrow(ctx, x + u * r, y + v * r, Math.atan2(u, -v), 22, EMITTER);
    }
  } else if ((e.shape === 'disc' || e.shape === 'ring') && e.aim === 'outward') {
    for (let i = 0; i < 12; i++) {
      const phi = (i / 12) * Math.PI * 2;
      const a = Math.atan2(Math.cos(phi), -Math.sin(phi));
      arrow(ctx, x + Math.cos(phi) * r, y + Math.sin(phi) * r, a, 22, EMITTER);
    }
  } else {
    const a = e.angle * DEG, half = Math.min(180, e.spread / 2) * DEG;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(a - half) * len, y - Math.cos(a - half) * len);
    ctx.lineTo(x, y);
    ctx.lineTo(x + Math.sin(a + half) * len, y - Math.cos(a + half) * len);
    stroke(ctx, EMITTER, 1, [4, 3]);
    arrow(ctx, x, y, a, len, EMITTER, 2);
  }

  handle(ctx, x, y, EMITTER, false);
  if (chosen) ring(ctx, x, y, EMITTER);
  label(ctx, e.z ? `emitter · depth ${e.z}` : 'emitter', x + 11, y + 16, EMITTER);
}

function drawField(ctx, e, p, view, ox, oy, width, height, given, chosen) {
  const x = ox + e.fx * view, y = oy + e.fy * view;
  if (!hasField(e)) {
    // Nothing pulls yet: the centre alone, faint, ready to be placed.
    ctx.globalAlpha = 0.55;
    handle(ctx, x, y, FIELD, true);
    if (chosen) ring(ctx, x, y, FIELD);
    label(ctx, 'field · off', x + 11, y - 10, FIELD);
    ctx.globalAlpha = 1;
    return;
  }
  const field = fieldOf(prepare(toModel(e, p), { field: given }));

  // The whole field on a grid, from the function the particles move through.
  const step = 48;
  const samples = [];
  let most = 0;
  for (let gy = step / 2; gy < height * view; gy += step) {
    for (let gx = step / 2; gx < width * view; gx += step) {
      const [ax, ay] = field((gx - ox) / view, (gy - oy) / view);
      const n = Math.hypot(ax, ay);
      most = Math.max(most, n);
      samples.push([gx, gy, ax, ay, n]);
    }
  }
  ctx.globalAlpha = 0.45;
  for (const [gx, gy, ax, ay, n] of samples) {
    if (n < most * 0.02) continue;
    arrow(ctx, gx, gy, Math.atan2(ax, -ay), 6 + 14 * Math.sqrt(n / most), FIELD, 1);
  }
  ctx.globalAlpha = 1;

  // Their reach, and a handle on it to pull it wider or narrower.
  if (e.falloff > 0 && (e.vortex || e.attract)) {
    const r = e.falloff * view;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    stroke(ctx, FIELD, 1.5, [7, 5]);
    ctx.beginPath();
    ctx.rect(x + r - 5, y - 5, 10, 10);
    ctx.fillStyle = HALO;
    ctx.fill();
    stroke(ctx, FIELD, 2);
    label(ctx, `reach ${Math.round(e.falloff)}`, x + r + 9, y + 4, FIELD);
  }
  if (e.vortex) {
    // Three quarters of a turn, the way it turns: clockwise for more than 0.
    const cw = e.vortex > 0, r = 34, from = -Math.PI / 2, to = from + (cw ? 1.5 : -1.5) * Math.PI;
    ctx.beginPath();
    ctx.arc(x, y, r, from, to, !cw);
    stroke(ctx, FIELD, 2);
    // The head at the arc's end, along its tangent there.
    const tx = cw ? -Math.sin(to) : Math.sin(to), ty = cw ? Math.cos(to) : -Math.cos(to);
    const ex = x + Math.cos(to) * r, ey = y + Math.sin(to) * r;
    arrow(ctx, ex - tx * 8, ey - ty * 8, Math.atan2(tx, -ty), 9, FIELD, 2);
  }
  if (e.attract) {
    // Four arrows towards the centre, or away from it for less than 0.
    for (let i = 0; i < 4; i++) {
      const phi = Math.PI / 4 + (i * Math.PI) / 2;
      const inward = e.attract > 0;
      const r0 = inward ? 56 : 22;
      const a = Math.atan2(Math.cos(phi), -Math.sin(phi)) + (inward ? Math.PI : 0);
      arrow(ctx, x + Math.cos(phi) * r0, y + Math.sin(phi) * r0, a, 26, FIELD, 1.5);
    }
  }
  handle(ctx, x, y, FIELD, true);
  if (chosen) ring(ctx, x, y, FIELD);
  label(ctx, 'field', x + 11, y - 10, FIELD);
}

function drawPull(ctx, e) {
  const gx = e.wind || 0, gy = e.gravity || 0;
  const n = Math.hypot(gx, gy);
  if (!n) return;
  arrow(ctx, 28, 30, Math.atan2(gx, -gy), 26, QUIET, 1.5);
  label(ctx, `pull ${Math.round(n)}`, 12, 72, QUIET);
}
