/**
 * CRT — an old screen: dark scanlines, and the colours not quite on top of
 * one another.
 *
 * Adapted from p5.FIP's `crt` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file): scanlines from a wave down the
 * picture, and red and blue sampled a little to the side. Changed here: the
 * lines hold still — p5.FIP rolled them on the clock, and a loop that rolls
 * on the clock does not close; their spacing and darkness and the colours'
 * split are params, in pixels that follow the print scale; the alpha is
 * kept, where p5.FIP made every pixel opaque.
 *
 * Reaches as far as its colours split.
 */
export default {
  id: 'crt',
  label: 'CRT',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    lines:    { type: 'range', min: 2, max: 12, step: 0.5, default: 3, label: 'a line every' },
    darkness: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.35, label: 'darkness' },
    split:    { type: 'range', min: 0, max: 8, step: 0.5, default: 1, label: 'colour split' },
  },
  reach: v => v.split,
  passes: [{
    code: /* wgsl */ `
struct Params { lines: f32, darkness: f32, split: f32 }
fn fx(uv: vec2f) -> vec4f {
  let d = vec2f(params.split * frame.texel.x, 0.0);
  let red = tex(uv + d);
  let mid = tex(uv);
  let blue = tex(uv - d);
  let wave = 0.5 + 0.5 * cos(6.2831853 * uv.y * frame.size.y / params.lines);
  let shade = 1.0 - params.darkness * smoothstep(0.3, 0.7, wave);
  return vec4f(vec3f(red.r, mid.g, blue.b) * shade, max(mid.a, max(red.a, blue.a)));
}`,
    uniforms: (v, info) => [v.lines * info.scale, v.darkness, v.split * info.scale],
  }],
};
