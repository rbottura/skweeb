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
 * And its picture (G4b, 2026-11-17): the author, "appliquer au modèle 3D
 * généré le motif … en texture de sorte que le modèle ressemble un peu au
 * dessin initial". The stamps drawn again by core (still.js `drawStill`, no
 * ground) on a picture framed on them alone — each centre, its sprite's
 * half-diagonal at its scale — so a body's skin does not move with its
 * threshold; opaque, the ink's mean colour where no stamp is, so a body's
 * sides are the drawing's colour, never black. Its `frame` is in the
 * drawing's pixels: loft.js maps each point of a body back to it, the
 * picture projected from the front.
 *
 * DOM-free until a sprite is read; the vault through core/vault.js.
 */

import { CanvasTexture, SRGBColorSpace } from '../../core/libs/three/three.core.js';
import { Vault }        from '../../core/vault.js';
import { surface }      from '../../core/surface.js';
import { familySprite } from '../../core/sprites.js';
import { drawStill }    from '../../core/stage/still.js';
import { stillOf, drawingOf, spritesOf } from '../../core/stage/drawing.js';

/** A sprite's alpha is read on a grid this many cells along its longer side, at most. */
const SIDE = 128;

/** A drawing's picture, this many pixels along its longer side: a print draws it no finer. */
const PICTURE = 2048;

/** The drawing's picture, and where it lies in the drawing's pixels — or null, nothing to draw. */
function pictureOf(drawing, images) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of drawing.stamps) {
    const image = images.get(s.key);
    const r = image ? (Math.hypot(image.width, image.height) / 2) * Math.abs(s.scale) : 0;
    x0 = Math.min(x0, s.x - r); x1 = Math.max(x1, s.x + r);
    y0 = Math.min(y0, s.y - r); y1 = Math.max(y1, s.y + r);
  }
  if (!(x1 > x0 && y1 > y0)) return null;
  const view = PICTURE / Math.max(x1 - x0, y1 - y0);
  const w = Math.max(1, Math.round((x1 - x0) * view)), h = Math.max(1, Math.round((y1 - y0) * view));
  const canvas = surface(w, h), ctx = canvas.getContext('2d');
  drawStill(ctx, { ground: null, clip: { x: 0, y: 0, w: x1 - x0, h: y1 - y0 },
    stamps: drawing.stamps.map(s => ({ ...s, x: s.x - x0, y: s.y - y0 })) }, images, view);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, a = 0;
  for (let i = 0; i < rgba.length; i += 28) { const k = rgba[i + 3]; r += rgba[i] * k; g += rgba[i + 1] * k; b += rgba[i + 2] * k; a += k; }
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = a ? `rgb(${Math.round(r / a)}, ${Math.round(g / a)}, ${Math.round(b / a)})` : '#808080';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  const skin = new CanvasTexture(canvas);
  skin.colorSpace = SRGBColorSpace;
  return { frame: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, skin };
}

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

/**
 * A vault object read as a drawing: its strokes' stamps in order, its sprites' alphas — or null, no marks. A
 * smart object, the gamepad's S since S6b, is the drawing it binds, as core/points.js reads one.
 */
async function read(id) {
  let { object } = await Vault.load(id);
  if (object && object.type === 'skw') object = (await import('../../core/smart.js')).unwrap(object);
  const still = stillOf(object && object.recipe);
  if (!still) return null;
  const drawing = drawingOf(still);
  const masks = new Map(), images = new Map();
  await Promise.all([...spritesOf(still)].map(async ([key, [familyId, index]]) => {
    try {
      const image = await familySprite(familyId, index);
      if (image) { images.set(key, image); masks.set(key, maskOf(image)); }
    } catch { /* a sprite that will not come: its marks' sections are circles */ }
  }));
  return { id, strokes: drawing.strokes.map(s => s.stamps.map(i => drawing.stamps[i])), masks, ...pictureOf(drawing, images) };
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
