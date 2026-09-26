/**
 * vignette — the picture darker towards its edges, as an old lens makes it.
 *
 * Adapted from p5.FIP's `vignette` (MIT, © 2024 Darragh Nolan — the notice
 * is LICENSE-p5.FIP.txt, beside this file): a darkening that grows with the
 * distance from the centre. Changed here: one curve — `size`, where it is
 * fully dark by, and `softness`, how far before that it starts — in place of
 * p5.FIP's four; the alpha kept.
 */
export default {
  id: 'vignette',
  label: 'vignette',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    strength: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'strength' },
    size:     { type: 'range', min: 0.2, max: 1.5, step: 0.01, default: 0.9, label: 'size' },
    softness: { type: 'range', min: 0.05, max: 1, step: 0.01, default: 0.5, label: 'softness' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { strength: f32, size: f32, softness: f32 }
fn fx(uv: vec2f) -> vec4f {
  // 0 at the centre, 1 at a corner.
  let d = length(uv - 0.5) * 1.4142136;
  let keep = 1.0 - params.strength * smoothstep(params.size - params.softness, params.size, d);
  let c = tex(uv);
  return vec4f(c.rgb * keep, c.a);
}`,
    uniforms: v => [v.strength, v.size, v.softness],
  }],
};
