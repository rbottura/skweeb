/**
 * lathe.js — a drawing turned round an axis (G7, 2026-11-17): each stroke
 * of a gamepad drawing a profile, spun on a lathe — a vase, a cup, a corolla.
 *
 * The plan the author took, "vas-y avec ce plan": after the drawn body
 * (loft.js), the lathe. A stroke's marks, their centres smoothed, are its
 * profile: each one's distance from a vertical axis is its radius, its
 * height its height, and three's LatheGeometry spins it `segments` times
 * round. The axis stands across the drawing at `axis`, 0 its left edge, 1 its
 * right: a profile drawn out from the axis — half a vase — at 0; a stroke
 * across the middle, mirrored onto itself, at 0.5. A profile that crosses the
 * axis turns back on itself there.
 *
 * Its wall is its marks' size (`wall`, by it): the profile offset either side
 * by half of it, the two sides joined at its ends, and that closed outline
 * spun — a solid, every face outward, closed but at the axis, where a ring
 * shrinks to a point. A wall of none is the surface alone, seen from both
 * sides (look.js `dress`), as a cup's inside is.
 *
 * The drawing read as a drawn body's is (drawn.js), its longer side `WORLD`
 * units, its middle the origin; with none, a vase of its own. Pure: three.core
 * only (tests/3d-drawn.mjs).
 */

import { BufferGeometry, Float32BufferAttribute, LatheGeometry, Vector2 } from '../../core/libs/three/three.core.js';
import { WORLD } from './loft.js';

const form = 'form';

/** A turned drawing's rows. */
export const TURNED_PARAMS = {
  drawing: { type: 'object', accepts: ['still', 'sequence'], by: ['gamepad'], label: 'a gamepad drawing', group: form },
  axis: { type: 'range', min: 0, max: 1, step: 0.01, default: 0, label: 'its axis, across the drawing', group: form },
  wall: { type: 'range', min: 0, max: 4, step: 0.01, default: 1, label: 'its wall, by its marks', unit: '×', group: form },
  segments: { type: 'int', min: 8, max: 128, default: 64, label: 'segments round', group: form },
  smooth: { type: 'int', min: 0, max: 30, default: 4, label: 'its line smoothed, marks either side', group: form },
};

/** A profile turned more than this many points along is taken a point in so many. */
const MOST = 1500;

/** The vase it is with no drawing: a belly, a neck, a lip — a mark 30 px across, a radius out from the axis. */
export const VASE = (() => {
  const stamps = [];
  for (let i = 0; i <= 120; i++) {
    const f = i / 120;
    stamps.push({ x: 40 + 140 * Math.sin(Math.PI * f * 0.9) + 50 * f * f, y: 300 - 300 * f, rotation: 0, scale: 1, flipX: 1, key: '' });
  }
  return { id: '', strokes: [stamps], masks: new Map(), size: 30 };
})();

/** A mark's size across, px: its sprite's longer side at its scale — or a drawn body's circle, with no sprite. */
const sizeOf = (drawn, st) => {
  const mask = drawn.masks && drawn.masks.get(st.key);
  return Math.abs(st.scale) * (mask ? Math.max(mask.width, mask.height) : drawn.size || 30);
};

/**
 * The geometry of a turned drawing.
 *
 * @param {object} v   its values — and `drawn`, the drawing read (drawn.js)
 * @returns {BufferGeometry}
 */
export function turnedGeometry(v) {
  const drawn = v.drawn && v.drawn.strokes && v.drawn.strokes.some(s => s.length > 1) ? v.drawn : VASE;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const stroke of drawn.strokes) for (const st of stroke) {
    x0 = Math.min(x0, st.x); x1 = Math.max(x1, st.x); y0 = Math.min(y0, st.y); y1 = Math.max(y1, st.y);
  }
  const axisX = x0 + (x1 - x0) * (Number(v.axis) || 0);
  const k = WORLD / Math.max(1e-6, x1 - x0, y1 - y0), cy = (y0 + y1) / 2;
  const segments = Math.max(3, Math.round(Number(v.segments) || 64)), wall = Math.max(0, Number(v.wall) || 0);
  const parts = [];
  for (const stroke of drawn.strokes) {
    if (stroke.length < 2) continue;
    const step = Math.max(1, Math.ceil(stroke.length / MOST));
    const marks = smoothed(stroke, Math.round(Number(v.smooth) || 0)).filter((_, i, all) => i % step === 0 || i === all.length - 1);
    // Its profile: each mark's distance from the axis, its height — y up — in the world's units.
    const line = marks.map(st => ({ r: Math.abs(st.x - axisX) * k, h: -(st.y - cy) * k, t: (wall * sizeOf(drawn, st) * k) / 2 }));
    const g = wall > 0 ? solid(line, segments) : new LatheGeometry(line.map(p => new Vector2(p.r, p.h)), segments);
    if (g.attributes.position.count) parts.push(g);
  }
  if (!parts.length) return drawn === VASE ? new LatheGeometry([new Vector2(0.5, -1), new Vector2(0.5, 1)], segments) : turnedGeometry({ ...v, drawn: null });
  return merged(parts);
}

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
 * A profile with a wall, spun: the line offset by `t` either side, square to it in the plane of radius and
 * height, the far side back the other way and the loop closed — counter-clockwise, so every face looks out.
 */
function solid(line, segments) {
  const n = line.length, side = [], back = [];
  for (let i = 0; i < n; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(n - 1, i + 1)];
    let dr = b.r - a.r, dh = b.h - a.h;
    const l = Math.hypot(dr, dh) || 1;
    dr /= l; dh /= l;
    const p = line[i];
    side.push(new Vector2(Math.max(0, p.r + dh * p.t), p.h - dr * p.t));
    back.push(new Vector2(Math.max(0, p.r - dh * p.t), p.h + dr * p.t));
  }
  const loop = [...side, ...back.reverse()];
  loop.push(loop[0].clone());
  // Counter-clockwise in radius and height, as LatheGeometry turns its faces out: its volume counted, positive.
  let area = 0;
  for (let i = 0; i < loop.length - 1; i++) area += loop[i].x * loop[i + 1].y - loop[i + 1].x * loop[i].y;
  return new LatheGeometry(area < 0 ? loop.reverse() : loop, segments);
}

/** Several geometries one: their points, normals and uv one after another, each one's triangles moved along. */
function merged(parts) {
  if (parts.length === 1) return parts[0];
  const total = parts.reduce((s, g) => s + g.attributes.position.count, 0);
  const position = new Float32Array(total * 3), normal = new Float32Array(total * 3), uv = new Float32Array(total * 2), index = [];
  let base = 0;
  for (const g of parts) {
    position.set(g.attributes.position.array, base * 3);
    normal.set(g.attributes.normal.array, base * 3);
    uv.set(g.attributes.uv.array, base * 2);
    const count = g.attributes.position.count;
    const own = g.index ? g.index.array : Array.from({ length: count }, (_, i) => i);
    for (let i = 0; i < own.length; i++) index.push(own[i] + base);
    base += count;
    g.dispose();
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(position, 3));
  out.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  out.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  out.setIndex(index);
  return out;
}
