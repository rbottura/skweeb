/**
 * sharpen — each pixel pushed away from its four neighbours.
 *
 * Adapted from p5.FIP's `sharpen` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file): the centre times 1 + 4k less k times
 * the four around it. Changed here: on premultiplied colour, then held in
 * range — alpha in [0, 1], colour no more than its alpha — where p5.FIP let a
 * sprite's edge overshoot into a dark or bright rim; and the neighbours are
 * as far as the print scale, so a sharpened picture drawn again at 2x keeps
 * its look.
 */
export default {
  id: 'sharpen',
  label: 'sharpen',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    amount: { type: 'range', min: 0, max: 4, step: 0.05, default: 0.5, label: 'amount' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { amount: f32, gap: f32 }
fn fx(uv: vec2f) -> vec4f {
  let d = frame.texel * params.gap;
  let around = tex(uv + vec2f(0.0, d.y)) + tex(uv - vec2f(0.0, d.y))
             + tex(uv + vec2f(d.x, 0.0)) + tex(uv - vec2f(d.x, 0.0));
  let s = tex(uv) * (1.0 + 4.0 * params.amount) - around * params.amount;
  let a = clamp(s.a, 0.0, 1.0);
  return vec4f(clamp(s.rgb, vec3f(0.0), vec3f(a)), a);
}`,
    uniforms: (v, info) => [v.amount, Math.max(1, info.scale)],
  }],
};
