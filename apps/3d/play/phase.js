/**
 * phase.js — a passage from one body to another, by the seconds since it
 * began (M16b, docs/worm.md). The author: "plusieurs vas et viens très
 * rapide, 3 ou 4 ou plus et se fix sur B pour un passage de A vers B dans le
 * 'pont spectrale' qui relie les 2 entitées".
 *
 * Four stages, one after the other:
 *  - `framing`: the walker stops, the camera goes to where both bodies are
 *    seen, the bridge comes — `framed` 0 to 1;
 *  - `swinging`: the phase, 0 at A and 1 at B, goes there and back `swings`
 *    times, fast, and over to B once more — `phase`;
 *  - `fixed`: held on B, the world turning to B's — `fixed` 0 to 1;
 *  - `bonded`: B is the one walked.
 *
 * Each half swing eases out of one body and into the other — a cosine — so
 * the last comes to rest on B. Pure: Node runs it (tests/3d-play.mjs).
 */

/** The phase at `u` of the swinging, 0 to 1: `swings` there and back, then over to B for good. */
export function swingAt(u, swings) {
  const k = Math.max(0, Math.min(1, u)), halves = 2 * Math.max(0, Math.round(swings)) + 1;
  return (1 - Math.cos(Math.PI * halves * k)) / 2;
}

/** How long each stage lasts by default, in seconds: the swinging the author's "très rapide". */
export const TIMES = { frame: 0.9, swing: 2.4, hold: 0.7 };

/**
 * Where a passage is `t` seconds after it began: its stage, its phase, and how far through framing and fixing.
 *
 * @param {number} t
 * @param {{ frame?: number, swing?: number, hold?: number, swings?: number }} [o]
 * @returns {{ stage: string, phase: number, framed: number, fixed: number }}
 */
export function passageAt(t, { frame = TIMES.frame, swing = TIMES.swing, hold = TIMES.hold, swings = 4 } = {}) {
  if (t < frame) return { stage: 'framing', phase: 0, framed: Math.max(0, t / frame), fixed: 0 };
  if (t < frame + swing) return { stage: 'swinging', phase: swingAt((t - frame) / swing, swings), framed: 1, fixed: 0 };
  if (t < frame + swing + hold) return { stage: 'fixed', phase: 1, framed: 1, fixed: (t - frame - swing) / hold };
  return { stage: 'bonded', phase: 1, framed: 1, fixed: 1 };
}

/** A ghost's light at `phase`, the ghost `at` its place along the bridge, of `count`: brightest as the phase passes. */
export function glowAt(phase, at, count) {
  const d = (phase - at) * (count + 1) / 1.2;
  return 0.12 + 0.88 * Math.exp(-d * d);
}
