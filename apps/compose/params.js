/**
 * params.js — compose's two schemas: the page, and one placement on it.
 *
 * Two, because they are two kinds of thing. The page is one per composition,
 * and it is the suite's own Format drawer: a page is a user of
 * core/formats.js, never a second copy of it (docs/roadmap-done.md, M4). A
 * placement is one of many — an object and where it sits — so its schema is
 * an editor for whichever placement is chosen, and a composition's `place`
 * list holds its values, one block each, in the shape docs/object-model.md
 * gives a placement.
 */

import { defineParams } from '../../core/params.js';
import { frameParams, DERIVED, MAX_SIDE } from '../../core/frame.js';
import { BLENDS, BLEND_LABELS } from '../../core/blend.js';
import { LAYERS } from '../../core/layers.js';

/** The page panel's drawers — its Format the viewer's since S14b (core/viewformat.js). */
export const PAGE_GROUPS = {
  player: { label: 'Sequence player', open: true },
  ground: { label: 'Ground', open: false },
};

/** The placement panel's drawers. */
export const PLACE_GROUPS = {
  object:    { label: 'Object', open: true },
  transform: { label: 'Transform', open: true },
  blend:     { label: 'Blend', open: false },
  time:      { label: 'Time', open: false },
};

/**
 * What a page takes: anything core gives frames of (core/rebuild.js
 * `openFrames`) — another page included, replayed by compose's rebuild.js;
 * a model, M10's, as its picture, drawn again at print scale.
 */
export const PLACEABLE = ['still', 'sequence', 'shape', 'composition', 'map', 'model'];

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
    layers: LAYERS,      // its layers, in the Stack section: an overlay in front, a picture behind (core/layers.js, L13)
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
    /** A smart object placed at the state it had then (S6b, the author's 2026-11-03) — 0 follows its new states. */
    version: { type: 'int', min: 0, max: 100000, default: 0, label: 'at its state · 0 follows', group: 'object', when: { ref: { prefix: 'skw_' } } },
    x: { type: 'int', min: -MAX_SIDE, max: MAX_SIDE, default: 0, label: 'x from centre', group: 'transform', pair: 'y', pairLabel: 'from centre', axis: 'x' },
    y: { type: 'int', min: -MAX_SIDE, max: MAX_SIDE, default: 0, label: 'y from centre', group: 'transform', axis: 'y' },
    scale: { type: 'range', min: 0.01, max: 8, step: 0.01, default: 1, label: 'scale', group: 'transform' },
    rot: { type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: 'rotation', unit: '°', group: 'transform' },
    /** How it meets what is under it: how much of it shows, and how it mixes (core/blend.js). */
    opacity: { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'opacity', group: 'blend' },
    blend: { type: 'enum', options: BLENDS, labels: BLEND_LABELS, default: 'normal', label: 'blend', group: 'blend' },
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
 * (docs/smart-objects.md, *Placement*). `at` and `length` are time, frames from
 * the composition's start and `null` for the object's own length. `version`
 * pins only a `.skw` — at the state it had when placed, since S6b — and 0 is
 * `latest`, following it; any other object never changes, so it is `latest`.
 * `look`, `opacity` and `blend` are there only when they say something, so a
 * block with none is the block it always was.
 */
export function toPlacement(values) {
  const { ref, x, y, scale, rot, look, opacity, blend } = values;
  const version = values.version > 0 && String(ref).startsWith('skw_') ? Math.round(values.version) : 'latest';
  const at = Math.max(0, Math.round(values.at || 0));
  const length = values.length > 0 ? Math.round(values.length) : null;
  return { ref, version, transform: { x, y, scale, rot }, at, length, ...(look ? { look } : {}),
           ...(opacity != null && opacity < 1 ? { opacity } : {}), ...(blend && blend !== 'normal' ? { blend } : {}) };
}

/** And back: the values a placement's panel shows for a block. */
export function fromPlacement(block) {
  const t = (block && block.transform) || {};
  return { ref: (block && block.ref) || null, version: block && Number.isInteger(block.version) ? block.version : 0, x: t.x, y: t.y, scale: t.scale, rot: t.rot,
           look: (block && block.look) || null, at: (block && block.at) || 0, length: (block && block.length) || 0,
           opacity: block && block.opacity != null ? block.opacity : 1, blend: (block && block.blend) || 'normal' };
}

/**
 * What a composition is made from — its `parents`: every object placed on
 * it and every look over one, once each, bottom first. Read off the recipe,
 * which names them all, so lineage cannot drift from what the page holds.
 */
export function parentsOf(recipe) {
  // A smart object pinned is made from that state of it, `skw_…@v3` — no ref: it will not change.
  const named = b => (Number.isInteger(b.version) && String(b.ref).startsWith('skw_') ? `${b.ref}@v${b.version}` : b.ref);
  return [...new Set(((recipe && recipe.place) || []).flatMap(b => [named(b), b.look]).filter(Boolean))];
}
