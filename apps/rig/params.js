/**
 * params.js — the rig's schema: the drawing it rigs, and how its bones are
 * proposed from that drawing's strokes.
 *
 * M9's app (docs/roadmap.md): a drawing made of marks rigged at its marks.
 * The bones are not drawn by hand; they are found — strokes where the pen
 * was lifted, joints where a stroke turns, a long run cut — so these values
 * are the whole of a proposal, and the same values on the same drawing
 * propose the same bones. A pose — the turns given by dragging — and the
 * waves are kept beside these values, by bone, as a map keeps its cells.
 *
 * A loop is `length` frames at `fps`; each bone's wave is edited through
 * `boneParams` when its handle is chosen (motion.js).
 */

import { defineParams } from '../../core/params.js';

/** The drawers. */
export const GROUPS = {
  drawing: { label: 'Drawing', open: true },
  bones:   { label: 'Bones', open: true },
  motion:  { label: 'Motion', open: true },
};

export function rigParams() {
  return defineParams('rig', {
    /** A gamepad still: its marks are what the bones carry. */
    drawing: { type: 'object', accepts: ['still'], label: 'drawing', group: 'drawing' },
    /** The least jump between two marks that is the pen lifted: a stroke ends there. */
    jump:    { type: 'range', min: 4, max: 200, step: 1, default: 16, label: 'a lifted pen, px', group: 'bones' },
    /** The least turn of a stroke that is a joint: an elbow, a knee. */
    corner:  { type: 'range', min: 10, max: 120, step: 1, default: 30, label: 'a corner, degrees', group: 'bones' },
    /** A run longer than this is cut into bones of equal length, so a long body bends too. */
    longest: { type: 'range', min: 20, max: 2000, step: 5, default: 200, log: true, label: 'longest bone, px', group: 'bones' },
    /** How far along a stroke, either side of a joint, its two bones share the stamps: the fan of a bend. */
    bend:    { type: 'range', min: 0, max: 60, step: 1, default: 12, label: 'bend, px', group: 'bones' },
    /** A loop's length: every wave a whole number of cycles in it, so it closes. */
    length:  { type: 'int', min: 2, max: 600, default: 60, label: 'loop, frames', group: 'motion' },
    fps:     { type: 'int', min: 1, max: 60, default: 30, label: 'fps', group: 'motion' },
  });
}

/** The chosen bone's drawer. */
export const BONE_GROUPS = {
  wave: { label: 'The bone, swinging', open: true },
};

/**
 * One bone's wave, as its panel edits it — degrees all: as far as it swings
 * either way, how many times a loop, where in its swing it starts, and
 * whether the bones below it in its chain follow, each a lag later.
 */
export function boneParams() {
  return defineParams('rig-bone', {
    swing:  { type: 'range', min: 0, max: 120, step: 1, default: 0, label: 'swing, degrees', group: 'wave' },
    cycles: { type: 'int', min: 1, max: 12, default: 1, label: 'cycles a loop', group: 'wave', when: { swing: { not: 0 } } },
    phase:  { type: 'range', min: -180, max: 180, step: 1, default: 0, label: 'phase, degrees', group: 'wave', when: { swing: { not: 0 } } },
    follow: { type: 'bool', default: false, label: 'the chain follows', group: 'wave', when: { swing: { not: 0 } } },
    lag:    { type: 'range', min: 0, max: 180, step: 1, default: 45, label: 'lag a bone, degrees', group: 'wave',
              when: { swing: { not: 0 }, follow: true } },
  });
}
