/**
 * sepia — the picture as an old brown photograph.
 *
 * Adapted from p5.FIP's `sepia` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file), which followed
 * https://stackoverflow.com/questions/36434905: Rec. 601 grey, times 1.2,
 * 0.9 and 0.7. Changed here: unpremultiplied first, and held in range — 1.2
 * of a light grey is past white.
 */
export default {
  id: 'sepia',
  label: 'sepia',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {},
  passes: [{
    code: /* wgsl */ `
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let grey = dot(c.rgb, vec3f(0.299, 0.587, 0.114));
  return premul(vec4f(clamp(grey * vec3f(1.2, 0.9, 0.7), vec3f(0.0), vec3f(1.0)), c.a));
}`,
  }],
};
