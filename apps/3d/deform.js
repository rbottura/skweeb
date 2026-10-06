/**
 * deform.js — the modifiers that move a shape's vertices and nothing else:
 * twist, bend and displace (modifiers.js holds the catalogue).
 *
 * A twist and a bend are functions of space, (x, y, z) to [x, y, z]: `deform`
 * moves every vertex by one and carries its normal as a surface's normal is
 * carried — by the cofactor of the function's Jacobian, measured in small
 * steps — so a hard edge stays hard and a smooth seam smooth, and no normal
 * is made again. Both are measured on the shape as it reaches: the whole
 * angle from one end to the other, the middle where it was.
 *
 * A displacement is not a function of space alone, since it pushes along
 * the surface's normals: copies of one point — where a seam or a box's edge
 * splits a vertex — move together, along their normals' mean, so nothing
 * cracks open, and the normals are then made again from the triangles,
 * smooth across a seam, hard across an edge that was hard.
 *
 * Only three.core.js: Node runs it (tests/3d-modifiers.mjs).
 */

import { Box3 } from '../../core/libs/three/three.core.js';
import { noise3 } from '../../core/noise.js';

const RAD = Math.PI / 180;
const AT = { x: 0, y: 1, z: 2 };

/** Where a geometry reaches along x, y and z: [low, high] each. */
export function extent(geometry) {
  const box = new Box3().setFromBufferAttribute(geometry.attributes.position);
  return { x: [box.min.x, box.max.x], y: [box.min.y, box.max.y], z: [box.min.z, box.max.z] };
}

/** How far along an axis a geometry reaches, and its middle. */
function span(geometry, along) {
  const [lo, hi] = extent(geometry)[along];
  return { length: hi - lo || 1, mid: (lo + hi) / 2 };
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
  const { length, mid } = span(geometry, along);
  const k = (degrees * RAD) / length;
  return (x, y, z) => turned(along, ([x, y, z][AT[along]] - mid) * k, x, y, z);
}

/** Which way a bend curves: up, but a shape bent along its height curves toward +x. */
export const towardOf = along => (along === 'y' ? 'x' : 'y');

/**
 * The bend of a geometry: its `along` axis laid on an arc of `degrees`, end
 * to end, curving toward `towardOf(along)` — the other way for a negative
 * angle — its middle where it was: Blender's simple deform, its pivot at the
 * radius the angle makes of the shape's length.
 */
export function bend(geometry, along, degrees) {
  const { length, mid } = span(geometry, along);
  const k = (degrees * RAD) / length;
  if (Math.abs(k) < 1e-9) return (x, y, z) => [x, y, z];
  const a = AT[along], b = AT[towardOf(along)], r = 1 / k;
  return (x, y, z) => {
    const p = [x, y, z];
    const theta = (p[a] - mid) * k, s = p[b];
    p[a] = mid + (r - s) * Math.sin(theta);
    p[b] = r - (r - s) * Math.cos(theta);
    return p;
  };
}

/**
 * Every vertex moved by `f` and its normal carried as a surface's is: by the
 * cofactor of f's Jacobian there, its columns measured by steps a
 * ten-thousandth of the geometry's size. In place.
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
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (nor) {
      const jx = column(x, y, z, 0), jy = column(x, y, z, 1), jz = column(x, y, z, 2);
      const cx = cross(jy, jz), cy = cross(jz, jx), cz = cross(jx, jy);
      const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
      setUnit(nor, i, [0, 1, 2].map(c => nx * cx[c] + ny * cy[c] + nz * cz[c]));
    }
    const [X, Y, Z] = f(x, y, z);
    pos.setXYZ(i, X, Y, Z);
  }
  return moved(geometry);
}

/**
 * A geometry pushed along its normals by seeded noise in 3D: `amount` where
 * the noise peaks, bumps `size` across, `detail` octaves, each half the size
 * and half the height of the last. In place.
 */
export function displace(geometry, { amount, size, detail, seed }) {
  const pos = geometry.attributes.position, nor = geometry.attributes.normal;
  const n = pos.count;
  const before = Float32Array.from(nor.array);
  const height = (x, y, z) => {
    let sum = 0, weight = 0;
    for (let o = 0, f = 1 / size, w = 1; o < detail; o++, f *= 2, w /= 2) {
      sum += w * noise3(x * f, y * f, z * f, (seed + o * 7919) >>> 0);
      weight += w;
    }
    return (amount * sum) / weight;
  };
  const copies = copiesOf(geometry);
  for (const group of copies) {
    const d = [0, 0, 0];
    for (const i of group) for (let c = 0; c < 3; c++) d[c] += before[i * 3 + c];
    const l = Math.hypot(d[0], d[1], d[2]);
    const dir = l > 1e-6 ? d.map(v => v / l) : [before[group[0] * 3], before[group[0] * 3 + 1], before[group[0] * 3 + 2]];
    const i0 = group[0];
    const hgt = height(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
    for (const i of group) pos.setXYZ(i, pos.getX(i) + dir[0] * hgt, pos.getY(i) + dir[1] * hgt, pos.getZ(i) + dir[2] * hgt);
  }
  // The normals again, from the triangles, each weighted by its area.
  const acc = new Float64Array(n * 3);
  const index = geometry.index ? geometry.index.array : Array.from({ length: n }, (_, i) => i);
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
    const ab = sub(pos, b, a), ac = sub(pos, c, a);
    const face = cross(ab, ac);
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) acc[v * 3 + k] += face[k];
  }
  // Copies on one smooth surface share theirs; copies across a hard edge keep their own.
  for (const group of copies) {
    const clusters = [];
    for (const i of group) {
      const near = clusters.find(cl => dot3(before, cl[0], i) > 0.9);
      if (near) near.push(i); else clusters.push([i]);
    }
    for (const cl of clusters) {
      const s = [0, 0, 0];
      for (const i of cl) for (let k = 0; k < 3; k++) s[k] += acc[i * 3 + k];
      for (const i of cl) setUnit(nor, i, s);
    }
  }
  return moved(geometry);
}

/** Vertices at one place, each place's indices: where a seam or an edge splits a point. */
export function copiesOf(geometry) {
  const pos = geometry.attributes.position;
  const e = extent(geometry);
  const q = 1e-6 * Math.max(e.x[1] - e.x[0], e.y[1] - e.y[0], e.z[1] - e.z[0], 1e-6);
  const groups = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${Math.round(pos.getX(i) / q)},${Math.round(pos.getY(i) / q)},${Math.round(pos.getZ(i) / q)}`;
    const g = groups.get(key);
    if (g) g.push(i); else groups.set(key, [i]);
  }
  return [...groups.values()];
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const sub = (pos, i, j) => [pos.getX(i) - pos.getX(j), pos.getY(i) - pos.getY(j), pos.getZ(i) - pos.getZ(j)];
const dot3 = (arr, i, j) => arr[i * 3] * arr[j * 3] + arr[i * 3 + 1] * arr[j * 3 + 1] + arr[i * 3 + 2] * arr[j * 3 + 2];

/** A normal set one long, unless it has no length. */
function setUnit(nor, i, v) {
  const l = Math.hypot(v[0], v[1], v[2]);
  if (l > 0) nor.setXYZ(i, v[0] / l, v[1] / l, v[2] / l);
}

/** A geometry whose vertices moved: three told, its bounds made again when asked — picking reads them. */
function moved(geometry) {
  geometry.attributes.position.needsUpdate = true;
  if (geometry.attributes.normal) geometry.attributes.normal.needsUpdate = true;
  geometry.boundingBox = null;
  geometry.boundingSphere = null;
  return geometry;
}
