/**
 * parts.js — what each chain is: the body, the head, an arm, a leg, a tail.
 *
 * A walk is made of parts, not of bone numbers, so one walk drives any
 * drawing whose chains are named the same — the slug from the front, the
 * back, the side (docs/roadmap.md, M9). The parts are guessed from where a
 * chain hangs on the body and which way it points, and corrected by hand:
 *
 *   the body   the chain the root bone starts — the first stroke drawn
 *   head       hangs from the top of the body and points on, as stalks do
 *   leg        hangs from the lower half and points back against the body
 *   arm        anything else hanging from the body
 *
 * Left and right are as seen: the side of the body a chain's far end lies
 * on, in the picture. A chain hanging from another limb is that limb's, and
 * named nothing. Each bone carries its chain's part (`bone.part`). Pure.
 */

import { tipOf } from './bones.js';

export const PARTS = ['none', 'body', 'head', 'arm-left', 'arm-right', 'leg-left', 'leg-right', 'tail'];

const RAD = Math.PI / 180;

/** The bones by chain — a stroke's — in their order along it. */
export function chainsOf(bones) {
  const out = new Map();
  for (const b of bones) {
    if (!out.has(b.stroke)) out.set(b.stroke, []);
    out.get(b.stroke).push(b);
  }
  for (const chain of out.values()) chain.sort((a, b) => a.from - b.from);
  return out;
}

const atRest = b => ({ x: b.x, y: b.y, a: b.angle });

/**
 * A part for every chain, guessed: `{ [stroke]: part }`.
 *
 * @param {object[]} bones   at rest, bones.js `proposeBones`
 */
export function guessParts(bones) {
  const out = {};
  if (!bones.length) return out;
  const chains = chainsOf(bones);
  const root = bones.find(b => b.parent == null) || bones[0];
  const body = chains.get(root.stroke);
  out[root.stroke] = 'body';
  const start = { x: body[0].x, y: body[0].y };
  const end = tipOf(body[body.length - 1], atRest(body[body.length - 1]));
  const dx = end.x - start.x, dy = end.y - start.y, span = dx * dx + dy * dy || 1;
  const onBody = new Set(body.map(b => b.id));

  for (const [stroke, chain] of chains) {
    if (stroke === root.stroke) continue;
    const first = chain[0];
    if (!onBody.has(first.parent)) { out[stroke] = 'none'; continue; }
    const far = tipOf(chain[chain.length - 1], atRest(chain[chain.length - 1]));
    const t = ((first.x - start.x) * dx + (first.y - start.y) * dy) / span;        // 0 at the body's start, 1 at its end
    const vx = far.x - first.x, vy = far.y - first.y;
    const turn = Math.abs(Math.atan2(dx * vy - dy * vx, dx * vx + dy * vy));       // from the body's way to the chain's
    const side = dx * (far.y - start.y) - dy * (far.x - start.x) > 0 ? 'right' : 'left';
    if (t >= 0.6 && turn <= 50 * RAD) out[stroke] = 'head';
    else if (t <= 0.5 && turn >= 110 * RAD) out[stroke] = `leg-${side}`;
    else out[stroke] = `arm-${side}`;
  }
  return out;
}

/** Bones with their chain's part on each: the guess, where none was given. */
export function withParts(bones, parts = guessParts(bones)) {
  return bones.map(b => ({ ...b, part: PARTS.includes(b.part) ? b.part : (parts[b.stroke] || 'none') }));
}
