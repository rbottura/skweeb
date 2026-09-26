/**
 * dilate — every pixel the brightest, most covered of those within a radius:
 * a sprite grows, light spreads into dark.
 *
 * Adapted from p5.FIP's `dilate` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file): the most of each channel among a
 * pixel's neighbours. Changed here: its four neighbours are a disc of
 * `radius`, as far as the print scale; on premultiplied colour, which a most
 * of each channel keeps valid.
 *
 * Reaches its radius past the edge.
 */
export default {
  id: 'dilate',
  label: 'dilate',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    radius: { type: 'range', min: 0.5, max: 16, step: 0.5, default: 1, label: 'radius' },
  },
  reach: v => v.radius,
  passes: [{
    code: /* wgsl */ `
struct Params { radius: f32 }
fn fx(uv: vec2f) -> vec4f {
  let px = vec2i(uv * frame.size);
  let n = i32(ceil(params.radius));
  let r2 = params.radius * params.radius + 0.5;
  var most = texAt(px);
  for (var dy = -n; dy <= n; dy++) {
    for (var dx = -n; dx <= n; dx++) {
      if (f32(dx * dx + dy * dy) <= r2) { most = max(most, texAt(px + vec2i(dx, dy))); }
    }
  }
  return most;
}`,
    uniforms: (v, info) => [v.radius * info.scale],
  }],
};
