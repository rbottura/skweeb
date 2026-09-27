/**
 * forces.js — the fields a particle moves through, and how it is moved
 * through them when no formula will do.
 *
 * Gravity, wind and drag have a closed form (model.js `motion`), and while
 * they are all there is, a particle is placed by it. A vortex, an attractor
 * or curl noise has none: the pull depends on where the particle is. So it
 * is integrated — but from its own birth, in fixed steps of `STEP`, every
 * time it is drawn. Nothing is carried from one frame to the next, so the
 * promise holds: a frame stands alone, and a loop closes, since a
 * particle's path depends only on where and how it left, which its slot
 * decided. The fields do not move in time, for the same reason.
 *
 * The cost is a particle's age in steps, each frame: a life of 1.5 s is 90
 * steps. A long life with a field is the slow case (STATUS.md).
 *
 * ── The fields ─────────────────────────────────────────────────────────────
 *
 * All about one centre, `fx`, `fy` from the picture's centre, in px/s²:
 *
 *   vortex    round the centre, clockwise for more than 0
 *   attract   towards it, away for less than 0
 *   noise     along the curl of seeded gradient noise (core/noise.js), its
 *             features `noiseScale` px across — a swirl that never gathers
 *
 * Near the centre the vortex and the pull fade in over `SOFT` px, so a
 * particle passing through it is not flung to infinity. Far from it they
 * reach everywhere — unless `falloff` gives them a radius: full strength at
 * the centre, `(1 − (d / falloff)²)²` of it at `d`, none past the radius.
 * A smooth fade, its slope 0 at the edge, so nothing jolts crossing it. The
 * noise has no centre, and no falloff.
 */

import { curl2, pcg } from '../../core/noise.js';

/** Seconds a step: 120 a second, so a 60 fps frame is two. */
export const STEP = 1 / 120;
const SOFT = 24;

/**
 * How much of a centred pull reaches `d` px from its centre, with a
 * `falloff` radius — 0 for none, everywhere at full strength.
 */
export function reach(d, falloff) {
  if (!(falloff > 0)) return 1;
  if (d >= falloff) return 0;
  const q = 1 - (d / falloff) ** 2;
  return q * q;
}

/**
 * The field's pull at a point, or null when there is none — and the closed
 * form places every particle.
 *
 * @param {object} m   a prepared recipe (model.js)
 * @returns {?(x: number, y: number) => [number, number]}
 */
export function fieldOf(m) {
  const vortex = m.vortex || 0, attract = m.attract || 0, noise = m.noise || 0;
  if (!vortex && !attract && !noise) return null;
  const cx = m.fx || 0, cy = m.fy || 0, falloff = m.falloff || 0;
  const scale = Math.max(1, m.noiseScale || 200);
  const seed = pcg((m.seed ^ 0x51ed27) >>> 0);
  return (x, y) => {
    let ax = 0, ay = 0;
    if (vortex || attract) {
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > 1e-9) {
        const k = (Math.min(1, d / SOFT) * reach(d, falloff)) / d;
        ax += (-dy * vortex - dx * attract) * k;
        ay += (dx * vortex - dy * attract) * k;
      }
    }
    if (noise) {
      const [nx, ny] = curl2(x / scale, y / scale, seed);
      ax += nx * noise;
      ay += ny * noise;
    }
    return [ax, ay];
  };
}

/**
 * Where a body is `age` seconds after it left `p` at `v`: gravity, wind and
 * drag as in the closed form, and the field — by the midpoint rule, in
 * whole steps of STEP and one last part-step, the count taken from the age
 * alone so the same age is always the same steps.
 *
 * @param {{x, y}} p
 * @param {{x, y}} v
 * @param {object} m                          a prepared recipe: gravity, wind, drag
 * @param {(x, y) => [number, number]} field  from fieldOf
 * @param {number} age
 * @returns {{x, y, vx, vy}}
 */
export function integrate(p, v, m, field, age) {
  let x = p.x, y = p.y, vx = v.x, vy = v.y;
  const g = m.gravity || 0, w = m.wind || 0, k = m.drag || 0;
  const step = h => {
    const [f1x, f1y] = field(x, y);
    const ax = w + f1x - k * vx, ay = g + f1y - k * vy;
    const mx = x + (vx * h) / 2, my = y + (vy * h) / 2;
    const mvx = vx + (ax * h) / 2, mvy = vy + (ay * h) / 2;
    const [f2x, f2y] = field(mx, my);
    x += mvx * h;
    y += mvy * h;
    vx += (w + f2x - k * mvx) * h;
    vy += (g + f2y - k * mvy) * h;
  };
  const whole = Math.max(0, Math.floor(age / STEP + 1e-9));
  for (let i = 0; i < whole; i++) step(STEP);
  const rest = age - whole * STEP;
  if (rest > 1e-12) step(rest);
  return { x, y, vx, vy };
}
