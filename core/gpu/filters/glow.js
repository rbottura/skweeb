/**
 * glow — the bright of a picture, spread and added back over it.
 *
 * Written for skweeb from the technique engines call bloom; no outside
 * code but the suite's own blur. Three steps: what is brighter than
 * `threshold` kept and the rest dropped; that blurred — the gaussian
 * blur's own two passes, `radius` its deviation; and the blur added over
 * the picture as it was (`orig`), as light is — black adds nothing. What a
 * fire's core, a spark and a spell have that a flat sprite has not.
 *
 * It spreads as far as its blur: three deviations (`reach`).
 */

import { across } from './blur.js';

export default {
  id: 'glow',
  label: 'glow',
  source: 'skweeb',
  licence: 'MIT',
  reach: v => 3 * v.radius,
  params: {
    threshold: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.6, label: 'brighter than' },
    radius:    { type: 'range', min: 0.5, max: 64, step: 0.5, default: 8, label: 'radius' },
    strength:  { type: 'range', min: 0, max: 4, step: 0.05, default: 1, label: 'strength' },
  },
  passes: [
    {
      code: /* wgsl */ `
struct Params { threshold: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = tex(uv);
  return c * smoothstep(params.threshold, params.threshold + 0.1, luma(c.rgb));
}`,
      uniforms: v => [v.threshold],
    },
    across(1, 0),
    across(0, 1),
    {
      code: /* wgsl */ `
struct Params { strength: f32 }
fn fx(uv: vec2f) -> vec4f {
  let px = vec2i(uv * frame.size);
  let o = origAt(px);
  let light = texAt(px).rgb * params.strength;
  return vec4f(min(o.rgb + light, vec3f(1.0)), min(1.0, o.a + max(light.r, max(light.g, light.b))));
}`,
      uniforms: v => [v.strength],
    },
  ],
};
