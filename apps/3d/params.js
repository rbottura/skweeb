/**
 * params.js — the 3D app's schema: the view, the light, the style, the
 * motion — a turntable (motion.js) — and the format.
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
import { STYLE_PARAMS } from './look.js';
import { MOTION_PARAMS } from './motion.js';
import { SHAPES, SHAPE_GROUPS, shapeSchema, startOf } from './shapes.js';
import { MODIFIERS } from './modifiers.js';

/** The drawers, top to bottom. `shapes` holds the cards, and no params. */
export const GROUPS = {
  view:   { label: 'View', open: true },
  light:  { label: 'Light', open: true },
  style:  { label: 'Style', open: true },
  motion: { label: 'Motion', open: false },
  format: { label: 'Format', open: false },
};

export function modelParams() {
  const { zoom, bleed, ...frame } = frameParams({ format: 'ig-square' });
  return defineParams('3d', {
    ...VIEW_PARAMS,
    ...LIGHT_PARAMS,
    ...STYLE_PARAMS,
    ...MOTION_PARAMS,
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
  });
}

/**
 * How core's cards are told about shapes (core/Cards.js): folded, so the
 * chosen shape's card — clicked in the view, or by its name — is the one
 * open; and in each card, after its form, its stack of modifiers, in order
 * (modifiers.js), kept in its entry as `modifiers`.
 */
export const SHAPE_CARDS = {
  catalogue: SHAPES,
  app: '3d',
  schemaOf: shapeSchema,
  groups: SHAPE_GROUPS,
  fold: true,
  start: (id, entries) => {
    const at = startOf(entries.length);
    if (SHAPES[id].ownColours) delete at.colour;         // BEC's grid: its palette's colours, none of its own
    return at;
  },
  words: {
    add: 'add a shape…',
    empty: 'No shapes yet. Add one.',
    on: 'shown', off: 'hidden',
    toggle: 'Hide this shape, or show it again',
    out: 'Take it out of the model',
  },
  inner: {
    key: 'modifiers',
    title: 'Modifiers',
    before: 'place',
    catalogue: MODIFIERS,
    app: '3d',
    order: true,
    words: {
      add: 'add a modifier…',
      empty: 'None: the shape as it is made.',
      toggle: 'Switch this modifier off, or on again',
      up: 'Sooner in the stack', down: 'Later in the stack',
      out: 'Take it off the shape',
    },
  },
};

/** What a fresh page opens on: a box, a sphere and a torus, side by side. */
export const OPENING = [
  { id: 'box',    params: { x: -1.6, turnY: 25, colour: '#ffd60a' } },
  { id: 'sphere', params: { colour: '#2a62d8' } },
  { id: 'torus',  params: { x: 1.6, turnX: -20, turnY: -25, colour: '#d8342a' } },
];
