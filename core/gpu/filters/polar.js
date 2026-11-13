/**
 * polar — what is under, wound round a point: its width becomes the way
 * round, its height the way out.
 *
 * Written for skweeb, the change of coordinates every editor has; no
 * outside code. The picture's top edge lands on the centre and its bottom
 * on a circle `size` of the shorter side across; left to right goes once
 * round, or `repeats` times. So a noise scrolling down becomes rings
 * leaving a centre, one scrolling across turns about it, and `twist` leans
 * the spokes into a vortex. Past the circle there is nothing.
 *
 * What is under should tile across, as the kit's noise does, or the place
 * where the round closes shows. It reads from anywhere, so a print draws it
 * whole (`reads`).
 */

export default {
  id: 'polar',
  label: 'polar',
  source: 'skweeb',
  licence: 'MIT',
  reads: () => Infinity,
  params: {
    size:    { type: 'range', min: 0.05, max: 2, step: 0.01, default: 1, label: 'size' },
    repeats: { type: 'int', min: 1, max: 16, default: 1, label: 'times round' },
    twist:   { type: 'range', min: -4, max: 4, step: 0.05, default: 0, label: 'twist, turns' },
    turn:    { type: 'range', min: 0, max: 360, step: 1, default: 0, label: 'turned' },
    x:       { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'centre x' },
    y:       { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'centre y' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { size: f32, repeats: f32, twist: f32, turn: f32, x: f32, y: f32 }
fn fx(uv: vec2f) -> vec4f {
  let side = min(frame.size.x, frame.size.y);
  let d = (uv - vec2f(params.x, params.y)) * frame.size / (0.5 * side * params.size);
  let r = length(d);
  let round = atan2(d.y, d.x) / 6.28318530718 - params.turn / 360.0 + params.twist * r;
  // Half a texel in from each side, so the round closes on the picture's own edges.
  let u = fract(round * params.repeats);
  let c = tex(vec2f(mix(0.5 * frame.texel.x, 1.0 - 0.5 * frame.texel.x, u), min(r, 1.0)));
  return c * step(r, 1.0);
}`,
    uniforms: v => [v.size, v.repeats, v.twist, v.turn, v.x, v.y],
  }],
};
