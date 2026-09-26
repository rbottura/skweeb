/**
 * unsharp mask — the picture pushed away from a blur of itself: detail
 * sharpened at the size the blur's radius names.
 *
 * Adapted from p5.FIP's `unsharpMasking` (MIT, © 2024 Darragh Nolan — the
 * notice is LICENSE-p5.FIP.txt, beside this file): the original plus
 * (original − blurred) × amount. Changed here: p5.FIP's "blur" was one
 * neighbour's sample; this is a true Gaussian of `radius`, the gaussian blur
 * filter's own two passes, and a third lays the original back against it
 * (`orig`) — on premultiplied colour, held in range as sharpen is.
 */

import { across } from './blur.js';

export default {
  id: 'unsharp',
  label: 'unsharp mask',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    radius: { type: 'range', min: 0.5, max: 32, step: 0.5, default: 2, label: 'radius' },
    amount: { type: 'range', min: 0, max: 5, step: 0.05, default: 1, label: 'amount' },
  },
  passes: [
    across(1, 0),
    across(0, 1),
    {
      code: /* wgsl */ `
struct Params { amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  let px = vec2i(uv * frame.size);
  let o = origAt(px);
  let s = o + (o - texAt(px)) * params.amount;
  let a = clamp(s.a, 0.0, 1.0);
  return vec4f(clamp(s.rgb, vec3f(0.0), vec3f(a)), a);
}`,
      uniforms: v => [v.amount],
    },
  ],
};
