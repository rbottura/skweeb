/**
 * params.js — the gamepad's schema (C6c, docs/gamepad.md): how the pad
 * moves the brush, the pattern it stamps in, the reference under the ink,
 * what a still is saved on, and core's format. The panel and the recipe are
 * generated from it (rule 1); until C6c they were a carousel of their own,
 * `ui/ParamPanel.js`, and a plain object.
 *
 * The brush's family and sprite are not here: they are its state, a still's
 * `brush` (core/vaultBridge.js), stepped by the D-pad and chosen in the
 * brushes panel. A recipe from before C6c named the format `frameFormat` and
 * its bleed `frameBleed`: `upgrade` reads them under their names now.
 */

import { defineParams } from '../../core/params.js';
import { frameParams } from '../../core/frame.js';
import { PATTERNS, PATTERN_LABELS } from '../../core/stamp.js';

/** The drawers, in their order; the format is core's own. */
export const GROUPS = {
  brush:   { label: 'Brush', open: true },
  pattern: { label: 'Pattern', open: true },
  canvas:  { label: 'Canvas', open: true },
  format:  { label: 'Format', open: false },
};

/** The pattern's chips: their glyph and name, as the brush stamps them (core/stamp.js). */
const PATTERN_NAMES = Object.fromEntries(PATTERNS.map(p => [p, PATTERN_LABELS[p].replace(/\s+/g, ' ').trim()]));

export function gamepadParams() {
  // Core's format, less what a still of the ink has no use for: it is the ink's own pixels, never
  // enlarged (`zoom`) nor drawn again at a scale (`scale`) — a print is (core/stage/still.js).
  const { zoom, scale, ...frame } = frameParams({ format: 'content' });
  return defineParams('gamepad', {
    moveSpeed:   { type: 'range', min: 1, max: 50, step: 1, default: 10, label: 'move', unit: 'px', group: 'brush' },
    rotateSpeed: { type: 'range', min: 0.005, max: 0.2, step: 0.005, default: 0.045, label: 'turn', unit: 'rad', group: 'brush' },
    scaleSpeed:  { type: 'range', min: 0.001, max: 0.05, step: 0.001, default: 0.006, label: 'grow', group: 'brush' },
    scaleMin:    { type: 'range', min: 0.01, max: 1, step: 'any', log: true, default: 0.05, label: 'smallest', unit: '×', group: 'brush', more: true },
    scaleMax:    { type: 'range', min: 1, max: 20, step: 'any', log: true, default: 8, label: 'largest', unit: '×', group: 'brush', more: true },
    pattern:     { type: 'enum', options: PATTERNS, labels: PATTERN_NAMES, default: PATTERNS[0], display: 'chips', label: 'pattern', group: 'pattern' },
    refOpacity:  { type: 'range', min: 0, max: 1, step: 0.05, default: 0.5, label: 'reference', group: 'canvas' },
    saveGround:  { type: 'enum', options: ['none', 'white'], labels: { none: 'transparent', white: 'white' }, default: 'none',
                   display: 'chips', label: 'saved on', group: 'canvas' },
    ...frame,
  }, { upgrade });
}

/** A recipe's params from before C6c: its format and its bleed under their old names. */
function upgrade(v) {
  if (!('frameFormat' in v) && !('frameBleed' in v)) return v;
  const { frameFormat, frameBleed, ...rest } = v;
  return { ...rest, ...(frameFormat ? { format: frameFormat } : {}), ...(frameBleed != null ? { bleed: frameBleed } : {}) };
}
