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
 * divergence. And in 3D (`noise3`), for a surface displaced in space. Pure:
 * no DOM, no Math.random — a seed and a point in, a number out, so a
 * particle's path through it is the same every time it is drawn.
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

/** What the hash of a lattice point is mixed with last: another salt, another noise of the same seed. */
export const GRAD_SALT = 0x9e3779b9;

/** The gradient index of a lattice point: WGSL's randAt hash, its low three bits. */
const gradAt = (ix, iy, seed, salt = GRAD_SALT) => pcg((pcg((pcg(((ix | 0) ^ seed) >>> 0) ^ (iy | 0)) >>> 0) ^ salt) >>> 0) & 7;

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
 * Gradient noise that comes round: `noise2` on a lattice wrapped every `px`
 * points across and `py` down, so a tile of px by py meets itself at its
 * edges, and scrolled by a whole tile it ends where it began. `salt` is
 * another noise of the same seed — an octave's, a second row's. With no wrap
 * in reach and no salt given it is `noise2`, to the bit. Its twin in WGSL is
 * `tileNoise` (core/gpu/filters/noise.js): the same hash, the same fade.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} seed   a u32
 * @param {number} px     lattice points across before it repeats, a whole number
 * @param {number} py     …and down
 * @param {number} [salt]
 */
export function noiseTile2(x, y, seed, px, py, salt = GRAD_SALT) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const x0 = ((ix % px) + px) % px, x1 = (x0 + 1) % px;
  const y0 = ((iy % py) + py) % py, y1 = (y0 + 1) % py;
  const ga = gradAt(x0, y0, seed, salt), gb = gradAt(x1, y0, seed, salt);
  const gc = gradAt(x0, y1, seed, salt), gd = gradAt(x1, y1, seed, salt);
  const a = GX[ga] * fx + GY[ga] * fy;
  const b = GX[gb] * (fx - 1) + GY[gb] * fy;
  const c = GX[gc] * fx + GY[gc] * (fy - 1);
  const d = GX[gd] * (fx - 1) + GY[gd] * (fy - 1);
  const u = fade(fx), v = fade(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
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

/**
 * Twelve gradients for 3D — the cube's edge middles, Perlin's improved set —
 * four of them twice, so a hash's low four bits pick one with no remainder.
 */
const G3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
            [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1], [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1]];

/** A lattice point's gradient in 3D: the same hash, one link longer, its low four bits. */
const grad3 = (ix, iy, iz, seed) =>
  G3[pcg((pcg((pcg((pcg(((ix | 0) ^ seed) >>> 0) ^ (iy | 0)) >>> 0) ^ (iz | 0)) >>> 0) ^ 0x9e3779b9) >>> 0) & 15];

/**
 * Gradient noise at (x, y, z), in lattice units: Perlin's improved noise on
 * the suite's hash — about −1 to 1, zero on every lattice point, smooth
 * between. JS only: nothing on the GPU wants it yet. What a surface is
 * displaced by in 3D (apps/3d/deform.js), where 2D noise would streak.
 */
export function noise3(x, y, z, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const dot = (dx, dy, dz) => { const g = grad3(ix + dx, iy + dy, iz + dz, seed); return g[0] * (fx - dx) + g[1] * (fy - dy) + g[2] * (fz - dz); };
  const u = fade(fx), v = fade(fy), w = fade(fz);
  const lerp = (a, b, t) => a + (b - a) * t;
  const x00 = lerp(dot(0, 0, 0), dot(1, 0, 0), u), x10 = lerp(dot(0, 1, 0), dot(1, 1, 0), u);
  const x01 = lerp(dot(0, 0, 1), dot(1, 0, 1), u), x11 = lerp(dot(0, 1, 1), dot(1, 1, 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

/**
 * Gradient noise at (x, y, z) and its slope — `[n, ∂n/∂x, ∂n/∂y, ∂n/∂z]`,
 * exact, from the same eight corners in one pass: `noise3`'s field, its value
 * the same within a rounding (summed in another order), so `noise3` stays as
 * it was for what it displaced. What a 3D curl is made of.
 *
 * @returns {[number, number, number, number]}
 */
export function noiseGrad3(x, y, z, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fade(fx), v = fade(fy), w = fade(fz), du = fade1(fx), dv = fade1(fy), dw = fade1(fz);
  let n = 0, nx = 0, ny = 0, nz = 0;
  for (let c = 0; c < 8; c++) {
    const i = c & 1, j = (c >> 1) & 1, k = (c >> 2) & 1;
    const g = grad3(ix + i, iy + j, iz + k, seed);
    const d = g[0] * (fx - i) + g[1] * (fy - j) + g[2] * (fz - k);
    const a = i ? u : 1 - u, b = j ? v : 1 - v, e = k ? w : 1 - w;
    const weight = a * b * e;
    n += weight * d;
    nx += weight * g[0] + (i ? du : -du) * b * e * d;
    ny += weight * g[1] + a * (j ? dv : -dv) * e * d;
    nz += weight * g[2] + a * b * (k ? dw : -dw) * d;
  }
  return [n, nx, ny, nz];
}

/** The three potentials of a 3D curl, each its own field of the one seed. */
const POTENTIALS = [0, 0x2545f491, 0x6b43a9b5];

/**
 * The curl of three noise fields at (x, y, z) — the 3D flow particles' `curl2`
 * is in the plane: it swirls and never gathers, a curl having no divergence.
 * Roughly unit-sized; the caller scales it. A cloud's dots move through it
 * (apps/3d/forces.js).
 *
 * @returns {[number, number, number]}
 */
export function curl3(x, y, z, seed) {
  const [p, q, r] = POTENTIALS.map(salt => noiseGrad3(x, y, z, salt ? pcg((seed ^ salt) >>> 0) : seed));
  return [r[2] - q[3], p[3] - r[1], q[1] - p[2]];
}
