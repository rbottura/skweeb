/**
 * saturation — colour pushed towards grey, or away from it.
 *
 * Adapted from p5.FIP's `saturation` (MIT, © 2024 Darragh Nolan — the notice
 * is LICENSE-p5.FIP.txt, beside this file): the colour mixed with its Rec.
 * 709 luma. Changed here: p5.FIP mixed the alpha with the grey too, so a
 * sprite's clear pixels turned grey; this mixes the colour only,
 * unpremultiplied, and holds the result in range above 1.
 */
export default {
  id: 'saturation',
  label: 'saturation',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    amount: { type: 'range', min: 0, max: 3, step: 0.01, default: 1, label: 'amount' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let grey = vec3f(luma(c.rgb));
  return premul(vec4f(clamp(mix(grey, c.rgb, params.amount), vec3f(0.0), vec3f(1.0)), c.a));
}`,
    uniforms: v => [v.amount],
  }],
};
