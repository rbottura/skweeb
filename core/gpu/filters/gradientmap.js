/**
 * gradient map — each pixel's brightness looked up on a gradient: the first
 * colour for black, the last for white, the ones between in between.
 *
 * Written for skweeb, the technique every editor has; no outside code. The
 * stops sit evenly along the brightness, dark to light, up to 16; `amount`
 * mixes back towards the picture as it was. Two stops are a duotone, a
 * palette's ramp recolours a sprite in it. The alpha is kept.
 */

/** '#rrggbb' as three numbers in [0, 1]; anything else is black. */
const rgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const MAX = 16;

export default {
  id: 'gradientmap',
  label: 'gradient map',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    colours: { type: 'color[]', default: ['#1b1464', '#c2185b', '#ffd60a', '#fffdf6'], label: 'dark to light' },
    amount:  { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'amount' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { count: f32, amount: f32, pad0: f32, pad1: f32, stops: array<vec4f, ${MAX}> }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let n = i32(params.count);
  if (n < 1) { return tex(uv); }
  var tone = params.stops[0].rgb;
  if (n > 1) {
    let x = clamp(luma(c.rgb), 0.0, 1.0) * f32(n - 1);
    let i = min(i32(floor(x)), n - 2);
    tone = mix(params.stops[i].rgb, params.stops[i + 1].rgb, x - f32(i));
  }
  return premul(vec4f(mix(c.rgb, tone, params.amount), c.a));
}`,
    uniforms: v => {
      const list = (v.colours || []).slice(0, MAX).map(rgb);
      const out = [list.length, v.amount, 0, 0];
      for (let i = 0; i < MAX; i++) out.push(...(list[i] || [0, 0, 0]), 0);
      return out;
    },
  }],
};
