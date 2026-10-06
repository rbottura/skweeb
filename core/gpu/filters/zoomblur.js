/**
 * zoom blur — the picture streaked away from a point, as a camera zooming
 * while the shutter is open.
 *
 * Adapted from glfx.js's `zoomBlur` (MIT, © 2011 Evan Wallace — the notice is
 * LICENSE-glfx.txt, beside this file): forty-one lookups from each pixel
 * towards the centre, weighted by a parabola, their start offset per pixel
 * to hide the steps. Kept, on the premultiplied colour the kit always has.
 * Changed here: glfx drew its offset from a hash meant to look random; this
 * one is fixed per pixel, needing no seed, so the blur is the same every time
 * whatever the recipe's seed. The centre is where in the picture, 0 to 1.
 */
export default {
  id: 'zoomblur',
  label: 'zoom blur',
  source: 'https://github.com/evanw/glfx.js',
  licence: 'MIT',
  copyright: 'Copyright (C) 2011 by Evan Wallace',
  notice: 'LICENSE-glfx.txt',
  reads: () => Infinity,              // toward the middle, from anywhere on the picture
  params: {
    strength: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, label: 'strength' },
    x:        { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'centre x' },
    y:        { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'centre y' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { cx: f32, cy: f32, strength: f32 }
fn fx(uv: vec2f) -> vec4f {
  let px = vec2i(uv * frame.size);
  let offset = f32(pcg(pcg(u32(px.x)) ^ u32(px.y))) / 4294967295.0;
  let toward = vec2f(params.cx, params.cy) - uv;
  var sum = vec4f(0.0);
  var total = 0.0;
  for (var t = 0; t <= 40; t++) {
    let k = (f32(t) + offset) / 40.0;
    let w = 4.0 * (k - k * k);
    sum += tex(uv + toward * k * params.strength) * w;
    total += w;
  }
  return sum / total;
}`,
    uniforms: v => [v.x, v.y, v.strength],
  }],
};
