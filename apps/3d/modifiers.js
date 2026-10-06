/**
 * modifiers.js — what can be done to a shape after it is made, in order: its
 * stack (M10's brick 3, docs/roadmap.md).
 *
 * A modifier is a catalogue entry as a shape is — an id, a label, a schema —
 * and what it does to a geometry: `apply(geometry, values)` hands back the
 * geometry made from it, the same for the same values, so a modified shape
 * is still its params and draws again at any size. A shape's recipe keeps
 * its stack as `modifiers: [{ id, params, on }]` beside its params, each a
 * card inside the shape's card (core/Cards.js, `inner`); scene.js makes the
 * geometry again when the stack changes.
 *
 * A modifier works in the shape's own space, before its place: a twist about
 * y turns round the shape's own up, wherever it stands and however turned.
 * The six, in the roadmap's order:
 *
 * - **subdivide** cuts every triangle into four, flat, n times. Nothing
 *   changes to the eye; what bends after it has vertices to bend.
 * - **displace** pushes the surface along its normals by seeded noise in
 *   3D, its own seed among its params (rule 2) — bumps, a rock, a blob.
 * - **twist** turns the shape about one of its axes, the whole angle from
 *   one end to the other, the middle where it was.
 * - **bend** lays one of its axes on an arc of a whole angle, end to end.
 * - **mirror** adds its reflection across a plane a distance from its middle.
 * - **array** makes it a row of itself, the row's middle where it was.
 *
 * The three that move vertices are deform.js's; the two that copy are
 * repeat.js's. Nothing a stack makes passes MAX_TRIANGLES: subdivide stops a
 * level short, a row is cut shorter, a mirror left out — the same way every
 * time, since a recipe draws the same wherever it opens.
 *
 * Only three.core.js: Node runs it (tests/3d-modifiers.mjs).
 */

import { BufferGeometry, Float32BufferAttribute } from '../../core/libs/three/three.core.js';
import { deform, twist, bend, displace } from './deform.js';
import { mirror, array } from './repeat.js';

/** No more triangles than this from a stack: past it, a browser stops answering. */
export const MAX_TRIANGLES = 1 << 19;

const axis = (d, label) => ({ type: 'enum', options: ['x', 'y', 'z'], default: d, display: 'chips', label });
const along = label => ({ type: 'range', min: -50, max: 50, step: 'any', default: 0, label });

/** The catalogue, in the order the add menu offers it. */
export const MODIFIERS = {
  subdivide: {
    id: 'subdivide', label: 'subdivide',
    params: { levels: { type: 'int', min: 1, max: 4, default: 2, label: 'levels, each a triangle into four' } },
    apply: (geometry, v) => subdivide(geometry, v.levels),
  },
  displace: {
    id: 'displace', label: 'displace',
    params: {
      amount: { type: 'range', min: -2, max: 2, step: 'any', default: 0.12, label: 'how far, at the noise\'s height' },
      size: { type: 'range', min: 0.02, max: 20, step: 'any', log: true, default: 0.4, label: 'bumps, how wide' },
      detail: { type: 'int', min: 1, max: 5, default: 2, label: 'detail, each half the last' },
      seed: { type: 'int', min: 0, max: 99999, default: 1, label: 'seed' },
    },
    apply: (geometry, v) => displace(geometry, v),
  },
  twist: {
    id: 'twist', label: 'twist',
    params: {
      axis: axis('y', 'about its'),
      angle: { type: 'range', min: -1080, max: 1080, step: 1, default: 90, label: 'degrees, end to end' },
    },
    apply: (geometry, v) => deform(geometry, twist(geometry, v.axis, v.angle)),
  },
  bend: {
    id: 'bend', label: 'bend',
    params: {
      axis: axis('x', 'along its'),
      angle: { type: 'range', min: -360, max: 360, step: 1, default: 90, label: 'degrees, end to end — up; along y, to +x' },
    },
    apply: (geometry, v) => deform(geometry, bend(geometry, v.axis, v.angle)),
  },
  mirror: {
    id: 'mirror', label: 'mirror',
    params: {
      axis: axis('x', 'across its'),
      offset: { ...along('the mirror, this far from its middle'), min: -20, max: 20, default: 0.6 },
    },
    apply: (geometry, v) => mirror(geometry, v.axis, v.offset, MAX_TRIANGLES),
  },
  array: {
    id: 'array', label: 'array',
    params: {
      count: { type: 'int', min: 2, max: 64, default: 3, label: 'how many' },
      dx: { ...along('each this far along x'), default: 1.5 },
      dy: along('…along y'),
      dz: along('…along z'),
    },
    apply: (geometry, v) => array(geometry, v.count, [v.dx, v.dy, v.dz], MAX_TRIANGLES),
  },
};

/**
 * A geometry through a stack, in order — `[{ id, values }]`, as scene.js has
 * them, coerced and known. A geometry a modifier replaces is freed.
 */
export function modify(geometry, stack = []) {
  let g = geometry;
  for (const { id, values } of stack) {
    const next = MODIFIERS[id].apply(g, values);
    if (next !== g) g.dispose();
    g = next;
  }
  return g;
}

// ── Subdivide ────────────────────────────────────────────────────────────────

/** Every triangle into four, `levels` times or as many as MAX_TRIANGLES allows. */
export function subdivide(geometry, levels = 1) {
  let g = geometry;
  for (let l = 0; l < levels && triangles(g) * 4 <= MAX_TRIANGLES; l++) {
    const next = quarter(g);
    if (g !== geometry) g.dispose();
    g = next;
  }
  return g;
}

export const triangles = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

/** One level: each edge's midpoint made once and shared, every attribute halfway, normals one long again. */
function quarter(geometry) {
  const n = geometry.attributes.position.count;
  const index = geometry.index ? geometry.index.array : Array.from({ length: n }, (_, i) => i);
  const names = Object.keys(geometry.attributes);
  const sizes = names.map(name => geometry.attributes[name].itemSize);
  const data = names.map(name => Array.from(geometry.attributes[name].array));
  let count = n;
  const mids = new Map();
  const midpoint = (a, b) => {
    const key = a < b ? a * 0x100000000 + b : b * 0x100000000 + a;
    let m = mids.get(key);
    if (m === undefined) {
      m = count++;
      mids.set(key, m);
      data.forEach((d, k) => { const s = sizes[k]; for (let c = 0; c < s; c++) d.push((d[a * s + c] + d[b * s + c]) / 2); });
    }
    return m;
  };
  const tris = [];
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i], b = index[i + 1], c = index[i + 2];
    const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
    tris.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  const out = new BufferGeometry();
  names.forEach((name, k) => out.setAttribute(name, new Float32BufferAttribute(data[k], sizes[k])));
  const normal = out.attributes.normal;
  if (normal) {
    for (let i = n; i < count; i++) {
      const l = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i));
      if (l > 0) normal.setXYZ(i, normal.getX(i) / l, normal.getY(i) / l, normal.getZ(i) / l);
    }
  }
  out.setIndex(tris);
  return out;
}
