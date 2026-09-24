/**
 * params.js — compose's two schemas: the page, and one placement on it.
 *
 * Two, because they are two kinds of thing. The page is one per composition,
 * and it is the suite's own Format drawer: a page is a user of
 * core/formats.js, never a second copy of it (docs/roadmap.md, M4). A
 * placement is one of many — an object and where it sits — so its schema is
 * an editor for whichever placement is chosen, and a composition's `place`
 * list holds its values, one block each, in the shape docs/object-model.md
 * gives a placement.
 */

import { defineParams } from '../../core/params.js';
import { frameParams, DERIVED, MAX_SIDE } from '../../core/frame.js';

/** The page panel's drawers. Format is the page, so it starts open. */
export const PAGE_GROUPS = {
  format: { label: 'Format', open: true },
  ground: { label: 'Ground', open: false },
};

/** The placement panel's drawers. */
export const PLACE_GROUPS = {
  object:    { label: 'Object', open: true },
  transform: { label: 'Transform', open: true },
};

/** What a page takes: anything core gives frames of (core/rebuild.js `openFrames`). */
export const PLACEABLE = ['still', 'sequence', 'shape'];

/**
 * The page: the frame group as a sheet, and the paper under everything.
 *
 * Two parts of the frame group mean nothing here and are left out. The
 * derived formats size the canvas from its one source, and a page has no one
 * source; `zoom` scales the object inside the canvas, and on a page every
 * placement has its own scale. The default is A4 at 150 dpi, that shape to
 * the pixel, so the chip and the box agree from the start and after a Reset.
 */
export function pageParams() {
  const { zoom, ...frame } = frameParams({ format: 'a4' });
  return defineParams('compose', {
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
    width:  { ...frame.width, default: 1240 },
    height: { ...frame.height, default: 1754 },
    ground: { type: 'ground', default: '#ffffff', label: 'paper', group: 'ground' },
  });
}

/**
 * One placement: the object, and its transform on the page (page.js says
 * exactly where that puts it). `x` and `y` are from the page's centre, in
 * page pixels, so both run the longest side there is, either way.
 */
export function placeParams() {
  return defineParams('compose-place', {
    ref: { type: 'object', accepts: PLACEABLE, label: 'object', group: 'object' },
    x: { type: 'int', min: -MAX_SIDE, max: MAX_SIDE, default: 0, label: 'x from centre', group: 'transform' },
    y: { type: 'int', min: -MAX_SIDE, max: MAX_SIDE, default: 0, label: 'y from centre', group: 'transform' },
    scale: { type: 'range', min: 0.01, max: 8, step: 0.01, default: 1, label: 'scale', group: 'transform' },
    rot: { type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: 'rotation °', group: 'transform' },
  });
}

/**
 * A placement's values as the block a composition's recipe keeps
 * (docs/object-model.md, *Placement*). `at` and `length` are time, frames from
 * the composition's start and `null` for the object's own length. `version`
 * pins only a `.skw`; any other object never changes, so it is `latest`.
 */
export function toPlacement(values, { at = 0, length = null } = {}) {
  const { ref, x, y, scale, rot } = values;
  return { ref, version: 'latest', transform: { x, y, scale, rot }, at, length };
}

/** And back: the values a placement's panel shows for a block. */
export function fromPlacement(block) {
  const t = (block && block.transform) || {};
  return { ref: (block && block.ref) || null, x: t.x, y: t.y, scale: t.scale, rot: t.rot };
}
