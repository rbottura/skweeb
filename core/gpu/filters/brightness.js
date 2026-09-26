/**
 * brightness — every colour lighter or darker by the same amount.
 *
 * Written for skweeb: the textbook formula, no outside code. The colour is
 * unpremultiplied first, so on a sprite's soft edge the colour moves and the
 * alpha does not.
 */
export default {
  id: 'brightness',
  label: 'brightness',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    amount: { type: 'range', min: -1, max: 1, step: 0.01, default: 0, label: 'amount' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  return premul(vec4f(clamp(c.rgb + params.amount, vec3f(0.0), vec3f(1.0)), c.a));
}`,
    uniforms: v => [v.amount],
  }],
};
