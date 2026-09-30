/**
 * points.js — an object as points to leave from: a dot-set's dots, or where
 * a picture has ink.
 *
 * Particles emit from them — M6's shape-alpha emitter widened to any vault
 * object, the author's idea of 2026-09-30 (docs/inbox.md). Two kinds, one
 * answer:
 *
 *   a dataset   ckt's dot-set, `[glyph][point][x, y]` in the pixels it was
 *               found at (apps/ckt/datasets.js). One cut from text is a
 *               single glyph, laid out as the word; a legacy font set has a
 *               glyph each. One glyph's dots, exact.
 *   a picture   a shape or a still: the pixels that are not see-through,
 *               sampled on a grid of at most SIDE along its longer side,
 *               each sample the centre of its cell — `cell` its size, for a
 *               jitter round it.
 *
 * Either comes back centred on its box and scaled so the box's longer side
 * is 1: an emitter sizes them with its `extent`, in px. The pure parts take
 * numbers and arrays, so tests/points.mjs holds them without a browser.
 */

import { Vault }   from './vault.js';
import { surface } from './surface.js';

/** Samples along a picture's longer side, at most: 16 384 points for a square all ink. */
export const SIDE = 128;

/** Alpha at or above this is ink. */
const INK = 128;

/**
 * Points centred on their box, the box's longer side 1.
 *
 * @param {Array<[number, number]>} list
 * @param {number} [cell=0]   a sample's size, in the list's units
 * @returns {{list: Array<[number, number]>, cell: number, w: number, h: number}}
 *          `w`, `h` the box as it was, in the list's units
 */
export function normalise(list, cell = 0) {
  if (!list.length) return { list: [], cell: 0, w: 0, h: 0 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of list) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const w = x1 - x0, h = y1 - y0, side = Math.max(w, h) || 1;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  return { list: list.map(([x, y]) => [(x - cx) / side, (y - cy) / side]), cell: cell / side, w, h };
}

/**
 * One glyph of a dot-set, its dots exact. The index wraps, so any is one.
 *
 * @param {Array<Array<[number, number]>>} data   `[glyph][point][x, y]`
 * @param {number} [glyph=0]
 */
export function pointsOfGlyph(data, glyph = 0) {
  const n = Array.isArray(data) ? data.length : 0;
  if (!n) return { ...normalise([]), glyph: 0, glyphs: 0 };
  const g = ((Math.round(glyph) % n) + n) % n;
  const dots = (Array.isArray(data[g]) ? data[g] : [])
    .filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  return { ...normalise(dots.map(p => [p[0], p[1]])), glyph: g, glyphs: n };
}

/**
 * Where a picture has ink, on a grid of at most `side` samples along its
 * longer side.
 *
 * @param {Uint8ClampedArray|Uint8Array} rgba   its pixels, four bytes each
 * @param {number} w
 * @param {number} h
 * @param {number} [side=SIDE]
 */
export function pointsOfPicture(rgba, w, h, side = SIDE) {
  const step = Math.max(1, Math.ceil(Math.max(w, h) / side));
  const list = [];
  for (let y = Math.floor(step / 2); y < h; y += step) {
    for (let x = Math.floor(step / 2); x < w; x += step) {
      if (rgba[(y * w + x) * 4 + 3] >= INK) list.push([x, y]);
    }
  }
  return normalise(list, step);
}

/**
 * A vault object as points: a dot-set's glyph, or a shape's or a still's
 * ink — with its title, and for a dot-set which glyph of how many.
 *
 * @param {string} id
 * @param {{glyph?: number}} [opts]
 * @returns {Promise<{list, cell, w, h, title: string, glyph?: number, glyphs?: number}>}
 */
export async function loadPoints(id, { glyph = 0 } = {}) {
  const { object, url } = await Vault.load(id);
  const title = object.title || id;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`the render of ${title} did not load (HTTP ${res.status})`);
  if (object.type === 'dataset') return { ...pointsOfGlyph(await res.json(), glyph), title };
  if (object.type !== 'shape' && object.type !== 'still') throw new Error(`${title} is a ${object.type}, not dots or a picture`);

  const bitmap = await createImageBitmap(await res.blob());
  const canvas = surface(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  if (bitmap.close) bitmap.close();
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { ...pointsOfPicture(data, canvas.width, canvas.height), title };
}
