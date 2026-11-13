/**
 * warp — what is under, read through a noise: every pixel takes its colour
 * from a little way off, the way and the distance a noise's.
 *
 * Written for skweeb from the technique engines call distortion; no outside
 * code. Two noises of the kit's tile (noise.js, `TILE_NOISE`) — one for
 * across, one for down — push where the picture is read by up to `amount`
 * of its shorter side. Scrolled, the push travels and what is under seems
 * to flow: the difference between a noise sliding and a fire licking.
 * Whole tiles a loop, so the loop still closes (meet.js, the phase).
 *
 * Drawn from the recipe's seed (rule 2). It reads from as far as it pushes,
 * which is counted in the picture's side and not in pixels — so a print
 * draws it whole (`reads`).
 */

import { TILE_NOISE } from './noise.js';
import { phaseOf } from './meet.js';

export default {
  id: 'warp',
  label: 'warp',
  source: 'skweeb',
  licence: 'MIT',
  random: true,
  reads: () => Infinity,
  params: {
    amount:  { type: 'range', min: 0, max: 0.5, step: 0.005, default: 0.06, label: 'amount, of the side' },
    cells:   { type: 'int', min: 1, max: 64, default: 4, label: 'cells across' },
    octaves: { type: 'int', min: 1, max: 4, default: 2, label: 'octaves' },
    variant: { type: 'int', min: 0, max: 99, default: 7, label: 'variant' },
    scrollX: { type: 'int', min: -8, max: 8, default: 0, label: 'scroll right, tiles a loop' },
    scrollY: { type: 'int', min: -8, max: 8, default: 0, label: 'scroll down' },
  },
  passes: [{
    code: TILE_NOISE + /* wgsl */ `
struct Params { amount: f32, cells: f32, octaves: f32, variant: f32, scrollX: f32, scrollY: f32, phase: f32 }
fn push(at: vec2f, lattice: vec2f, variant: u32) -> f32 {
  var sum = 0.0;
  var total = 0.0;
  var amp = 1.0;
  var freq = 1.0;
  for (var o = 0u; o < u32(params.octaves); o++) {
    sum += amp * tileNoise(at * lattice * freq, vec2i(lattice * freq), noiseSalt(variant, o));
    total += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum / total * 1.41421356;
}
fn fx(uv: vec2f) -> vec4f {
  let across = max(1.0, params.cells);
  let down = max(1.0, floor(across * frame.size.y / frame.size.x + 0.5));
  let lattice = vec2f(across, down);
  let at = uv - vec2f(params.scrollX, params.scrollY) * params.phase;
  let side = min(frame.size.x, frame.size.y);
  let by = vec2f(push(at, lattice, u32(params.variant)), push(at, lattice, u32(params.variant) + 1u));
  return tex(uv + by * params.amount * side * frame.texel);
}`,
    uniforms: (v, info) => [v.amount, v.cells, v.octaves, v.variant, v.scrollX, v.scrollY, phaseOf(info)],
  }],
};
