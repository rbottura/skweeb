/**
 * skin.js — which bones carry each stamp, and where a stamp is when they
 * turn.
 *
 * The rig's own way (docs/roadmap.md, M9): a stamp rides its own stroke's
 * bones, never the nearest, so an arm drawn over the body is never taken by
 * the body; and it stays whole — moved and turned, never stretched. Near a
 * joint, within `bend` px along the stroke, it is carried by both bones,
 * half and half at the joint itself, so a bend crowds the stamps inside it
 * and fans those outside: the scales. A chain's first stamps share with the
 * bone it hangs from. A stroke with no bones — a dot — rides the bone
 * nearest it, whole.
 *
 * A stamp's binding keeps where it sits in each bone's rest frame, so a
 * posed stamp is a weighted sum of where those frames have gone (`placeOf`),
 * and at rest it is exactly where it was drawn. Pure.
 */

import { nearestBone } from './bones.js';

const smooth = t => { const u = Math.max(0, Math.min(1, t)); return u * u * (3 - 2 * u); };

/** A stamp's place in a bone's rest frame. */
function local(bone, stamp) {
  const c = Math.cos(bone.angle), s = Math.sin(bone.angle), dx = stamp.x - bone.x, dy = stamp.y - bone.y;
  return { lx: c * dx + s * dy, ly: -s * dx + c * dy };
}

/**
 * @param {object} drawing          drawing.js `drawingOf`
 * @param {object[]} bones          bones.js `proposeBones`
 * @param {object} [opts]
 * @param {number} [opts.bend=12]   px along a stroke, either side of a joint, shared by its two bones
 * @returns {Array<Array<{bone: number, w: number, lx: number, ly: number}>>}  by stamp; empty with no bones at all
 */
export function bind(drawing, bones, { bend = 12 } = {}) {
  const chains = new Map();
  for (const b of bones) {
    if (!chains.has(b.stroke)) chains.set(b.stroke, []);
    chains.get(b.stroke).push(b);
  }
  return drawing.stamps.map(stamp => {
    const chain = chains.get(stamp.stroke);
    if (!chain) {
      const near = nearestBone(bones, stamp);
      return near == null ? [] : [{ bone: near, w: 1, ...local(bones[near], stamp) }];
    }
    let j = chain.findIndex(b => stamp.s <= b.to);
    if (j < 0) j = chain.length - 1;
    const own = chain[j];
    let other = null, w = 1;
    if (bend > 0 && stamp.s - own.from < bend) {
      const before = j > 0 ? chain[j - 1] : (own.parent != null ? bones[own.parent] : null);
      if (before) { other = before; w = smooth(0.5 + (stamp.s - own.from) / (2 * bend)); }
    } else if (bend > 0 && own.to - stamp.s < bend && j < chain.length - 1) {
      other = chain[j + 1];
      w = smooth(0.5 + (own.to - stamp.s) / (2 * bend));
    }
    const out = [{ bone: own.id, w, ...local(own, stamp) }];
    if (other && w < 1) out.push({ bone: other.id, w: 1 - w, ...local(other, stamp) });
    return out;
  });
}

/**
 * Where a stamp is, its bones posed: its place and its turn, the weighted
 * sum of where its bones' frames went and how far they turned.
 *
 * @param {{x, y, rotation}} stamp
 * @param {Array<{bone, w, lx, ly}>} binding
 * @param {object[]} bones           at rest
 * @param {Array<{x, y, a}>} at      bones.js `posed`
 */
export function placeOf(stamp, binding, bones, at) {
  if (!binding.length) return { x: stamp.x, y: stamp.y, rotation: stamp.rotation };
  let x = 0, y = 0, turn = 0;
  for (const { bone, w, lx, ly } of binding) {
    const t = at[bone], c = Math.cos(t.a), s = Math.sin(t.a);
    x += w * (t.x + c * lx - s * ly);
    y += w * (t.y + s * lx + c * ly);
    turn += w * (t.a - bones[bone].angle);
  }
  return { x, y, rotation: stamp.rotation + turn };
}
