/**
 * grid.js — BEC's grid (M13a, docs/bec.md): BEC_2025's 3D grid made again
 * from its values, a shape of the catalogue (shapes.js) as any other.
 *
 * A lattice of cells, X by Y by Z at a cell's size; its edges the pairs of
 * corners next to each other along an axis, some of them drawn — a bar each,
 * a little past the joints, a colour of the palette — and some of the cells'
 * faces filled. In BEC each of those draws was `random()`, loose; here each
 * is a seed of the recipe (rule 2) — `seed` which edges, `hues` how the
 * colours are dealt, `fill` which faces — so a grid is the same for the same
 * values and drawn again at any size. As BEC's `e` dealt the colours anew
 * with the edges, a new `seed` deals them anew; `hues` alone, as its `c`.
 *
 * Read in BEC's source — class.js `Matrix`, `Edge`, `Cell`; functions.js
 * `createEdges`, `updateEdgesRender`, `shuffleColors`, `shuffleRenderedFaces`
 * — an edge is a box along its axis, the cell long and its offset more, its
 * section its thickness; a face a thin square at 0.8 of the cell, on the
 * cell's side.
 *
 * One geometry for the whole grid, its colours a vertex attribute: one mesh
 * and one material, as every shape has (look.js `dress`). Only three.core.js:
 * Node runs it (tests/3d-shapes.mjs).
 */

import { BufferGeometry, Float32BufferAttribute, Color } from '../../core/libs/three/three.core.js';
import { makeRng } from '../../core/rng.js';

/** BEC's palettes — its identity's colours: the original first, then the two its source kept beside it. */
export const PALETTES = {
  bec: ['#0073dc', '#e40514', '#00a773', '#ffd400', '#000000'],
  mix: ['#1a9eda', '#da214b', '#00a773', '#ffcb04', '#000000'],
  'grand paris sud': ['#1a9eda', '#da214b', '#21a654', '#ffcb04', '#000000'],
};

/** Every edge of an X × Y × Z lattice of cells, in one order: along x, then y, then z, corner by corner. */
export function edgesOf(nx, ny, nz) {
  const out = [];
  for (const [axis, dx, dy, dz] of [[0, 1, 0, 0], [1, 0, 1, 0], [2, 0, 0, 1]]) {
    for (let i = 0; i <= nx - dx; i++) for (let j = 0; j <= ny - dy; j++) for (let k = 0; k <= nz - dz; k++) out.push({ axis, i, j, k });
  }
  return out;
}

/** `n` of `total` indices, unique, in order, as a seed picks them: none for none, all for as many or more. */
export function pick(total, n, seed) {
  const all = [...Array(total).keys()];
  if (!(n > 0)) return [];
  if (n >= total) return all;
  const r = makeRng(seed);
  for (let i = 0; i < n; i++) {
    const j = i + r.int(total - i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, n).sort((a, b) => a - b);
}

/** A box's six sides into the arrays: four corners each, outward, with their normal and the box's colour. */
function box(out, cx, cy, cz, sx, sy, sz, rgb) {
  const x = sx / 2, y = sy / 2, z = sz / 2;
  const sides = [
    [[1, 0, 0], [[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]]],
    [[-1, 0, 0], [[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]]],
    [[0, 1, 0], [[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]]],
    [[0, -1, 0], [[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]]],
    [[0, 0, 1], [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]]],
    [[0, 0, -1], [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]]],
  ];
  for (const [normal, quad] of sides) {
    const at = out.position.length / 3;
    for (const [a, b, c] of quad) {
      out.position.push(cx + a, cy + b, cz + c);
      out.normal.push(...normal);
      out.color.push(...rgb);
    }
    out.index.push(at, at + 1, at + 2, at, at + 2, at + 3);
  }
}

/** A cell's six sides, as BEC names them: where each is from the cell's centre, along which axis, which way. */
const SIDES = [['left', 0, -1], ['right', 0, 1], ['top', 1, 1], ['bottom', 1, -1], ['front', 2, 1], ['back', 2, -1]];

/**
 * The grid's geometry for its values.
 *
 * @param {object} v   its card's: cellsX, cellsY, cellsZ, cell, edges, seed, thickness, overhang, faces, fill, palette, hues;
 *                     and `inks`, the colours of the vault's palette its `colours` names, once read (palettes.js)
 * @returns {BufferGeometry}
 */
export function gridGeometry(v) {
  const nx = v.cellsX, ny = v.cellsY, nz = v.cellsZ, c = v.cell, half = c / 2;
  // A palette of the vault, given as its colours (`inks`, palettes.js) — or one of BEC's own three.
  const inks = Array.isArray(v.inks) && v.inks.length ? v.inks : PALETTES[v.palette] || PALETTES.bec;
  const palette = inks.map(hex => { const k = new Color(hex); return [k.r, k.g, k.b]; });
  const at = (i, n) => (i - n / 2) * c;                      // a corner along an axis: the lattice centred on the origin
  const out = { position: [], normal: [], color: [], index: [] };

  const all = edgesOf(nx, ny, nz);
  const dealt = makeRng(`${v.seed}:${v.hues}`);
  const colours = all.map(() => palette[dealt.int(palette.length)]);
  const long = c + v.overhang, t = v.thickness;
  for (const n of pick(all.length, v.edges, v.seed)) {
    const e = all[n], x = at(e.i, nx), y = at(e.j, ny), z = at(e.k, nz);
    if (e.axis === 0) box(out, x + half, y, z, long, t, t, colours[n]);
    else if (e.axis === 1) box(out, x, y + half, z, t, long, t, colours[n]);
    else box(out, x, y, z + half, t, t, long, colours[n]);
  }

  const cells = nx * ny * nz, square = c * 0.8, thin = Math.max(c * 0.01, 1e-4);
  const painted = makeRng(`faces ${v.fill}:${v.hues}`);
  const faceColours = Array.from({ length: cells * SIDES.length }, () => palette[painted.int(palette.length)]);
  for (const n of pick(cells * SIDES.length, v.faces, `faces ${v.fill}`)) {
    const cell = Math.floor(n / SIDES.length), [, axis, way] = SIDES[n % SIDES.length];
    const i = Math.floor(cell / (ny * nz)), j = Math.floor(cell / nz) % ny, k = cell % nz;
    const centre = [at(i, nx) + half, at(j, ny) + half, at(k, nz) + half];
    centre[axis] += way * (half - thin);
    const size = [square, square, square];
    size[axis] = thin;
    box(out, ...centre, ...size, faceColours[n]);
  }

  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(out.position, 3));
  g.setAttribute('normal', new Float32BufferAttribute(out.normal, 3));
  g.setAttribute('color', new Float32BufferAttribute(out.color, 3));
  g.setIndex(out.index);
  return g;
}
