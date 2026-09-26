/**
 * wgsl.js — what every filter pass is written against.
 *
 * A pass is WGSL: a function `fx(uv: vec2f) -> vec4f`, and, when it takes
 * params, a `struct Params` of `f32` fields and nothing else. That one rule
 * keeps packing clear of WGSL's alignment rules — a colour is four f32
 * fields — and tests/gpu-filters.mjs holds every filter to it.
 *
 * Everything else is here, prepended to each pass:
 *
 *   frame      size and texel (1/size) in pixels; scale, the print scale a
 *              size param is multiplied by; time in seconds; seed (rule 2)
 *   src, orig  the previous pass's output, and the chain's source
 *   tex(uv)    src sampled bilinear at any uv. textureSampleLevel, so there
 *              is no uniformity rule to trip on in a loop or a branch
 *   texAt(px)  one texel of src, exactly, clamped to the edge
 *   unpremul, premul
 *              textures hold premultiplied alpha, as a canvas does: a colour
 *              adjustment unpremultiplies first, a blur never does — that is
 *              what keeps a sprite's edge from going dark
 *   luma       Rec. 709
 *   rand(px)   a hash of a pixel and the seed, in [0, 1]
 *
 * WGSL reserves many words a pass might reach for — `filter`, `pass`,
 * `target`, `type`, `module`, `set` among them — hence `fx`.
 */

export const PRELUDE = /* wgsl */ `
struct Frame {
  size: vec2f,
  texel: vec2f,
  scale: f32,
  time: f32,
  seed: u32,
  pad: u32,
}

@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var src: texture_2d<f32>;
@group(0) @binding(4) var orig: texture_2d<f32>;

struct Vary {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
}

// One triangle over the whole target: (0,0) (2,0) (0,2), uv from the top left.
@vertex fn vs_main(@builtin(vertex_index) i: u32) -> Vary {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
  var v: Vary;
  v.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
  v.uv = vec2f(p.x, 1.0 - p.y);
  return v;
}

@fragment fn fs_main(v: Vary) -> @location(0) vec4f {
  return fx(v.uv);
}

fn tex(uv: vec2f) -> vec4f {
  return textureSampleLevel(src, samp, uv, 0.0);
}

fn texAt(px: vec2i) -> vec4f {
  let last = vec2i(textureDimensions(src)) - vec2i(1);
  return textureLoad(src, clamp(px, vec2i(0), last), 0);
}

fn unpremul(c: vec4f) -> vec4f {
  if (c.a <= 0.0) { return vec4f(0.0); }
  return vec4f(c.rgb / c.a, c.a);
}

fn premul(c: vec4f) -> vec4f {
  return vec4f(c.rgb * c.a, c.a);
}

fn luma(rgb: vec3f) -> f32 {
  return dot(rgb, vec3f(0.2126, 0.7152, 0.0722));
}

fn pcg(n: u32) -> u32 {
  let s = n * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}

fn rand(px: vec2i) -> f32 {
  return f32(pcg(pcg(u32(px.x) ^ frame.seed) ^ u32(px.y))) / 4294967295.0;
}
`;

/** How many lines the prelude adds, so an error can name the pass's own line. */
export const PRELUDE_LINES = PRELUDE.split('\n').length - 1;

const PARAMS = '@group(0) @binding(3) var<uniform> params: Params;\n';

/** The whole module for one pass: the prelude, then the pass. */
export function moduleFor(pass) {
  return PRELUDE + (pass.uniforms ? PARAMS : '') + pass.code;
}

/** The last pass of every run: the result, into the canvas it is handed back in. */
export const PRESENT = { code: 'fn fx(uv: vec2f) -> vec4f { return tex(uv); }' };
