/**
 * emitters.js — the vault objects a model's clouds are born on (cloud.js): a
 * dot-set's dots, or where a shape or a still has ink, read by core/points.js
 * as particles' object emitter reads them — `ckt → particles: an emitter`,
 * the same link into the 3D app (2026-11-11).
 *
 * A cloud keeps only the object's id and a glyph in its values, as every
 * object param does; its points are read once and kept for the page, as
 * palettes.js keeps a palette's colours. While they come the cloud is a disc
 * (cloud.js `spotOf`), and `then` — the app's draw — is called when they have
 * come. A replay, a print or a save reads them first (`readEmitters`), so what
 * it draws is born on them from the first frame.
 *
 * DOM-free until a picture is read; the vault through core/vault.js.
 */

import { loadPoints } from '../../core/points.js';

const known = new Map();        // `${id}#${glyph}` → its points; null while they come, or when there are none

const keyOf = (id, glyph) => `${id}#${Math.round(Number(glyph) || 0)}`;

/**
 * The points of the object `id` — a dot-set's glyph `glyph` — if they have come; asked for the first time,
 * read, `then` called once they are here.
 *
 * @param {?string} id
 * @param {number} [glyph]
 * @param {() => void} [then]
 * @returns {?{list: Array<[number, number]>, cell: number, title: string}}
 */
export function pointsOf(id, glyph = 0, then) {
  if (!id) return null;
  const key = keyOf(id, glyph);
  if (known.has(key)) return known.get(key);
  known.set(key, null);
  loadPoints(id, { glyph }).then(points => { known.set(key, points.list.length ? points : null); if (then) then(); }, () => {});
  return null;
}

/** The clouds of a recipe that are born on an object, shown: [{ id, glyph }]. */
const namedIn = recipe => ((recipe && recipe.shapes) || [])
  .filter(s => s && s.on !== false && s.id === 'cloud' && s.params && s.params.emitter === 'object'
    && typeof s.params.from === 'string' && s.params.from)
  .map(s => ({ id: s.params.from, glyph: s.params.glyph || 0 }));

/** The objects a recipe's clouds are born on — parents of what it saves, as its palettes are. */
export const emittersIn = recipe => [...new Set(namedIn(recipe).map(e => e.id))];

/** Every object a recipe's clouds are born on, read before it is drawn: a replay, a print, a save. */
export async function readEmitters(recipe) {
  await Promise.all(namedIn(recipe).filter(e => !known.get(keyOf(e.id, e.glyph))).map(async e => {
    try {
      const points = await loadPoints(e.id, { glyph: e.glyph });
      known.set(keyOf(e.id, e.glyph), points.list.length ? points : null);
    } catch { known.set(keyOf(e.id, e.glyph), null); }
  }));
}
