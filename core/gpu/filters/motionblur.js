/**
 * motion blur — the picture smeared along one direction, as a thing moving
 * past a slow shutter.
 *
 * Adapted from p5.FIP's `motionBlur` (MIT, © 2024 Darragh Nolan — the notice
 * is LICENSE-p5.FIP.txt, beside this file): an average of samples along a
 * line. Changed here: p5.FIP took ten fixed steps down one diagonal behind the
 * pixel; this smears `length` pixels at any `angle`, centred on the pixel, in
 * steps of no more than a pixel, on premultiplied colour so a sprite's trail
 * fades out rather than darkening, its length following the print scale.
 *
 * Reaches half its length past the edge, the trail on each side.
 */
export default {
  id: 'motionblur',
  label: 'motion blur',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    length: { type: 'range', min: 0, max: 64, step: 0.5, default: 8, label: 'length' },
    angle:  { type: 'range', min: 0, max: 360, step: 1, default: 0, label: 'angle °' },
  },
  reach: v => v.length / 2,
  passes: [{
    code: /* wgsl */ `
struct Params { dx: f32, dy: f32, taps: f32 }
fn fx(uv: vec2f) -> vec4f {
  let n = i32(params.taps);
  if (n < 1) { return tex(uv); }
  let dir = vec2f(params.dx, params.dy) * frame.texel;
  var sum = vec4f(0.0);
  for (var i = -n; i <= n; i++) { sum += tex(uv + dir * f32(i)); }
  return sum / f32(2 * n + 1);
}`,
    uniforms: (v, info) => {
      const half = (v.length * info.scale) / 2;
      const taps = Math.min(256, Math.ceil(half));
      const step = taps ? half / taps : 0;
      const a = (v.angle * Math.PI) / 180;
      return [Math.cos(a) * step, Math.sin(a) * step, taps];
    },
  }],
};
