/**
 * halftone — the picture as a screen of dots, big where it is dark.
 *
 * Adapted from p5.FIP's `halftone` (MIT, © 2024 Darragh Nolan — the notice is
 * LICENSE-p5.FIP.txt, beside this file): a dot in each cell, its size from
 * how dark the picture is at the cell's centre. Changed here: the screen
 * turns (45°, as print screens do); a dot's area, not its radius, follows the
 * darkness, so a mid grey reads as mid grey; its edge is soft over a pixel;
 * ink and paper are colours — and paper may be none, so a sprite's dots sit
 * on nothing, only where the sprite was; its cell follows the print scale.
 */

/** '#rrggbb' as three numbers in [0, 1]; anything else is black. */
const rgb = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export default {
  id: 'halftone',
  label: 'halftone',
  source: 'https://github.com/prontopablo/p5.FIP',
  licence: 'MIT',
  copyright: 'Copyright (c) 2024 Darragh Nolan',
  notice: 'LICENSE-p5.FIP.txt',
  reads: v => v.cell,                 // its turned cell's middle
  params: {
    cell:  { type: 'range', min: 2, max: 64, step: 1, default: 8, label: 'cell' },
    angle: { type: 'range', min: 0, max: 90, step: 1, default: 45, label: 'angle', unit: '°' },
    ink:   { type: 'color', default: '#111111', label: 'ink' },
    paper: { type: 'ground', default: 'none', label: 'paper' },
  },
  passes: [{
    code: /* wgsl */ `
struct Params { cell: f32, c: f32, s: f32, ir: f32, ig: f32, ib: f32, pr: f32, pg: f32, pb: f32, pa: f32 }
fn fx(uv: vec2f) -> vec4f {
  let p = uv * frame.size;
  // Into the turned screen, to the centre of this pixel's cell, and back.
  let q = vec2f(p.x * params.c + p.y * params.s, p.y * params.c - p.x * params.s);
  let cq = (floor(q / params.cell) + 0.5) * params.cell;
  let centre = vec2f(cq.x * params.c - cq.y * params.s, cq.x * params.s + cq.y * params.c);
  let src = unpremul(tex(centre * frame.texel));
  let r = 0.7071 * params.cell * sqrt(1.0 - luma(src.rgb));
  let cover = clamp(r - distance(q, cq) + 0.5, 0.0, 1.0);
  let ink = vec4f(params.ir, params.ig, params.ib, 1.0);
  let paper = vec4f(params.pr, params.pg, params.pb, 1.0) * params.pa;
  return mix(paper, ink, cover) * src.a;
}`,
    uniforms: (v, info) => {
      const a = (v.angle * Math.PI) / 180;
      const paper = v.paper === 'none' ? [0, 0, 0, 0] : [...rgb(v.paper), 1];
      return [Math.max(2, v.cell * info.scale), Math.cos(a), Math.sin(a), ...rgb(v.ink), ...paper];
    },
  }],
};
