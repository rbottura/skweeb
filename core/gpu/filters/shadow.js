/**
 * drop shadow — the sprite's shape, moved, softened and coloured, behind it.
 *
 * Written for skweeb, no outside code. The sprite's alpha taken from where the
 * shadow falls (`x`, `y`, in the source's pixels), blurred as the gaussian
 * blur is — across, then down — in two passes; then the shadow is coloured,
 * faded to its opacity, and the sprite laid back over it (`orig`).
 *
 * Reaches as far as it is moved, and three deviations more for its softness.
 */

/** '#rrggbb' as three numbers in [0, 1]; anything else is black. */
const rgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const MAX_TAPS = 512;

/** The blur's deviation and taps, in pixels at this scale. */
const soft = (v, info) => {
  const sigma = v.softness * info.scale;
  return [sigma, Math.min(MAX_TAPS, Math.ceil(3 * sigma))];
};

export default {
  id: 'shadow',
  label: 'drop shadow',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    x:        { type: 'int', min: -64, max: 64, default: 4, label: 'x' },
    y:        { type: 'int', min: -64, max: 64, default: 4, label: 'y' },
    softness: { type: 'range', min: 0, max: 32, step: 0.5, default: 2, label: 'softness' },
    colour:   { type: 'color', default: '#000000', label: 'colour' },
    opacity:  { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'opacity' },
  },
  reach: v => Math.max(Math.abs(v.x), Math.abs(v.y)) + 3 * v.softness,
  passes: [
    {
      // Across: the alpha from where the shadow is cast, blurred along the row.
      code: /* wgsl */ `
struct Params { dx: f32, dy: f32, sigma: f32, taps: f32 }
fn fx(uv: vec2f) -> vec4f {
  let at = uv - vec2f(params.dx, params.dy) * frame.texel;
  let n = i32(params.taps);
  if (n < 1) { return vec4f(tex(at).a, 0.0, 0.0, 1.0); }
  let k = -0.5 / (params.sigma * params.sigma);
  var sum = 0.0;
  var total = 0.0;
  for (var i = -n; i <= n; i++) {
    let w = exp(f32(i * i) * k);
    sum += tex(at + vec2f(f32(i) * frame.texel.x, 0.0)).a * w;
    total += w;
  }
  return vec4f(sum / total, 0.0, 0.0, 1.0);
}`,
      uniforms: (v, info) => [v.x * info.scale, v.y * info.scale, ...soft(v, info)],
    },
    {
      // Down: the rest of the blur, the colour, and the sprite over its shadow.
      code: /* wgsl */ `
struct Params { sigma: f32, taps: f32, r: f32, g: f32, b: f32, opacity: f32 }
fn fx(uv: vec2f) -> vec4f {
  let n = i32(params.taps);
  var a = tex(uv).r;
  if (n >= 1) {
    let k = -0.5 / (params.sigma * params.sigma);
    var sum = 0.0;
    var total = 0.0;
    for (var i = -n; i <= n; i++) {
      let w = exp(f32(i * i) * k);
      sum += tex(uv + vec2f(0.0, f32(i) * frame.texel.y)).r * w;
      total += w;
    }
    a = sum / total;
  }
  let shade = vec4f(params.r, params.g, params.b, 1.0) * (a * params.opacity);
  let sprite = origAt(vec2i(uv * frame.size));
  return sprite + shade * (1.0 - sprite.a);
}`,
      uniforms: (v, info) => [...soft(v, info), ...rgb(v.colour), v.opacity],
    },
  ],
};
