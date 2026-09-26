/**
 * invert — every colour turned to its opposite.
 *
 * Adapted from p5.FIP's `invertColors` (MIT, © 2024 Darragh Nolan — the
 * notice is LICENSE-p5.FIP.txt, beside this file): one minus the colour, the
 * alpha kept. Changed here: unpremultiplied first, so a sprite's soft edge
 * inverts its colour and not its coverage.
 */
export default {
  id: 'invert',
  label: 'invert',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {},
  passes: [{
    code: /* wgsl */ `
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  return premul(vec4f(1.0 - c.rgb, c.a));
}`,
  }],
};
