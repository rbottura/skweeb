/**
 * motion.js — where each dot is, which way it faces, how big it is, at a tick.
 *
 * ── What v2 did ─────────────────────────────────────────────────────────────
 *
 * Every dot was a Matter body tied to its place in the letter by a constraint
 * — a tether of length `constLength` from a fixed anchor. The attractor
 * (attractor.js) pulled every body towards itself, so each dot swung out on
 * its tether and leaned the attractor's way. When the attractor is far off the
 * whole letter shifts one way as a block; when it passes through the letter
 * the dots splay out around it. That is the "kine" in ColorKineType, and it is
 * the part a first port of this app got wrong by moving each dot round its own
 * little circle instead.
 *
 * ── Why a resting point and not a simulation ────────────────────────────────
 *
 * v2 booted its sliders at their midpoints, which means air friction 0.51:
 * half of every body's velocity was thrown away each step, against a pull
 * worth several pixels a step. The dots did not swing, they sat, a few frames
 * behind the attractor. Stiffness booted at 0.5, which lets a tether stretch
 * by a few pixels under that pull — a few percent of its hundred. Where a body
 * on a tether of length L sits, pulled towards A, is the point of the tether's
 * circle nearest A:
 *
 *     p = anchor + L · (A − anchor) / |A − anchor|
 *
 * That is the whole motion, and it needs no state — so frame 400 costs what
 * frame 1 costs and a loop re-renders identically anywhere. Dropping Matter
 * loses the settling wobble when a slider moved, and nothing that showed in a
 * running piece.
 *
 * ── Rotation and scale, as v2 had them ──────────────────────────────────────
 *
 *   spin   every sprite turns together — v2's `gRot += speed` each frame.
 *          Here `turns` whole turns per loop, so the loop closes.
 *   face   each sprite points at the attractor, from where the dot actually
 *          is: atan2(A − p) + 0.9π. The 0.9π is v2's own offset, kept.
 *   none   still.
 *
 * `pulse` is v2's `gScale = cos(t) · 0.32`: every sprite grows and shrinks
 * together, through zero, so they flip inside out halfway. Here it multiplies
 * the size rather than replacing it, and runs `pulses` times per loop.
 */

import { attractorAt, phaseOf } from './attractor.js';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** v2's offset for `face` — a sprite's "front" as v2's sprites were drawn. */
export const FACE_OFFSET = 0.9 * Math.PI;

export const ROTATE_IDS = ['spin', 'face', 'none'];

/** Stride of the buffer place() fills: x, y, rotation (rad), scale. */
export const STRIDE = 4;

/**
 * The anchors: one glyph's points, centred in the world as v2's
 * `boundingBox()` centred them — the middle of the glyph's box on the middle
 * of the window.
 *
 * @param {number[][]} points  [x, y] pairs in the pixels they were found at
 * @param {{width:number, height:number}} world
 * @returns {Float64Array} x0, y0, x1, y1 …
 */
export function centre(points, world) {
  const out = new Float64Array((points ? points.length : 0) * 2);
  if (!out.length) return out;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const dx = world.width / 2 - (minX + maxX) / 2;
  const dy = world.height / 2 - (minY + maxY) / 2;
  for (let i = 0; i < points.length; i++) {
    out[i * 2] = points[i][0] + dx;
    out[i * 2 + 1] = points[i][1] + dy;
  }
  return out;
}

/**
 * Every dot at one tick, written into `out` — reused, because a trail asks
 * for this many times a frame and a thousand small objects each time is the
 * garbage collector's problem, not the picture's.
 *
 * @param {Float64Array} anchors  from centre()
 * @param {object} recipe  tether, rotate, turns, angle, pulse, pulses, size,
 *                         and what attractorAt() needs
 * @param {number} tick
 * @param {{width:number, height:number}} world
 * @param {Float64Array} [out]
 * @returns {{dots: Float64Array, attractor: {x, y}}}
 */
export function place(anchors, recipe, tick, world, out) {
  const n = anchors.length / 2;
  const dots = out && out.length >= n * STRIDE ? out : new Float64Array(n * STRIDE);

  const A = attractorAt(recipe, tick, world);
  const phase = phaseOf(tick, recipe.period);
  const L = recipe.tether;

  const base = (recipe.angle || 0) * DEG;
  const spin = recipe.rotate === 'spin' ? TAU * (recipe.turns || 0) * phase : 0;
  const face = recipe.rotate === 'face';
  const scale = (recipe.size ?? 1) *
    (recipe.pulse ? Math.cos(TAU * Math.max(1, recipe.pulses || 1) * phase) : 1);

  for (let i = 0; i < n; i++) {
    const ax = anchors[i * 2];
    const ay = anchors[i * 2 + 1];
    const dx = A.x - ax;
    const dy = A.y - ay;
    const d = Math.hypot(dx, dy);

    // Dead on its anchor the pull has no direction; the dot stays put.
    const x = d > 1e-9 ? ax + (L * dx) / d : ax;
    const y = d > 1e-9 ? ay + (L * dy) / d : ay;

    const o = i * STRIDE;
    dots[o] = x;
    dots[o + 1] = y;
    dots[o + 2] = base + (face ? Math.atan2(A.y - y, A.x - x) + FACE_OFFSET : spin);
    dots[o + 3] = scale;
  }

  return { dots, attractor: A };
}

/**
 * The box every dot stays inside, in world pixels, grown by `reach` — half the
 * mark's diagonal at full size — so a sprite at the edge is not cut.
 *
 * Over what, depends on what is being made. A loop's frames must all be one
 * size, so for a loop it is the whole loop. A still — a recipe carrying the
 * `tick` it shows — is one frame and its trail, so a brush cut from the
 * middle of a sweep is cropped to its own ink and not to everywhere the sweep
 * went.
 *
 * Measured by walking the frames rather than bounded by anchor ± tether: a dot
 * only ever leans the attractor's way, and for `point` it does not move at
 * all, so the honest box is often much smaller than the worst case. A few
 * hundred thousand multiplications, once per change, not per frame.
 *
 * @returns {{x, y, w, h}}
 */
export function loopBounds(anchors, recipe, world, reach) {
  const n = anchors.length / 2;
  if (!n) return { x: 0, y: 0, w: world.width, h: world.height };

  const still = Number.isFinite(recipe.tick);
  const first = still ? recipe.tick - Math.max(0, Math.round(recipe.trail || 0)) : 0;
  const last = still ? recipe.tick
    : (recipe.path === 'point' ? 0 : Math.max(1, Math.round(recipe.period)) - 1);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let buf = null;

  for (let t = first; t <= last; t++) {
    buf = place(anchors, recipe, t, world, buf).dots;
    for (let i = 0; i < n; i++) {
      const x = buf[i * STRIDE];
      const y = buf[i * STRIDE + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const r = Math.max(0, reach || 0);
  return { x: minX - r, y: minY - r, w: maxX - minX + 2 * r, h: maxY - minY + 2 * r };
}
