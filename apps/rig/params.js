/**
 * params.js — the rig's schema: the drawing it rigs, and how its bones are
 * proposed from that drawing's strokes.
 *
 * M9's app (docs/roadmap.md): a drawing made of marks rigged at its marks.
 * The bones are not drawn by hand; they are found — strokes where the pen
 * was lifted, joints where a stroke turns, a long run cut — so these values
 * are the whole of a proposal, and the same values on the same drawing
 * propose the same bones. A pose — the turns given by dragging — is the
 * editor's, and not here.
 */

import { defineParams } from '../../core/params.js';

/** The drawers. */
export const GROUPS = {
  drawing: { label: 'Drawing', open: true },
  bones:   { label: 'Bones', open: true },
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
  });
}
