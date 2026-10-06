/**
 * params.js — the 3D app's schema: the view, the light, and the format.
 *
 * The shapes are not here. A model's shapes are a list, each entry with the
 * schema of its own primitive (shapes.js), so they live beside the params as
 * filter's chain does, in core's cards (core/Cards.js). The recipe is these
 * values and `shapes: [{ id, params, on }]` — a `model` (docs/object-model.md).
 *
 * The format is core's Format drawer, less what a picture drawn from nothing
 * has no use for: no `ink` or `canvas` format, no `zoom` — the camera's
 * distance is the zoom — and no `bleed`: a model's picture fills whatever it
 * is given.
 */

import { defineParams } from '../../core/params.js';
import { frameParams, DERIVED } from '../../core/frame.js';
import { VIEW_PARAMS } from './camera.js';
import { LIGHT_PARAMS } from './scene.js';
import { SHAPES, SHAPE_GROUPS, shapeSchema, startOf } from './shapes.js';

/** The drawers, top to bottom. `shapes` holds the cards, and no params. */
export const GROUPS = {
  view:   { label: 'View', open: true },
  light:  { label: 'Light', open: true },
  format: { label: 'Format', open: false },
};

export function modelParams() {
  const { zoom, bleed, ...frame } = frameParams({ format: 'ig-square' });
  return defineParams('3d', {
    ...VIEW_PARAMS,
    ...LIGHT_PARAMS,
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
  });
}

/** How core's cards are told about shapes (core/Cards.js). */
export const SHAPE_CARDS = {
  catalogue: SHAPES,
  app: '3d',
  schemaOf: shapeSchema,
  groups: SHAPE_GROUPS,
  start: (id, entries) => startOf(entries.length),
  words: {
    add: 'add a shape…',
    empty: 'No shapes yet. Add one.',
    on: 'shown', off: 'hidden',
    toggle: 'Hide this shape, or show it again',
    out: 'Take it out of the model',
  },
};

/** What a fresh page opens on: a box, a sphere and a torus, side by side. */
export const OPENING = [
  { id: 'box',    params: { x: -1.6, turnY: 25, colour: '#ffd60a' } },
  { id: 'sphere', params: { colour: '#2a62d8' } },
  { id: 'torus',  params: { x: 1.6, turnX: -20, turnY: -25, colour: '#d8342a' } },
];
