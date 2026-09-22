/**
 * formats.js — the named shapes an output can take.
 *
 * A table and nothing else: no policy, no canvas, no drawing. `frame.js`
 * decides what a format *does*; this file only says what the formats are, so
 * adding one is a row here and appears in every app's panel at once.
 *
 * ── Three kinds of entry, on purpose ────────────────────────────────────────
 *
 * The ancestor this idea comes from (BEC_2025's `assets/formats.json`) mixed
 * them and it cost it clarity: `poster` was 400x600 and `270/180` was 270x180,
 * one an aspect ratio at preview size and the other a client deliverable, both
 * wearing the same coat. Here they are distinguished:
 *
 *   `ratio` — a shape and no size. The canvas grows to it.
 *   `px`    — an exact pixel size, because some deliverables are exactly that.
 *   `mm`    — a physical size. Carries a ratio like the others, and its
 *             millimetres besides, which is what makes `dpiOf()` possible.
 *
 * ── On print ────────────────────────────────────────────────────────────────
 *
 * Nothing here makes a PDF or knows what a bleed is in ink. Resolution in this
 * suite is an export concern (docs/roadmap.md): the live loop runs at screen
 * size and `render()` is re-run once at scale. So a print-quality still is
 * already reachable — pick A3, export at a scale that puts enough pixels
 * across it — and the only thing missing was being able to see whether you
 * had. That is `dpiOf()`, and it is the whole of print support for now.
 *
 * The field names are `format`, `mm` and `bleed` deliberately: M4's page in
 * docs/roadmap.md is specified as `{ format: "A3", mm: [297, 420], bleed: 3 }`,
 * so a composition becomes a user of this table rather than a second copy of
 * it.
 */

/**
 * @typedef {object} Format
 * @property {string} id
 * @property {string} label       what the button says
 * @property {string} group       'ratio' | 'px' | 'print'
 * @property {[number,number]} [ratio]
 * @property {[number,number]} [px]
 * @property {[number,number]} [mm]
 */

/** @type {Format[]} */
export const FORMATS = [
  // Shapes. No size of their own — the canvas grows to meet them.
  { id: '1-1',  label: '1:1',  group: 'ratio', ratio: [1, 1] },
  { id: '4-5',  label: '4:5',  group: 'ratio', ratio: [4, 5] },
  { id: '5-4',  label: '5:4',  group: 'ratio', ratio: [5, 4] },
  { id: '2-3',  label: '2:3',  group: 'ratio', ratio: [2, 3] },
  { id: '3-2',  label: '3:2',  group: 'ratio', ratio: [3, 2] },
  { id: '9-16', label: '9:16', group: 'ratio', ratio: [9, 16] },
  { id: '16-9', label: '16:9', group: 'ratio', ratio: [16, 9] },

  // Exact sizes, for when a thing has to be that many pixels across.
  { id: 'ig-square',   label: '1080²',     group: 'px', px: [1080, 1080] },
  { id: 'ig-portrait', label: '1080×1350', group: 'px', px: [1080, 1350] },
  { id: 'story',       label: '1080×1920', group: 'px', px: [1080, 1920] },
  { id: 'hd',          label: '1920×1080', group: 'px', px: [1920, 1080] },

  // ISO A, portrait. Landscape is the same sheet turned over, which is what
  // swapping width and height already does, so it is not a second row.
  { id: 'a5', label: 'A5', group: 'print', mm: [148, 210] },
  { id: 'a4', label: 'A4', group: 'print', mm: [210, 297] },
  { id: 'a3', label: 'A3', group: 'print', mm: [297, 420] },
  { id: 'a2', label: 'A2', group: 'print', mm: [420, 594] },
  { id: 'a1', label: 'A1', group: 'print', mm: [594, 841] },
];

const BY_ID = new Map(FORMATS.map(f => [f.id, f]));

/** One format, or null. */
export const byId = id => BY_ID.get(id) || null;

/** Every id, in table order. For building an enum of options. */
export const ids = () => FORMATS.map(f => f.id);

/**
 * The shape of a format as [w, h], whichever way it was declared.
 * A `px` or `mm` entry is its own ratio; there is no third source of truth.
 */
export function ratioOf(format) {
  const f = typeof format === 'string' ? byId(format) : format;
  if (!f) return null;
  const pair = f.ratio || f.px || f.mm;
  return pair ? [pair[0], pair[1]] : null;
}

/** The exact pixel size a format demands, or null if it only has a shape. */
export function pixelsOf(format) {
  const f = typeof format === 'string' ? byId(format) : format;
  return f && f.px ? [f.px[0], f.px[1]] : null;
}

const MM_PER_INCH = 25.4;

/**
 * What resolution a pixel size actually lands at on a physical format.
 *
 * The answer to "is this big enough to print". 300 is the usual floor for
 * litho, 150 is acceptable large-format, and below 100 it shows. Returns null
 * for a format with no physical size, because the question does not apply.
 *
 * Both axes are reported: a canvas whose proportions have drifted from the
 * sheet's will not have one dpi, and averaging them would hide that.
 *
 * @param {string|Format} format
 * @param {number} w  pixels across
 * @param {number} h  pixels down
 * @returns {{x:number, y:number, min:number}|null}
 */
export function dpiOf(format, w, h) {
  const f = typeof format === 'string' ? byId(format) : format;
  if (!f || !f.mm) return null;

  const x = (w / f.mm[0]) * MM_PER_INCH;
  const y = (h / f.mm[1]) * MM_PER_INCH;
  return { x, y, min: Math.min(x, y) };
}

/**
 * The pixel size a physical format needs at a given resolution.
 *
 * The other direction of the same sum, and the one that answers "what scale do
 * I export at": A3 at 300dpi is 3508x4961.
 *
 * @returns {[number,number]|null}
 */
export function pixelsAtDpi(format, dpi) {
  const f = typeof format === 'string' ? byId(format) : format;
  if (!f || !f.mm || !(dpi > 0)) return null;
  return [
    Math.round((f.mm[0] / MM_PER_INCH) * dpi),
    Math.round((f.mm[1] / MM_PER_INCH) * dpi),
  ];
}
