/**
 * dots — the picture as a grid of round dots, each its cell's colour.
 *
 * Adapted from p5.FIP's `dot` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file): a disc in each cell, coloured by the
 * picture there. Changed here: the colour from the cell's centre rather than
 * its corner; the disc's size a share of the cell, its edge soft over a
 * pixel; its coverage the picture's too, so a sprite's dots stop where it
 * does; the cell in pixels, following the print scale.
 */
export default {
  id: 'dots',
  label: 'dots',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  reads: v => v.cell,                 // its cell's middle
  params: {
    cell: { type: 'range', min: 2, max: 64, step: 1, default: 8, label: 'cell' },
    size: { type: 'range', min: 0.1, max: 1.4, step: 0.05, default: 0.9, label: 'dot size' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { cell: f32, size: f32 }
fn fx(uv: vec2f) -> vec4f {
  let p = uv * frame.size;
  let centre = (floor(p / params.cell) + 0.5) * params.cell;
  let cover = clamp(0.5 * params.cell * params.size - distance(p, centre) + 0.5, 0.0, 1.0);
  return tex(centre * frame.texel) * cover;
}`,
    uniforms: (v, info) => [Math.max(2, v.cell * info.scale), v.size],
  }],
};
