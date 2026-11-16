/**
 * drawn.js — the gamepad drawings a model's drawn bodies are swept from
 * (loft.js): `gamepad → 3d: a body along its strokes` (G4, 2026-11-16), the
 * link the rig's `gamepad → rig: a drawing's strokes as limbs` opened.
 *
 * A drawing is a still or a recorded sequence; its marks, a sequence's
 * events, are put into strokes by core — core/stage/drawing.js, the rig's
 * — and each sprite they name is read once as its alpha on a grid of at
 * most `SIDE` along its longer side, what its silhouette is traced from at
 * any threshold (silhouette.js). A body keeps only the drawing's id in its
 * values, as every object param does; what is read is kept for the page, as
 * emitters.js keeps an emitter's points. While it comes the body is loft.js's
 * worm, and `then` — the app's draw — is called when it has come. A replay,
 * a print or a save reads it first (`readDrawn`), so the body is the
 * drawing's from the first frame. A drawing with no marks, or not there,
 * stays the worm.
 *
 * DOM-free until a sprite is read; the vault through core/vault.js.
 */

import { Vault }        from '../../core/vault.js';
import { surface }      from '../../core/surface.js';
import { familySprite } from '../../core/sprites.js';
import { stillOf, drawingOf, spritesOf } from '../../core/stage/drawing.js';

/** A sprite's alpha is read on a grid this many cells along its longer side, at most. */
const SIDE = 128;

const known = new Map();        // id → the drawing read; null while it comes, or when it has no marks

/** A sprite's alpha, on its grid. */
function maskOf(image) {
  const width = image.width, height = image.height;
  const cell = Math.max(1, Math.max(width, height) / SIDE);
  const w = Math.max(1, Math.round(width / cell)), h = Math.max(1, Math.round(height / cell));
  const canvas = surface(w, h), ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data, alpha = new Uint8Array(w * h);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return { w, h, alpha, width, height };
}

/** A vault object read as a drawing: its strokes' stamps in order, its sprites' alphas — or null, no marks. */
async function read(id) {
  const { object } = await Vault.load(id);
  const still = stillOf(object && object.recipe);
  if (!still) return null;
  const drawing = drawingOf(still);
  const masks = new Map();
  await Promise.all([...spritesOf(still)].map(async ([key, [familyId, index]]) => {
    try {
      const image = await familySprite(familyId, index);
      if (image) masks.set(key, maskOf(image));
    } catch { /* a sprite that will not come: its marks' sections are circles */ }
  }));
  return { id, strokes: drawing.strokes.map(s => s.stamps.map(i => drawing.stamps[i])), masks };
}

/**
 * The drawing `id` read, if it has come; asked for the first time, read, `then` called once it is here.
 *
 * @param {?string} id
 * @param {() => void} [then]
 * @returns {?{id: string, strokes: Array<Array<object>>, masks: Map<string, object>}}
 */
export function drawnOf(id, then) {
  if (!id || typeof id !== 'string') return null;
  if (known.has(id)) return known.get(id);
  known.set(id, null);
  read(id).then(d => { known.set(id, d); if (d && then) then(); }, () => {});
  return null;
}

/** The drawings a recipe's drawn bodies name, shown. */
export const drawnIn = recipe => [...new Set(((recipe && recipe.shapes) || [])
  .filter(s => s && s.on !== false && s.id === 'drawn' && s.params && typeof s.params.drawing === 'string' && s.params.drawing)
  .map(s => s.params.drawing))];

/** Every drawing a recipe's bodies are swept from, read before it is drawn: a replay, a print, a save. */
export async function readDrawn(recipe) {
  await Promise.all(drawnIn(recipe).filter(id => !known.get(id)).map(async id => {
    try { known.set(id, await read(id)); } catch { known.set(id, null); }
  }));
}
