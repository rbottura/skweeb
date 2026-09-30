/**
 * motion.js — one param swung over a loop: an idle, in either family.
 *
 * The author's find, 2026-09-28: a tree's *each copy turned °* swung
 * between −10 and +10 is a plant in a breeze. So a copies picture may
 * `move` one param — the twist, the branches' spread, each copy's ratio,
 * the whole turn or size. Escape time may `moveEscape` one of its own
 * (2026-09-30): the ramp's `phase` — a palette cycling — or the Julia set's
 * `c` round a circle of `radius` about the `c` chosen, `from` and `to` then
 * degrees along it. Either moves `from` one value `to` another over
 * `frames` at `fps`:
 *
 *   there and back   from, to, and back to from along the curve both ways —
 *                    it eases at each end, and the loop closes on itself
 *   once through     from to to along the curve, then from again — for a
 *                    whole turn, 0 to 360, or the ramp once round, 0 to 1,
 *                    where the two ends are the same picture
 *
 * A frame's values are the recipe's with that one replaced, from its tick
 * alone (`valuesAt`), so any frame is drawn on its own and frame `frames` is
 * frame 0: the loop closes exactly, as particles' do.
 */

import { easeParam, easing } from '../../core/easing.js';

/** What can move in a copies picture, and what it is called on the panel. */
export const MOVABLE = {
  twist:  'each copy turned',
  spread: 'branches apart',
  ratio:  'each copy ×',
  turn:   'the whole turned',
  size:   'the whole sized',
};

/** What can move in escape time. The Julia `c` moves only a Julia set. */
export const MOVABLE_ESCAPE = {
  phase: 'the ramp, round',
  julia: 'julia c, round a circle',
};

/** Which key says what moves, by family, and what it may name. */
const MOVERS = {
  copies: { key: 'move', movable: MOVABLE },
  escape: { key: 'moveEscape', movable: MOVABLE_ESCAPE },
};

/** What moves in these values — a param's name, or `julia` — or null: a still. */
export function moverOf(v) {
  const m = v && MOVERS[v.family];
  const what = m && v[m.key];
  if (typeof what !== 'string' || !Object.hasOwn(m.movable, what)) return null;
  return what === 'julia' && v.kind !== 'julia' ? null : what;
}

/** A range to start from when a param is picked to move: round its value now. */
export function rangeAround(key, value) {
  const v = Number(value) || 0;
  if (key === 'ratio') return { from: Math.max(0.05, v - 0.03), to: Math.min(0.98, v + 0.03) };
  if (key === 'size') return { from: v * 0.92, to: v * 1.08 };
  if (key === 'turn') return { from: v, to: v + 360, wave: 'through' };
  if (key === 'phase') return { from: v, to: v + 1, wave: 'through', ease: 'linear' };
  if (key === 'julia') return { from: 0, to: 360, wave: 'through', ease: 'linear' };
  return { from: v - 10, to: v + 10 };
}

const still = labels => ({ none: 'nothing: a still', ...labels });
const ROUND_C = { family: 'escape', moveEscape: 'julia', kind: 'julia' };
/** The shared rows show while anything moves, in either family. */
const MOVING = [{ family: 'copies', move: Object.keys(MOVABLE) }, { family: 'escape', moveEscape: 'phase' }, ROUND_C];

/** The Motion drawer's params, for params.js. */
export const MOTION_PARAMS = {
  move:   { type: 'enum', options: ['none', ...Object.keys(MOVABLE)], default: 'none', label: 'moving',
            labels: still(MOVABLE), group: 'motion', when: { family: 'copies' } },
  moveEscape: { type: 'enum', options: ['none', ...Object.keys(MOVABLE_ESCAPE)], default: 'none', label: 'moving',
            labels: still(MOVABLE_ESCAPE), group: 'motion', when: { family: 'escape' } },
  /** The circle the Julia `c` goes round, about the `c` chosen, in the plane's units. */
  radius: { type: 'range', min: 0.0001, max: 2, step: 'any', log: true, default: 0.02, label: 'radius round c',
            group: 'motion', when: ROUND_C },
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
  return moverOf(v) ? Math.max(2, Math.round(v.frames)) : 1;
}

/**
 * The values at a frame: the recipe's, the moving one swung to where this
 * tick puts it — or the Julia `c` that many degrees round its circle, the
 * recipe's `c` the centre. A still's values are its own at every tick.
 *
 * @param {object} v     the values
 * @param {number} tick  any integer: it wraps
 */
export function valuesAt(v, tick) {
  const what = moverOf(v);
  if (!what) return v;
  const n = loopOf(v);
  const p = (((tick % n) + n) % n) / n;           // 0 to 1, never 1
  const curve = easing(v.ease);
  const k = v.wave === 'through' ? curve(p) : curve(p < 0.5 ? p * 2 : 2 - p * 2);
  const at = v.from + (v.to - v.from) * k;
  if (what !== 'julia') return { ...v, [what]: at };
  const a = at * Math.PI / 180, r = Number(v.radius) || 0;
  return { ...v, jx: v.jx + r * Math.cos(a), jy: v.jy + r * Math.sin(a) };
}
