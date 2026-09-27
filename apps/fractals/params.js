/**
 * params.js — fractals' schema: which family, its params, and the format.
 *
 * A copies picture may move one of its params over a loop — an idle — in
 * the Motion drawer (motion.js); a still is a loop of one.
 *
 * Two families. **Escape time** is fractal.js's: the Mandelbrot set and its
 * Julia sets on the GPU, its params the pass's own. **Copies** is
 * copies.js's: a sprite from the vault copying itself by a few maps, drawn
 * on a Canvas 2D. Each family's rows show only while it is chosen (`when`),
 * so the panel is one or the other; a recipe keeps both, and switching back
 * finds each as it was.
 *
 * The format is core's Format drawer, less what a picture drawn from nothing
 * has no use for: no `ink` or `canvas` format — there is no source to take a
 * size from — no `zoom`, since escape time's own zoom is the plane's, and no
 * `bleed`: a fractal fills whatever it is given.
 */

import { defineParams } from '../../core/params.js';
import { frameParams, DERIVED } from '../../core/frame.js';
import { FRACTAL_PARAMS } from './fractal.js';
import { SHAPES } from './copies.js';
import { MOTION_PARAMS } from './motion.js';

/** The drawers. The family first: it says which of the others there are. */
export const GROUPS = {
  family:  { label: 'Family', open: true },
  fractal: { label: 'Fractal', open: true },
  colour:  { label: 'Colour', open: true },
  copies:  { label: 'Copies', open: true },
  motion:  { label: 'Motion', open: true },
  format:  { label: 'Format', open: false },
};

const ESCAPE = { family: 'escape' };
const COPIES = { family: 'copies' };
const TREE = { family: 'copies', shape: 'tree' };

/** A family's rows, shown only while it is the family chosen. */
const only = (when, schema) => Object.fromEntries(Object.entries(schema)
  .map(([k, spec]) => [k, { ...spec, when: { ...when, ...(spec.when || {}) } }]));

const start = SHAPES.triangle.start;

/** A sprite copying itself (copies.js). */
const COPY_PARAMS = {
  /** What is copied: one shape or still, or a set — a member a generation, or a branch. */
  sprite:   { type: 'object', accepts: ['set', 'shape', 'still'], use: 'copies', label: 'sprite', group: 'copies' },
  shape:    { type: 'enum', options: Object.keys(SHAPES), default: 'triangle', display: 'chips', label: 'shape', group: 'copies' },
  depth:    { type: 'int', min: 0, max: 60, default: start.depth, label: 'generations', group: 'copies' },
  show:     { type: 'enum', options: ['every', 'last'], default: start.show, display: 'chips', label: 'drawn',
              labels: { every: 'every generation', last: 'the last' }, group: 'copies' },
  ratio:    { type: 'range', min: 0.05, max: 0.98, step: 0.005, default: start.ratio, label: 'each copy ×', group: 'copies' },
  twist:    { type: 'range', min: -180, max: 180, step: 0.5, default: start.twist, label: 'each copy turned °', group: 'copies' },
  spread:   { type: 'range', min: 0, max: 180, step: 0.5, default: 50, label: 'branches apart °', group: 'copies', when: TREE },
  branches: { type: 'int', min: 1, max: 5, default: 2, label: 'branches', group: 'copies', when: TREE },
  pick:     { type: 'enum', options: ['level', 'branch'], default: 'level', display: 'chips', label: 'a set\'s member',
              labels: { level: 'by generation', branch: 'by branch' }, group: 'copies' },
  size:     { type: 'range', min: 0.1, max: 20, step: 'any', log: true, default: 1, label: 'size ×', group: 'copies' },
  turn:     { type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: 'turned °', group: 'copies' },
  ground:   { type: 'ground', default: '#fffdf6', label: 'ground', group: 'copies' },
  /** With no sprite chosen, each copy is a dot in this. */
  ink:      { type: 'color', default: '#111111', label: 'dots, with no sprite', group: 'copies', when: { family: 'copies', sprite: null } },
};

export function fractalParams() {
  const { zoom, bleed, ...frame } = frameParams({ format: 'ig-square' });
  return defineParams('fractals', {
    family: { type: 'enum', options: ['escape', 'copies'], default: 'escape', display: 'chips', label: 'family',
              labels: { escape: 'escape time', copies: 'a sprite, copied' }, group: 'family' },
    ...only(ESCAPE, FRACTAL_PARAMS),
    ...only(COPIES, COPY_PARAMS),
    ...MOTION_PARAMS,
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
  });
}
