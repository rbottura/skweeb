/**
 * presets.js — a walk, a waddle, an idle: waves set by part (parts.js), so
 * any drawing whose chains are named moves the same way, from the front or
 * the side. Each is a starting point — what it sets is ordinary waves, a
 * rise and a loop, edited bone by bone after. Pure.
 *
 * A wave goes on a chain's first bone, and the chain follows it, a lag a
 * bone, where the chain has more than one: a knee after its thigh, a hand
 * after its arm, a stalk's tip after its base. Opposite phases make the
 * legs step against each other and each arm swing against its leg. The
 * rise is a share of the body's length, so a small creature bobs small.
 */

import { chainsOf } from './parts.js';
import { tipOf } from './bones.js';

/** By name: its loop, its rise as a share of the body, and a wave for each part. */
export const PRESETS = {
  walk: {
    label: 'Walk — from the side', length: 24, fps: 24, rise: 0.03, rises: 2,
    parts: {
      'leg-left':  { swing: 24, cycles: 1, phase: 0,   follow: true, lag: 70 },
      'leg-right': { swing: 24, cycles: 1, phase: 180, follow: true, lag: 70 },
      'arm-left':  { swing: 18, cycles: 1, phase: 180, follow: true, lag: 45 },
      'arm-right': { swing: 18, cycles: 1, phase: 0,   follow: true, lag: 45 },
      body:        { swing: 2,  cycles: 2, phase: 0 },
      head:        { swing: 5,  cycles: 2, phase: 90,  follow: true, lag: 60 },
      tail:        { swing: 10, cycles: 1, phase: 90,  follow: true, lag: 50 },
    },
  },
  waddle: {
    label: 'Waddle — from the front', length: 24, fps: 24, rise: 0.02, rises: 2,
    parts: {
      body:        { swing: 6,  cycles: 1, phase: 0 },
      'leg-left':  { swing: 6,  cycles: 1, phase: 180 },             // against the body: the feet stay down
      'leg-right': { swing: 6,  cycles: 1, phase: 180 },
      'arm-left':  { swing: 14, cycles: 1, phase: 0,   follow: true, lag: 40 },
      'arm-right': { swing: 14, cycles: 1, phase: 180, follow: true, lag: 40 },
      head:        { swing: 6,  cycles: 1, phase: 180, follow: true, lag: 60 },
      tail:        { swing: 10, cycles: 1, phase: 90,  follow: true, lag: 50 },
    },
  },
  idle: {
    label: 'Idle — breathing', length: 48, fps: 24, rise: 0.012, rises: 1,
    parts: {
      body:        { swing: 1.5, cycles: 1, phase: 0 },
      head:        { swing: 6,   cycles: 1, phase: 90,  follow: true, lag: 60 },
      'arm-left':  { swing: 4,   cycles: 1, phase: 180, follow: true, lag: 40 },
      'arm-right': { swing: 4,   cycles: 1, phase: 0,   follow: true, lag: 40 },
      tail:        { swing: 8,   cycles: 1, phase: 90,  follow: true, lag: 50 },
    },
  },
};

/** The body's length at rest: from its first joint to its last bone's end. */
export function bodyLength(bones) {
  const root = bones.find(b => b.parent == null);
  if (!root) return 0;
  const body = chainsOf(bones).get(root.stroke);
  const last = body[body.length - 1], end = tipOf(last, { x: last.x, y: last.y, a: last.angle });
  return Math.hypot(end.x - body[0].x, end.y - body[0].y);
}

/**
 * A preset on a drawing's bones: a wave a bone — on each named chain's
 * first, null elsewhere — and the values it sets: the loop, the rise.
 *
 * @param {string} name       a key of PRESETS
 * @param {object[]} bones    with their parts (parts.js `withParts`)
 * @returns {{waves: Array<?object>, values: {length, fps, rise, rises}}}
 */
export function preset(name, bones) {
  const p = PRESETS[name];
  if (!p) throw new Error(`rig: no preset called ${name}`);
  const waves = bones.map(() => null);
  for (const chain of chainsOf(bones).values()) {
    const w = p.parts[chain[0].part];
    if (!w) continue;
    waves[chain[0].id] = { swing: w.swing, cycles: w.cycles, phase: w.phase,
                           follow: !!w.follow && chain.length > 1, lag: w.lag ?? 45 };
  }
  const rise = Math.round(p.rise * bodyLength(bones) * 10) / 10;
  return { waves, values: { length: p.length, fps: p.fps, rise, rises: p.rises } };
}
