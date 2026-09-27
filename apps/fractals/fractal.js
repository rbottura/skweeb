/**
 * fractal.js — escape time: the Mandelbrot set and its Julia sets, as a
 * pure function of their params, drawn on the GPU kit.
 *
 * M7's first brick (docs/roadmap.md, M7). A point `c` of the plane is
 * iterated `z ← z² + c` from `z = 0` — the Mandelbrot set — or a point `z`
 * is iterated with one fixed `c` — the Julia set of that `c`. The count
 * until `|z|` passes 256 colours it, smoothed by how far past it went
 * (`n + 1 − log₂ ln |z|`), through a ramp of colours that comes round every
 * `cycle` iterations, turned by `phase`; a point that never leaves in
 * `iterations` is inside, and takes the inside's colour.
 *
 * ── The plane ──────────────────────────────────────────────────────────────
 *
 * `cx`, `cy` is the point at the picture's centre, the imaginary axis up;
 * the picture's height spans `SPAN / zoom` of the plane, its width as much
 * more as it is wider. So the picture is the same at any size in pixels —
 * print scale is exact — and a mapping, not a canvas, is what the pointer
 * and the tests hold (`planeAt`, `zoomAbout`).
 *
 * The GPU works in 32-bit floats: past a zoom of about 10⁴–10⁵ the picture
 * blocks up into flat squares. Deeper is a later brick.
 *
 * ── The pass ───────────────────────────────────────────────────────────────
 *
 * A filter-shaped pass (core/gpu/wgsl.js) that reads nothing: run over a
 * blank picture of the size wanted, it writes every pixel from `uv` alone.
 * It rides the kit — one device, the compile errors named by line — as a
 * chain entry that carries its own filter (core/gpu/runner.js), and is no
 * filter in filter's catalogue.
 */

/** The plane's height, in its own units, that the picture shows at zoom 1: −1.5 to 1.5. */
export const SPAN = 3;
const BAILOUT = 256;
export const MAX_STOPS = 16;

/** The params that make the picture, for the app's schema and the pass alike. */
export const FRACTAL_PARAMS = {
  kind: { type: 'enum', options: ['mandelbrot', 'julia'], default: 'mandelbrot', display: 'chips',
          label: 'set', group: 'fractal' },
  cx:   { type: 'range', min: -4, max: 4, step: 'any', default: -0.6, label: 'centre x', group: 'fractal' },
  cy:   { type: 'range', min: -4, max: 4, step: 'any', default: 0, label: 'centre y', group: 'fractal' },
  zoom: { type: 'range', min: 0.1, max: 1000000, step: 'any', default: 1, label: 'zoom', group: 'fractal' },
  iterations: { type: 'int', min: 8, max: 5000, default: 200, label: 'iterations', group: 'fractal' },
  /** The Julia set's `c`: the Mandelbrot point it belongs to. */
  jx:   { type: 'range', min: -2, max: 2, step: 'any', default: -0.8, label: 'julia c x', group: 'fractal',
          when: { kind: 'julia' } },
  jy:   { type: 'range', min: -2, max: 2, step: 'any', default: 0.156, label: 'julia c y', group: 'fractal',
          when: { kind: 'julia' } },

  colours: { type: 'color[]', default: ['#0b1d51', '#2a62d8', '#fffdf6', '#ffd60a', '#d8342a', '#1b1464'],
             label: 'ramp, round', group: 'colour' },
  /** Iterations for one turn of the ramp: fewer, the bands come closer. */
  cycle:  { type: 'range', min: 1, max: 1000, step: 0.5, default: 48, label: 'iterations a turn', group: 'colour' },
  /** Where on the ramp the count starts: turned round the whole way, the same picture — a loop. */
  phase:  { type: 'range', min: 0, max: 1, step: 0.001, default: 0, label: 'phase', group: 'colour' },
  inside: { type: 'color', default: '#111111', label: 'inside', group: 'colour' },
};

/** '#rrggbb' as three numbers in [0, 1]; anything else is black. */
const rgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * The point of the plane under a pixel of a `w` × `h` picture — its centre
 * at the picture's, the imaginary axis up.
 *
 * @returns {[number, number]}
 */
export function planeAt(v, w, h, px, py) {
  const unit = SPAN / v.zoom / h;                // plane units a pixel
  return [v.cx + (px - w / 2) * unit, v.cy - (py - h / 2) * unit];
}

/**
 * The view zoomed by `factor` about a pixel, which keeps the point under it:
 * the pointer's place on the plane is the same before and after.
 *
 * @returns {{cx: number, cy: number, zoom: number}}
 */
export function zoomAbout(v, w, h, px, py, factor) {
  const [x, y] = planeAt(v, w, h, px, py);
  const zoom = v.zoom * factor;
  return { cx: x - (x - v.cx) / factor, cy: y - (y - v.cy) / factor, zoom };
}

/**
 * How many iterations a point takes to leave — the pass's loop, in doubles:
 * `iterations` for a point that never does. What the checks hold the GPU's
 * picture to, away from the set's edge where 32 bits and 64 could differ.
 */
export function escape(v, x, y) {
  let zx = 0, zy = 0, cx = x, cy = y;
  if (v.kind === 'julia') { zx = x; zy = y; cx = v.jx; cy = v.jy; }
  for (let i = 0; i < v.iterations; i++) {
    const nx = zx * zx - zy * zy + cx;
    zy = 2 * zx * zy + cy;
    zx = nx;
    if (zx * zx + zy * zy > BAILOUT * BAILOUT) return i;
  }
  return v.iterations;
}

/** The pass, as a filter the runner takes in a chain entry: `{ filter: FRACTAL, params: values }`. */
export const FRACTAL = {
  id: 'fractal',
  label: 'escape time',
  source: 'skweeb',
  licence: 'MIT',
  params: FRACTAL_PARAMS,
  passes: [{
    code: /* wgsl */ `
struct Params {
  cx: f32, cy: f32, span: f32, iters: f32,
  cycle: f32, phase: f32, count: f32, julia: f32,
  jx: f32, jy: f32, ir: f32, ig: f32,
  ib: f32, pad0: f32, pad1: f32, pad2: f32,
  stops: array<vec4f, ${MAX_STOPS}>,
}

// Round the ramp: past the last colour it runs back into the first.
fn ramp(t: f32) -> vec3f {
  let n = i32(params.count);
  if (n < 2) { return params.stops[0].rgb; }
  let x = fract(t) * f32(n);
  let i = i32(floor(x)) % n;
  return mix(params.stops[i].rgb, params.stops[(i + 1) % n].rgb, x - floor(x));
}

fn fx(uv: vec2f) -> vec4f {
  let aspect = frame.size.x / frame.size.y;
  let p = vec2f(params.cx + (uv.x - 0.5) * params.span * aspect, params.cy + (0.5 - uv.y) * params.span);
  var z = vec2f(0.0);
  var c = p;
  if (params.julia > 0.5) { z = p; c = vec2f(params.jx, params.jy); }
  let n = u32(params.iters);
  var i = 0u;
  loop {
    if (i >= n) { break; }
    z = vec2f(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > ${BAILOUT * BAILOUT}.0) { break; }
    i = i + 1u;
  }
  if (i >= n) { return vec4f(params.ir, params.ig, params.ib, 1.0); }
  let nu = f32(i) + 1.0 - log2(0.5 * log(dot(z, z)));
  return vec4f(ramp(nu / params.cycle + params.phase), 1.0);
}`,
    uniforms: v => {
      const list = (v.colours || []).slice(0, MAX_STOPS).map(rgb);
      const [ir, ig, ib] = rgb(v.inside);
      const out = [v.cx, v.cy, SPAN / v.zoom, v.iterations, v.cycle, v.phase, list.length,
                   v.kind === 'julia' ? 1 : 0, v.jx, v.jy, ir, ig, ib, 0, 0, 0];
      for (let i = 0; i < MAX_STOPS; i++) out.push(...(list[i] || [0, 0, 0]), 0);
      return out;
    },
  }],
};
