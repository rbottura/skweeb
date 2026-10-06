/**
 * emboss — the picture as a grey relief, lit from the top left.
 *
 * Adapted from p5.FIP's `emboss` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file): the difference between the
 * neighbours on either side of a diagonal, around middle grey. Changed here:
 * one grey from the brightness of that difference, where p5.FIP embossed each
 * channel apart and its alpha too; the sprite keeps its own alpha, and its
 * edge against nothing stands up in relief; a `strength`; the neighbours as
 * far as the print scale.
 */
export default {
  id: 'emboss',
  label: 'emboss',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  reads: () => 1,                     // a pixel either side, at any scale
  params: {
    strength: { type: 'range', min: 0, max: 4, step: 0.05, default: 1, label: 'strength' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { strength: f32, gap: f32 }
fn fx(uv: vec2f) -> vec4f {
  let d = frame.texel * params.gap;
  let e = (luma(tex(uv + d).rgb) - luma(tex(uv - d).rgb)) * params.strength;
  let a = tex(uv).a;
  return vec4f(vec3f(clamp(0.5 + e, 0.0, 1.0)) * a, a);
}`,
    uniforms: (v, info) => [v.strength, Math.max(1, info.scale)],
  }],
};
