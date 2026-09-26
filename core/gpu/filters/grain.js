/**
 * grain — film grain: every pixel a little lighter or darker, at random.
 *
 * Written for skweeb: no outside code. The first filter that draws at random,
 * so it draws from the recipe's seed (rule 2, `rand` in core/gpu/wgsl.js) and
 * never from the clock: the same seed, the same grain, every time. Moving, it
 * is new on every frame of a loop — mixed with the frame's tick — and still
 * comes round when the loop does. In grey or in colour; its size in pixels,
 * following the print scale. The alpha is kept.
 */
export default {
  id: 'grain',
  label: 'grain',
  source: 'skweeb',
  licence: 'MIT',
  random: true,
  params: {
    amount: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.15, label: 'amount' },
    size:   { type: 'range', min: 1, max: 8, step: 1, default: 1, label: 'grain' },
    colour: { type: 'bool', default: false, label: 'in colour' },
    moving: { type: 'bool', default: true, label: 'new every frame' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { amount: f32, size: f32, colour: f32, moving: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let cell = vec2i(floor(uv * frame.size / params.size));
  let salt = select(0u, frame.tick * 2654435761u + 1u, params.moving > 0.5);
  let n = randAt(cell, salt) - 0.5;
  var noise = vec3f(n);
  if (params.colour > 0.5) {
    noise = vec3f(n, randAt(cell, salt ^ 0x68bc21u) - 0.5, randAt(cell, salt ^ 0x2e5be93u) - 0.5);
  }
  return premul(vec4f(clamp(c.rgb + noise * params.amount, vec3f(0.0), vec3f(1.0)), c.a));
}`,
    uniforms: (v, info) => [v.amount, Math.max(1, Math.round(v.size * info.scale)), v.colour ? 1 : 0, v.moving ? 1 : 0],
  }],
};
