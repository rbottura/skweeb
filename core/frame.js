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
  return {
    format: {
      type: 'enum',
      options: [...DERIVED, ...ids(), CUSTOM],
      default: format,
      label: 'format',
      display: 'chips',
      labels: formatLabels(),
      groups: formatGroups(),
    },

    /**
     * The canvas, in pixels. A preset writes into these; typing into them
     * switches `format` to `custom`. Both directions go through
     * `applyFrameEdit()` so the two can never disagree.
     */
    width:  { type: 'int', min: 1, max: 16384, default: 1080, label: 'width' },
    height: { type: 'int', min: 1, max: 16384, default: 1080, label: 'height' },

    /** Keep the ratio while typing — the chain. */
    link: { type: 'bool', default: true, label: 'link w/h' },

    /** Ground on all four sides. Always grows the canvas; 0 for an exact size. */
    bleed: { type: 'int', min: 0, max: 2048, default: bleed, label: 'bleed' },

    /** The content's own scale inside the frame. 1 is its true size. */
    zoom: { type: 'range', min: 0.05, max: 8, step: 0.05, default: 1, label: 'content zoom' },
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
 * Called from an app's param-change handler, and it is the whole of the chain
 * behaviour. Three cases:
 *
 *   a format was picked   -> write its size, or its shape, into width/height
 *   a dimension was typed -> format becomes `custom`; if linked, the other
 *                            dimension follows to hold the ratio it had
 *   anything else         -> nothing to do
 *
 * @param {object} params   from defineParams()
 * @param {string} key      the param that just changed
 * @param {{x,y,w,h}} [content]  the content rect, for the derived formats
 * @returns {boolean} whether anything else was changed
 */
export function applyFrameEdit(params, key, content) {
  if (key === 'format') {
    const next = sizeForFormat(params.get('format'), params, content);
    if (!next) return false;
    return params.set({ width: next[0], height: next[1] }) > 0;
  }

  if (key !== 'width' && key !== 'height') return false;

  const before = params.get('format');
  let changed = params.set('format', CUSTOM) > 0;

  if (params.get('link')) {
    // The ratio to hold is the one the frame had a moment ago, which is the
    // previous format's when there was one and the current box's otherwise.
    const ratio = ratioOf(before) || currentRatio(params, key);
    if (ratio) {
      const [rw, rh] = ratio;
      changed = (key === 'width'
        ? params.set('height', Math.max(1, Math.round(params.get('width') * rh / rw)))
        : params.set('width',  Math.max(1, Math.round(params.get('height') * rw / rh)))) > 0 || changed;
    }
  }

  return changed;
}

/**
 * The ratio the box had before this edit, reconstructed from the dimension
 * that did *not* change — the one that changed no longer describes it.
 */
function currentRatio(params, key) {
  const w = params.get('width');
  const h = params.get('height');
  if (!(w > 0) || !(h > 0)) return null;
  return key === 'width' ? [w, h] : [w, h];
}

/**
 * What width and height a format asks for.
 *
 * `px` formats give it outright. `ratio` and `mm` formats give only a shape,
 * so the current box is grown — never shrunk — until it fits, which keeps a
 * format change from throwing away content that was already framed.
 *
 * @returns {[number,number]|null}  null when the format derives its own size
 */
export function sizeForFormat(format, params, content) {
  if (format === CUSTOM) return null;

  if (DERIVED.includes(format)) {
    const box = format === 'content' && content ? content : null;
    if (!box) return null;
    const bleed = params.get('bleed') || 0;
    const zoom = params.get('zoom') || 1;
    return [
      Math.max(1, Math.round(box.w * zoom) + bleed * 2),
      Math.max(1, Math.round(box.h * zoom) + bleed * 2),
    ];
  }

  const exact = pixelsOf(format);
  if (exact) return [exact[0], exact[1]];

  const ratio = ratioOf(format);
  if (!ratio) return null;

  const [rw, rh] = ratio;
  const w = params.get('width');
  const h = params.get('height');

  // Grow the short side. Shrinking would silently crop something that was
  // framed a moment ago, and a format change should not lose work.
  const byWidth = Math.round(w * rh / rw);
  return byWidth >= h ? [w, byWidth] : [Math.round(h * rw / rh), h];
}

/**
 * The frame, resolved: how big the canvas is and where the content lands.
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

  if (spec.format === 'content') {
    width = drawnW + bleed * 2;
    height = drawnH + bleed * 2;
  } else if (spec.format === 'source') {
    width = Math.max(1, Math.round(source.width * zoom)) + bleed * 2;
    height = Math.max(1, Math.round(source.height * zoom)) + bleed * 2;
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
