/**
 * posterize — each channel in a few flat steps, black to full.
 *
 * Adapted from p5.FIP's `quantization` (MIT, © 2024 Darragh Nolan — the
 * notice is LICENSE-p5.FIP.txt, beside this file): `floor(c * shades) /
 * (shades - 1)`. Changed here: that sends full white one step past 1, so the
 * top bin is held to the last step — `shades` equal bins, landing on exactly
 * `shades` levels from 0 to 1 — and the colour is unpremultiplied first.
 */
export default {
  id: 'posterize',
  label: 'posterize',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    shades: { type: 'int', min: 2, max: 32, default: 4, label: 'shades' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { shades: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let s = max(2.0, params.shades);
  let q = min(floor(c.rgb * s), vec3f(s - 1.0)) / (s - 1.0);
  return premul(vec4f(q, c.a));
}`,
    uniforms: v => [v.shades],
  }],
};
