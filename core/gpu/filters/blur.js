/**
 * blur — a Gaussian blur, in two passes: across, then down.
 *
 * Written for skweeb: the textbook separable Gaussian, no outside code. Two
 * passes of 2n+1 taps instead of one of (2n+1)², which is what keeps a blur
 * affordable at print scale, where its radius doubles with the picture.
 *
 * `radius` is the standard deviation in the source's pixels, as CSS's
 * blur() means it; taps reach three of them. It works on premultiplied
 * colour, never unpremultiplied — a transparent neighbour then adds nothing,
 * and a sprite's edge fades out instead of going dark.
 */

const MAX_TAPS = 512;            // a side; past it a blur wants a smaller picture first

const across = (dx, dy) => ({
  code: /* wgsl */ `
struct Params { dx: f32, dy: f32, sigma: f32, taps: f32 }
fn fx(uv: vec2f) -> vec4f {
  let n = i32(params.taps);
  if (n < 1) { return tex(uv); }
  let dir = vec2f(params.dx, params.dy) * frame.texel;
  let k = -0.5 / (params.sigma * params.sigma);
  var sum = vec4f(0.0);
  var total = 0.0;
  for (var i = -n; i <= n; i++) {
    let w = exp(f32(i * i) * k);
    sum += tex(uv + dir * f32(i)) * w;
    total += w;
  }
  return sum / total;
}`,
  uniforms: (v, info) => {
    const sigma = v.radius * info.scale;
    return [dx, dy, sigma, Math.min(MAX_TAPS, Math.ceil(3 * sigma))];
  },
});

export default {
  id: 'blur',
  label: 'gaussian blur',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    radius: { type: 'range', min: 0, max: 64, step: 0.5, default: 4, label: 'radius' },
  },
  /** As far as its taps: three deviations, in the source's pixels. */
  reach: v => 3 * v.radius,
  passes: [across(1, 0), across(0, 1)],
};
