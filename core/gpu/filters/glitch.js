/**
 * glitch — bands of the picture torn sideways, its colours split.
 *
 * Adapted from p5.FIP's `glitch` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file), which split red, green and blue
 * apart. Kept, as a split to the sides in pixels that follow the print scale;
 * added here: the picture cut into horizontal bands, some of them — `rate` —
 * torn left or right by up to `shift`. Which, and how far, is drawn at
 * random from the recipe's seed (rule 2); moving, it tears again on every
 * frame of a loop and still comes round when the loop does. Coverage is the
 * most of the three colours', so a sprite's split fringes show past it.
 *
 * Reaches as far as it can tear, and split.
 */
export default {
  id: 'glitch',
  label: 'glitch',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  random: true,
  params: {
    shift:  { type: 'range', min: 0, max: 64, step: 1, default: 8, label: 'tear' },
    bands:  { type: 'int', min: 2, max: 64, default: 12, label: 'bands' },
    rate:   { type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, label: 'how many torn' },
    split:  { type: 'range', min: 0, max: 16, step: 0.5, default: 2, label: 'colour split' },
    moving: { type: 'bool', default: true, label: 'new every frame' },
  },
  reach: v => v.shift + v.split,
  passes: [{
    code: /* wgsl */ `
struct Params { shift: f32, bands: f32, rate: f32, split: f32, moving: f32 }
fn fx(uv: vec2f) -> vec4f {
  let band = i32(floor(uv.y * params.bands));
  let salt = select(0u, frame.tick * 2654435761u + 1u, params.moving > 0.5);
  let torn = randAt(vec2i(band, 0), salt) < params.rate;
  let dx = select(0.0, (randAt(vec2i(band, 1), salt) - 0.5) * 2.0 * params.shift, torn);
  let at = uv + vec2f(dx * frame.texel.x, 0.0);
  let d = vec2f(params.split * frame.texel.x, 0.0);
  let red = tex(at + d);
  let mid = tex(at);
  let blue = tex(at - d);
  return vec4f(red.r, mid.g, blue.b, max(mid.a, max(red.a, blue.a)));
}`,
    uniforms: (v, info) => [v.shift * info.scale, v.bands, v.rate, v.split * info.scale, v.moving ? 1 : 0],
  }],
};
