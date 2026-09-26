/**
 * edges — white where the picture changes, black where it does not: the
 * Sobel operator, a line drawing of what it is given.
 *
 * Adapted from p5.FIP's `sobelEdgeDetection` (MIT, © 2024 Darragh Nolan — the
 * notice is LICENSE-p5.FIP.txt, beside this file): a gradient's size against
 * a threshold. Changed here: p5.FIP took two central differences; this is
 * the Sobel kernel itself, on brightness and on alpha both, so a dark sprite
 * on nothing still has an outline to find. Everywhere it covered stays
 * covered, and the edge just outside it is drawn too: a sprite comes out a
 * black shape with white lines, on the nothing it was on.
 *
 * Reaches a pixel past the edge, the line round the outside.
 */
export default {
  id: 'edges',
  label: 'edges (sobel)',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  params: {
    level: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.25, label: 'level' },
  },
  reach: () => 1,
  passes: [{
    code: /* wgsl */ `
struct Params { level: f32, gap: f32 }
fn fx(uv: vec2f) -> vec4f {
  var gl = vec2f(0.0);
  var ga = vec2f(0.0);
  for (var j = -1; j <= 1; j++) {
    for (var i = -1; i <= 1; i++) {
      let c = tex(uv + vec2f(f32(i), f32(j)) * frame.texel * params.gap);
      let w = vec2f(f32(i) * f32(2 - j * j), f32(j) * f32(2 - i * i));
      gl += w * luma(c.rgb);
      ga += w * c.a;
    }
  }
  let edge = step(params.level, max(length(gl), length(ga)) / 4.0);
  let a = max(tex(uv).a, edge);
  return vec4f(vec3f(edge), a);
}`,
    uniforms: (v, info) => [v.level, Math.max(1, info.scale)],
  }],
};
