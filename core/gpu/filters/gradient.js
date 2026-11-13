/**
 * gradient — a generator: dark to light along the picture, out from a point,
 * or round one.
 *
 * Written for skweeb, every editor's three ramps; no outside code. *Along*
 * runs from one edge of the picture to the other at its angle; *round* from
 * its centre out, light at half the picture's shorter side; *about* turns
 * round its centre from its angle, clockwise. Repeated, it is bands, rings,
 * rays; *there and back* makes each repeat a ridge instead of a step. And
 * scrolled by whole repeats in a loop it ends where it began (meet.js, the
 * phase): rings leaving a centre, rays turning.
 *
 * In units of the picture's shorter side, so a ring is round on any format
 * and a print scale changes nothing.
 */

import { MEET, MEET_PARAMS, meetUniforms, phaseOf } from './meet.js';

const KINDS = ['along', 'round', 'about'];

export default {
  id: 'gradient',
  label: 'gradient',
  source: 'skweeb',
  licence: 'MIT',
  generates: true,
  params: {
    kind:    { type: 'enum', options: KINDS, default: 'along', display: 'chips', label: 'kind' },
    angle:   { type: 'range', min: 0, max: 360, step: 1, default: 0, label: 'angle' },
    x:       { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'centre x' },
    y:       { type: 'range', min: 0, max: 1, step: 0.01, default: 0.5, label: 'centre y' },
    repeats: { type: 'int', min: 1, max: 32, default: 1, label: 'repeats' },
    mirror:  { type: 'bool', default: false, label: 'there and back' },
    flip:    { type: 'bool', default: false, label: 'light to dark' },
    scroll:  { type: 'int', min: -8, max: 8, default: 0, label: 'scroll, repeats a loop' },
    ...MEET_PARAMS,
  },
  passes: [{
    code: MEET + /* wgsl */ `
struct Params { kind: f32, angle: f32, x: f32, y: f32, repeats: f32, mirror: f32, flip: f32, scroll: f32, phase: f32, blend: f32, amount: f32 }
fn fx(uv: vec2f) -> vec4f {
  let unit = min(frame.size.x, frame.size.y);
  let p = (uv - vec2f(params.x, params.y)) * frame.size / unit;
  var t = 0.0;
  if (params.kind < 0.5) {
    // Along: edge to edge of the picture, whatever the angle.
    let dir = vec2f(cos(params.angle), sin(params.angle));
    let span = (abs(dir.x) * frame.size.x + abs(dir.y) * frame.size.y) / unit;
    t = dot((uv - vec2f(0.5)) * frame.size / unit, dir) / span + 0.5;
  } else if (params.kind < 1.5) {
    t = length(p) * 2.0;
  } else {
    t = fract((atan2(p.y, p.x) - params.angle) / 6.28318531 + 2.0);
  }
  t = t * params.repeats - params.scroll * params.phase;
  // One ramp that holds still stops at its ends; anything else comes round.
  let wraps = params.repeats > 1.5 || abs(params.scroll) > 0.5 || params.kind > 1.5;
  var v = select(clamp(t, 0.0, 1.0), fract(t), wraps);
  if (params.mirror > 0.5) { v = 1.0 - abs(2.0 * v - 1.0); }
  if (params.flip > 0.5) { v = 1.0 - v; }
  return meet(tex(uv), v, params.blend, params.amount);
}`,
    uniforms: (v, info) => [Math.max(0, KINDS.indexOf(v.kind)), v.angle * Math.PI / 180, v.x, v.y, v.repeats,
      v.mirror ? 1 : 0, v.flip ? 1 : 0, v.scroll, phaseOf(info), ...meetUniforms(v)],
  }],
};
