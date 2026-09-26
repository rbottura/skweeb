/**
 * duotone — the picture in two colours: the dark one where it is dark, the
 * light one where it is light, and their mix between.
 *
 * Adapted from p5.FIP's `duoTone` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file): the two tones mixed by Rec. 601
 * luminance. Changed here: the tones are colour params, picked like any
 * colour in the suite, and the colour is unpremultiplied first.
 */

/** '#rrggbb' as three numbers in [0, 1]; anything else is black. */
const rgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export default {
  id: 'duotone',
  label: 'duotone',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    dark:  { type: 'color', default: '#1b1464', label: 'dark' },
    light: { type: 'color', default: '#ffd60a', label: 'light' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { dr: f32, dg: f32, db: f32, lr: f32, lg: f32, lb: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let t = dot(c.rgb, vec3f(0.299, 0.587, 0.114));
  let tone = mix(vec3f(params.dr, params.dg, params.db), vec3f(params.lr, params.lg, params.lb), t);
  return premul(vec4f(tone, c.a));
}`,
    uniforms: v => [...rgb(v.dark), ...rgb(v.light)],
  }],
};
