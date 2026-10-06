/**
 * repeat.js — a shape made of copies of itself: mirrored across a plane, or
 * in a row (modifiers.js holds the catalogue).
 *
 * Each copy has every attribute of the shape's and triangles of its own, all
 * in one geometry, so what follows in the stack bends them as one and a
 * click picks them as one shape. A mirrored copy's triangles turn the other
 * way round, so its outside still faces out.
 *
 * Copies multiply triangles: past `max` a row is made shorter and a mirror
 * left out, the same way every time, as subdivide stops short.
 *
 * Only three.core.js: Node runs it (tests/3d-modifiers.mjs).
 */

import { BufferGeometry, Float32BufferAttribute } from '../../core/libs/three/three.core.js';

const AT = { x: 0, y: 1, z: 2 };
const trianglesOf = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

/**
 * The shape and its reflection across the plane square to `along`, `offset`
 * from the shape's middle along it: an offset of a shape's half-width is a
 * twin touching it.
 */
export function mirror(geometry, along, offset, max = Infinity) {
  if (trianglesOf(geometry) * 2 > max) return geometry;
  const a = AT[along];
  return copies(geometry, [
    { move: () => {} },
    { move: p => { p[a] = 2 * offset - p[a]; }, turn: n => { n[a] = -n[a]; }, flip: true },
  ]);
}

/**
 * `count` of the shape in a row, `step` apart — [x, y, z] in its own units —
 * the row's middle where the shape was, so it turns and frames about it.
 */
export function array(geometry, count, step, max = Infinity) {
  const n = Math.max(1, Math.min(count, Math.floor(max / trianglesOf(geometry))));
  return copies(geometry, Array.from({ length: n }, (_, i) => {
    const k = i - (n - 1) / 2;
    return { move: p => { p[0] += step[0] * k; p[1] += step[1] * k; p[2] += step[2] * k; } };
  }));
}

/**
 * One geometry of several copies: each `{ move(p), turn?(n), flip? }` — a
 * point moved in place, a normal turned in place, triangles wound the other way.
 */
function copies(geometry, each) {
  const count = geometry.attributes.position.count;
  const index = geometry.index ? geometry.index.array : Array.from({ length: count }, (_, i) => i);
  const names = Object.keys(geometry.attributes);
  const out = new BufferGeometry();
  for (const name of names) {
    const src = geometry.attributes[name], size = src.itemSize;
    const data = new Float32Array(count * size * each.length);
    each.forEach((copy, c) => {
      for (let i = 0; i < count; i++) {
        const v = Array.from({ length: size }, (_, k) => src.array[i * size + k]);
        if (name === 'position') copy.move(v);
        if (name === 'normal' && copy.turn) copy.turn(v);
        data.set(v, (c * count + i) * size);
      }
    });
    out.setAttribute(name, new Float32BufferAttribute(data, size));
  }
  const tris = [];
  each.forEach((copy, c) => {
    const base = c * count;
    for (let t = 0; t < index.length; t += 3) {
      if (copy.flip) tris.push(base + index[t], base + index[t + 2], base + index[t + 1]);
      else tris.push(base + index[t], base + index[t + 1], base + index[t + 2]);
    }
  });
  out.setIndex(tris);
  return out;
}
