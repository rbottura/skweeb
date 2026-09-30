/**
 * field.js — escape time as a field: which way the set is, anywhere on a
 * fractals picture. M7's link, `fractal → particles: a field`.
 *
 * The smooth escape count (fractal.js `smooth`) rises towards the set, so
 * its slope, made a direction of length 1, points at it. It is sampled once,
 * on a grid of CELLS along the picture's longer side, in doubles — a field
 * needs no GPU and is the same on any machine — and read between the
 * samples bilinearly, held at the grid's edge past it. Inside the set,
 * where nothing escapes, it is at its highest and has no slope: no pull, but
 * its edge draws everything outside towards it.
 *
 * Positions are px from the picture's centre, y down — the particles' own —
 * at the object's size at scale 1: the fractal as saved, laid centred on the
 * particles' picture. A loop's field is its set at its own values — a Julia
 * loop's, the set of the `c` its circle goes round: the field stays still,
 * so particles moving through it still close their loop.
 */

import { SPAN, smooth } from './fractal.js';

/** Samples along the picture's longer side. */
export const CELLS = 128;

/** More iterations than this, a field's sample does not wait for: they only sharpen the edge. */
const MOST = 1000;

/**
 * @param {object} v   an escape-time recipe: kind, cx, cy, zoom, iterations, jx, jy, width, height
 * @param {{cells?: number}} [opts]
 * @returns {{at(x: number, y: number): [number, number], nx: number, ny: number}}
 */
export function escapeField(v, { cells = CELLS } = {}) {
  const W = Math.max(1, v.width), H = Math.max(1, v.height);
  const unit = SPAN / v.zoom / H;                          // plane units a pixel
  const step = Math.max(W, H) / cells;
  const nx = Math.max(2, Math.round(W / step) + 1), ny = Math.max(2, Math.round(H / step) + 1);
  const sx = W / (nx - 1), sy = H / (ny - 1);
  const w = { ...v, iterations: Math.min(v.iterations, MOST) };
  const top = w.iterations + 1;                            // inside: higher than anything that leaves

  const height = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const s = smooth(w, v.cx + (-W / 2 + i * sx) * unit, v.cy - (-H / 2 + j * sy) * unit);
      height[j * nx + i] = Number.isFinite(s) ? Math.min(s, top) : top;
    }
  }

  const dir = new Float64Array(nx * ny * 2);
  const at = (i, j) => height[Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const gx = (at(i + 1, j) - at(i - 1, j)) / sx, gy = (at(i, j + 1) - at(i, j - 1)) / sy;
      const len = Math.hypot(gx, gy);
      if (len > 1e-12) {
        dir[(j * nx + i) * 2] = gx / len;
        dir[(j * nx + i) * 2 + 1] = gy / len;
      }
    }
  }

  return {
    nx, ny,
    at(x, y) {
      const fx = Math.min(nx - 1, Math.max(0, (x + W / 2) / sx));
      const fy = Math.min(ny - 1, Math.max(0, (y + H / 2) / sy));
      const i = Math.min(nx - 2, Math.floor(fx)), j = Math.min(ny - 2, Math.floor(fy));
      const tx = fx - i, ty = fy - j;
      const k00 = (j * nx + i) * 2, k10 = k00 + 2, k01 = k00 + nx * 2, k11 = k01 + 2;
      const mix = o => (dir[k00 + o] * (1 - tx) + dir[k10 + o] * tx) * (1 - ty) + (dir[k01 + o] * (1 - tx) + dir[k11 + o] * tx) * ty;
      return [mix(0), mix(1)];
    },
  };
}
