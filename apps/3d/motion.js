/**
 * motion.js — the model turning: a turntable (M10's fifth brick, P1,
 * 2026-11-06; docs/plan.md).
 *
 * A loop of `length` frames at `fps`: frame i seen from the yaw plus
 * 360° × turns × i / length — 0 turns a still, ±1, ±2 — and i taken modulo
 * the length, so the frame after the last is the first, to the bit. What
 * turns:
 *
 *   the model   on a turntable, under the eye and the sun: the sun turns with
 *               the eye, so every side comes round into the light, and its
 *               shadow turns with it
 *   the eye     walked round the model under a sun fixed in the world, as a
 *               drag turns round it (scene.js, *The light*): its dark side
 *               comes round too
 *
 * A frame's values are the recipe's with the yaw moved — and the sun's, as
 * the model turns — from the frame's index alone: any frame drawn on its
 * own, as fractals' idles and the rig's loops are. Pure: Node runs it
 * (tests/3d-camera.mjs).
 */

const motion = 'motion';
const TURNING = { turns: { not: 0 } };

/** The motion's rows, for the app's schema. */
export const MOTION_PARAMS = {
  turns:   { type: 'int', min: -2, max: 2, default: 0, label: 'turns a loop', group: motion },
  turning: { type: 'enum', options: ['the model', 'the eye'], default: 'the model', display: 'chips', label: 'what turns', group: motion, when: TURNING },
  length:  { type: 'int', min: 2, max: 600, default: 72, label: 'loop, frames', group: motion, when: TURNING },
  fps:     { type: 'int', min: 1, max: 60, default: 24, label: 'fps', group: motion, when: TURNING },
};

/**
 * The loop the values make: its frames and their rate — a still's one frame when nothing turns, and in
 * a recipe saved before the turntable, which has no `turns`.
 *
 * @returns {{length: number, fps: number, loop: boolean, turns: number}}
 */
export function loopOf(v) {
  const turns = Math.round(Number(v && v.turns) || 0);
  if (!turns) return { length: 1, fps: 0, loop: false, turns: 0 };
  return { length: Math.max(2, Math.round(Number(v.length) || 72)), fps: Math.max(1, Number(v.fps) || 24), loop: true, turns };
}

/** How far round frame `i` is turned, in degrees: whole steps of the loop, i modulo its length. */
export function turnedAt(v, i) {
  const { length, turns } = loopOf(v);
  if (!turns) return 0;
  const k = ((Math.round(Number(i) || 0) % length) + length) % length;
  return (360 * turns * k) / length;
}

/** The values frame `i` is seen with: the yaw turned on, and the sun with it when the model turns. */
export function seenAt(v, i) {
  const by = turnedAt(v, i);
  if (!by) return v;
  return { ...v, yaw: v.yaw + by, ...(v.turning === 'the eye' ? {} : { sunYaw: v.sunYaw + by }) };
}
