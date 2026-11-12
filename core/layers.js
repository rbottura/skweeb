/**
 * layers.js — an object's layers (L13, 2026-11-12; docs/decisions.md): the
 * author's "pouvoir bénéficier de l'option d'overlay sur toutes les apps
 * facilement … dans la section stack comme une section à part entière
 * dédiée au système de 'calque' … faisant partie des paramètres d'objets
 * sauvegardables par état". Particles' overlay (G3), made every app's.
 *
 * A layer is an object of the vault — a picture, a loop, another app's smart
 * object, which follows its latest state — in front of the app's picture or
 * behind it, fitted to its format: whole, as large as the format allows, or
 * filling it, what spills over cut; a share of that size; moved from the
 * format's middle, in its pixels; turned clockwise round its own middle;
 * see-through; meeting what is under it by CSS's blends (core/blend.js).
 * Behind is under the picture: seen where its ground is none.
 *
 * The list is one param of the app's schema (rule 1), `LAYERS`, spread into
 * the schema of the panel its Stack is in: its values are in the recipe, so
 * an S keeps them state by state, a Ctrl Z takes a change back, the graph
 * lays a state's back. `[{ ref, on, at, fit, scale, x, y, rot, opacity,
 * blend }]`, bottom first; core/params.js coerces each by `LAYER_PARAMS`.
 * Its rows are the Stack section's (core/layers-row.js); core draws them
 * (core/layers-draw.js) round the app's canvas while it is worked on
 * (core/layers-view.js) and in everything made of the object — its saved
 * picture, a replay, compose, the windows' stack, the print.
 *
 * Pure: data and arithmetic, no DOM — tests/layers.mjs.
 */

import { BLENDS, BLEND_LABELS } from './blend.js';
import { DERIVED } from './frame.js';

/** One layer's rows — the chosen one's, in the Stack section — as particles' overlay had them (G3). */
export const LAYER_PARAMS = {
  at:      { type: 'enum', options: ['front', 'behind'], default: 'front', display: 'chips',
             labels: { front: 'in front', behind: 'behind' }, label: 'where' },
  fit:     { type: 'enum', options: ['whole', 'fill'], default: 'whole', display: 'chips',
             labels: { whole: 'whole', fill: 'filling it' }, label: 'fitted' },
  scale:   { type: 'range', min: 0.05, max: 10, step: 'any', log: true, default: 1, label: 'size', unit: '×' },
  x:       { type: 'int', min: -8000, max: 8000, default: 0, label: 'x', pair: 'y', pairLabel: 'from centre', axis: 'x' },
  y:       { type: 'int', min: -8000, max: 8000, default: 0, label: 'y', axis: 'y' },
  rot:     { type: 'range', min: -180, max: 180, step: 0.5, default: 0, label: 'turned', unit: '°' },
  opacity: { type: 'range', min: 0, max: 1, step: 0.01, default: 1, label: 'opacity' },
  blend:   { type: 'enum', options: BLENDS, labels: BLEND_LABELS, default: 'normal', label: 'blend' },
};

/**
 * The param an app spreads into its schema — the panel its Stack is in, last,
 * so the Stack section comes after its other groups. What a layer may be: a
 * picture, a loop, a page — or a smart object of any of them.
 */
export const LAYERS = {
  type: 'layers', of: LAYER_PARAMS, default: [], label: 'layers', group: 'stack',
  accepts: ['still', 'shape', 'sequence', 'composition'],
};

/** A new layer on `ref`, as "+ overlay…" makes one: in front, whole, as it is. */
export function layerOn(ref) {
  const out = { ref, on: true };
  for (const [k, spec] of Object.entries(LAYER_PARAMS)) out[k] = spec.default;
  return out;
}

/**
 * The part of a recipe that holds its layers — the recipe itself, or one of
 * its parts: particles' picture, compose's page, ckt's motion — or null.
 * With them, that part holds the app's format, when it has one.
 */
export function holderOf(recipe) {
  if (!recipe || typeof recipe !== 'object') return null;
  if (Array.isArray(recipe.layers)) return recipe;
  for (const v of Object.values(recipe)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.layers)) return v;
  }
  return null;
}

/** An object's layers that are on, each naming an object, bottom first — none for a recipe with none. */
export function layersOf(recipe) {
  const part = holderOf(recipe);
  return part ? part.layers.filter(l => l && typeof l.ref === 'string' && l.ref && l.on !== false) : [];
}

/**
 * The format the layers fit, in its own pixels — `{ width, height, bleed,
 * scale }`, the picture `(width + 2 bleed) × scale` of them across — read off
 * the part that holds them, where the app's Format is (core/frame.js). An app
 * with none — filter, the map, the rig — or a format its source sets — grid's
 * `content`, whose width and height are not its picture's — is given its
 * picture's own size (`fallback`).
 *
 * @param {?object} part
 * @param {?{width: number, height: number}} [fallback]
 * @returns {?{width: number, height: number, bleed: number, scale: number}}
 */
export function formatOf(part, fallback = null) {
  if (part && part.width > 0 && part.height > 0 && !DERIVED.includes(part.format)) {
    return { width: part.width, height: part.height, bleed: Math.max(0, Math.round(part.bleed || 0)),
             scale: part.scale > 0 ? part.scale : 1 };
  }
  return fallback && fallback.width > 0 && fallback.height > 0
    ? { width: fallback.width, height: fallback.height, bleed: 0, scale: 1 } : null;
}

/** How many of a format's pixels the picture is across: the format and its bleed on both sides. */
export const across = fmt => fmt.width + 2 * fmt.bleed;

/**
 * Where a layer goes: whole, as large as the format allows, centred, its
 * proportions kept — so a sheet made for the format fills it, and on another
 * nothing of it is cut — or filling it; `scale` times that; its middle `x`,
 * `y` from the format's. Within a pixel of filling a side, it fills it: A3 is
 * 1080 × 1527, rounded, and a sheet of A3 inside it would leave a hairline.
 * Particles' `overlayBox`, word for word, so its saves draw as they did.
 *
 * @param {number} w        the layer's own width
 * @param {number} h        and height
 * @param {object} layer
 * @param {{width, height, bleed}} fmt
 * @returns {{x: number, y: number, w: number, h: number}}   in the format's pixels, from the picture's corner, unturned
 */
export function layerBox(w, h, layer, fmt) {
  const size = layer.scale > 0 ? layer.scale : 1;
  const k = (layer.fit === 'fill' ? Math.max : Math.min)(fmt.width / w, fmt.height / h) * size;
  const fw = Math.abs(fmt.width - w * k) < 1 ? fmt.width : w * k;
  const fh = Math.abs(fmt.height - h * k) < 1 ? fmt.height : h * k;
  return { x: fmt.bleed + (fmt.width - fw) / 2 + (layer.x || 0), y: fmt.bleed + (fmt.height - fh) / 2 + (layer.y || 0),
           w: fw, h: fh };
}
