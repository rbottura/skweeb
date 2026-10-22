/**
 * sway.js — the drawing moved by the author's head: the body bending as
 * the head leans and turns, the whole rising as it nods, the eyestalks and
 * the arms swinging after it on springs.
 *
 * The rig names its chains (../parts.js): the body is the root chain, from
 * its base up; the stalks are `head`; every other chain — arms, legs, a
 * tail — is loose. The head's pose as the page shows it (head.js) sets a
 * target turn for each bone. The body bends towards where the head leans,
 * turns and moves, its top turning `sway` times a share of each, the bend
 * spread up it, more at the top, its base staying where it stands; the
 * stalks lean on into a turn, as eyes look; a nod lifts the drawing by a
 * share of its body (`nod`). A loose limb has no target: it only follows.
 *
 * Then each bone is a damped spring on the way it points — not on its turn
 * from its parent — so when the body swings, a stalk is left behind a
 * moment, catches up and overshoots: follow-through, as the rig's waves
 * make it, answering the head. The body follows near critically damped; the
 * stalks and the loose limbs `wobble`, from 0, settling at once, to 1,
 * swinging long. A spring has a past, so none of this is ever in a recipe:
 * a puppet worn is a performance (main.js). Pure but for the springs.
 */

const RAD = Math.PI / 180;

/** The body's top turns this share of the head's lean and of its turn, and so far a centimetre aside. */
const BEND = { roll: 0.6, yaw: 0.35, x: 1.2 * RAD };
/** The stalks lean on by this share of the head's turn, spread down each. */
const LEAN = 0.3;
/** A nod of 90° up would lift the drawing this share of its body's length. */
const LIFT = 0.15;
/** The most the head turns any bone. */
const MOST = 40 * RAD;
/** How the springs answer: Hz, and the body's damping. */
const BODY_HZ = 3.2, BODY_DAMPING = 0.85, LOOSE_HZ = 2.4;
/** The longest step a spring takes, s: past it a frame is taken in several. */
const STEP = 1 / 120;

const clamp = (v, most) => Math.max(-most, Math.min(most, v));

/**
 * The bones by what they do: the body's, base first; each stalk's and each
 * loose limb's, from where it hangs out.
 *
 * @param {Array<{id, stroke, parent, from, part}>} bones
 * @returns {{body: number[], stalks: number[][], loose: number[][]}}
 */
export function limbsOf(bones) {
  const chains = new Map();
  for (const b of bones) {
    if (!chains.has(b.stroke)) chains.set(b.stroke, []);
    chains.get(b.stroke).push(b);
  }
  const root = bones.find(b => b.parent == null);
  const out = { body: [], stalks: [], loose: [] };
  for (const [stroke, chain] of chains) {
    const ids = chain.sort((a, b) => a.from - b.from).map(b => b.id);
    if (root && stroke === root.stroke) out.body = ids;
    else (chain[0].part === 'head' ? out.stalks : out.loose).push(ids);
  }
  return out;
}

/** A turn spread down a chain so its last bone points `total` further: each bone's share as far along as it is. */
function spread(turns, chain, total) {
  const n = chain.length, whole = (n * (n + 1)) / 2;
  chain.forEach((id, i) => { turns[id] += (total * (i + 1)) / whole; });
}

/**
 * What the head asks of each bone: a turn from its parent, and a lift.
 *
 * @param {object[]} bones
 * @param {object} limbs        limbsOf's
 * @param {?{yaw, pitch, roll, x}} pose   as shown, from straight — or null with no face
 * @param {object} [values]     the panel's: { sway, nod }
 * @param {number} [bodyLength] px
 * @returns {{turns: Float64Array, lift: number}}  radians by bone id; px up
 */
export function targetsOf(bones, limbs, pose, { sway = 1, nod = 1 } = {}, bodyLength = 0) {
  const turns = new Float64Array(bones.length);
  if (!pose) return { turns, lift: 0 };
  spread(turns, limbs.body, clamp((BEND.roll * pose.roll + BEND.yaw * pose.yaw + BEND.x * pose.x) * sway, MOST));
  for (const stalk of limbs.stalks) spread(turns, stalk, clamp(LEAN * pose.yaw * sway, MOST));
  return { turns, lift: Math.sin(pose.pitch) * LIFT * nod * bodyLength };
}

/**
 * A spring a bone, on the way each points: `step` moves them all on by
 * `dt` towards the targets and gives each bone's turn from its parent.
 *
 * @param {object[]} bones   parents before children, as the rig proposes them
 * @param {object} limbs
 */
export function springsFor(bones, limbs) {
  const n = bones.length;
  const at = new Float64Array(n), speed = new Float64Array(n), out = new Float64Array(n);
  const body = new Uint8Array(n);
  for (const id of limbs.body) body[id] = 1;
  return {
    /**
     * @param {Float64Array} targets   targetsOf's turns
     * @param {number} dt              seconds since the last step
     * @param {object} [opts]          { wobble } 0 to 1
     * @returns {Float64Array}         each bone's turn from its parent, radians
     */
    step(targets, dt, { wobble = 0.5 } = {}) {
      const loose = 0.9 - 0.75 * Math.max(0, Math.min(1, wobble));
      const steps = Math.max(1, Math.ceil(Math.min(dt, 0.1) / STEP)), h = Math.min(dt, 0.1) / steps;
      for (let s = 0; s < steps; s++) {
        for (const b of bones) {
          const w = 2 * Math.PI * (body[b.id] ? BODY_HZ : LOOSE_HZ), z = body[b.id] ? BODY_DAMPING : loose;
          const goal = (b.parent == null ? 0 : at[b.parent]) + targets[b.id];
          speed[b.id] += (w * w * (goal - at[b.id]) - 2 * z * w * speed[b.id]) * h;
          at[b.id] += speed[b.id] * h;
        }
      }
      for (const b of bones) out[b.id] = clamp(at[b.id] - (b.parent == null ? 0 : at[b.parent]), 1.5 * MOST);
      return out;
    },
    reset() { at.fill(0); speed.fill(0); },
  };
}

/** How far the drawing may move from where it was drawn, for its room: a share of its size. */
export const reachOfSway = ({ sway = 1, nod = 1 } = {}, size = 0) => size * (0.12 * Math.min(1.5, sway) + 0.04 * Math.min(2, nod));
