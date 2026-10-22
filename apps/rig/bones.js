/**
 * bones.js — a drawing's bones, proposed from its strokes, and where they
 * are when turned.
 *
 * Each stroke is a chain of bones (docs/roadmap.md, M9): jointed at its
 * corners, and a run longer than `longest` px cut evenly so a long body can
 * bend too. A bone runs straight from one joint to the next, along the
 * stroke's line. The chain hangs from the bone nearest the point it starts
 * at, of the strokes drawn before it — the first stroke's first bone is the
 * root. A stroke shorter than `least` px — a dot, a tap — has no bones of
 * its own: its stamps ride the bone nearest them (skin.js).
 *
 * A bone at rest is where it was drawn: `x`, `y` its joint, `angle` the way it
 * points, `length`, and `from`–`to`, the stretch of its stroke it carries.
 * A pose is a turn for each bone, radians, about its joint; a bone turned
 * carries everything below it in the chain (`posed`). Pure.
 */

import { cornersOf, pointAt } from './strokes.js';

/** How far a point is from a bone, as drawn. */
export function distanceTo(bone, p) {
  const ex = Math.cos(bone.angle) * bone.length, ey = Math.sin(bone.angle) * bone.length;
  const span = ex * ex + ey * ey;
  const t = span > 0 ? Math.max(0, Math.min(1, ((p.x - bone.x) * ex + (p.y - bone.y) * ey) / span)) : 0;
  return Math.hypot(p.x - (bone.x + ex * t), p.y - (bone.y + ey * t));
}

/** The bone nearest a point, of `bones` — its index, or null when there are none. */
export function nearestBone(bones, p) {
  let best = null, d = Infinity;
  bones.forEach((b, i) => {
    const di = distanceTo(b, p);
    if (di < d) { d = di; best = i; }
  });
  return best;
}

/**
 * The chains are hung in drawing order, or in `order` — stroke indices, the
 * body's first — so a body drawn after its limbs can still be what they
 * hang from.
 *
 * @param {object} drawing          drawing.js `drawingOf`
 * @param {object} [opts]
 * @param {number} [opts.corner=30]   degrees: a turn that makes a joint
 * @param {number} [opts.longest=200] px: the longest a bone runs before it is cut
 * @param {number} [opts.least=4]     px: a stroke shorter has no bones
 * @param {number[]} [opts.order]     the strokes in the order their chains are hung
 * @returns {Array<{id, stroke, parent, x, y, angle, length, from, to}>}  parents before children
 */
export function proposeBones(drawing, { corner = 30, longest = 200, least = 4, order = null } = {}) {
  const bones = [];
  for (const k of order || drawing.strokes.map((_, i) => i)) {
    const stroke = drawing.strokes[k];
    const { path } = stroke;
    if (path.length < least) continue;
    const cuts = [0, ...cornersOf(path, { corner }), path.length];
    const at = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const a = cuts[i], b = cuts[i + 1], n = Math.max(1, Math.ceil((b - a) / Math.max(1, longest)));
      for (let j = 0; j < n; j++) at.push(a + ((b - a) * j) / n);
    }
    at.push(path.length);
    const earlier = bones.slice();
    for (let i = 0; i < at.length - 1; i++) {
      const p = pointAt(path, at[i]), q = pointAt(path, at[i + 1]);
      bones.push({
        id: bones.length,
        stroke: k,
        parent: i > 0 ? bones.length - 1 : nearestBone(earlier, p),
        x: p.x, y: p.y,
        angle: Math.atan2(q.y - p.y, q.x - p.x),
        length: Math.hypot(q.x - p.x, q.y - p.y),
        from: at[i], to: at[i + 1],
      });
    }
  }
  return bones;
}

/**
 * Where every bone is, turned: `{ x, y, a }`, its joint and the way it
 * points. At rest — no turns — each is where it was drawn. `lift` raises
 * the whole drawing, px: its roots, and all that hangs from them.
 *
 * @param {object[]} bones
 * @param {number[]} [turns]   radians, by bone id; missing is 0
 * @param {number} [lift=0]    px up
 * @returns {Array<{x: number, y: number, a: number}>}
 */
export function posed(bones, turns = [], lift = 0) {
  const out = [];
  for (const b of bones) {
    const d = turns[b.id] || 0;
    if (b.parent == null) {
      out.push({ x: b.x, y: b.y - lift, a: b.angle + d });
      continue;
    }
    const p = bones[b.parent], t = out[b.parent];
    const c = Math.cos(p.angle), s = Math.sin(p.angle);
    const lx = c * (b.x - p.x) + s * (b.y - p.y), ly = -s * (b.x - p.x) + c * (b.y - p.y);
    const ca = Math.cos(t.a), sa = Math.sin(t.a);
    out.push({ x: t.x + ca * lx - sa * ly, y: t.y + sa * lx + ca * ly, a: t.a + (b.angle - p.angle) + d });
  }
  return out;
}

/** A posed bone's far end. */
export const tipOf = (bone, t) => ({ x: t.x + Math.cos(t.a) * bone.length, y: t.y + Math.sin(t.a) * bone.length });

/**
 * The turn that points a bone at `q`, as things are posed now: its own turn
 * changed by however far its posed direction is from `q`'s.
 */
export function turnToward(bone, t, turn, q) {
  const want = Math.atan2(q.y - t.y, q.x - t.x);
  return turn + Math.atan2(Math.sin(want - t.a), Math.cos(want - t.a));
}
