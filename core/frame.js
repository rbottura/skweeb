/**
 * frame.js — what rectangle an object occupies, and where its content sits.
 *
 * Two questions that turned out to be one. "Crop to the painted area" answers
 * it from the content outwards; "set the canvas size" answers it from the
 * outside in. This is both, as one parameter group every app spreads into its
 * own schema — so the gamepad, grid and later ckt frame their output the same
 * way and a recipe means the same thing in each.
 *
 * ── The rule that keeps it predictable ──────────────────────────────────────
 *
 * Content is placed at its own scale and is allowed to overflow. There is no
 * automatic fitting and no automatic cropping. A canvas smaller than its
 * content crops it; a canvas larger pads it with the ground colour. Both of
 * those are things you did on purpose, and neither needs a policy that will be
 * wrong half the time.
 *
 * That is the whole reason this file has no `fit` parameter. Letterboxing is
 * "make the canvas bigger", cropping is "make it smaller", and `zoom` is there
 * for when it is the content that should move instead.
 *
 * ── Nothing here draws ──────────────────────────────────────────────────────
 *
 * It returns rectangles. An app turns them into one `drawImage` — the source
 * rect out, the placed rect in — which is also why this is testable without a
 * browser and why `render()` can stay pure.
 */

import { FORMATS, byId, ids, ratioOf, pixelsOf } from './formats.js';

/** Canvas derived from what is in it, rather than from a named shape. */
export const DERIVED = ['content', 'source'];

/** Chosen by typing a width or a height rather than by picking anything. */
export const CUSTOM = 'custom';

/**
 * The longest side a canvas can be given, in pixels. More resolution than
 * that is `scale`'s job — 4000 at 4× is 16000 px, A1 at over 400 dpi — and a
 * slider that stops here is still fine enough to set a size by feel.
 */
export const MAX_SIDE = 4000;

/**
 * The parameter group, for an app to spread into its schema.
 *
 * ```js
 * defineParams('grid', { ...frameParams(), cell: {…}, ramp: {…} })
 * ```
 *
 * `link` is the odd one out: it changes how editing behaves rather than what
 * is drawn, so it lands in the recipe without meaning anything there. That is
 * accepted rather than overlooked — the alternative is a second kind of
 * parameter that the panel knows about and the recipe does not, which is a
 * much larger hole in "params are data" than one inert boolean.
 *
 * @param {object} [defaults]
 * @param {string} [defaults.format='content']
 */
export function frameParams({ format = 'content', bleed = 0 } = {}) {
  const group = 'format';
  return {
    format: {
      type: 'enum',
      options: [...DERIVED, ...ids(), CUSTOM],
      default: format,
      label: 'format',
      display: 'chips',
      labels: formatLabels(),
      groups: formatGroups(),
      group,
    },

    /**
     * The canvas, in pixels, 1 to MAX_SIDE. A preset writes into these; typing
     * into them makes the format `custom` — unless the link is holding a ratio
     * or a sheet, which are still themselves at any size. Both directions go
     * through `applyFrameEdit()` so the two can never disagree.
     */
    width:  { type: 'int', min: 1, max: MAX_SIDE, default: 1080, label: 'width', group },
    height: { type: 'int', min: 1, max: MAX_SIDE, default: 1080, label: 'height', group },

    /** Hold the shape while typing: either side drags the other — the chain. */
    link: { type: 'bool', default: true, label: 'link w/h', group },

    /** Ground on all four sides. Always grows the canvas; 0 for an exact size. */
    bleed: { type: 'int', min: 0, max: 2048, default: bleed, label: 'bleed', group },

    /**
     * The object's scale inside the canvas. Never changes the canvas: above 1
     * the content overflows and is cropped, below 1 the ground shows round it.
     */
    zoom: { type: 'range', min: 0.05, max: 8, step: 0.05, default: 1, label: 'zoom', group },

    /**
     * The canvas's scale: width and height multiplied, and everything on the
     * canvas with them — the same picture in more pixels. Resolution, never
     * composition, so it is applied last, by the renderer (see resolveFrame).
     */
    scale: { type: 'range', min: 0.25, max: 4, step: 0.25, default: 1, label: 'scale', group },
  };
}

/** What each chip says. An id is for the recipe; a label is for a person. */
function formatLabels() {
  const out = { content: 'ink', source: 'canvas', [CUSTOM]: 'custom' };
  for (const f of FORMATS) out[f.id] = f.label;
  return out;
}

/**
 * Which chips start a run, so the panel can rule a line between the kinds.
 * Only the first of each group is marked — a divider before every chip of a
 * run would be a grid, not a grouping.
 */
function formatGroups() {
  const out = { content: 'derived' };
  const seen = new Set();
  for (const f of FORMATS) {
    if (seen.has(f.group)) continue;
    seen.add(f.group);
    out[f.id] = f.group;
  }
  out[CUSTOM] = 'custom';
  return out;
}

/**
 * Keep `format`, `width` and `height` consistent after one of them is edited.
 *
 * Called from an app's param-change handler for every key, and it is the whole
 * of the chain behaviour:
 *
 *   a format was picked   -> write its size, or its shape, into width/height;
 *                            a derived one keeps writing it as its content moves
 *   a side was typed      -> unlinked, the format becomes `custom`. Linked, the
 *                            other side follows to hold the shape the box had:
 *                            a ratio or a sheet is still itself, so it stays
 *                            picked, and anything else becomes `custom`
 *   a restore             -> nothing: a recipe comes back as it was saved
 *
 * No side goes below 1 or past MAX_SIDE. A linked side that would stops at
 * the limit and the typed side gives way: the link holds the shape, not the
 * number.
 *
 * ── Its own writes come back round ──────────────────────────────────────────
 *
 * It writes through `params`, and an app calls it from a `params.on`
 * listener — so every write it makes re-enters it with a new key. Picking
 * `hd` wrote 1920 into width, came back in as "a dimension was typed", and set
 * the format to `custom`: the size right, the chip wrong, and `ink` no longer
 * following its content. The test that should have caught it used a stand-in
 * Params with no listeners, which is the one thing a real one always has.
 * So an edit already in progress on the same params ignores the echoes.
 *
 * ── The box before the edit ─────────────────────────────────────────────────
 *
 * A typed width arrives already written, so the box it replaced survives only
 * in what the chain last saw (`_last`). Reading the ratio off the box after
 * the edit was the old bug: it held the new ratio, so once the format was
 * `custom` the other side never moved. The shape is kept there too rather
 * than read again off a rounded box, or a slider dragged down and back up
 * would come home a few pixels off. Both sides moving at once is a set, not a
 * keystroke, and stands.
 *
 * @param {object} params   from defineParams()
 * @param {string} key      the param that just changed
 * @param {{x,y,w,h}} [content]  the content rect, for the derived formats
 * @returns {boolean} whether anything else was changed
 */
export function applyFrameEdit(params, key, content) {
  if (_editing.has(params)) return false;
  _editing.add(params);
  try {
    return edit(params, key, content);
  } finally {
    _editing.delete(params);
  }
}

/** The params an applyFrameEdit() is running on right now, to know its echoes. */
const _editing = new WeakSet();

/** What the chain last saw, per params: { w, h, shape } — the box and the shape held. */
const _last = new WeakMap();

function edit(params, key, content) {
  const last = _last.get(params) || firstBox(params);
  const format = params.get('format');
  let shape = last.shape;
  let changed = false;

  if (params.restoring) {
    shape = null;
  } else if (key === 'width' || key === 'height') {
    const movedW = params.get('width') !== last.w;
    const movedH = params.get('height') !== last.h;
    const lead = movedW === movedH ? null : movedW ? 'width' : 'height';
    if (lead && params.get('link')) {
      shape = shapeOf(format, params, content) || last.shape || [last.w, last.h];
      const [w, h] = hold(shape, lead, params.get(lead), limits(params));
      changed = params.set({ width: w, height: h }) > 0;
      if (!keepsShape(format)) changed = params.set('format', CUSTOM) > 0 || changed;
    } else if (lead) {
      changed = params.set('format', CUSTOM) > 0;
      shape = null;
    } else if (movedW) {
      shape = null;                              // both at once: a set, and it stands
    }
  } else if (key === 'format' || DERIVED.includes(format)) {
    // A picked format writes its size, and a derived one keeps writing it, so
    // the rows say what the canvas is when its content or its bleed moves.
    const next = sizeForFormat(format, params, content);
    if (next) changed = params.set({ width: next[0], height: next[1] }) > 0;
    if (key === 'format' || changed) shape = null;
  }
  if (key === 'link') shape = null;              // locked from here: the box as it is

  const w = params.get('width');
  const h = params.get('height');
  _last.set(params, { w, h, shape: shape || shapeOf(params.get('format'), params, content) || [w, h] });
  return changed;
}

/**
 * Before the chain has seen anything, the box is the one the params began
 * with: an app hears every change from the start, so a box it has not seen
 * is still the default.
 */
function firstBox(params) {
  const start = key => specOf(params, key)?.default ?? params.get(key);
  return { w: start('width'), h: start('height'), shape: null };
}

const specOf = (params, key) => (typeof params.spec === 'function' ? params.spec(key) : null);

/** Each side's limits, from the schema when there is one: an app may narrow them. */
function limits(params) {
  const of = key => [specOf(params, key)?.min ?? 1, specOf(params, key)?.max ?? MAX_SIDE];
  return { w: of('width'), h: of('height') };
}

/** The shape a format stands for: its own, or its ink's; `custom` has none. */
function shapeOf(format, params, content) {
  return ratioOf(format) || derivedSize(format, params, content);
}

/** A ratio or a sheet is still itself at any size; an exact size is not. */
function keepsShape(format) {
  const f = byId(format);
  return !!(f && (f.ratio || f.mm));
}

/**
 * One side given, the other follows the shape. A follower that would pass a
 * limit stops at it, and the given side gives way instead.
 */
function hold([rw, rh], lead, value, lim) {
  const fit = (n, [lo, hi]) => Math.min(hi, Math.max(lo, Math.round(n)));
  if (lead === 'width') {
    const w = fit(value, lim.w);
    const h = fit(w * rh / rw, lim.h);
    return h === Math.round(w * rh / rw) ? [w, h] : [fit(h * rw / rh, lim.w), h];
  }
  const h = fit(value, lim.h);
  const w = fit(h * rw / rh, lim.w);
  return w === Math.round(h * rw / rh) ? [w, h] : [w, fit(w * rh / rw, lim.h)];
}

/** A size brought inside the limits, its proportions kept. */
function within([w, h], lim) {
  const k = Math.min(1, lim.w[1] / w, lim.h[1] / h);
  return [Math.max(lim.w[0], Math.round(w * k)), Math.max(lim.h[0], Math.round(h * k))];
}

/** What `content` measures, bleed and all; null while the ink is not known. */
function derivedSize(format, params, content) {
  if (format !== 'content' || !content) return null;
  const bleed = params.get('bleed') || 0;
  return [
    Math.max(1, Math.round(content.w) + bleed * 2),
    Math.max(1, Math.round(content.h) + bleed * 2),
  ];
}

/**
 * What width and height a format asks for, inside the limits.
 *
 * `px` formats give it outright. `ratio` and `mm` formats give only a shape:
 * a box already that shape keeps its size, and any other is grown — never
 * shrunk — until it fits, which keeps a format change from throwing away
 * content that was already framed. Only a box that would grow past the limit
 * is fitted inside it instead.
 *
 * @returns {[number,number]|null}  null when the format derives its own size
 */
export function sizeForFormat(format, params, content) {
  if (format === CUSTOM) return null;
  const lim = limits(params);

  if (DERIVED.includes(format)) {
    const size = derivedSize(format, params, content);
    return size && within(size, lim);
  }

  const exact = pixelsOf(format);
  if (exact) return within(exact, lim);

  const ratio = ratioOf(format);
  if (!ratio) return null;

  const [rw, rh] = ratio;
  const w = params.get('width');
  const h = params.get('height');

  // Already that shape, to the pixel whichever way it rounded: a box a linked
  // edit made is left exactly as it is.
  if (Math.round(w * rh / rw) === h || Math.round(h * rw / rh) === w) return within([w, h], lim);

  // Grow the short side. Shrinking would silently crop something that was
  // framed a moment ago, and a format change should not lose work.
  const byWidth = Math.round(w * rh / rw);
  return within(byWidth >= h ? [w, byWidth] : [Math.round(h * rw / rh), h], lim);
}

/**
 * The frame, resolved: how big the canvas is and where the content lands.
 *
 * `zoom` moves the content only; the canvas is the format's. `scale` is not
 * applied here at all — it is resolution, not composition, so a renderer
 * multiplies the whole result by it last: the same frame, more pixels.
 *
 * @param {object} spec              { format, width, height, bleed, zoom }
 * @param {{x,y,w,h}} content        the part of the source worth keeping
 * @param {{width,height}} source    the source's full size
 * @returns {{width, height, from: {x,y,w,h}, to: {x,y,w,h}}}
 *   `from` is the rect to read out of the source, `to` where it goes — one
 *   drawImage, and the overflow when `to` falls outside is the point.
 */
export function resolveFrame(spec = {}, content, source) {
  const bleed = Math.max(0, Math.round(spec.bleed || 0));
  const zoom = spec.zoom > 0 ? spec.zoom : 1;

  const from = content && content.w > 0 && content.h > 0
    ? content
    : { x: 0, y: 0, w: source.width, h: source.height };

  const drawnW = Math.max(1, Math.round(from.w * zoom));
  const drawnH = Math.max(1, Math.round(from.h * zoom));

  let width, height;

  // The canvas never follows `zoom`: zoom is the object inside it. A derived
  // canvas is the content's own size, or the source's.
  if (spec.format === 'content') {
    width = Math.max(1, Math.round(from.w)) + bleed * 2;
    height = Math.max(1, Math.round(from.h)) + bleed * 2;
  } else if (spec.format === 'source') {
    width = Math.max(1, Math.round(source.width)) + bleed * 2;
    height = Math.max(1, Math.round(source.height)) + bleed * 2;
  } else {
    // A named or custom size. Bleed still grows it, so a bleed of 0 is how an
    // exact deliverable stays exact.
    width = Math.max(1, Math.round(spec.width || drawnW)) + bleed * 2;
    height = Math.max(1, Math.round(spec.height || drawnH)) + bleed * 2;
  }

  return {
    width,
    height,
    from: { x: from.x, y: from.y, w: from.w, h: from.h },
    to: {
      x: Math.round((width - drawnW) / 2),
      y: Math.round((height - drawnH) / 2),
      w: drawnW,
      h: drawnH,
    },
  };
}

/** A format's label for a readout, falling back to the id. */
export function labelOf(format) {
  const f = byId(format);
  return f ? f.label : format;
}
