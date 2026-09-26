/**
 * ordered dither — the picture in a few flat levels, the steps between them
 * made of a fixed pattern of dots: Bayer's matrix, the look of old screens
 * and printers.
 *
 * Written for skweeb, the textbook algorithm; no outside code — p5.FIP's
 * `dithering` is noise inside circles, another thing. Each channel, or its
 * grey, is pushed to the nearest of `levels` steps with a threshold from the
 * matrix — 2×2, 4×4 or 8×8 — at the pixel's place in it; `pixel` makes the
 * pattern chunky, following the print scale. The alpha is kept.
 */
export default {
  id: 'dither',
  label: 'ordered dither',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    levels: { type: 'int', min: 2, max: 16, default: 2, label: 'levels' },
    matrix: { type: 'enum', options: ['2', '4', '8'], default: '4', display: 'chips',
              labels: { 2: '2×2', 4: '4×4', 8: '8×8' }, label: 'matrix' },
    size:   { type: 'range', min: 1, max: 8, step: 1, default: 1, label: 'pixel' },
    grey:   { type: 'bool', default: false, label: 'in grey' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { levels: f32, bits: f32, size: f32, grey: f32 }

// Bayer's threshold at a place in the matrix, in (0, 1): built a bit a level,
// the lowest bits of x and y deciding the highest of the index.
fn bayer(p: vec2u, bits: u32) -> f32 {
  var v = 0u;
  for (var i = 0u; i < bits; i++) {
    let xb = (p.x >> i) & 1u;
    let yb = (p.y >> i) & 1u;
    v = (v << 2u) | ((xb ^ yb) << 1u) | yb;
  }
  return (f32(v) + 0.5) / f32(1u << (2u * bits));
}

fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let cell = vec2u(floor(uv * frame.size / params.size));
  let b = bayer(cell, u32(params.bits));
  let l = max(2.0, params.levels) - 1.0;
  var rgb = c.rgb;
  if (params.grey > 0.5) { rgb = vec3f(luma(c.rgb)); }
  let q = clamp(floor(rgb * l + b) / l, vec3f(0.0), vec3f(1.0));
  return premul(vec4f(q, c.a));
}`,
    uniforms: (v, info) => [v.levels, ({ 2: 1, 4: 2, 8: 3 })[v.matrix] || 2,
      Math.max(1, Math.round(v.size * info.scale)), v.grey ? 1 : 0],
  }],
};
