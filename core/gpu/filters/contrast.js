/**
 * contrast — colours pushed away from middle grey, or pulled towards it.
 *
 * Written for skweeb: the textbook formula, no outside code. 1 changes
 * nothing, 0 is flat grey. Unpremultiplied first, as brightness is.
 */
export default {
  id: 'contrast',
  label: 'contrast',
  source: 'skweeb',
  licence: 'MIT',
  params: {
    amount: { type: 'range', min: 0, max: 3, step: 0.01, default: 1, label: 'amount' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  let c = unpremul(tex(uv));
  let rgb = (c.rgb - 0.5) * params.amount + 0.5;
  return premul(vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), c.a));
}`,
    uniforms: v => [v.amount],
  }],
};
