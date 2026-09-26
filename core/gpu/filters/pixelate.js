/**
 * pixelate — the picture in square blocks, each one texel of the source.
 *
 * Written for skweeb, no outside code. Each block takes the one texel at its
 * centre, exactly, rather than an average: a block is always a colour the
 * source had, which is what pixel art and a palette want.
 */
export default {
  id: 'pixelate',
  label: 'pixelate',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    size: { type: 'int', min: 1, max: 256, default: 8, label: 'block' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { size: f32 }
fn fx(uv: vec2f) -> vec4f {
  let b = max(1.0, params.size);
  let cell = floor(uv * frame.size / b);
  return texAt(vec2i(cell * b + floor(b * 0.5)));
}`,
    uniforms: (v, info) => [Math.max(1, Math.round(v.size * info.scale))],
  }],
};
