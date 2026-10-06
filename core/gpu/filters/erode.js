/**
 * erode — every pixel the darkest, least covered of those within a radius:
 * a sprite shrinks, dark spreads into light.
 *
 * Adapted from p5.FIP's `erosion` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file): the least among a pixel's
 * neighbours. Changed here: p5.FIP took the least of a grey and so lost the
 * colour; this takes the least of each channel, in a disc of `radius` as far
 * as the print scale, on premultiplied colour, which a least keeps valid.
 */
export default {
  id: 'erode',
  label: 'erode',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  reads: v => v.radius,               // shrinks, so it spreads nowhere, but reads its radius
  params: {
    radius: { type: 'range', min: 0.5, max: 16, step: 0.5, default: 1, label: 'radius' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { radius: f32 }
fn fx(uv: vec2f) -> vec4f {
  let px = vec2i(uv * frame.size);
  let n = i32(ceil(params.radius));
  let r2 = params.radius * params.radius + 0.5;
  var least = texAt(px);
  for (var dy = -n; dy <= n; dy++) {
    for (var dx = -n; dx <= n; dx++) {
      if (f32(dx * dx + dy * dy) <= r2) { least = min(least, texAt(px + vec2i(dx, dy))); }
    }
  }
  return least;
}`,
    uniforms: (v, info) => [v.radius * info.scale],
  }],
};
