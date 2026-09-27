/**
 * motion.js — one of the copies' params swung over a loop: an idle.
 *
 * The author's find, 2026-09-28: a tree's *each copy turned °* swung
 * between −10 and +10 is a plant in a breeze. So a copies picture may
 * `move` one param — the twist, the branches' spread, each copy's ratio,
 * the whole turn or size — `from` one value `to` another over `frames` at
 * `fps`:
 *
 *   there and back   from, to, and back to from along the curve both ways —
 *                    it eases at each end, and the loop closes on itself
 *   once through     from to to along the curve, then from again — for a
 *                    whole turn, 0 to 360, where the two ends are the same
 *
 * A frame's values are the recipe's with that one replaced, from its tick
 * alone (`valuesAt`), so any frame is drawn on its own and frame `frames` is
 * frame 0: the loop closes exactly, as particles' do.
 */

import { easeParam, easing } from '../../core/easing.js';

/** What can move, and what it is called on the panel. */
export const MOVABLE = {
  twist:  'each copy turned',
  spread: 'branches apart',
  ratio:  'each copy ×',
  turn:   'the whole turned',
  size:   'the whole sized',
};

/** A range to start from when a param is picked to move: round its value now. */
export function rangeAround(key, value) {
  const v = Number(value) || 0;
  if (key === 'ratio') return { from: Math.max(0.05, v - 0.03), to: Math.min(0.98, v + 0.03) };
  if (key === 'size') return { from: v * 0.92, to: v * 1.08 };
  if (key === 'turn') return { from: v, to: v + 360, wave: 'through' };
  return { from: v - 10, to: v + 10 };
}

const COPIES = { family: 'copies' };
const MOVING = { family: 'copies', move: Object.keys(MOVABLE) };

/** The Motion drawer's params, for params.js. */
export const MOTION_PARAMS = {
  move:   { type: 'enum', options: ['none', ...Object.keys(MOVABLE)], default: 'none', label: 'moving',
            labels: { none: 'nothing: a still', ...MOVABLE }, group: 'motion', when: COPIES },
  from:   { type: 'range', min: -720, max: 720, step: 'any', default: -10, label: 'from', group: 'motion', when: MOVING },
  to:     { type: 'range', min: -720, max: 720, step: 'any', default: 10, label: 'to', group: 'motion', when: MOVING },
  wave:   { type: 'enum', options: ['back', 'through'], default: 'back', display: 'chips', label: 'loop',
            labels: { back: 'there and back', through: 'once through' }, group: 'motion', when: MOVING },
  ease:   easeParam({ default: 'inOutSine', label: 'curve', group: 'motion', when: MOVING }, { all: true }),
  frames: { type: 'int', min: 2, max: 600, default: 48, label: 'frames', group: 'motion', when: MOVING },
  fps:    { type: 'int', min: 1, max: 60, default: 24, label: 'fps', group: 'motion', when: MOVING },
};

/** How many frames the picture is: its loop's, or one for a still. */
export function loopOf(v) {
  return v && v.family === 'copies' && v.move in MOVABLE ? Math.max(2, Math.round(v.frames)) : 1;
}

/**
 * The values at a frame: the recipe's, the moving one swung to where this
 * tick puts it. A still's values are its own at every tick.
 *
 * @param {object} v     the values
 * @param {number} tick  any integer: it wraps
 */
export function valuesAt(v, tick) {
  const n = loopOf(v);
  if (n < 2) return v;
  const p = (((tick % n) + n) % n) / n;           // 0 to 1, never 1
  const curve = easing(v.ease);
  const k = v.wave === 'through' ? curve(p) : curve(p < 0.5 ? p * 2 : 2 - p * 2);
  return { ...v, [v.move]: v.from + (v.to - v.from) * k };
}
