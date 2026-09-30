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
  player: { label: 'Sequence player', open: true },
  ground: { label: 'Ground', open: false },
};

/** The placement panel's drawers. */
export const PLACE_GROUPS = {
  object:    { label: 'Object', open: true },
  transform: { label: 'Transform', open: true },
  time:      { label: 'Time', open: false },
};

/**
 * What a page takes: anything core gives frames of (core/rebuild.js
 * `openFrames`) — another page included, replayed by compose's rebuild.js.
 */
export const PLACEABLE = ['still', 'sequence', 'shape', 'composition', 'map'];

/**
 * The page: the frame group as a sheet, and the paper under everything.
 *
 * Two parts of the frame group mean nothing here and are left out. The
 * derived formats size the canvas from its one source, and a page has no one
 * source; `zoom` scales the object inside the canvas, and on a page every
 * placement has its own scale. The default is A4 at 150 dpi, that shape to
 * the pixel, so the chip and the box agree from the start and after a Reset.
 *
 * `fps` is the page's own rate: what it plays at, and what an export of it
 * will be. Every loop on it keeps its own speed (time.js). 60 by default,
 * because the gamepad records at 60 and ckt loops at 30: at 60 every loop in
 * the suite shows every one of its ticks.
 *
 * `onion` is the preview's onion skin (onion.js): paused, the frames either
 * side of the one shown, faint. Nothing a render draws.
 */
export function pageParams() {
  const { zoom, ...frame } = frameParams({ format: 'a4' });
  return defineParams('compose', {
    ...frame,
    format: { ...frame.format, options: frame.format.options.filter(o => !DERIVED.includes(o)) },
    width:  { ...frame.width, default: 1240 },
    height: { ...frame.height, default: 1754 },
    fps:    { type: 'int', min: 1, max: 60, default: 60, label: 'fps', group: 'player' },
    onion:  { type: 'bool', default: true, label: 'onion skin, paused', group: 'player' },
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
    /** A look made in filter, run over the object's frames (core/gpu/look.js). */
    look: { type: 'object', accepts: ['params'], label: 'look', group: 'object' },
    x: { type: 'int', min: -MAX_SIDE, max: MAX_SIDE, default: 0, label: 'x from centre', group: 'transform' },
    y: { type: 'int', min: -MAX_SIDE, max: MAX_SIDE, default: 0, label: 'y from centre', group: 'transform' },
    scale: { type: 'range', min: 0.01, max: 8, step: 0.01, default: 1, label: 'scale', group: 'transform' },
    rot: { type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: 'rotation °', group: 'transform' },
    /**
     * When, in the page's frames: from `at`, for `length` — 0 its own, which
     * for a still is the rest of the page and for a loop its loop, again and
     * again. A flipbook is stills one after another, a frame or a few each.
     */
    at:     { type: 'int', min: 0, max: 100000, default: 0, label: 'from frame', group: 'time' },
    length: { type: 'int', min: 0, max: 100000, default: 0, label: 'for frames (0: its own)', group: 'time' },
  });
}

/**
 * A placement's values as the block a composition's recipe keeps
 * (docs/object-model.md, *Placement*). `at` and `length` are time, frames from
 * the composition's start and `null` for the object's own length. `version`
 * pins only a `.skw`; any other object never changes, so it is `latest`.
 * `look` is there only when there is one, so a block with none is the block
 * it always was.
 */
export function toPlacement(values) {
  const { ref, x, y, scale, rot, look } = values;
  const at = Math.max(0, Math.round(values.at || 0));
  const length = values.length > 0 ? Math.round(values.length) : null;
  return { ref, version: 'latest', transform: { x, y, scale, rot }, at, length, ...(look ? { look } : {}) };
}

/** And back: the values a placement's panel shows for a block. */
export function fromPlacement(block) {
  const t = (block && block.transform) || {};
  return { ref: (block && block.ref) || null, x: t.x, y: t.y, scale: t.scale, rot: t.rot,
           look: (block && block.look) || null, at: (block && block.at) || 0, length: (block && block.length) || 0 };
}

/**
 * What a composition is made from — its `parents`: every object placed on
 * it and every look over one, once each, bottom first. Read off the recipe,
 * which names them all, so lineage cannot drift from what the page holds.
 */
export function parentsOf(recipe) {
  return [...new Set(((recipe && recipe.place) || []).flatMap(b => [b.ref, b.look]).filter(Boolean))];
}
