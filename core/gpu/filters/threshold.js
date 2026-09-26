/**
 * threshold — black below a level of brightness, white above it.
 *
 * Adapted from p5.FIP's `threshold` (MIT, © 2024 Darragh Nolan — the notice
 * is LICENSE-p5.FIP.txt, beside this file): a step on Rec. 709 luma, the
 * alpha kept. Changed here: unpremultiplied first, so a soft edge is judged
 * by its colour and not darkened by its coverage.
 */
export default {
  id: 'threshold',
  label: 'threshold',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    level: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'level' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { level: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  return premul(vec4f(vec3f(step(params.level, luma(c.rgb))), c.a));
}`,
    uniforms: v => [v.level],
  }],
};
