/**
 * outline — a line of one colour round a sprite, outside its edge.
 *
 * Written for skweeb, no outside code. How far each pixel is from the
 * sprite's nearest solid pixel — half covered or more — measured exactly, in
 * two passes: the distance transform taken apart, the squared distance along
 * the row first, then down the column. Within `width` of the sprite the line
 * is drawn, its outer edge softened over a pixel; then the sprite is laid
 * back over it (`orig`), so the line only ever shows outside. Corners come out
 * round, as a pen would draw them.
 *
 * Reaches its width past the edge, and a pixel more for the softening.
 */

/** '#rrggbb' as three numbers in [0, 1]; anything else is black. */
const rgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** How far to look, in pixels at this scale. */
const look = (v, info) => Math.ceil((v.width + 1) * info.scale);

export default {
  id: 'outline',
  label: 'outline',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    width:  { type: 'range', min: 0, max: 32, step: 0.5, default: 2, label: 'width' },
    colour: { type: 'color', default: '#111111', label: 'colour' },
  },
  reach: v => v.width + 1,
  passes: [
    {
      // Along the row: the squared distance to the nearest solid pixel, or far.
      code: /* wgsl */ `
struct Params { reach: f32 }
fn fx(uv: vec2f) -> vec4f {
  let px = vec2i(uv * frame.size);
  let n = i32(params.reach);
  var best = 65000.0;
  for (var dx = -n; dx <= n; dx++) {
    if (texAt(px + vec2i(dx, 0)).a >= 0.5) { best = min(best, f32(dx * dx)); }
  }
  return vec4f(best, 0.0, 0.0, 1.0);
}`,
      uniforms: (v, info) => [look(v, info)],
    },
    {
      // Down the column: the true distance, the line it makes, the sprite over it.
      code: /* wgsl */ `
struct Params { reach: f32, width: f32, r: f32, g: f32, b: f32 }
fn fx(uv: vec2f) -> vec4f {
  let px = vec2i(uv * frame.size);
  let n = i32(params.reach);
  var best = 65000.0;
  for (var dy = -n; dy <= n; dy++) {
    best = min(best, texAt(px + vec2i(0, dy)).r + f32(dy * dy));
  }
  let cover = clamp(params.width + 1.0 - sqrt(best), 0.0, 1.0);
  let line = vec4f(params.r, params.g, params.b, 1.0) * cover;
  let sprite = origAt(px);
  return sprite + line * (1.0 - sprite.a);
}`,
      uniforms: (v, info) => [look(v, info), v.width * info.scale, ...rgb(v.colour)],
    },
  ],
};
