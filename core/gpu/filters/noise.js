/**
 * noise — a generator: smooth noise from nothing, a tile that comes round.
 *
 * Written for skweeb: Perlin's improved gradient noise on the kit's hash, no
 * outside code. `tileNoise` below is core/noise.js's `noiseTile2`, and
 * `noiseAt` the whole of this pass in JS — the same grey on either side
 * (rule 2), which node holds without a GPU and check-filters on one.
 *
 * Summed in octaves, each twice as fine and `rough` as strong as the one
 * before. Its lattice wraps at the picture's edge — a whole number of cells
 * across, the nearest whole number down — so the picture is a tile, and
 * scrolled by whole tiles in a loop it ends where it began (meet.js, the
 * phase). Drawn from the recipe's seed; `variant` is another noise of the
 * same seed, so two rows multiplied are two noises and not one squared.
 * Nothing is in pixels: cells are counted across the picture, so a print
 * scale changes nothing, and a window of it is its part of the whole.
 */

import { noiseTile2, GRAD_SALT } from '../../noise.js';
import { MEET, MEET_PARAMS, meetUniforms, phaseOf } from './meet.js';

/** An octave's salt, and a variant's: core/noise.js's own for the first of each. */
const saltOf = (variant, octave) => (GRAD_SALT ^ Math.imul(variant, 0x85ebca6b) ^ Math.imul(octave, 0xc2b2ae35)) >>> 0;

/** WGSL: `tileNoise(p, period, salt)`, and the salt of an octave of a variant. */
export const TILE_NOISE = /* wgsl */ `
fn tileGrad(ix: i32, iy: i32, salt: u32) -> vec2f {
  var dirs = array<vec2f, 8>(vec2f(1.0, 0.0), vec2f(-1.0, 0.0), vec2f(0.0, 1.0), vec2f(0.0, -1.0),
    vec2f(0.70710678, 0.70710678), vec2f(-0.70710678, 0.70710678),
    vec2f(0.70710678, -0.70710678), vec2f(-0.70710678, -0.70710678));
  return dirs[pcg(pcg(pcg(u32(ix) ^ frame.seed) ^ u32(iy)) ^ salt) & 7u];
}

fn wrapTo(i: i32, n: i32) -> i32 {
  return ((i % n) + n) % n;
}

fn tileNoise(p: vec2f, period: vec2i, salt: u32) -> f32 {
  let cell = floor(p);
  let f = p - cell;
  let x0 = wrapTo(i32(cell.x), period.x);
  let x1 = (x0 + 1) % period.x;
  let y0 = wrapTo(i32(cell.y), period.y);
  let y1 = (y0 + 1) % period.y;
  let a = dot(tileGrad(x0, y0, salt), f);
  let b = dot(tileGrad(x1, y0, salt), f - vec2f(1.0, 0.0));
  let c = dot(tileGrad(x0, y1, salt), f - vec2f(0.0, 1.0));
  let d = dot(tileGrad(x1, y1, salt), f - vec2f(1.0, 1.0));
  let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return a + (b - a) * u.x + (c - a) * u.y + (a - b - c + d) * u.x * u.y;
}

fn noiseSalt(variant: u32, octave: u32) -> u32 {
  return ${GRAD_SALT}u ^ (variant * 0x85ebca6bu) ^ (octave * 0xc2b2ae35u);
}
`;

/**
 * The grey this pass draws at (u, v) of a picture `width` by `height`, in JS.
 *
 * @param {number} u        across the picture, 0 to 1
 * @param {number} v        down it
 * @param {object} values   this filter's params
 * @param {number} seed     the recipe's
 * @param {number} [phase]  where in its loop, 0 to 1 (meet.js)
 * @returns {number} 0 to 1
 */
export function noiseAt(u, v, width, height, values, seed, phase = 0) {
  const across = Math.max(1, values.cells);
  const down = Math.max(1, Math.floor(across * height / width + 0.5));
  const x = u - values.scrollX * phase, y = v - values.scrollY * phase;
  let sum = 0, total = 0, amp = 1, freq = 1;
  for (let o = 0; o < values.octaves; o++) {
    sum += amp * noiseTile2(x * across * freq, y * down * freq, seed >>> 0, across * freq, down * freq, saltOf(values.variant, o));
    total += amp;
    amp *= values.rough;
    freq *= 2;
  }
  return Math.min(1, Math.max(0, 0.5 + sum / total * Math.SQRT1_2 * values.contrast));
}

export default {
  id: 'noise',
  label: 'noise',
  source: 'skweeb',
  licence: 'MIT',
  random: true,
  generates: true,
  params: {
    cells:    { type: 'int', min: 1, max: 64, default: 4, label: 'cells across' },
    octaves:  { type: 'int', min: 1, max: 6, default: 3, label: 'octaves' },
    rough:    { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'roughness' },
    contrast: { type: 'range', min: 0.25, max: 4, step: 0.05, default: 1.5, label: 'contrast' },
    variant:  { type: 'int', min: 0, max: 99, default: 0, label: 'variant' },
    scrollX:  { type: 'int', min: -8, max: 8, default: 0, label: 'scroll right, tiles a loop' },
    scrollY:  { type: 'int', min: -8, max: 8, default: 0, label: 'scroll down' },
    ...MEET_PARAMS,
  },
  passes: [{
    code: TILE_NOISE + MEET + /* wgsl */ `
struct Params { cells: f32, octaves: f32, rough: f32, contrast: f32, variant: f32, scrollX: f32, scrollY: f32, phase: f32, blend: f32, amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  let across = max(1.0, params.cells);
  let down = max(1.0, floor(across * frame.size.y / frame.size.x + 0.5));
  let lattice = vec2f(across, down);
  let at = uv - vec2f(params.scrollX, params.scrollY) * params.phase;
  var sum = 0.0;
  var total = 0.0;
  var amp = 1.0;
  var freq = 1.0;
  for (var o = 0u; o < u32(params.octaves); o++) {
    sum += amp * tileNoise(at * lattice * freq, vec2i(lattice * freq), noiseSalt(u32(params.variant), o));
    total += amp;
    amp *= params.rough;
    freq *= 2.0;
  }
  let v = 0.5 + sum / total * 0.70710678 * params.contrast;
  return meet(tex(uv), v, params.blend, params.amount);
}`,
    uniforms: (v, info) => [v.cells, v.octaves, v.rough, v.contrast, v.variant, v.scrollX, v.scrollY,
      phaseOf(info), ...meetUniforms(v)],
  }],
};
