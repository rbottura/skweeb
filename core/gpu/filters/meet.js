/**
 * meet.js — how a generator meets what is under it.
 *
 * A generator is a filter that makes its picture rather than changing one — a
 * noise, a gradient, a shape (docs/vfx.md): a grey, `v` in [0, 1], at every
 * pixel. What it does with the picture it is handed is its `blend`:
 *
 *   replace    the grey, opaque, over everything — a chain's first row
 *   multiply   what is under darkened by it, its coverage kept
 *   mask       what is under kept where it is light and gone where it is
 *              dark, colour and coverage both — how a surface gets its shape
 *   add        its light added: black adds nothing
 *   screen     its light added, never past white
 *
 * `amount` is how much of it: at 0 the picture under is as it was. Pictures
 * are premultiplied (wgsl.js), and every blend here keeps rgb within alpha
 * until light is added past white, which a float texture holds.
 *
 * And the loop's phase, for what moves: `phaseOf(info)`, in [0, 1) — the
 * frame's tick over the loop's length, which a run is told (`frames`,
 * runner.js). What moves by a whole number of its periods in a loop ends
 * where it began. A still, or a run told no length, is at 0.
 *
 * And its age, for what happens once: `ageOf(info)`, in [0, 1] — a *life*,
 * which a run is told it is (`life`), is 0 at its first frame and 1 at its
 * last, where a loop never reaches 1; told no life, the age is the phase.
 *
 * Written for skweeb; the blends are every editor's.
 */

export const BLENDS = ['replace', 'multiply', 'mask', 'add', 'screen'];

/** The two params every generator ends with. */
export const MEET_PARAMS = {
  blend:  { type: 'enum', options: BLENDS, default: 'replace', label: 'over what is under' },
  amount: { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'amount' },
};

/** Their two numbers, the last of a generator's Params: `blend: f32, amount: f32`. */
export const meetUniforms = v => [Math.max(0, BLENDS.indexOf(v.blend)), v.amount];

/** Where a run lies in its loop, in [0, 1): 0 for a still, or where the loop's length is not told. */
export function phaseOf(info) {
  const n = info && info.frames > 1 ? Math.floor(info.frames) : 0;
  return n ? ((((info.tick | 0) % n) + n) % n) / n : 0;
}

/** How old a run is, in [0, 1]: a life's first frame 0 and its last 1; a loop's phase otherwise. */
export function ageOf(info) {
  if (!info || !info.life) return phaseOf(info);
  const n = info.frames > 1 ? Math.floor(info.frames) : 0;
  return n ? Math.min(1, Math.max(0, (info.tick | 0) / (n - 1))) : 0;
}

/** WGSL: `meet(under, v, blend, amount)` — the picture under, the grey, how, how much. */
export const MEET = /* wgsl */ `
fn meet(under: vec4f, v: f32, blend: f32, amount: f32) -> vec4f {
  let g = clamp(v, 0.0, 1.0);
  let k = clamp(amount, 0.0, 1.0);
  if (blend < 0.5) { return mix(under, vec4f(g, g, g, 1.0), k); }
  if (blend < 1.5) { return vec4f(under.rgb * mix(1.0, g, k), under.a); }
  if (blend < 2.5) { return under * mix(1.0, g, k); }
  let light = g * k;
  if (blend < 3.5) { return vec4f(under.rgb + vec3f(light), min(1.0, under.a + light)); }
  return under + vec4f(light) * (vec4f(1.0) - under);
}
`;
