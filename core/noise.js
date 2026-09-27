/**
 * noise.js — seeded noise in JS, on the GPU kit's hash.
 *
 * The roadmap's promise for M5–M7 (docs/roadmap.md, *M5*): seeded noise is
 * the same function in the shader language and in JS (rule 2). `pcg` here is
 * core/gpu/wgsl.js's `pcg`, bit for bit — the same 32-bit multiply, shifts
 * and xors, with Math.imul standing in for WGSL's wrapping u32 multiply — so
 * `randAt` of a cell and a seed is the same number on either side.
 *
 * On it, gradient noise in 2D (Perlin's improved: one of eight gradients per
 * lattice point by the hash, quintic fade), its exact slope in the same
 * pass, and its curl: the field a particle follows so it
 * swirls without ever gathering or thinning out, since a curl has no
 * divergence. Pure: no DOM, no Math.random — a seed and a point in, a number
 * out, so a particle's path through it is the same every time it is drawn.
 */

/** WGSL's pcg, on u32s. */
export function pcg(n) {
  const s = (Math.imul(n >>> 0, 747796405) + 2891336453) >>> 0;
  const w = Math.imul(((s >>> ((s >>> 28) + 4)) ^ s) >>> 0, 277803737) >>> 0;
  return ((w >>> 22) ^ w) >>> 0;
}

/** WGSL's randAt: a lattice cell, a seed and a salt to [0, 1]. */
export function randAt(x, y, seed, salt = 0) {
  return pcg((pcg((pcg(((x | 0) ^ seed) >>> 0) ^ (y | 0)) >>> 0) ^ salt) >>> 0) / 4294967295;
}

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
const fade1 = t => 30 * t * t * (t - 1) * (t - 1);      // its slope

/**
 * Eight gradient directions, as Perlin's improved noise picks from a few
 * rather than any angle: a table and a hash, no trigonometry, which is what
 * a particle integrated through the field every step can afford.
 */
const R = Math.SQRT1_2;
const GX = [1, -1, 0, 0, R, -R, R, -R];
const GY = [0, 0, 1, -1, R, R, -R, -R];

/** The gradient index of a lattice point: WGSL's randAt hash, its low three bits. */
const gradAt = (ix, iy, seed) => pcg((pcg((pcg(((ix | 0) ^ seed) >>> 0) ^ (iy | 0)) >>> 0) ^ 0x9e3779b9) >>> 0) & 7;

/**
 * Gradient noise at (x, y), in lattice units, and its slope — `[n, ∂n/∂x,
 * ∂n/∂y]`, the slope exact, from the same four corners in the same pass.
 * About −0.7 to 0.7, zero on every lattice point, smooth between.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} seed   a u32
 * @returns {[number, number, number]}
 */
export function noiseGrad2(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ga = gradAt(ix, iy, seed), gb = gradAt(ix + 1, iy, seed);
  const gc = gradAt(ix, iy + 1, seed), gd = gradAt(ix + 1, iy + 1, seed);
  const a = GX[ga] * fx + GY[ga] * fy;
  const b = GX[gb] * (fx - 1) + GY[gb] * fy;
  const c = GX[gc] * fx + GY[gc] * (fy - 1);
  const d = GX[gd] * (fx - 1) + GY[gd] * (fy - 1);
  const u = fade(fx), v = fade(fy), du = fade1(fx), dv = fade1(fy);
  const k = a - b - c + d;
  const n = a + (b - a) * u + (c - a) * v + k * u * v;
  // Each corner's term is linear in the offset, so its slope is its gradient.
  const kx = GX[ga] - GX[gb] - GX[gc] + GX[gd], ky = GY[ga] - GY[gb] - GY[gc] + GY[gd];
  const nx = GX[ga] + (GX[gb] - GX[ga]) * u + (GX[gc] - GX[ga]) * v + kx * u * v + ((b - a) + k * v) * du;
  const ny = GY[ga] + (GY[gb] - GY[ga]) * u + (GY[gc] - GY[ga]) * v + ky * u * v + ((c - a) + k * u) * dv;
  return [n, nx, ny];
}

/** Gradient noise at (x, y): `noiseGrad2`'s value alone. */
export function noise2(x, y, seed) {
  return noiseGrad2(x, y, seed)[0];
}

/**
 * The curl of the noise at (x, y): `(∂n/∂y, −∂n/∂x)` — a flow that turns
 * and never converges. Roughly unit-sized; the caller scales it.
 *
 * @returns {[number, number]}
 */
export function curl2(x, y, seed) {
  const [, nx, ny] = noiseGrad2(x, y, seed);
  return [ny, -nx];
}
