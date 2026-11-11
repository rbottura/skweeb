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
 *
 * And a shape swung (P2, 2026-11-06): its place on a wave, as the rig
 * swings a bone — a turn about an axis, a move along one, its size — as far
 * either way as it says, a whole number of cycles in the loop and at its
 * phase, so frame `length` is frame 0 here too. A shape that swings makes
 * the model a loop, turning or not.
 *
 * And a cloud under its forces (forces.js, G2, 2026-11-11): `time` is how
 * long they have acted, the state a still and a print show; a model with a
 * cloud that moves is then its evolution — frame 0 at rest, the last at
 * `time` — a sequence played once, which does not close: the author's pick.
 * What turns or swings turns and swings along it.
 */

import { forcesOn } from './forces.js';

const motion = 'motion';
const TURNING = { turns: { not: 0 } };
const RAD = Math.PI / 180;

/** The motion's rows, for the app's schema: the loop's length and rate are a swung shape's too (P2). */
export const MOTION_PARAMS = {
  turns:   { type: 'int', min: -2, max: 2, default: 0, label: 'turns a loop', group: motion },
  turning: { type: 'enum', options: ['the model', 'the eye'], default: 'the model', display: 'chips', label: 'what turns', group: motion, when: TURNING },
  length:  { type: 'int', min: 2, max: 600, default: 72, label: 'loop, frames', group: motion },
  fps:     { type: 'int', min: 1, max: 60, default: 24, label: 'fps', group: motion },
  /** How long a cloud's forces have acted (forces.js): 0, at rest; more, its evolution from rest to then. */
  time:    { type: 'range', min: 0, max: 60, step: 0.05, default: 0, label: 'time under the forces', unit: 's', group: motion },
};

/** Whether a model's clouds move: one shown, with a force on, and time for it. */
export const evolves = v => !!v && Number(v.time) > 0 && Array.isArray(v.shapes)
  && v.shapes.some(s => !!s && s.on !== false && s.id === 'cloud' && forcesOn(s.params));

/** Whether a shape swings: on, and its `swingBy` a place key, not `none` (shapes.js). */
export const swings = shape => !!shape && shape.on !== false && !!shape.params
  && typeof shape.params.swingBy === 'string' && shape.params.swingBy !== 'none';

/**
 * The frames the values make and their rate — a still's one frame when nothing turns, swings or evolves, and in a
 * recipe saved before the turntable, which has no `turns`. `loop`: more frames than one; `closes`: the frame
 * after the last is the first — not for an evolution, which plays once.
 *
 * @returns {{length: number, fps: number, loop: boolean, closes: boolean, turns: number, swings: boolean, evolves: boolean}}
 */
export function loopOf(v) {
  const turns = Math.round(Number(v && v.turns) || 0);
  const swung = !!v && Array.isArray(v.shapes) && v.shapes.some(swings);
  const evolving = evolves(v);
  if (!turns && !swung && !evolving) return { length: 1, fps: 0, loop: false, closes: false, turns: 0, swings: false, evolves: false };
  return { length: Math.max(2, Math.round(Number(v.length) || 72)), fps: Math.max(1, Number(v.fps) || 24), loop: true,
           closes: !evolving, turns, swings: swung, evolves: evolving };
}

/** How long the forces have acted at frame `i` of an evolution: 0 at the first, `time` at the last. */
export function elapsedAt(v, i) {
  const { length, evolves: evolving } = loopOf(v);
  if (!evolving) return 0;
  const k = Math.max(0, Math.min(length - 1, Math.round(Number(i) || 0)));
  return (Number(v.time) * k) / (length - 1);
}

/**
 * A shape at frame `i` of a loop `length` long: its swing's place key moved on its wave — whole cycles, so
 * frame `length` is frame 0 — or the shape itself, when it does not swing.
 */
export function swungAt(shape, i, length) {
  if (!swings(shape) || !(length > 0)) return shape;
  const p = shape.params, key = p.swingBy;
  const cycles = Math.max(1, Math.round(Number(p.swingCycles) || 1));
  const k = ((cycles * Math.round(Number(i) || 0)) % length + length) % length;
  const wave = Math.sin((2 * Math.PI * k) / length + (Number(p.swingPhase) || 0) * RAD);
  const base = Number.isFinite(Number(p[key])) ? Number(p[key]) : key === 'size' ? 1 : 0;
  const moved = key.startsWith('turn') ? base + (p.swingTurn ?? 20) * wave
    : key === 'size' ? base * (1 + (p.swingSize ?? 0.15) * wave)
    : base + (p.swingMove ?? 0.25) * wave;
  return { ...shape, params: { ...p, [key]: moved } };
}

/** How far round frame `i` is turned, in degrees: whole steps of the loop, i modulo its length. */
export function turnedAt(v, i) {
  const { length, turns } = loopOf(v);
  if (!turns) return 0;
  const k = ((Math.round(Number(i) || 0) % length) + length) % length;
  return (360 * turns * k) / length;
}

/**
 * The values frame `i` is seen with: the yaw turned on, the sun with it when the model turns, its shapes swung —
 * and `elapsed`, how long its clouds' forces have acted, in an evolution (scene.js).
 */
export function seenAt(v, i) {
  const { length, swings: swung, evolves: evolving } = loopOf(v);
  const by = turnedAt(v, i);
  let out = by ? { ...v, yaw: v.yaw + by, ...(v.turning === 'the eye' ? {} : { sunYaw: v.sunYaw + by }) } : v;
  if (swung) out = { ...out, shapes: v.shapes.map(s => swungAt(s, i, length)) };
  if (evolving) out = { ...out, elapsed: elapsedAt(v, i) };
  return out;
}
