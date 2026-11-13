/**
 * dissolve — what is under eaten away from its dark parts up, over a life.
 *
 * Written for skweeb from the technique every engine calls erosion; no
 * outside code. A pixel stays while its brightness is over a threshold, and
 * the threshold runs `from` → `to` over the run's age (meet.js, `ageOf`):
 * a life's first frame to its last, or a loop's length. So a noise under it
 * goes in holes that grow — and since the threshold *is* the age, whatever
 * wears the frames dissolves on its own clock (docs/vfx.md). At 0 the
 * picture is whole, soft edge, rim and all; at 1 it is gone.
 *
 * `soft` is the edge's width, in brightness; `rim` a band just inside the
 * edge taken to a colour — the hot line a burning edge has. A still, told no
 * length, holds at `from`.
 */

import { easing, easeParam } from '../../easing.js';
import { ageOf } from './meet.js';

const rgb = hex => [1, 3, 5].map(i => parseInt(String(hex || '#000000').slice(i, i + 2), 16) / 255 || 0);

/** The threshold a run is at: `from` → `to` over its age, eased. */
export const thresholdOf = (v, info) => v.from + (v.to - v.from) * easing(v.ease)(ageOf(info));

export default {
  id: 'dissolve',
  label: 'dissolve',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    from:   { type: 'range', min: 0, max: 1, step: 0.01, default: 0, label: 'at birth' },
    to:     { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'at death' },
    ease:   easeParam({ default: 'linear', label: 'over its life' }),
    soft:   { type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.06, label: 'soft edge' },
    rim:    { type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.08, label: 'hot rim' },
    colour: { type: 'color', default: '#ffd27a', label: 'the rim\'s colour' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { at: f32, soft: f32, rim: f32, pad0: f32, r: f32, g: f32, b: f32, pad1: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let soft = max(params.soft, 0.0001);
  let band = soft + params.rim;
  // The edge's zone starts under black at 0 and ends over white at 1: whole, then gone.
  let t = params.at * (1.0 + band + 0.0002) - band - 0.0001;
  let l = clamp(luma(c.rgb), 0.0, 1.0);
  let keep = smoothstep(t, t + soft, l);
  let hot = 1.0 - smoothstep(t + soft, t + band + 0.0001, l);
  let lit = mix(c.rgb, vec3f(params.r, params.g, params.b), hot * step(0.0001, params.rim));
  return premul(vec4f(lit, c.a * keep));
}`,
    uniforms: (v, info) => [Math.min(1, Math.max(0, thresholdOf(v, info))), v.soft, v.rim, 0, ...rgb(v.colour), 0],
  }],
};
