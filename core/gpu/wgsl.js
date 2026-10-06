/**
 * wgsl.js — what every filter pass is written against.
 *
 * A pass is WGSL: a function `fx(uv: vec2f) -> vec4f`, and, when it takes
 * params, a `struct Params` of `f32` fields — and, last, at most one
 * `array<vec4f, N>`, with the f32 fields before it a multiple of four, which
 * is where WGSL's alignment puts it (a palette). That rule keeps packing a
 * flat list of numbers; tests/gpu-filters.mjs holds every filter to it.
 *
 * Everything else is here, prepended to each pass:
 *
 *   frame      size and texel (1/size) in pixels; scale, the print scale a
 *              size param is multiplied by; time in seconds; seed (rule 2);
 *              tick, the frame of a loop — 0 for a still. And where the run
 *              lies in a bigger picture: `origin`, the corner of what is being
 *              drawn, and `here`, its own size — a print's window (core/
 *              print.js). Then `size`, `uv` and every pixel a pass is handed
 *              are the whole picture's, and `tex`, `texAt` and `origAt` read
 *              the window's texture where that point of the picture lies — so
 *              a pass that places anything by position, a vignette's middle,
 *              a halftone's grid, grain's seed, draws its part of the whole
 *              and never a whole of its own. Drawn whole, origin is 0 and
 *              here is size: nothing changes.
 *   src        the previous pass's output
 *   orig       this filter's own input — the picture before its first pass,
 *              what a later pass lays back over (an outline, a shadow)
 *   tex(uv)    src sampled bilinear at any uv. textureSampleLevel, so there
 *              is no uniformity rule to trip on in a loop or a branch
 *   texAt(px)  one texel of src, exactly, clamped to the edge; origAt(px), of orig
 *   oklab(rgb) a colour in OKLab, where distance is how different two
 *              colours look — Björn Ottosson's published matrices
 *   unpremul, premul
 *              textures hold premultiplied alpha, as a canvas does: a colour
 *              adjustment unpremultiplies first, a blur never does — that is
 *              what keeps a sprite's edge from going dark
 *   luma       Rec. 709
 *   rand(px)   a hash of a pixel and the seed, in [0, 1]; randAt(px, salt)
 *              the same with more mixed in — the tick, for grain that moves
 *              and still comes round when the loop does
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
  tick: u32,
  origin: vec2f,
  here: vec2f,
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

// A pass is handed the whole picture's uv: its pixel's middle, moved by the window's corner.
@fragment fn fs_main(v: Vary) -> @location(0) vec4f {
  return fx((v.pos.xy + frame.origin) * frame.texel);
}

fn tex(uv: vec2f) -> vec4f {
  return textureSampleLevel(src, samp, (uv * frame.size - frame.origin) / frame.here, 0.0);
}

fn texAt(px: vec2i) -> vec4f {
  let last = vec2i(textureDimensions(src)) - vec2i(1);
  return textureLoad(src, clamp(px - vec2i(frame.origin), vec2i(0), last), 0);
}

fn origAt(px: vec2i) -> vec4f {
  let last = vec2i(textureDimensions(orig)) - vec2i(1);
  return textureLoad(orig, clamp(px - vec2i(frame.origin), vec2i(0), last), 0);
}

fn oklab(rgb: vec3f) -> vec3f {
  let l = select(pow((rgb + 0.055) / 1.055, vec3f(2.4)), rgb / 12.92, rgb <= vec3f(0.04045));
  let lms = vec3f(
    0.4122214708 * l.r + 0.5363325363 * l.g + 0.0514459929 * l.b,
    0.2119034982 * l.r + 0.6806995451 * l.g + 0.1073969566 * l.b,
    0.0883024619 * l.r + 0.2817188376 * l.g + 0.6299787005 * l.b);
  let q = pow(max(lms, vec3f(1e-9)), vec3f(1.0 / 3.0));
  return vec3f(
    0.2104542553 * q.x + 0.7936177850 * q.y - 0.0040720468 * q.z,
    1.9779984951 * q.x - 2.4285922050 * q.y + 0.4505937099 * q.z,
    0.0259040371 * q.x + 0.7827717662 * q.y - 0.8086757660 * q.z);
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

fn randAt(px: vec2i, salt: u32) -> f32 {
  return f32(pcg(pcg(pcg(u32(px.x) ^ frame.seed) ^ u32(px.y)) ^ salt)) / 4294967295.0;
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
