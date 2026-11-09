/**
 * palettes.js — the vault's palettes a model's shapes name (V1, 2026-11-06;
 * docs/workshop.md): BEC's grid drawn in one of them rather than one of its
 * own three — BEC 2027's colours, made in the vault panel.
 *
 * A shape keeps only the palette's id in its values, as every object param
 * does; its colours are read once and kept for the page. While they come, a
 * grid is drawn in its own palette, and `then` — the app's draw — is called
 * when they have come. A replay, a print or a save reads them first
 * (`readPalettes`), so what it draws is the palette's from the first frame.
 *
 * DOM-free; the vault read through core/vault.js.
 */

import { Vault } from '../../core/vault.js';
import { coloursIn } from '../../core/palettes.js';

const known = new Map();        // a palette's id → its colours; null while they come, or when there are none

/**
 * The colours of the palette `id`, if they have come; asked for the first time, read — `then` called once
 * they are here.
 *
 * @param {?string} id
 * @param {() => void} [then]
 * @returns {?string[]}
 */
export function inksOf(id, then) {
  if (!id) return null;
  if (known.has(id)) return known.get(id);
  known.set(id, null);
  Vault.load(id).then(({ object }) => { known.set(id, coloursIn(object)); if (then) then(); }, () => {});
  return null;
}

/** The palettes a recipe's shapes name. */
export const palettesIn = recipe => [...new Set(((recipe && recipe.shapes) || [])
  .map(s => s && s.on !== false && s.params && s.params.colours).filter(id => typeof id === 'string' && id))];

/** Every palette a recipe names, read before it is drawn: a replay, a print, a save. */
export async function readPalettes(recipe) {
  await Promise.all(palettesIn(recipe).filter(id => !known.get(id)).map(async id => {
    try { known.set(id, coloursIn((await Vault.load(id)).object)); } catch { known.set(id, null); }
  }));
}
