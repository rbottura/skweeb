/**
 * palette lock — every pixel to the nearest colour of a palette.
 *
 * Written for skweeb, no outside code. Nearest as the eye judges it: the
 * distance is taken in OKLab (core/gpu/wgsl.js), not in RGB, where a dark
 * blue and a dark green sit closer than they look. A sprite's alpha is kept;
 * a clear pixel stays clear. Up to 32 colours. When the suite has a `palette`
 * type (docs/roadmap.md), this takes one; until then the palette is a list of
 * colours here, four greens of an old handheld to start.
 */

/** '#rrggbb' as three numbers in [0, 1]; anything else is black. */
const rgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const MAX = 32;

export default {
  id: 'palette',
  label: 'palette lock',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    colours: { type: 'color[]', default: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'], label: 'palette' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { count: f32, pad0: f32, pad1: f32, pad2: f32, colours: array<vec4f, ${MAX}> }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let n = i32(params.count);
  if (c.a <= 0.0 || n < 1) { return tex(uv); }
  let want = oklab(c.rgb);
  var best = params.colours[0].rgb;
  var nearest = 1e9;
  for (var i = 0; i < n; i++) {
    let p = params.colours[i].rgb;
    let d = distance(oklab(p), want);
    if (d < nearest) { nearest = d; best = p; }
  }
  return premul(vec4f(best, c.a));
}`,
    uniforms: v => {
      const list = (v.colours || []).slice(0, MAX).map(rgb);
      const out = [list.length, 0, 0, 0];
      for (let i = 0; i < MAX; i++) out.push(...(list[i] || [0, 0, 0]), 0);
      return out;
    },
  }],
};
