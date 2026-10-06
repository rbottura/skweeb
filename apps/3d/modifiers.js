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
 *
 * - **subdivide** cuts every triangle into four, flat, n times. Nothing
 *   changes to the eye; what bends after it has vertices to bend. It stops
 *   short of a level that would pass MAX_TRIANGLES, the same way every time.
 * - **twist** turns the shape about one of its axes by an angle growing along
 *   it: the whole angle from one end of the shape to the other, the middle
 *   where it was.
 *
 * A deformation moves the vertices and carries their normals with them, by
 * the cofactor of its Jacobian measured in small steps (`deform`): a hard
 * edge stays hard, a seam smooth, and nothing is made again.
 *
 * Only three.core.js: Node runs it (tests/3d-modifiers.mjs).
 */

import { BufferGeometry, Float32BufferAttribute, Box3 } from '../../core/libs/three/three.core.js';

/** No more triangles than this from subdividing: past it, a browser stops answering. */
export const MAX_TRIANGLES = 1 << 19;

const RAD = Math.PI / 180;
const axis = (d, label) => ({ type: 'enum', options: ['x', 'y', 'z'], default: d, display: 'chips', label });

/** The catalogue, in the order the add menu offers it. */
export const MODIFIERS = {
  subdivide: {
    id: 'subdivide', label: 'subdivide',
    params: { levels: { type: 'int', min: 1, max: 4, default: 2, label: 'levels, each a triangle into four' } },
    apply: (geometry, v) => subdivide(geometry, v.levels),
  },
  twist: {
    id: 'twist', label: 'twist',
    params: {
      axis: axis('y', 'about its'),
      angle: { type: 'range', min: -1080, max: 1080, step: 1, default: 90, label: 'degrees, end to end' },
    },
    apply: (geometry, v) => deform(geometry, twist(geometry, v.axis, v.angle)),
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

// ── Deformations ─────────────────────────────────────────────────────────────

/** Where a geometry reaches along x, y and z: [low, high] each. */
function extent(geometry) {
  const box = new Box3().setFromBufferAttribute(geometry.attributes.position);
  return { x: [box.min.x, box.max.x], y: [box.min.y, box.max.y], z: [box.min.z, box.max.z] };
}

/** A point turned about an axis through the origin, by `a` radians, the right hand's way. */
function turned(along, a, x, y, z) {
  const c = Math.cos(a), s = Math.sin(a);
  if (along === 'x') return [x, y * c - z * s, y * s + z * c];
  if (along === 'y') return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
}

/** The twist of a geometry: `degrees` from one end to the other along `along`, its middle still. */
export function twist(geometry, along, degrees) {
  const [lo, hi] = extent(geometry)[along];
  const span = hi - lo || 1, mid = (lo + hi) / 2;
  const k = (degrees * RAD) / span;
  const at = { x: 0, y: 1, z: 2 }[along];
  return (x, y, z) => turned(along, ([x, y, z][at] - mid) * k, x, y, z);
}

/**
 * Every vertex moved by `f` — (x, y, z) to [x, y, z] — and its normal carried
 * as a surface's is: by the cofactor of f's Jacobian there, its columns
 * measured by steps a ten-thousandth of the geometry's size. In place.
 */
export function deform(geometry, f) {
  const pos = geometry.attributes.position, nor = geometry.attributes.normal;
  const e = extent(geometry);
  const h = 1e-4 * Math.max(e.x[1] - e.x[0], e.y[1] - e.y[0], e.z[1] - e.z[0], 1e-6);
  const column = (x, y, z, d) => {
    const p = f(x + (d === 0 ? h : 0), y + (d === 1 ? h : 0), z + (d === 2 ? h : 0));
    const m = f(x - (d === 0 ? h : 0), y - (d === 1 ? h : 0), z - (d === 2 ? h : 0));
    return [p[0] - m[0], p[1] - m[1], p[2] - m[2]];
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (nor) {
      const jx = column(x, y, z, 0), jy = column(x, y, z, 1), jz = column(x, y, z, 2);
      const cx = cross(jy, jz), cy = cross(jz, jx), cz = cross(jx, jy);
      const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
      const v = [0, 1, 2].map(c => nx * cx[c] + ny * cy[c] + nz * cz[c]);
      const l = Math.hypot(v[0], v[1], v[2]);
      if (l > 0) nor.setXYZ(i, v[0] / l, v[1] / l, v[2] / l);
    }
    const [X, Y, Z] = f(x, y, z);
    pos.setXYZ(i, X, Y, Z);
  }
  pos.needsUpdate = true;
  if (nor) nor.needsUpdate = true;
  geometry.boundingBox = null;          // made again when asked: picking reads the sphere
  geometry.boundingSphere = null;
  return geometry;
}
