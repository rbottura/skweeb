/**
 * morph.js — one body into another (M16b, docs/worm.md): the in-between
 * frames of the morph from A to B, what the spectral bridge is made of.
 *
 * loft.js lays each stroke as rings of points (`userData.bodies`). A body's
 * longest stroke is read as its rings, tail to head, in a frame where its
 * head is ahead (`canon`) — so two worms drawn either way match end for end.
 * Both are resampled to as many rings by their length and as many points
 * round each — loft.js starts every ring at the same place round it — and
 * then any in-between is a mix, point by point. A tube is laid over the
 * rings, its ends closed by a point each.
 *
 * Pure: three's core only, Node runs it (tests/3d-play.mjs).
 */

import { BufferGeometry, Float32BufferAttribute } from '../../../core/libs/three/three.core.js';

const lerp3 = (p, q, f) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f, p[2] + (q[2] - p[2]) * f];
const middle = ring => ring.reduce((c, p) => [c[0] + p[0], c[1] + p[1], c[2] + p[2]], [0, 0, 0]).map(x => x / ring.length);

/**
 * The rings of a body's longest stroke, tail to head, each its points `[x, y, z]` — turned so its head is along +x
 * (`toward`, worm.js) as it is `seen`: from the side, about its up; from above, about its depth.
 */
export function ringsOf(geometry, { headAtEnd = true, toward = 1, seen = 'side' } = {}) {
  const bodies = (geometry.userData && geometry.userData.bodies) || [];
  const body = bodies.reduce((a, b) => (!a || b.length > a.length ? b : a), null);
  if (!body) return [];
  const P = geometry.getAttribute('position').array;
  const flip = seen === 'above' ? [toward, toward, 1] : [toward, 1, toward];
  const rings = [];
  for (let r = 0; r < body.rings; r++) {
    const ring = [];
    for (let j = 0; j < body.points; j++) {
      const i = (body.base + r * body.points + j) * 3;
      ring.push([P[i] * flip[0], P[i + 1] * flip[1], P[i + 2] * flip[2]]);
    }
    rings.push(ring);
  }
  return headAtEnd ? rings : rings.reverse();
}

/** A ring as `n` points, at equal steps round it. */
const around = (ring, n) => Array.from({ length: n }, (_, j) => {
  const x = (j * ring.length) / n, a = Math.floor(x);
  return lerp3(ring[a % ring.length], ring[(a + 1) % ring.length], x - a);
});

/** `k` rings at equal steps along the line through their middles, `n` points round each. */
export function resample(rings, k, n) {
  if (!rings.length) return [];
  const round = rings.map(r => around(r, n)), mids = round.map(middle);
  const at = [0];
  for (let r = 1; r < mids.length; r++) at.push(at[r - 1] + Math.hypot(...mids[r].map((x, q) => x - mids[r - 1][q])));
  const length = at[at.length - 1];
  const out = [];
  let r = 0;
  for (let i = 0; i < k; i++) {
    const s = k > 1 ? (length * i) / (k - 1) : 0;
    while (r < at.length - 2 && at[r + 1] < s) r++;
    const span = at[r + 1] - at[r];
    const f = mids.length > 1 && span > 0 ? Math.min(1, Math.max(0, (s - at[r]) / span)) : 0;
    const b = round[Math.min(r + 1, round.length - 1)];
    out.push(round[r].map((p, j) => lerp3(p, b[j], f)));
  }
  return out;
}

/** The rings `t` of the way from `a` to `b`, point by point: both as many rings, as many points. */
export const mixRings = (a, b, t) => a.map((ring, i) => ring.map((p, j) => lerp3(p, b[i][j], t)));

/** A tube over its rings: quads between each two, a point beyond each end — normals its own. */
export function tubeOf(rings) {
  const k = rings.length, n = k ? rings[0].length : 0;
  const position = [], index = [];
  for (const ring of rings) for (const p of ring) position.push(...p);
  for (let r = 0; r < k - 1; r++) {
    for (let j = 0; j < n; j++) {
      const a = r * n + j, b = r * n + ((j + 1) % n);
      index.push(a, b, b + n, a, b + n, a + n);
    }
  }
  if (k > 1) {
    const ends = [[0, 1], [k - 1, k - 2]];
    for (const [r, inner] of ends) {
      const m = middle(rings[r]), d = middle(rings[inner]), tip = lerp3(m, d, -0.5);
      const at = position.length / 3;
      position.push(...tip);
      for (let j = 0; j < n; j++) index.push(at, r * n + j, r * n + ((j + 1) % n));
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(position, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
