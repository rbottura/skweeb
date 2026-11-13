/**
 * shape — a generator: a disc, a ring or a star, light inside and dark out.
 *
 * Written for skweeb, from the distance to each shape's edge; no outside
 * code. What a surface is masked by (meet.js, `mask`), or the light of a
 * flash added. Its edge is soft inwards — `soft` of the way to its middle,
 * so a disc all soft is a glow and nothing reaches past its size — and
 * never harder than a pixel and a half.
 *
 * A star's edge is the line from a tip to the notch beside it, folded round
 * its points: its distance is to that line, exact but for a hair at the tips.
 * Its notches as deep as its middle make it a polygon.
 *
 * In units of the picture's shorter side — `size` 1 is as wide as it — so a
 * disc is round on any format and a print scale changes nothing.
 */

import { MEET, MEET_PARAMS, meetUniforms } from './meet.js';

const KINDS = ['disc', 'ring', 'star'];

export default {
  id: 'shape',
  label: 'shape',
  source: 'skweeb',
  licence: 'MIT',
  generates: true,
  params: {
    kind:   { type: 'enum', options: KINDS, default: 'disc', display: 'chips', label: 'kind' },
    size:   { type: 'range', min: 0, max: 2, step: 0.01, default: 0.8, label: 'size' },
    soft:   { type: 'range', min: 0, max: 1, step: 0.01, default: 0.1, label: 'soft edge' },
    width:  { type: 'range', min: 0.01, max: 1, step: 0.01, default: 0.2, label: 'a ring\'s width' },
    points: { type: 'int', min: 3, max: 16, default: 5, label: 'a star\'s points' },
    inner:  { type: 'range', min: 0.05, max: 1, step: 0.01, default: 0.45, label: '…and its notches' },
    turn:   { type: 'range', min: 0, max: 360, step: 1, default: 0, label: 'turned' },
    x:      { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'centre x' },
    y:      { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'centre y' },
    ...MEET_PARAMS,
  },
  passes: [{
    code: MEET + /* wgsl */ `
struct Params { kind: f32, size: f32, soft: f32, width: f32, points: f32, inner: f32, turn: f32, x: f32, y: f32, blend: f32, amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  let unit = min(frame.size.x, frame.size.y);
  let p = (uv - vec2f(params.x, params.y)) * frame.size / unit;
  let r = max(params.size * 0.5, 0.0001);
  let far = length(p);
  var d = far - r;      // a disc: how far past its edge
  var deep = r;         // …and how deep its middle lies
  if (params.kind > 0.5 && params.kind < 1.5) {
    let mid = clamp(params.width, 0.0, 1.0) * r * 0.5;
    d = abs(far - (r - mid)) - mid;
    deep = mid;
  } else if (params.kind > 1.5) {
    // One of its sectors folded onto the first: a tip on the axis, a notch half a sector on. A tip up.
    let sector = 6.28318531 / max(3.0, params.points);
    let a = abs(fract((atan2(p.y, p.x) - params.turn + 1.57079633) / sector + 0.5) - 0.5) * sector;
    let q = far * vec2f(cos(a), sin(a));
    let tip = vec2f(r, 0.0);
    let notch = r * clamp(params.inner, 0.05, 1.0) * vec2f(cos(sector * 0.5), sin(sector * 0.5));
    let edge = notch - tip;
    let away = normalize(vec2f(edge.y, -edge.x));
    d = dot(q - tip, away);
    deep = dot(tip, away);
  }
  let band = max(params.soft * deep, 1.5 / unit);
  let v = smoothstep(0.0, band, -d);
  return meet(tex(uv), v, params.blend, params.amount);
}`,
    uniforms: v => [Math.max(0, KINDS.indexOf(v.kind)), v.size, v.soft, v.width, v.points, v.inner,
      v.turn * Math.PI / 180, v.x, v.y, ...meetUniforms(v)],
  }],
};
