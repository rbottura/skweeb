/**
 * loft.js — a body from a drawing's strokes: each mark's silhouette a ring,
 * each ring joined to the next by quads, the ends closed (G4, 2026-11-16).
 *
 * The author: "ce mesh serait un segment qu'on connecterait au prochain
 * segment en faisant des quads ou des triangles, et on pourrait ainsi
 * transformer un dessin 2d en 3d … en fermant le mesh sur la première
 * section et la dernière ou on rajoute un point de fermeture à chaque bout
 * … des worms et des fleurs en 3d". A loft, as modelling software has it.
 *
 * A stroke's marks (core/stage/drawing.js), their centres smoothed over
 * `smooth` marks either side, are its line; rings stand along it at equal
 * steps, `spacing` a section apart, each between two marks — its size, its
 * turn and its silhouette theirs, mixed (silhouette.js: rings of two sprites
 * match point for point). Where a ring stands is `lay`:
 *  - `across` the stroke, upright: the line in the drawing's plane, the
 *    section across it, the drawing's up its up — a worm, the brush its
 *    nozzle. The line is flat, so the frame is too: no Frenet flip.
 *  - `stamped`: each ring where the mark was stamped, flat in the plane,
 *    stepped back in depth by how far along the stroke it is — seen from
 *    the front, the drawing; from the side, a body.
 * `twist` turns each section as its brush was turned (radians, never
 * wrapped: the gamepad's turn runs on). The ends are `pointed` — a point
 * beyond each, `point` sections out — `flat`, the end rings filled, or
 * `open`. Each stroke is a body of its own, every face turned outward: its
 * volume is counted, and a body inside out — a mirrored copy, a ring laid
 * flat — is turned over.
 *
 * A drawing's longer side is `WORLD` units, its middle at the origin. With
 * no drawing yet — none chosen, or its marks still coming — the body is a
 * worm of its own (`DEMO`), so the shape is seen at once. Pure: three.core
 * only, Node runs it (tests/3d-drawn.mjs).
 */

import { BufferGeometry, Float32BufferAttribute, ShapeUtils, Vector2 } from '../../core/libs/three/three.core.js';
import { pathOf, pointAt } from '../../core/stage/strokes.js';
import { spriteRing, circleRing, areaOf } from './silhouette.js';

const form = 'form';

export const LAYS = ['across', 'stamped'];
export const ENDS = ['pointed', 'flat', 'open'];

/** A drawn body's own rows: the drawing, how its rings stand, its ends, its silhouette. */
export const DRAWN_PARAMS = {
  drawing: { type: 'object', accepts: ['still', 'sequence'], label: 'a gamepad drawing', group: form },
  lay: { type: 'enum', options: LAYS, labels: { across: 'across the stroke', stamped: 'as stamped, stepped back' },
         default: 'across', display: 'chips', label: 'its sections stand', group: form },
  back: { type: 'range', min: 0.05, max: 4, step: 'any', default: 0.6, label: 'stepped back, by the stroke\'s length',
          unit: '×', group: form, when: { lay: 'stamped' } },
  twist: { type: 'bool', default: true, label: 'each section turned as its brush was', group: form },
  ends: { type: 'enum', options: ENDS, labels: { pointed: 'a point', flat: 'flat', open: 'open' },
          default: 'pointed', display: 'chips', label: 'its ends', group: form },
  point: { type: 'range', min: 0, max: 4, step: 'any', default: 0.8, label: 'the point, out by its section',
           unit: '×', group: form, when: { ends: 'pointed' } },
  threshold: { type: 'range', min: 0.02, max: 0.98, step: 0.01, default: 0.5, label: 'its silhouette, at alpha',
               group: form },
  segments: { type: 'int', min: 8, max: 128, default: 48, label: 'points round a section', group: form },
  spacing: { type: 'range', min: 0.05, max: 2, step: 'any', log: true, default: 0.25, label: 'rings apart, by a section',
             unit: '×', group: form },
  smooth: { type: 'int', min: 0, max: 30, default: 4, label: 'its line smoothed, marks either side', group: form },
};

/** A drawing's longer side, in the world's units: the camera starts six away. */
export const WORLD = 4;

/** The rings along one stroke, at most: a long stroke's rings spaced further. */
const MOST_RINGS = 3000;

/** The demo worm: an S, thin at its ends, round — a mark with no sprite is a circle `CIRCLE` px across its middle. */
const CIRCLE = 100;
export const DEMO = (() => {
  const stamps = [];
  for (let i = 0; i <= 160; i++) {
    const f = i / 160;
    stamps.push({ x: 600 * f, y: 110 * Math.sin(f * 2 * Math.PI), rotation: 0, scale: 0.3 + 0.7 * Math.sin(Math.PI * f),
                  flipX: 1, key: '' });
  }
  return { id: '', strokes: [stamps], masks: new Map() };
})();

// Rings by sprite, for a drawing at a threshold and a count: traced once, kept while the drawing is.
const traced = new WeakMap();
function ringsFor(drawn, threshold, n) {
  if (!traced.has(drawn)) traced.set(drawn, new Map());
  const byLook = traced.get(drawn), look = `${threshold}:${n}`;
  if (!byLook.has(look)) byLook.set(look, new Map());
  const rings = byLook.get(look);
  return key => {
    if (!rings.has(key)) {
      const mask = drawn.masks && drawn.masks.get(key);
      rings.set(key, mask ? spriteRing(mask, threshold, n) : circleRing(n, CIRCLE / 2));
    }
    return rings.get(key);
  };
}

const radiusOf = ring => ring.reduce((s, [u, v]) => s + Math.hypot(u, v), 0) / ring.length;
const median = list => { const s = list.slice().sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };

/** A stroke's marks, their centres smoothed over `k` either side — its ends where they were. */
function smoothed(stamps, k) {
  if (!(k > 0)) return stamps;
  return stamps.map((st, i) => {
    const m = Math.min(k, i, stamps.length - 1 - i);
    let x = 0, y = 0;
    for (let j = i - m; j <= i + m; j++) { x += stamps[j].x; y += stamps[j].y; }
    return { ...st, x: x / (2 * m + 1), y: y / (2 * m + 1) };
  });
}

/**
 * The geometry of a drawn body.
 *
 * @param {object} v   its values — and `drawn`, the drawing read (drawn.js): `{ id, strokes: [[{ x, y, rotation,
 *                     scale, flipX, key }]], masks: Map<key, mask> }`, the stamps in the drawing's pixels, y down
 * @returns {BufferGeometry}
 */
export function drawnGeometry(v) {
  const drawn = v.drawn && v.drawn.strokes && v.drawn.strokes.some(s => s.length > 1) ? v.drawn : DEMO;
  const n = Math.max(3, Math.round(v.segments) || 48);
  const ringOfKey = ringsFor(drawn, v.threshold ?? 0.5, n);
  // The drawing's extent, its marks with their sizes: its longer side WORLD units, its middle the origin.
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const stroke of drawn.strokes) {
    for (const st of stroke) {
      const r = Math.abs(st.scale) * radiusOf(ringOfKey(st.key));
      x0 = Math.min(x0, st.x - r); x1 = Math.max(x1, st.x + r);
      y0 = Math.min(y0, st.y - r); y1 = Math.max(y1, st.y + r);
    }
  }
  const k = WORLD / Math.max(1e-6, x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const out = { position: [], index: [] };
  for (const stroke of drawn.strokes) if (stroke.length > 1) body(out, smoothed(stroke, Math.round(v.smooth) || 0), v, n, ringOfKey, k, cx, cy);
  if (!out.index.length && drawn !== DEMO) return drawnGeometry({ ...v, drawn: null });   // dots only: the worm
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(out.position, 3));
  g.setIndex(out.index);
  g.computeVertexNormals();
  return g;
}

/** One stroke's body into `out`: its rings, the quads between them, its ends; turned outward. */
function body(out, stamps, v, n, ringOfKey, k, cx, cy) {
  const path = pathOf(stamps), L = path.length;
  if (!(L > 1e-6)) return;                                  // a pen held still: a dot, no line to stand rings on
  const sizes = stamps.map(st => 2 * Math.abs(st.scale) * radiusOf(ringOfKey(st.key)));
  const step = Math.max(L / MOST_RINGS, (v.spacing || 0.25) * median(sizes), 1e-3);
  const m = Math.max(2, Math.ceil(L / step) + 1);
  const across = v.lay !== 'stamped', twist = v.twist !== false, back = v.back ?? 0.6;
  const base = out.position.length / 3;
  const centres = [], sections = [];
  let i = 1, tx = 1, ty = 0;
  for (let r = 0; r < m; r++) {
    const s = (L * r) / (m - 1);
    while (i < stamps.length - 1 && path.at[i] < s) i++;
    const a = stamps[i - 1], b = stamps[i], span = path.at[i] - path.at[i - 1];
    const f = span > 0 ? Math.min(1, Math.max(0, (s - path.at[i - 1]) / span)) : 1;
    const p = pointAt(path, s), h = Math.min(step, L / 2);
    const p0 = pointAt(path, Math.max(0, s - h)), p1 = pointAt(path, Math.min(L, s + h));
    const dl = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (dl > 1e-9) { tx = (p1.x - p0.x) / dl; ty = -(p1.y - p0.y) / dl; }   // y up
    const scale = (a.scale + (b.scale - a.scale) * f) * k;
    const turn = twist ? -(a.rotation + (b.rotation - a.rotation) * f) : 0;
    const ra = ringOfKey(a.key), rb = a.key === b.key ? ra : ringOfKey(b.key), flip = a.flipX < 0 ? -1 : 1;
    const cos = Math.cos(turn), sin = Math.sin(turn);
    const C = [(p.x - cx) * k, -(p.y - cy) * k, across ? 0 : -s * k * back];
    const section = [];
    for (let j = 0; j < n; j++) {
      // A mirrored copy's ring runs the other way round from the same first point: counter-clockwise again.
      const jj = flip < 0 ? (n - j) % n : j;
      const u = (ra[jj][0] + (rb[jj][0] - ra[jj][0]) * f) * scale * flip, w = (ra[jj][1] + (rb[jj][1] - ra[jj][1]) * f) * scale;
      const su = u * cos - w * sin, sv = u * sin + w * cos;
      section.push([su, sv]);
      if (across) out.position.push(C[0] - ty * su, C[1] + tx * su, sv);   // u along the line's normal, v the drawing's up
      else out.position.push(C[0] + su, C[1] + sv, C[2]);
    }
    centres.push(C);
    sections.push(section);
  }
  const tris = [];
  for (let r = 0; r < m - 1; r++) {
    for (let j = 0; j < n; j++) {
      const a = base + r * n + j, b = base + r * n + (j + 1) % n, c = b + n, d = a + n;
      tris.push([a, b, c], [a, c, d]);
    }
  }
  const first = base, last = base + (m - 1) * n;
  const ends = ENDS.includes(v.ends) ? v.ends : 'pointed';
  // A body with open ends is turned by its volume closed as a point would close it, at its ends' middles.
  const closing = [];
  const pole = (r, sign, out3) => {
    const C = centres[r], D = centres[r === 0 ? 1 : m - 1].map((c, q) => (c - centres[r === 0 ? 0 : m - 2][q]));
    const len = Math.hypot(...D) || 1, size = radiusOf(sections[r]) * (ends === 'pointed' ? v.point ?? 0.8 : 0);
    out3.push(C[0] + (sign * D[0] / len) * size, C[1] + (sign * D[1] / len) * size, C[2] + (sign * D[2] / len) * size);
  };
  if (ends === 'flat') {
    for (const [r, at, lastEnd] of [[0, first, false], [m - 1, last, true]]) {
      const cap = out.position.length / 3;
      for (let j = 0; j < n; j++) out.position.push(...out.position.slice((at + j) * 3, (at + j) * 3 + 3));
      // Earcut's triangles all turn one way: which, by their area together — a sliver along a straight side
      // has none to tell by.
      const faces = ShapeUtils.triangulateShape(sections[r].map(([x, y]) => new Vector2(x, y)), []);
      const over = faces.reduce((sum, [a, b, c]) => sum + areaOf([sections[r][a], sections[r][b], sections[r][c]]), 0) < 0;
      for (let [a, b, c] of faces) {
        if (over) [b, c] = [c, b];
        tris.push(lastEnd ? [cap + a, cap + b, cap + c] : [cap + a, cap + c, cap + b]);
      }
    }
  } else {
    const points = out.position.length / 3;
    const into = ends === 'pointed' ? out.position : closing;
    pole(0, -1, into);
    pole(m - 1, 1, into);
    const A = ends === 'pointed' ? points : -1, B = ends === 'pointed' ? points + 1 : -2;
    for (let j = 0; j < n; j++) {
      tris.push([first + (j + 1) % n, first + j, A], [last + j, last + (j + 1) % n, B]);
    }
  }
  // Its volume: outward, positive. A vertex -1 or -2 is an open end's middle, counted only.
  const P = q => (q >= 0 ? out.position.slice(q * 3, q * 3 + 3) : closing.slice((-q - 1) * 3, (-q - 1) * 3 + 3));
  let vol = 0;
  for (const [a, b, c] of tris) {
    const [ax, ay, az] = P(a), [bx, by, bz] = P(b), [qx, qy, qz] = P(c);
    vol += ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx);
  }
  for (const [a, b, c] of tris) {
    if (ends === 'open' && (a < 0 || b < 0 || c < 0)) continue;
    if (vol < 0) out.index.push(a, c, b);
    else out.index.push(a, b, c);
  }
}
